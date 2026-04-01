import path from "path";
import { defineCommand } from "citty";
import {
  resolveItem,
  downloadAttachment,
  createTextSend,
  createFileSend,
  formatItemAsText,
  safeName,
  SendModeSchema,
} from "../bw.js";

export default defineCommand({
  meta: { description: "Create a Bitwarden Send from a vault item" },
  args: {
    query: {
      type: "positional" as const,
      description: "Exact item name or UUID",
      required: true,
    },
    mode: {
      type: "string" as const,
      alias: "m",
      description: "body | attachments | both | auto (default)",
      default: "auto",
    },
    hidden: {
      type: "boolean" as const,
      alias: "H",
      description: "Hide text body (body/both modes)",
      default: false,
    },
    days: {
      type: "string" as const,
      alias: "d",
      description: "Days until deletion",
      default: "7",
    },
    max: {
      type: "string" as const,
      alias: "a",
      description: "Max number of accesses",
    },
    password: {
      type: "string" as const,
      alias: "p",
      description: "Password-protect the Send",
    },
  },
  async run({ args }) {
    // Validate mode with Zod
    const mode = SendModeSchema.parse(args.mode);
    const item = await resolveItem(args.query);
    const hasAttachments = !!item.attachments?.length;

    // Resolve "auto"
    const effective =
      mode === "auto" ? (hasAttachments ? "both" : "body") : mode;

    if (
      (effective === "attachments" || effective === "both") &&
      !hasAttachments
    ) {
      if (effective === "attachments") {
        console.error(`"${item.name}" has no attachments.`);
        process.exit(1);
      }
      // both with no attachments → fall back to body-only
      console.warn(`No attachments found, falling back to body-only send.`);
    }

    const sendOpts = {
      days: parseInt(args.days),
      maxAccessCount: args.max ? parseInt(args.max) : undefined,
      password: args.password,
    };

    // ---- body only --------------------------------------------------------
    if (effective === "body" || (effective === "both" && !hasAttachments)) {
      const url = await createTextSend({
        name: item.name,
        text: formatItemAsText(item),
        hidden: args.hidden,
        ...sendOpts,
      });
      console.log(`\n✓ Text send: ${item.name}`);
      if (args.hidden) console.log("  (text hidden by default)");
      console.log(`\n  ${url}`);
      return;
    }

    // ---- attachments or both (file send) ----------------------------------
    const tmpDir = `/tmp/bw-send-${Date.now()}`;
    await Bun.spawn(["mkdir", "-p", tmpDir]).exited;
    const filePaths: string[] = [];

    if (effective === "both") {
      // Include body as a .txt file inside the zip
      const txtPath = path.join(tmpDir, `${safeName(item.name)}.txt`);
      await Bun.write(txtPath, formatItemAsText(item));
      filePaths.push(txtPath);
    }

    console.log(`Downloading ${item.attachments!.length} attachment(s)...`);
    for (const att of item.attachments!) {
      await downloadAttachment(att.id, item.id, `${tmpDir}/`);
      filePaths.push(path.join(tmpDir, att.fileName));
      console.log(`  ✓ ${att.fileName}`);
    }

    const zipPath = `/tmp/${safeName(item.name)}.zip`;
    const zip = Bun.spawn(["zip", "-j", zipPath, ...filePaths], {
      stderr: "pipe",
    });
    if ((await zip.exited) !== 0) {
      console.error("Failed to create zip archive.");
      process.exit(1);
    }

    const url = await createFileSend({
      name: item.name,
      filePath: zipPath,
      ...sendOpts,
    });

    await Bun.spawn(["rm", "-rf", tmpDir, zipPath]).exited;

    const label = effective === "both" ? "body + attachments" : "attachments";
    console.log(`\n✓ File send (${label}): ${item.name}`);
    console.log(`\n  ${url}`);
  },
});
