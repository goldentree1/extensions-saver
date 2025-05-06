const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;

/** @param {string} schema */
export function getDconfDump(schema) {
    const [ok, out] = GLib.spawn_command_line_sync(`dconf dump "${schema}"`);
    if (!ok) {
        print(`Failed to dump dconf for ${schema}`);
        return null;
    }
    // @ts-ignore
    const decoder = new TextDecoder("utf-8");
    return decoder.decode(out);
}

/**
 * 1. Find the extension's schema in dir/uuid/schemas
 * 2. Get path variable from <schema> tag and read its content
 * 3. return path
 * @param {string} dir  @param {string} uuid  */
export function getExtensionDconfPath(dir, uuid) {
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

/** @param {string} dir @param {string} uuid */
export function getExtensionMetadata(dir, uuid) {
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

/** @param {boolean} onOrOff */
export function switchExtensions(onOrOff){
    const settings = new Gio.Settings({ schema_id: 'org.gnome.shell' });
    settings.set_strv('disable-user-extensions', onOrOff ? "true":"false");
}

export function disableAllExtensions() {
    const settings = new Gio.Settings({ schema_id: 'org.gnome.shell' });
    settings.set_strv('enabled-extensions', []);
}

/** @param {string[]} uuids */
export function enableExtensions(uuids) {
    const settings = new Gio.Settings({ schema_id: 'org.gnome.shell' });
    settings.set_strv('enabled-extensions', uuids);
}

export function getEnabledExtensions() {
    const shellSettings = new Gio.Settings({ schema_id: 'org.gnome.shell' });
    /** @type {string[]} */
    const enabledExtensions = shellSettings.get_strv('enabled-extensions');
    return enabledExtensions;
}

/** @param {string} dir extensions dir (could be sys or user) */
export function getInstalledExtensions(dir) {
    const file = Gio.File.new_for_path(dir);
    const enumerator = file.enumerate_children('standard::name', Gio.FileQueryInfoFlags.NONE, null);
    /** @type {string[]} */
    let extensions = [];
    let info;
    while ((info = enumerator.next_file(null)) !== null) {
        extensions.push(info.get_name());
    }
    return extensions;
}

/**
 * We only want extensions that are currently affecting the user's system, so
 * we need to check they are both enabled AND installed.
 * @param {string} dir
 * @returns {string[]} UUIDs of enabled+installed extensions */
export function getInstalledEnabledExtensions(dir) {
    const enabled = getEnabledExtensions();
    const installed = getInstalledExtensions(dir);
    return enabled.filter((uuid) => installed.includes(uuid));
}

export function getGnomeShellVersionMajor() {
    try {
        const [ok, out] = GLib.spawn_command_line_sync('gnome-shell --version');
        if (!ok) return null;

        const versionStr = imports.byteArray.toString(out).replace("GNOME Shell", "").trim();  // e.g., "3.38.5" or "48.1"
        const parts = versionStr.split(".");
        
        // New-style versioning (40+): "48.1" → "48"
        const firstPart = Number(parts[0]);
        if (firstPart >= 40) {
            return String(firstPart);
        }

        // Legacy versioning: use major.minor (e.g. "3.38")
        return parts.length >= 2 ? `${parts[0]}.${parts[1]}` : parts[0];

    } catch (e) {
        print(`Unable to get GNOME Shell version: ${e instanceof Error ? e.message : e}`);
        return null;
    }
}

/** @param {string} uuid @param {string} shellVersion @param {string} downloadDir */
export function downloadExtension_sync(uuid, shellVersion, downloadDir) {
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
            print(`Failed to fetch extension info for ${uuid}`);
            return null;
        }

        /** @ts-ignore */
        const decoder = new TextDecoder();
        extensionInfoJson = decoder.decode(out);
    } catch (e) {
        /** @ts-ignore */
        print(`Error fetching extension info: ${e.message}`);
        return null;
    }

    let extensionInfo;
    try {
        extensionInfo = JSON.parse(extensionInfoJson);
    } catch (e) {
        /** @ts-ignore */
        print(`Failed to parse extension info JSON: ${e.message}`);
        return null;
    }

    const versionEntry = extensionInfo.shell_version_map?.[majorShellVersion];
    if (!versionEntry?.version) {
        print(`No compatible version found for GNOME Shell ${shellVersion}`);
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
            print(`Failed to download extension zip for ${uuid}`);
            return null;
        }
    } catch (e) {
        /** @ts-ignore */
        print(`Error downloading extension zip: ${e.message}`);
        return null;
    }

    return outputFile;
}


/** @param {string} absoluteFilepath  */
export function gnomeExtensionsInstall(absoluteFilepath) {
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


// /**
//  * 
//  * @param {"GET"|"POST"} method 
//  * @param {string} url 
//  */
// export function makeHttpRequestSync(method, url) {
//     let session = new Soup.SessionSync();
//     let message = Soup.Message.new(method, url);

//     session.send_message(message);

//     if (message.status_code === Soup.Status.OK) {
//         print("Success:");
//         print(message.response_body.data);
//     } else {
//         print("Failed with status: " + message.status_code);
//     }
// }

// // use curl like curl -L https://extensions.gnome.org/api/v1/extensions/dash-to-panel@jderose9.github.com/versions/67/?format=zip -v --output DOWNLOADED.zip
