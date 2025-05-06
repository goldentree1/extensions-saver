const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
import { SAVE_DIR } from "./globals.js";

/** @param {ParsedArgv} argv */
export function cmdInfo({ cmd, args, flags }) {
    const [saveName] = args;
    if (!saveName) {
        printerr("No save name specified");
        imports.system.exit(1);
    }

    const filePath = GLib.build_filenamev([SAVE_DIR, `${saveName}.json`]);
    if (!GLib.file_test(filePath, GLib.FileTest.EXISTS)) {
        printerr(`Save "${saveName}" does not exist`);
        imports.system.exit(1);
    }

    const file = Gio.File.new_for_path(filePath);
    /** @type {SaveFile|null} */
    let saveData = null;
    try {
        const [, contents] = file.load_contents(null);
        /** @ts-ignore */
        const decoder = new TextDecoder("utf-8");
        saveData = JSON.parse(decoder.decode(contents));
    } catch (e) {
        printerr(`Failed to load save "${saveName}": ${e instanceof Error ? e.message : e}`);
        imports.system.exit(1);
    }
    if (!saveData) {
        printerr(`Failed to load save "${saveName}"`);
        imports.system.exit(1);
        return;
    }

    print(`Name: ${saveName}`);
    print(`GNOME Shell version: ${saveData.gnomeShellVersion}`);
    print(`Extensions:`);
    for (const extension of saveData.extensions) {
        print(`  - ${extension.uuid} (v${extension.version})`);
        if (flags.includes("v") || flags.includes("verbose")) {
            /**@ts-ignore */
            extension.prefs.split("\n").forEach(line => {
                if (line.startsWith("[")) {
                    print("       " + line);
                } else {
                    print("         " + line);
                }
            });
        }
    }
    print(`Total extensions: ${saveData.extensions.length}`);
}
