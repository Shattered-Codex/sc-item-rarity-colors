import {
  getFallbackRarityEntries,
  RARITY_LIST_ENABLED_SETTING_KEY,
  RARITY_LIST_SETTING_KEY,
  buildRaritySettingObject,
  getMergedRarityEntries,
  humanizeRarityLabel,
  normalizeRarityKey,
} from "../core/rarityListConfig.js";
import { buildRarityFieldSettingName, getRarityFieldDefinitions } from "../core/rarityFieldSchema.js";
import { getDefaultSpellSchoolStylesSetting, SPELL_SCHOOL_STYLES_SETTING_KEY } from "../core/spellSchoolConfig.js";
import { SUPPORT_CARD_VERSION_SETTING_KEY } from "../core/constants.js";
import { ModuleSettingsCatalog } from "./ModuleSettingsCatalog.js";

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

// Options shown in the module settings window are registered from its catalog,
// so the registration and the window cannot drift apart.
function registerCatalogSettings(moduleId) {
  for (const field of ModuleSettingsCatalog.fields()) {
    if (game.settings.settings.has(`${moduleId}.${field.key}`)) continue;
    game.settings.register(moduleId, field.key, ModuleSettingsCatalog.registration(field));
  }
}

function registerSupportCardVersionSetting(moduleId) {
  if (game.settings.settings.has(`${moduleId}.${SUPPORT_CARD_VERSION_SETTING_KEY}`)) return;
  game.settings.register(moduleId, SUPPORT_CARD_VERSION_SETTING_KEY, {
    scope: "client",
    config: false,
    type: String,
    default: "",
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

    if (field.type === "select") {
      // Stored as a plain string, like colors.
      registerColorSetting(moduleId, settingKey, settingName, String(field.defaultValue ?? ""));
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

  registerCatalogSettings(MODULE_ID);
  registerSupportCardVersionSetting(MODULE_ID);
}
