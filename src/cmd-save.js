const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
import { SAVE_DIR, EXTENSIONS_DIR_USER } from "./globals.js";
import {
    getDconfDump,
    getExtensionMetadata,
    getExtensionDconfPath,
    getGnomeShellVersionMajor,
    getInstalledEnabledExtensions
} from "./helpers.js";

/** @param {ParsedArgv} argv */
export function cmdSave({ cmd, args, flags }) {
    const [saveName] = args;

    if (!saveName) {
        print("No save name specified");
        imports.system.exit(1);
    }

    const outPath = GLib.build_filenamev([SAVE_DIR, `${saveName}.json`]);
    if (!(flags.includes("o") || flags.includes("overwrite")) && GLib.file_test(outPath, GLib.FileTest.EXISTS)) {
        print(`"${saveName}" already exists`);
        imports.system.exit(0);
    }

    const shellVersion = getGnomeShellVersionMajor();
    const extensions = getInstalledEnabledExtensions(EXTENSIONS_DIR_USER);

    // Create save file data
    /** @type {SaveFile} */
    const saveData = {
        gnomeShellVersion: shellVersion,
        extensions: extensions.map((uuid => {
            const metadata = getExtensionMetadata(EXTENSIONS_DIR_USER, uuid);
            const dconfPath = getExtensionDconfPath(EXTENSIONS_DIR_USER, uuid);
            const prefs = getDconfDump(dconfPath);
            /**@type {SaveFileGnomeExtensionData} */
            const data = {
                uuid,
                version: metadata?.version,
                dconfPath,
                prefs,
            }
            return data;
        }))
    };

    // Write data to save file
    const file = Gio.File.new_for_path(outPath);
    file.replace_contents(
        JSON.stringify(saveData, null, 4), null, false, Gio.FileCreateFlags.REPLACE_DESTINATION, null
    );

    print(`Saved ${extensions.length} extensions to "${saveName}"`);
}
