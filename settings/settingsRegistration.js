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
import { getDefaultSpellSchoolStylesSetting, SPELL_SCHOOL_STYLES_SETTING_KEY } from "../core/spellSchoolConfig.js";
import { SUPPORT_CARD_HIDE_SETTING_KEY, SUPPORT_CARD_VERSION_SETTING_KEY } from "../core/constants.js";

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

function registerSupportCardSettings(moduleId) {
  if (!game.settings.settings.has(`${moduleId}.${SUPPORT_CARD_HIDE_SETTING_KEY}`)) {
    game.settings.register(moduleId, SUPPORT_CARD_HIDE_SETTING_KEY, {
      name: "Hide automatic support message until next update",
      hint: "After the support card appears once for the current version, this option is checked automatically. Uncheck it if you want the card to appear whenever the world loads.",
      scope: "client",
      config: true,
      type: Boolean,
      default: false,
    });
  }

  if (!game.settings.settings.has(`${moduleId}.${SUPPORT_CARD_VERSION_SETTING_KEY}`)) {
    game.settings.register(moduleId, SUPPORT_CARD_VERSION_SETTING_KEY, {
      scope: "client",
      config: false,
      type: String,
      default: "",
    });
  }
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

  registerObjectSetting(
    MODULE_ID,
    SPELL_SCHOOL_STYLES_SETTING_KEY,
    "Spell School Style Configuration",
    getDefaultSpellSchoolStylesSetting()
  );

  registerDebugSetting(MODULE_ID);
  registerSupportCardSettings(MODULE_ID);
}
