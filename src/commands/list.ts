import { defineCommand } from "citty";
import { listItems, listCollections } from "../bw.js";

const attachmentsCommand = defineCommand({
  meta: { description: "List all items that have file attachments" },
  async run() {
    const items = await listItems();
    const withAttachments = items.filter((i) => i.attachments?.length);
    if (!withAttachments.length) {
      console.log("No items with attachments found.");
      return;
    }
    console.log(`${withAttachments.length} items with attachments:\n`);
    for (const item of withAttachments) {
      console.log(`  ${item.name}`);
      for (const att of item.attachments!) {
        console.log(`    • ${att.fileName} (${att.sizeName})`);
      }
    }
  },
});

const collectionsCommand = defineCommand({
  meta: { description: "List all collections with id and org" },
  async run() {
    const collections = await listCollections();
    if (!collections.length) {
      console.log("No collections found.");
      return;
    }
    console.log(`${collections.length} collections:\n`);
    for (const col of collections) {
      console.log(`  ${col.name}`);
      console.log(`    id:  ${col.id}`);
      console.log(`    org: ${col.organizationId}`);
    }
  },
});

export default defineCommand({
  meta: { description: "List vault items" },
  subCommands: {
    attachments: attachmentsCommand,
    collections: collectionsCommand,
  },
});
