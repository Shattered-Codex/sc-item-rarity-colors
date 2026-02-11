import {
  RARITY_LIST_ENABLED_SETTING_KEY,
  RARITY_LIST_SETTING_KEY,
  buildRaritySettingObject,
  getMergedRarityEntries,
  humanizeRarityLabel,
  normalizeRarityKey,
} from "../core/rarityListConfig.js";

// Register settings for item rarity colors.
function registerColorSetting(moduleId, key, name, defaultValue) {
  if (game.settings.settings.has(`${moduleId}.${key}`)) return;
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
  if (game.settings.settings.has(`${moduleId}.${key}`)) return;
  game.settings.register(moduleId, key, {
    name,
    scope: "world",
    config: false,
    type: Boolean,
    default: defaultValue,
  });
}

// Register object settings.
function registerObjectSetting(moduleId, key, name, defaultValue) {
  if (game.settings.settings.has(`${moduleId}.${key}`)) return;
  game.settings.register(moduleId, key, {
    name,
    scope: "world",
    config: false,
    type: Object,
    default: defaultValue,
  });
}

// Register single settings for other module options.
function registerSingleSetting(moduleId, key, name, defaultValue) {
  if (game.settings.settings.has(`${moduleId}.${key}`)) return;
  game.settings.register(moduleId, key, {
    name,
    scope: "world",
    config: true,
    type: Boolean,
    default: defaultValue,
  });
}

function registerSupportCardSetting(moduleId) {
  const key = "supportCardDisabled";
  if (game.settings.settings.has(`${moduleId}.${key}`)) return;

  game.settings.register(moduleId, key, {
    name: "Support Chat Card - disable",
    hint: "If enabled, the support chat card will not show on startup.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
  });
}

function registerRaritySettings(moduleId, rarityKey, rarityLabel) {
  const key = normalizeRarityKey(rarityKey);
  if (!key) return;

  const title = rarityLabel || humanizeRarityLabel(key);

  registerColorSetting(moduleId, `${key}-item-color`, `${title} Item Color`, "#000000");
  registerBooleanSetting(moduleId, `${key}-enable-item-color`, `${title}: Enable Item Sheet Background Color`, false);
  registerColorSetting(moduleId, `${key}-text-color`, `${title} Item Sheet Text Color`, "#000000");
  registerBooleanSetting(moduleId, `${key}-enable-text-color`, `${title}: Enable Item Sheet Text Color`, false);
  registerBooleanSetting(moduleId, `${key}-enable-inventory-title-color`, `${title}: Enable Inventory Title/Subtitle Color`, false);
  registerColorSetting(moduleId, `${key}-inventory-title-color`, `${title}: Inventory Title/Subtitle Color`, "#000000");
  registerBooleanSetting(moduleId, `${key}-enable-inventory-details-color`, `${title}: Enable Inventory Details Text Color`, false);
  registerColorSetting(moduleId, `${key}-inventory-details-color`, `${title}: Inventory Details Text Color`, "#000000");
  registerBooleanSetting(moduleId, `${key}-enable-inventory-border-color`, `${title}: Enable Inventory Border Color`, false);
  registerColorSetting(moduleId, `${key}-inventory-border-color`, `${title}: Inventory Border Color`, "#ffffff");
  registerColorSetting(moduleId, `${key}-secondary-item-color`, `${title} Secondary Item Color`, "#ffffff");
  registerBooleanSetting(moduleId, `${key}-gradient-option`, `${title} Gradient Option`, false);
  registerBooleanSetting(moduleId, `${key}-glow-option`, `${title} Glow Option`, false);
  registerColorSetting(moduleId, `${key}-inventory-border-secondary-color`, `${title}: Inventory Border Secondary Color`, "#ffffff");
  registerBooleanSetting(moduleId, `${key}-enable-inventory-border-glow`, `${title}: Enable Inventory Border Glow`, false);
}

export function ensureRaritySettingsRegistered(moduleId, rarityKey, rarityLabel = null) {
  registerRaritySettings(moduleId, rarityKey, rarityLabel);
}

// Main function to register all module settings.
export function registerModuleSettings(MODULE_ID) {
  const mergedRarities = getMergedRarityEntries(MODULE_ID, { includeHidden: true });

  registerBooleanSetting(
    MODULE_ID,
    RARITY_LIST_ENABLED_SETTING_KEY,
    "Enable SC Item Rarity List Configuration",
    true
  );

  registerObjectSetting(
    MODULE_ID,
    RARITY_LIST_SETTING_KEY,
    "SC Item Rarity List Configuration",
    buildRaritySettingObject(mergedRarities)
  );

  for (const entry of mergedRarities) {
    registerRaritySettings(MODULE_ID, entry.key, entry.label);
  }

  registerSingleSetting(MODULE_ID, "enableActorInventoryGradientEffects", "Enable Inventory Items Gradient Effects", false);
  registerSingleSetting(MODULE_ID, "enableActorInventoryBorders", "Enable Inventory Items Coloured Borders", false);
  registerSupportCardSetting(MODULE_ID);
}
