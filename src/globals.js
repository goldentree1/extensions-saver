import { GLib } from "./gjs";

export const VERSION = "0.1.0";
export const SAVE_DIR = GLib.build_filenamev([GLib.get_home_dir(), '.extension-saver']);
export const EXTENSIONS_DIR_SYS = "/usr/share/gnome-shell/extensions";
export const EXTENSIONS_DIR_USER = GLib.build_filenamev([GLib.get_home_dir(), ".local/share/gnome-shell/extensions"]);
