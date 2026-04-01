import { defineCommand } from "citty";
import { listItems } from "../bw.js";

export default defineCommand({
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
