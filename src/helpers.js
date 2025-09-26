import { GLib, Gio } from "./gjs.js";

/** @returns {string|null} */
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
        printerr(`Unable to get GNOME Shell version: ${e instanceof Error ? e.message : e}`);
        return null;
    }
}

export function getEnabledExtensions() {
    const shellSettings = new Gio.Settings({ schema_id: 'org.gnome.shell' });
    /** @type {string[]} */
    const enabledExtensions = shellSettings.get_strv('enabled-extensions');
    return enabledExtensions;
}

/** @param {string[]} uuids */
export function setEnabledExtensions(uuids) {
    const settings = new Gio.Settings({ schema_id: 'org.gnome.shell' });
    settings.set_strv('enabled-extensions', uuids);
}

/** @param {string} dir extensions dir (could be sys or user) */
export function getInstalledExtensions(dir) {
    if (!GLib.file_test(dir, GLib.FileTest.IS_DIR)) {
        return [];
    }

    const file = Gio.File.new_for_path(dir);
    const enumerator = file.enumerate_children('standard::name', Gio.FileQueryInfoFlags.NONE, null);
    /** @type {string[]} */
    let extensions = [];
    let info;
    while ((info = enumerator.next_file(null)) !== null) {
        if (info.get_file_type() === Gio.FileType.DIRECTORY) {
            extensions.push(info.get_name());
        }
    }
    return extensions;
}
