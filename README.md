# Extensions Saver
Load/save an entire set of GNOME extensions and their preferences with a single command.

## Example Usage
```bash
    extensions-saver save original
    # Make some crazy changes to your extensions! (add extensions, change extension preferences, etc.)
    extension-saver save my-crazy-desktop # save your new desktop
    extension-saver load original # Revert back to your original desktop!
```

### IMPORTANT:
The script may not always load all of the saved preferences because extension authors may choose to put preferences in unconventional places which we have not accounted for. For example, the panel position (e.g., 'top', 'bottom') for Dash To Panel is not altered and must be manually changed in extension preferences.

## Installation
Download the [extension-saver](./extension-saver) script and save it in a user bin directory like ~/.local/bin

## Commands

### `list`  
  List all saved saves.

### `load <name>`  
  Load extensions and their settings from the save `name`.

### `save <name>`  
  Save the current extensions and their settings to `name`. Use `-o` or `--overwrite` flags to overwrite the save if it already exists.

### `remove <name>`  
  Remove the save `name`.

### `info <name>`  
  Show information about the save `name`. Use `-v` or `--verbose` flags to include preferences.

### `help`
  Show help message.

### `version`  
  Show version.
