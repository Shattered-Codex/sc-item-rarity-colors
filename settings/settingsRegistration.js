import {
  getFallbackRarityEntries,
  RARITY_LIST_ENABLED_SETTING_KEY,
  RARITY_LIST_SETTING_KEY,
  buildRaritySettingObject,
  getMergedRarityEntries,
  humanizeRarityLabel,
  normalizeRarityKey,
} from "../core/rarityListConfig.js";
import { DEBUG_LOGS_SETTING_KEY } from "../core/debug.js";
import { buildRarityFieldSettingName, getRarityFieldDefinitions } from "../core/rarityFieldSchema.js";

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

function registerDebugSetting(moduleId) {
  const key = DEBUG_LOGS_SETTING_KEY;
  if (game.settings.settings.has(`${moduleId}.${key}`)) return;

  game.settings.register(moduleId, key, {
    name: "Enable Debug Logs",
    hint: "Log rarity color flow details in the browser console for troubleshooting.",
    scope: "client",
    config: true,
    type: Boolean,
    default: false,
  });
}

function registerRaritySettings(moduleId, rarityKey, rarityLabel) {
  const key = normalizeRarityKey(rarityKey);
  if (!key) return;

  const title = rarityLabel || humanizeRarityLabel(key);

  for (const field of getRarityFieldDefinitions(key)) {
    const settingKey = `${key}-${field.key}`;
    const settingName = buildRarityFieldSettingName(title, field);

    if (field.type === "checkbox") {
      registerBooleanSetting(moduleId, settingKey, settingName, Boolean(field.defaultValue));
      continue;
    }

    if (field.type === "color") {
      registerColorSetting(moduleId, settingKey, settingName, String(field.defaultValue || "#000000"));
      continue;
    }
  }
}

export function ensureRaritySettingsRegistered(moduleId, rarityKey, rarityLabel = null) {
  registerRaritySettings(moduleId, rarityKey, rarityLabel);
}

// Main function to register all module settings.
export function registerModuleSettings(MODULE_ID) {
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
    buildRaritySettingObject(getFallbackRarityEntries())
  );

  // Compute merged rarities after base list settings are registered,
  // so persisted custom entries are available on reload.
  let mergedRarities = [];
  try {
    mergedRarities = getMergedRarityEntries(MODULE_ID, { includeHidden: true });
  } catch (error) {
    console.error(`${MODULE_ID} | Failed to load merged rarity entries during init. Falling back to defaults.`, error);
    mergedRarities = getFallbackRarityEntries();
  }

  for (const entry of mergedRarities) {
    registerRaritySettings(MODULE_ID, entry.key, entry.label);
  }

  registerSupportCardSetting(MODULE_ID);
  registerDebugSetting(MODULE_ID);
}
