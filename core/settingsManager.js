/**
 * Settings Manager
 * Centralized utility for reading and managing module settings
 */

import { MODULE_ID } from "./constants.js";
import { raritySupportsGradient, raritySupportsGlow, raritySupportsBorderGradient, raritySupportsBorderGlow } from "./rarityConfig.js";
import { normalizeRarityKey } from "./rarityListConfig.js";
import { readEffectSettings } from "./effectSettingFields.js";
import { UNIDENTIFIED_STYLE_KEY } from "./unidentifiedStyle.js";
import { readConcealSettings } from "./unidentifiedImageConfig.js";

const _raritySettingsCache = new Map();

export function invalidateRaritySettingsCache() {
  _raritySettingsCache.clear();
}

/**
 * Check if a setting exists in the game settings
 * @param {string} moduleId - Module ID
 * @param {string} key - Setting key
 * @returns {boolean}
 */
export function settingExists(moduleId, key) {
  return game.settings.settings.has(`${moduleId}.${key}`);
}

/**
 * Get a setting value with a default fallback
 * @param {string} moduleId - Module ID
 * @param {string} key - Setting key
 * @param {*} defaultValue - Default value if setting doesn't exist
 * @returns {*}
 */
export function getSetting(moduleId, key, defaultValue = null) {
  if (!settingExists(moduleId, key)) {
    return defaultValue;
  }
  return game.settings.get(moduleId, key);
}

/**
 * Get a rarity-specific setting
 * @param {string} moduleId - Module ID
 * @param {string} rarity - Rarity tier
 * @param {string} settingKey - Setting key suffix (e.g., 'item-color', 'text-color')
 * @param {*} defaultValue - Default value
 * @returns {*}
 */
export function getRaritySetting(moduleId, rarity, settingKey, defaultValue = null) {
  const normalized = normalizeRarityKey(rarity);
  const raw = rarity !== undefined && rarity !== null ? String(rarity).trim() : "";

  const seen = new Set();
  const candidates = [];
  for (const v of [normalized, raw, raw.toLowerCase()]) {
    if (typeof v === "string" && v && !seen.has(v)) {
      seen.add(v);
      candidates.push(v);
    }
  }

  for (const candidate of candidates) {
    const key = `${candidate}-${settingKey}`;
    if (settingExists(moduleId, key)) {
      return game.settings.get(moduleId, key);
    }
  }

  return defaultValue;
}

/**
 * Build rarity settings object for a given rarity
 * @param {string} rarity - Normalized rarity value
 * @returns {object} Complete settings object
 */
export function buildRaritySettings(rarity) {
  const cacheKey = normalizeRarityKey(rarity) ?? String(rarity ?? "");
  if (_raritySettingsCache.has(cacheKey)) {
    return _raritySettingsCache.get(cacheKey);
  }

  const settings = {
    // Item Sheet Background
    enableItemColor: getRaritySetting(MODULE_ID, rarity, "enable-item-color", false),
    backgroundColor: getRaritySetting(MODULE_ID, rarity, "item-color", "#000000"),
    
    // Item Sheet Text
    enableTextColor: getRaritySetting(MODULE_ID, rarity, "enable-text-color", false),
    itemSheetTextColor: getRaritySetting(MODULE_ID, rarity, "text-color", "#000000"),
    
    // Gradient
    gradientEnabled: raritySupportsGradient(rarity)
      ? getRaritySetting(MODULE_ID, rarity, "gradient-option", false)
      : false,
    gradientColor: raritySupportsGradient(rarity)
      ? getRaritySetting(MODULE_ID, rarity, "secondary-item-color", "#ffffff")
      : "#ffffff",
    
    // Glow
    glowEnabled: raritySupportsGlow(rarity)
      ? getRaritySetting(MODULE_ID, rarity, "glow-option", false)
      : false,

    // Gold accent (dnd5e / Tidy 5e gold details)
    enableGoldAccentColor: getRaritySetting(MODULE_ID, rarity, "enable-gold-accent-color", false),
    goldAccentColor: getRaritySetting(MODULE_ID, rarity, "gold-accent-color", "#9f9275"),

    // Table header bars on the item sheet
    enableTableHeaderColor: getRaritySetting(MODULE_ID, rarity, "enable-table-header-color", false),
    tableHeaderColor: getRaritySetting(MODULE_ID, rarity, "table-header-color", "#491d25"),
    enableTableHeaderTextColor: getRaritySetting(MODULE_ID, rarity, "enable-table-header-text-color", false),
    tableHeaderTextColor: getRaritySetting(MODULE_ID, rarity, "table-header-text-color", "#ffffff"),

    // Animated effects (Effects tab)
    ...readEffectSettings((fieldKey, field) => getRaritySetting(MODULE_ID, rarity, fieldKey, field.defaultValue ?? null)),

    // Where the background goes on Tidy 5e sheets: content, sidebar, or sheet.
    tidyBackgroundArea: getRaritySetting(MODULE_ID, rarity, "tidy-background-area", "content"),

    // Inventory Effects
    enableInventoryGradientEffects: getRaritySetting(MODULE_ID, rarity, "enable-inventory-gradient-effects", false),
    enableInventoryBorders: getRaritySetting(MODULE_ID, rarity, "enable-inventory-borders", false),

    // Foundry Interface Item Directory Effects
    enableFoundryInterfaceGradientEffects: getRaritySetting(MODULE_ID, rarity, "enable-foundry-interface-gradient-effects", false),
    enableFoundryInterfaceTextColor: getRaritySetting(MODULE_ID, rarity, "enable-foundry-interface-text-color", false),
    foundryInterfaceTextColor: getRaritySetting(MODULE_ID, rarity, "foundry-interface-text-color", "#000000"),
    
    // Inventory Title Color
    enableInventoryTitleColor: getRaritySetting(MODULE_ID, rarity, "enable-inventory-title-color", false),
    inventoryTitleColor: getRaritySetting(MODULE_ID, rarity, "inventory-title-color", "#000000"),
    
    // Inventory Details Color
    enableInventoryDetailsColor: getRaritySetting(MODULE_ID, rarity, "enable-inventory-details-color", false),
    inventoryDetailsColor: getRaritySetting(MODULE_ID, rarity, "inventory-details-color", "#000000"),
    
    // Inventory Border Color
    enableInventoryBorderColor: getRaritySetting(MODULE_ID, rarity, "enable-inventory-border-color", false),
    inventoryBorderColor: getRaritySetting(MODULE_ID, rarity, "inventory-border-color", "#ffffff"),
  };

  // Border Secondary Color
  if (raritySupportsBorderGradient(rarity)) {
    settings.inventoryBorderSecondaryColor = getRaritySetting(
      MODULE_ID,
      rarity,
      "inventory-border-secondary-color",
      "#ffffff"
    );
  } else {
    settings.inventoryBorderSecondaryColor = undefined;
  }

  // Border Glow
  if (raritySupportsBorderGlow(rarity)) {
    settings.enableInventoryBorderGlow = getRaritySetting(
      MODULE_ID,
      rarity,
      "enable-inventory-border-glow",
      false
    );
  } else {
    settings.enableInventoryBorderGlow = false;
  }

  // How unidentified items hide their image (Image tab).
  if (cacheKey === UNIDENTIFIED_STYLE_KEY) {
    settings.conceal = readConcealSettings((fieldKey, defaultValue) => getRaritySetting(MODULE_ID, rarity, fieldKey, defaultValue));
  }

  _raritySettingsCache.set(cacheKey, settings);
  return settings;
}
