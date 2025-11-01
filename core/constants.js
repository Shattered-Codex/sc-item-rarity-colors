/**
 * Core Constants
 * Centralized constants used throughout the module
 */

export const MODULE_ID = "sc-item-rarity-colors";

// Default colors
export const DEFAULT_COLORS = {
  BACKGROUND_DEFAULT: "#252830", // Default background when no rarity is set
  BACKGROUND_FALLBACK: "#ffffff",
  TEXT_DEFAULT: "#000000",
  BORDER_SECONDARY_DEFAULT: "#000000",
};

// Rarity tiers
export const RARITY_TIERS = {
  COMMON: "common",
  UNCOMMON: "uncommon",
  RARE: "rare",
  VERY_RARE: "veryrare",
  LEGENDARY: "legendary",
  ARTIFACT: "artifact",
};

// Default intensity for glow effects
export const DEFAULT_GLOW_INTENSITY = 8;

// CSS selectors
export const SELECTORS = {
  ITEM_SHEET: ".application.sheet.item",
  MINISHEET: ".mini-item-sheet",
  INVENTORY_PREVIEW: ".inventory-preview-item",
  DND5E_ITEM: ".item",
  DND5E_ITEM_IMAGE: ".item-image.gold-icon",
  TIDY5E_ITEM_CONTAINER: ".items-section .items-list .item-list-container",
  TIDY5E_ITEM_ROW: ".item-table-row",
  TIDY5E_ITEM_IMAGE: ".item-image",
  ITEM_NAME: ".item-name",
  ITEM_TITLE: ".title",
  ITEM_SUBTITLE: ".subtitle",
  ITEM_DETAIL: ".item-detail",
};

