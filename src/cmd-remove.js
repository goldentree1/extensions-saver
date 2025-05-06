import { GLib, Gio } from "./gjs.js";
import { SAVE_DIR } from "./globals";

/** @param {ParsedArgv} argv */
export function cmdRemove(argv) {
    const [saveName] = argv.args;
    if (!saveName) {
        print("No save name specified");
        imports.system.exit(1);
    }

    const filePath = GLib.build_filenamev([SAVE_DIR, `${saveName}.json`]);
    if (!GLib.file_test(filePath, GLib.FileTest.EXISTS)) {
        print(`"${saveName}" does not exist`);
        imports.system.exit(1);
    }

    const file = Gio.File.new_for_path(filePath);
    file.delete(null);

    print(`Removed save "${saveName}"`);
    imports.system.exit(0);
}
