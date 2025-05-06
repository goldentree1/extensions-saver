import { GLib, Gio } from "./gjs.js";
import { SAVE_DIR, EXTENSIONS_DIR_USER } from "./globals.js";
import {
    getGnomeShellVersionMajor,
    getEnabledExtensions,
    getInstalledExtensions
} from "./helpers.js";

/** @param {ParsedArgv} argv */
export function cmdSave({ cmd, args, flags }) {
    const [saveName] = args;

    if (!saveName) {
        printerr("No save name specified");
        imports.system.exit(1);
    }

    const outPath = GLib.build_filenamev([SAVE_DIR, `${saveName}.json`]);
    if (!(flags.includes("o") || flags.includes("overwrite")) && GLib.file_test(outPath, GLib.FileTest.EXISTS)) {
        printerr(`"${saveName}" already exists`);
        imports.system.exit(1);
    }

    const shellVersion = getGnomeShellVersionMajor();
    if (!shellVersion) {
        printerr(`GNOME Shell version could not be determined, unable to save`)
        return imports.system.exit(1);
    }

    // we only want extensions that are currently affecting the user's system,
    // so we need to only get extensions that are both enabled AND installed.
    const installed = getInstalledExtensions(EXTENSIONS_DIR_USER);
    const extensions = getEnabledExtensions().filter((uuid) => installed.includes(uuid));

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
    imports.system.exit(0);
}

/** @param {string} dir @param {string} uuid */
function getExtensionMetadata(dir, uuid) {
    const metadataPath = GLib.build_filenamev([dir, uuid, "metadata.json"]);
    const metadataFile = Gio.File.new_for_path(metadataPath);
    try {
        const [, contents] = metadataFile.load_contents(null);
        /** @ts-ignore */
        const decoder = new TextDecoder("utf-8");
        const res = JSON.parse(decoder.decode(contents));
        return res;
    } catch (e) {
        printerr(`Broken extension? Failed to load metadata.json from path "${dir}/${uuid}": ${e instanceof Error ? e.message : e}`);
        return null;
    }
}

/**
 * 1. Find the extension's schema in dir/uuid/schemas
 * 2. Get path variable from <schema> tag and read its content
 * 3. return path
 * @param {string} dir  @param {string} uuid  */
function getExtensionDconfPath(dir, uuid) {
    const schemaDir = GLib.build_filenamev([dir, uuid, "schemas"]);
    const schemaFiles = GLib.file_test(schemaDir, GLib.FileTest.IS_DIR);
    if (!schemaFiles) {
        printerr(`No 'schemas' directory was found for ${uuid}`);
        return null;
    }
    const dirFile = Gio.File.new_for_path(schemaDir);
    const enumerator = dirFile.enumerate_children('standard::name', Gio.FileQueryInfoFlags.NONE, null);

    let schemaFile = null;
    let info;
    while ((info = enumerator.next_file(null)) !== null) {
        /**@type {string} */
        const name = info.get_name();
        if (name.endsWith('.gschema.xml')) {
            schemaFile = GLib.build_filenamev([schemaDir, name]);
            break;
        }
    }

    if (!schemaFile) {
        printerr(`No gschema.xml file was found for ${uuid}`);
        return null;
    }

    const [, contents] = Gio.File.new_for_path(schemaFile).load_contents(null);
    const xmlContent = imports.byteArray.toString(contents);

    // gjs doesn't have XML parsing!? wtf: use some hacky regex instead
    const pathMatch = xmlContent.match(/<schema[^>]*path="([^"]*)"/);
    if (pathMatch && pathMatch[1]) {
        return pathMatch[1];
    } else {
        printerr(`Schema file was found, but dconf path attribute was missing for ${uuid}`);
        return null;
    }
}

/** @param {string} schema */
function getDconfDump(schema) {
    const [ok, out] = GLib.spawn_command_line_sync(`dconf dump "${schema}"`);
    if (!ok) {
        printerr(`Failed to dump dconf for ${schema}`);
        return null;
    }
    // @ts-ignore
    const decoder = new TextDecoder("utf-8");
    return decoder.decode(out);
}
