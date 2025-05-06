/**
 * Type defs for the JSON save files created by this script.
 * These will store all extensions used and the preferences set for them.
 * 
 * @typedef SaveFileGnomeExtensionData
 * @property {string} version Version of the extension
 * @property {string} uuid Extension UUID (e.g., "blur-my-shell@aunetx")
 * @property {string} dconfPath Dconf schema path (e.g., "/org/gnome/shell/extensions/blur-my-shell/")
 * @property {string} prefs Dconf dump of the extension's preferences
 * 
 * @typedef SaveFile
 * @property {string|null} gnomeShellVersion GNOME Shell version the save was created on
 * @property {SaveFileGnomeExtensionData[]} extensions
 * 
 * Type def for parsed CLI arguments
 * 
 * @typedef ParsedArgv
 * @property {string|null} cmd Command to run
 * @property {string[]} args Arguments to the command
 * @property {string[]} flags Flags to the command
 */
