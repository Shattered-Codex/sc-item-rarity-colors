// Register settings for item rarity colors.
function registerColorSetting(moduleId, key, name, defaultValue) {
  game.settings.register(moduleId, key, {
    name,
    scope: "world",
    config: false,
    type: String,
    default: defaultValue,
  });
}

// Register boolean settings for item rarity options.
function registerBooleanSetting(moduleId, key, name, defaultValue) {
  game.settings.register(moduleId, key, {
    name,
    scope: "world",
    config: false,
    type: Boolean,
    default: defaultValue,
  });
}

// Main function to register all module settings.
export function registerModuleSettings(MODULE_ID) {
  registerColorSetting(MODULE_ID, "common-item-color", "Common Item Color", "#ffffff");
  registerColorSetting(MODULE_ID, "uncommon-item-color", "Uncommon Item Color", "#00ff00");
  registerColorSetting(MODULE_ID, "rare-item-color", "Rare Item Color", "#0000ff");

  registerColorSetting(MODULE_ID, "very-rare-item-color", "Very Rare Item Color", "#ff00ff");
  registerColorSetting(MODULE_ID, "very-rare-secondary-item-color", "Very Rare Secondary Item Color", "#000000");
  registerBooleanSetting(MODULE_ID, "very-rare-gradient-option", "Very Rare Gradient Option", false);

  registerColorSetting(MODULE_ID, "legendary-item-color", "Legendary Item Color", "#ffff00");
  registerColorSetting(MODULE_ID, "legendary-secondary-item-color", "Legendary Secondary Item Color", "#000000");
  registerBooleanSetting(MODULE_ID, "legendary-gradient-option", "Legendary Gradient Option", false);

  registerColorSetting(MODULE_ID, "artifact-item-color", "Artifact Item Color", "#ff7b00");
  registerColorSetting(MODULE_ID, "artifact-secondary-item-color", "Artifact Secondary Item Color", "#000000");
  registerBooleanSetting(MODULE_ID, "artifact-gradient-option", "Artifact Gradient Option", false);
  registerBooleanSetting(MODULE_ID, "artifact-glow-option", "Artifact Glow Option", false);
}
