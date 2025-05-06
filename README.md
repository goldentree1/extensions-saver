# Extensions Saver
Load/save an entire set of GNOME extensions with a single command.

## Example Usage
```bash
    extensions-saver save original
    # Make some crazy changes to your extensions! (add, change preferences, etc.)
    extension-saver save my-crazy-desktop
    extension-saver load original # Revert back to your original desktop
```

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


## Problems

- ### How to handle system extensions?
  System extensions are annoying, because they cant be downloaded from the GNOME extensions website. However, they should be able to be sourced from somewhere, so perhaps keeping this program updated with where to get them would work for installation. If we did this, would also likely need to save the user's current distro. 

  In meantime, we can just keep record of user's sys extensions, and re-enable them if they go back to that setting so we don't annoy them.

- ### Some dash-to-panel settings are not saved
  When saving dash-to-panel on the top/bottom, it does not load between saves (i.e., once save at bottom, always remains theres despite loading saves that have it in a different position). This suggests that the settings are stored somewhere else. `gsettings` is able to be used for storage for extensions as well - the data may be stored there, or somewhere else that dash-to-panel personally chose.... fuck.

  #### FIXES:
  1. If they exist, change gsettings settings as well as the dconf ones?
  2. We... may... have to ... add rules for each popular extension like dash-to-panel :'(