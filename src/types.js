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

/**
 * Type defs for the JSON save files created by this script.
 * These will store all extensions used and the preferences set for them.
 * 
 * @typedef SaveFileGnomeExtensionData2
 * @property {string} version Version of the extension
 * @property {string} uuid Extension UUID (e.g., "blur-my-shell@aunetx")
 * @property {boolean} hasDconf 
 * @property {string} dconfPath Dconf schema path (e.g., "/org/gnome/shell/extensions/blur-my-shell/")
 * @property {string} dconfDump Dconf dump/gs of the extension's preferences
 * We may need to use gsettings instead of dconf for some extensions:
 * @property {string} gsettingsSchema
 * @property {string} gsettingsDump
 * 
 * @typedef SaveFile2
 * @property {string|null} gnomeShellVersion GNOME Shell version the save was created on
 * @property {SaveFileGnomeExtensionData[]} extensions
 */