const Gio = imports.gi.Gio;
import { SAVE_DIR } from "./globals";

export function cmdList() {
    const enumerator = Gio.File
        .new_for_path(SAVE_DIR)
        .enumerate_children('standard::name', Gio.FileQueryInfoFlags.NONE, null);

    let file;
    while ((file = enumerator.next_file(null)) !== null) {
        const name = file.get_name();
        if (name.endsWith('.json')) {
            print(name.substring(0, name.length - 5)); // remove .json
        }
    }
}
