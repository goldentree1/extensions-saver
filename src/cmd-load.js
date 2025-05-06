import { GLib, Gio } from "./gjs.js";
import { EXTENSIONS_DIR_USER, SAVE_DIR } from "./globals.js";
import {
    getGnomeShellVersionMajor,
    getInstalledExtensions,
    setEnabledExtensions,
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
        return imports.system.exit(1);
    }

    if (!saveData || !saveData.extensions || !Array.isArray(saveData.extensions)) {
        printerr(`Save file "${saveName}" is corrupted or invalid.`);
        return imports.system.exit(1);
    }

    // Download and install missing extensions
    const installed = getInstalledExtensions(EXTENSIONS_DIR_USER);
    const notInstalled = saveData.extensions
        .filter(({ uuid }) => !installed.includes(uuid));
    const gnomeShellVersion = getGnomeShellVersionMajor();
    if (!gnomeShellVersion) {
        printerr(`Unable to determine current GNOME Shell version`);
        return imports.system.exit(1);
    }
    if (saveData.gnomeShellVersion !== gnomeShellVersion) {
        print(`WARNING: GNOME Shell version mismatch, current version ${gnomeShellVersion} does not match saved version ${saveData.gnomeShellVersion}, which may break some extensions`);
    }
    if (notInstalled.length > 0) {
        for (const { uuid } of notInstalled) {
            print(`Downloading extension ${uuid}`);
            const zipFile = downloadExtension_sync(uuid, gnomeShellVersion, GLib.build_filenamev([SAVE_DIR, "tmp"]));
            print(`Installing extension ${uuid}`);
            if (!zipFile) {
                printerr(`Failed to download extension for ${uuid}`);
                continue;
            }
            gnomeExtensionsInstall(zipFile);
            GLib.unlink(zipFile);
        }
    }

    // Disable all extensions
    print("Disabling extensions")
    setEnabledExtensions([]);

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

    print("Enabling extensions");
    setEnabledExtensions(saveData.extensions.map(({ uuid }) => uuid));

    // YAY ;-)
    print(`Loaded extensions and their preferences from "${saveName}"`);
}


/** @param {string} uuid @param {string} shellVersion @param {string} downloadDir */
function downloadExtension_sync(uuid, shellVersion, downloadDir) {
    GLib.mkdir_with_parents(downloadDir, 0o755);

    const majorShellVersion = String(shellVersion).split(".")[0];
    const infoEndpoint = `https://extensions.gnome.org/extension-info/?uuid=${encodeURIComponent(uuid)}`;
    const curlInfoCommand = ["curl", "-s", infoEndpoint];

    let extensionInfoJson;
    try {
        const [ok, out, err, status] = GLib.spawn_sync(
            null, curlInfoCommand, null, GLib.SpawnFlags.SEARCH_PATH, null
        );

        if (!ok || !GLib.spawn_check_exit_status(status)) {
            printerr(`Failed to fetch extension info for ${uuid}`);
            return null;
        }

        /** @ts-ignore */
        const decoder = new TextDecoder();
        extensionInfoJson = decoder.decode(out);
    } catch (e) {
        /** @ts-ignore */
        printerr(`Error fetching extension info: ${e.message}`);
        return null;
    }

    let extensionInfo;
    try {
        extensionInfo = JSON.parse(extensionInfoJson);
    } catch (e) {
        /** @ts-ignore */
        printerr(`Failed to parse extension info JSON: ${e.message}`);
        return null;
    }

    const versionEntry = extensionInfo.shell_version_map?.[majorShellVersion];
    if (!versionEntry?.version) {
        printerr(`No compatible version found for GNOME Shell ${shellVersion}`);
        return null;
    }

    const extensionVersion = versionEntry.version;
    const endpoint = `https://extensions.gnome.org/api/v1/extensions/${uuid}/versions/${extensionVersion}/?format=zip`;
    const outputFile = GLib.build_filenamev([downloadDir, `${uuid}-${extensionVersion}.zip`]);

    const curlCommand = ["curl", "-L", endpoint, "--output", outputFile];

    try {
        const [ok, out, err, status] = GLib.spawn_sync(
            null, curlCommand, null, GLib.SpawnFlags.SEARCH_PATH, null
        );

        if (!ok || !GLib.spawn_check_exit_status(status)) {
            printerr(`Failed to download extension zip for ${uuid}`);
            return null;
        }
    } catch (e) {
        /** @ts-ignore */
        printerr(`Error downloading extension zip: ${e.message}`);
        return null;
    }

    return outputFile;
}

/** @param {string} absoluteFilepath  */
function gnomeExtensionsInstall(absoluteFilepath) {
    const installCommand = `gnome-extensions install "${absoluteFilepath}"`;
    try {
        const [ok, out, err, status] = GLib.spawn_command_line_sync(installCommand);
        if (!ok || !GLib.spawn_check_exit_status(status)) {
            return null;
        }
        return true;
    } catch (e) {
        return null;
    }
}
