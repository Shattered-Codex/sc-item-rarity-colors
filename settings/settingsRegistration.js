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

// Register single settings for other module options.
function registerSingleSetting(moduleId, key, name, defaultValue) {
  game.settings.register(moduleId, key, {
    name,
    scope: "world",
    config: true,
    type: Boolean,
    default: defaultValue,
  });
}

// Main function to register all module settings.
export function registerModuleSettings(MODULE_ID) {
  registerColorSetting(MODULE_ID, "common-item-color", "Common Item Color", "#000000");
  registerBooleanSetting(MODULE_ID, "common-enable-item-color", "Common: Enable Item Sheet Background Color", false);
  registerColorSetting(MODULE_ID, "common-text-color", "Common Item Sheet Text Color", "#000000");
  registerBooleanSetting(MODULE_ID, "common-enable-text-color", "Common: Enable Item Sheet Text Color", false);
  registerBooleanSetting(MODULE_ID, "common-enable-inventory-title-color", "Common: Enable Inventory Title/Subtitle Color", false);
  registerColorSetting(MODULE_ID, "common-inventory-title-color", "Common: Inventory Title/Subtitle Color", "#000000");
  registerBooleanSetting(MODULE_ID, "common-enable-inventory-details-color", "Common: Enable Inventory Details Text Color", false);
  registerColorSetting(MODULE_ID, "common-inventory-details-color", "Common: Inventory Details Text Color", "#000000");
  registerBooleanSetting(MODULE_ID, "common-enable-inventory-border-color", "Common: Enable Inventory Border Color", false);
  registerColorSetting(MODULE_ID, "common-inventory-border-color", "Common: Inventory Border Color", "#ffffff");
  registerColorSetting(MODULE_ID, "common-secondary-item-color", "Common Secondary Item Color", "#ffffff");
  registerBooleanSetting(MODULE_ID, "common-gradient-option", "Common Gradient Option", false);
  registerBooleanSetting(MODULE_ID, "common-glow-option", "Common Glow Option", false);
  registerColorSetting(MODULE_ID, "common-inventory-border-secondary-color", "Common: Inventory Border Secondary Color", "#ffffff");
  registerBooleanSetting(MODULE_ID, "common-enable-inventory-border-glow", "Common: Enable Inventory Border Glow", false);
  
  registerColorSetting(MODULE_ID, "uncommon-item-color", "Uncommon Item Color", "#000000");
  registerBooleanSetting(MODULE_ID, "uncommon-enable-item-color", "Uncommon: Enable Item Sheet Background Color", false);
  registerColorSetting(MODULE_ID, "uncommon-text-color", "Uncommon Item Sheet Text Color", "#000000");
  registerBooleanSetting(MODULE_ID, "uncommon-enable-text-color", "Uncommon: Enable Item Sheet Text Color", false);
  registerBooleanSetting(MODULE_ID, "uncommon-enable-inventory-title-color", "Uncommon: Enable Inventory Title/Subtitle Color", false);
  registerColorSetting(MODULE_ID, "uncommon-inventory-title-color", "Uncommon: Inventory Title/Subtitle Color", "#000000");
  registerBooleanSetting(MODULE_ID, "uncommon-enable-inventory-details-color", "Uncommon: Enable Inventory Details Text Color", false);
  registerColorSetting(MODULE_ID, "uncommon-inventory-details-color", "Uncommon: Inventory Details Text Color", "#000000");
  registerBooleanSetting(MODULE_ID, "uncommon-enable-inventory-border-color", "Uncommon: Enable Inventory Border Color", false);
  registerColorSetting(MODULE_ID, "uncommon-inventory-border-color", "Uncommon: Inventory Border Color", "#ffffff");
  registerColorSetting(MODULE_ID, "uncommon-secondary-item-color", "Uncommon Secondary Item Color", "#ffffff");
  registerBooleanSetting(MODULE_ID, "uncommon-gradient-option", "Uncommon Gradient Option", false);
  registerBooleanSetting(MODULE_ID, "uncommon-glow-option", "Uncommon Glow Option", false);
  registerColorSetting(MODULE_ID, "uncommon-inventory-border-secondary-color", "Uncommon: Inventory Border Secondary Color", "#ffffff");
  registerBooleanSetting(MODULE_ID, "uncommon-enable-inventory-border-glow", "Uncommon: Enable Inventory Border Glow", false);
  
  registerColorSetting(MODULE_ID, "rare-item-color", "Rare Item Color", "#000000");
  registerBooleanSetting(MODULE_ID, "rare-enable-item-color", "Rare: Enable Item Sheet Background Color", false);
  registerColorSetting(MODULE_ID, "rare-text-color", "Rare Item Sheet Text Color", "#000000");
  registerBooleanSetting(MODULE_ID, "rare-enable-text-color", "Rare: Enable Item Sheet Text Color", false);
  registerBooleanSetting(MODULE_ID, "rare-enable-inventory-title-color", "Rare: Enable Inventory Title/Subtitle Color", false);
  registerColorSetting(MODULE_ID, "rare-inventory-title-color", "Rare: Inventory Title/Subtitle Color", "#000000");
  registerBooleanSetting(MODULE_ID, "rare-enable-inventory-details-color", "Rare: Enable Inventory Details Text Color", false);
  registerColorSetting(MODULE_ID, "rare-inventory-details-color", "Rare: Inventory Details Text Color", "#000000");
  registerBooleanSetting(MODULE_ID, "rare-enable-inventory-border-color", "Rare: Enable Inventory Border Color", false);
  registerColorSetting(MODULE_ID, "rare-inventory-border-color", "Rare: Inventory Border Color", "#ffffff");
  registerColorSetting(MODULE_ID, "rare-secondary-item-color", "Rare Secondary Item Color", "#ffffff");
  registerBooleanSetting(MODULE_ID, "rare-gradient-option", "Rare Gradient Option", false);
  registerBooleanSetting(MODULE_ID, "rare-glow-option", "Rare Glow Option", false);
  registerColorSetting(MODULE_ID, "rare-inventory-border-secondary-color", "Rare: Inventory Border Secondary Color", "#ffffff");
  registerBooleanSetting(MODULE_ID, "rare-enable-inventory-border-glow", "Rare: Enable Inventory Border Glow", false);

  registerColorSetting(MODULE_ID, "veryrare-item-color", "Very Rare Item Color", "#000000");
  registerBooleanSetting(MODULE_ID, "veryrare-enable-item-color", "Very Rare: Enable Item Sheet Background Color", false);
  registerColorSetting(MODULE_ID, "veryrare-text-color", "Very Rare Item Sheet Text Color", "#000000");
  registerBooleanSetting(MODULE_ID, "veryrare-enable-text-color", "Very Rare: Enable Item Sheet Text Color", false);
  registerColorSetting(MODULE_ID, "veryrare-secondary-item-color", "Very Rare Secondary Item Color", "#ffffff");
  registerBooleanSetting(MODULE_ID, "veryrare-gradient-option", "Very Rare Gradient Option", false);
  registerBooleanSetting(MODULE_ID, "veryrare-glow-option", "Very Rare Glow Option", false);
  registerBooleanSetting(MODULE_ID, "veryrare-enable-inventory-title-color", "Very Rare: Enable Inventory Title/Subtitle Color", false);
  registerColorSetting(MODULE_ID, "veryrare-inventory-title-color", "Very Rare: Inventory Title/Subtitle Color", "#000000");
  registerBooleanSetting(MODULE_ID, "veryrare-enable-inventory-details-color", "Very Rare: Enable Inventory Details Text Color", false);
  registerColorSetting(MODULE_ID, "veryrare-inventory-details-color", "Very Rare: Inventory Details Text Color", "#000000");
  registerBooleanSetting(MODULE_ID, "veryrare-enable-inventory-border-color", "Very Rare: Enable Inventory Border Color", false);
  registerColorSetting(MODULE_ID, "veryrare-inventory-border-color", "Very Rare: Inventory Border Color", "#ffffff");
  registerColorSetting(MODULE_ID, "veryrare-inventory-border-secondary-color", "Very Rare: Inventory Border Secondary Color", "#ffffff");
  registerBooleanSetting(MODULE_ID, "veryrare-enable-inventory-border-glow", "Very Rare: Enable Inventory Border Glow", false);

  registerColorSetting(MODULE_ID, "legendary-item-color", "Legendary Item Color", "#000000");
  registerBooleanSetting(MODULE_ID, "legendary-enable-item-color", "Legendary: Enable Item Sheet Background Color", false);
  registerColorSetting(MODULE_ID, "legendary-text-color", "Legendary Item Sheet Text Color", "#000000");
  registerBooleanSetting(MODULE_ID, "legendary-enable-text-color", "Legendary: Enable Item Sheet Text Color", false);
  registerColorSetting(MODULE_ID, "legendary-secondary-item-color", "Legendary Secondary Item Color", "#ffffff");
  registerBooleanSetting(MODULE_ID, "legendary-gradient-option", "Legendary Gradient Option", false);
  registerBooleanSetting(MODULE_ID, "legendary-glow-option", "Legendary Glow Option", false);
  registerBooleanSetting(MODULE_ID, "legendary-enable-inventory-title-color", "Legendary: Enable Inventory Title/Subtitle Color", false);
  registerColorSetting(MODULE_ID, "legendary-inventory-title-color", "Legendary: Inventory Title/Subtitle Color", "#000000");
  registerBooleanSetting(MODULE_ID, "legendary-enable-inventory-details-color", "Legendary: Enable Inventory Details Text Color", false);
  registerColorSetting(MODULE_ID, "legendary-inventory-details-color", "Legendary: Inventory Details Text Color", "#000000");
  registerBooleanSetting(MODULE_ID, "legendary-enable-inventory-border-color", "Legendary: Enable Inventory Border Color", false);
  registerColorSetting(MODULE_ID, "legendary-inventory-border-color", "Legendary: Inventory Border Color", "#ffffff");
  registerColorSetting(MODULE_ID, "legendary-inventory-border-secondary-color", "Legendary: Inventory Border Secondary Color", "#ffffff");
  registerBooleanSetting(MODULE_ID, "legendary-enable-inventory-border-glow", "Legendary: Enable Inventory Border Glow", false);

  registerColorSetting(MODULE_ID, "artifact-item-color", "Artifact Item Color", "#000000");
  registerBooleanSetting(MODULE_ID, "artifact-enable-item-color", "Artifact: Enable Item Sheet Background Color", false);
  registerColorSetting(MODULE_ID, "artifact-text-color", "Artifact Item Sheet Text Color", "#000000");
  registerBooleanSetting(MODULE_ID, "artifact-enable-text-color", "Artifact: Enable Item Sheet Text Color", false);
  registerColorSetting(MODULE_ID, "artifact-secondary-item-color", "Artifact Secondary Item Color", "#ffffff");
  registerBooleanSetting(MODULE_ID, "artifact-gradient-option", "Artifact Gradient Option", false);
  registerBooleanSetting(MODULE_ID, "artifact-glow-option", "Artifact Glow Option", false);
  registerBooleanSetting(MODULE_ID, "artifact-enable-inventory-title-color", "Artifact: Enable Inventory Title/Subtitle Color", false);
  registerColorSetting(MODULE_ID, "artifact-inventory-title-color", "Artifact: Inventory Title/Subtitle Color", "#000000");
  registerBooleanSetting(MODULE_ID, "artifact-enable-inventory-details-color", "Artifact: Enable Inventory Details Text Color", false);
  registerColorSetting(MODULE_ID, "artifact-inventory-details-color", "Artifact: Inventory Details Text Color", "#000000");
  registerBooleanSetting(MODULE_ID, "artifact-enable-inventory-border-color", "Artifact: Enable Inventory Border Color", false);
  registerColorSetting(MODULE_ID, "artifact-inventory-border-color", "Artifact: Inventory Border Color", "#ffffff");
  registerColorSetting(MODULE_ID, "artifact-inventory-border-secondary-color", "Artifact: Inventory Border Secondary Color", "#ffffff");
  registerBooleanSetting(MODULE_ID, "artifact-enable-inventory-border-glow", "Artifact: Enable Inventory Border Glow", false);

  registerSingleSetting(MODULE_ID, "enableActorInventoryGradientEffects", "Enable Inventory Items Gradient Effects", false);
  registerSingleSetting(MODULE_ID, "enableActorInventoryBorders", "Enable Inventory Items Coloured Borders", false);
}

