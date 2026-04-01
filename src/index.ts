#!/usr/bin/env bun
import { defineCommand, runMain } from "citty";
import listCommand from "./commands/list.js";
import sendCommand from "./commands/send.js";
import collectionCommand from "./commands/collection.js";

runMain(
  defineCommand({
    meta: {
      name: "bbw",
      version: "0.1.0",
      description: "Better Bitwarden CLI — sends, attachments, archiving, collections",
    },
    subCommands: {
      list: listCommand,       // bbw list attachments
      send: sendCommand,       // bbw send <query> [--mode ...]
      collection: collectionCommand, // bbw collection archive <id>
    },
  })
);
