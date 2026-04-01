import { defineCommand } from "citty";
import { listItems, archiveItem, deleteCollection } from "../bw.js";

const COLLECTION_ARGS = {
  collectionId: {
    type: "positional" as const,
    description: "Collection ID",
    required: true,
  },
  org: {
    type: "string" as const,
    description: "Organization ID that owns the collection",
    required: true,
  },
} as const;

const archiveCommand = defineCommand({
  meta: { description: "Archive every item inside a collection" },
  args: COLLECTION_ARGS,
  async run({ args }) {
    console.log(`Fetching items in collection ${args.collectionId}...`);
    const items = await listItems({ collectionId: args.collectionId });
    if (!items.length) {
      console.log("No items found in that collection.");
      return;
    }
    console.log(`Archiving ${items.length} items...\n`);
    let ok = 0, fail = 0;
    for (const item of items) {
      try {
        await archiveItem(item.id);
        console.log(`  ✓ ${item.name}`);
        ok++;
      } catch (e) {
        console.error(`  ✗ ${item.name}: ${e}`);
        fail++;
      }
    }
    console.log(`\nDone. ${ok} archived${fail > 0 ? `, ${fail} failed` : ""}.`);
  },
});

const deleteCommand = defineCommand({
  meta: { description: "Delete a collection (items move to Unassigned)" },
  args: COLLECTION_ARGS,
  async run({ args }) {
    await deleteCollection(args.collectionId, args.org);
    console.log(`✓ Collection ${args.collectionId} deleted.`);
  },
});

export default defineCommand({
  meta: { description: "Manage collections" },
  subCommands: {
    archive: archiveCommand,
    delete: deleteCommand,
  },
});
