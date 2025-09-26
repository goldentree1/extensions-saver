#!/usr/bin/gjs

import { GLib } from "./gjs.js";
import { SAVE_DIR, VERSION } from "./globals.js";
import { cmdList } from "./cmd-list.js";
import { cmdRemove } from "./cmd-remove.js";
import { cmdSave } from "./cmd-save.js";
import { cmdInfo } from "./cmd-info.js";
import { cmdLoad } from "./cmd-load.js";

// create the save directory if it doesnt exist
GLib.mkdir_with_parents(SAVE_DIR, 0o755);

// parse argv
const argv = parseArgv(ARGV);
const { cmd, args, flags } = argv;

// run program!!
if (cmd == "version" ||
    ((flags.includes("v") || flags.includes("version")) && !cmd && args.length == 0 && flags.filter(v => v !== "v" && v !== "version").length === 0)) {
    print(`extension-saver ${VERSION}`);
} else if (cmd == "help" || (!cmd && flags.length == 0) || (!cmd && (flags.includes("h") || flags.includes("help")))) {
    printHelp();
} else if (cmd == "list") {
    cmdList();
} else if (cmd == "info") {
    cmdInfo(argv);
} else if (cmd == "save") {
    cmdSave(argv);
} else if (cmd == "remove") {
    cmdRemove(argv);
} else if (cmd == "load") {
    cmdLoad(argv);
} else {
    print(cmd ? `Unknown command: ${cmd}` : 'Unknown flags');
    imports.system.exit(1);
}

function printHelp() {
    print("Usage: extension-saver <command> <args...>");
    print("Commands:");
    print("  list              List all saved sets");
    print("  info <name>       Show information about the saved set <name>");
    print("  save <name>       Save the current extensions and their settings to <name>");
    print("  remove <name>     Remove the saved set <name>");
    print("  load <name>       Load extensions and their settings from the saved set <name>");
    print("  help              Show this help message");
    print("  version           Show the version of this script");
}

/** @param {string[]} argv @returns {ParsedArgv} */
function parseArgv(argv) {

    let cmd = null;
    let args = [];
    let flags = [];

    for (let str of argv) {
        if (str.startsWith("--")) {
            flags.push(str.substring(2));
        } else if (str.startsWith("-")) {
            for (const ch of str.substring(1)) {
                flags.push(ch);
            }
        } else if (!cmd) {
            cmd = str;
        } else {
            args.push(str);
        }
    }

    return { cmd, args, flags };
}

