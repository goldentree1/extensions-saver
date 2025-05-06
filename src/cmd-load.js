import { GLib, Gio } from "./gjs.js";
import { EXTENSIONS_DIR_USER, SAVE_DIR } from "./globals.js";
import {
    disableAllExtensions,
    downloadExtension_sync,
    enableExtensions,
    getGnomeShellVersionMajor,
    getInstalledExtensions,
    gnomeExtensionsInstall
} from "./helpers.js";

/** @param {ParsedArgv} argv */
export function cmdLoad({ cmd, args, flags }) {

    // Load the save file
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
        return;
    }

    if (!saveData || !saveData.extensions || !Array.isArray(saveData.extensions)) {
        printerr(`Save file "${saveName}" is corrupted or invalid.`);
        return imports.system.exit(1);
    }

    // Check gnome shell version
    const gnomeShellVersion = getGnomeShellVersionMajor();
    if (saveData.gnomeShellVersion !== gnomeShellVersion) {
        print(`WARNING: GNOME Shell version mismatch, current version ${gnomeShellVersion} does not match saved version ${saveData.gnomeShellVersion}, which may break some extensions`);
    }

    // Download and install missing extensions
    const installed = getInstalledExtensions(EXTENSIONS_DIR_USER);
    const notInstalled = saveData.extensions
        .filter(({ uuid }) => !installed.includes(uuid));
    if (notInstalled.length > 0) {
        for (const { uuid } of notInstalled) {
            print(`Downloading extension ${uuid}`);
            const zipFile = downloadExtension_sync(uuid, gnomeShellVersion || '', GLib.build_filenamev([SAVE_DIR, "tmp"]));
            print(`Installing extension ${uuid}`);
            if (!zipFile) {
                print(`Skipping install: failed to download extension for ${uuid}`);
                continue;
            }
            gnomeExtensionsInstall(zipFile);
            GLib.unlink(zipFile);
        }
    }

    // Disable all extensions
    print("Disabling extensions")
    disableAllExtensions();

    // Load preferences via shell script with dconf
    print("Updating preferences")
    const dconfLoadScript = `sh -c ` + GLib.shell_quote(
        saveData.extensions
            .filter(({ dconfPath }) => Boolean(dconfPath))
            .map(({ uuid, dconfPath }) => (
                `cat ${GLib.shell_quote(filePath)} | jq -r ${GLib.shell_quote(`.extensions[] | select(.uuid == "${uuid}").prefs`)} | dconf load ${GLib.shell_quote(dconfPath)}`))
            .join("\n")
    );
    const [ok] = GLib.spawn_command_line_sync(dconfLoadScript);
    if (!ok) {
        print("Failed to load dconf settings");
    }

    // Enable extensions from the save
    print("Enabling extensions");
    enableExtensions(saveData.extensions.map(({ uuid }) => uuid));

    // YAY ;-)
    print(`Loaded extensions and their preferences from "${saveName}"`);
}
