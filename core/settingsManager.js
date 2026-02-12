/**
 * Settings Manager
 * Centralized utility for reading and managing module settings
 */

import { MODULE_ID } from "./constants.js";
import { raritySupportsGradient, raritySupportsGlow, raritySupportsBorderGradient, raritySupportsBorderGlow } from "./rarityConfig.js";

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
  return getSetting(moduleId, `${rarity}-${settingKey}`, defaultValue);
}

/**
 * Get main menu setting
 * @param {string} key - Setting key (without module prefix)
 * @returns {*}
 */
export function getMainMenuSetting(key) {
  return getSetting(MODULE_ID, key, false);
}

/**
 * Check if main menu gradient effects are enabled
 * @returns {boolean}
 */
export function isGradientEffectsEnabled() {
  return getMainMenuSetting("enableActorInventoryGradientEffects");
}

/**
 * Check if main menu borders are enabled
 * @returns {boolean}
 */
export function isBordersEnabled() {
  return getMainMenuSetting("enableActorInventoryBorders");
}

/**
 * Build rarity settings object for a given rarity
 * @param {string} rarity - Normalized rarity value
 * @returns {object} Complete settings object
 */
export function buildRaritySettings(rarity) {
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

  return settings;
}
