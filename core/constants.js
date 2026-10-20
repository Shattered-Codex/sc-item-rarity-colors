/**
 * Core Constants
 * Centralized constants used throughout the module
 */

export const MODULE_ID = "sc-item-rarity-colors";

// Class carrying a rarity's runtime CSS (see core/runtimeRarityStyles.js).
export const RARITY_CLASS_PREFIX = "scirc-rarity-";
// Element drawn over an unidentified item's image (core/unidentifiedImageConceal.js);
// it sits right before the image, like the icon effects (core/itemEffects.js).
export const IMAGE_COVER_CLASS = "scirc-conceal";
export const SUPPORT_CARD_HIDE_SETTING_KEY = "hideSupportCardUntilNextUpdate";
export const SUPPORT_CARD_VERSION_SETTING_KEY = "supportCardAcknowledgedVersion";
export const DOCS_URL = "https://wiki.shattered-codex.com/modules/sc-item-rarity-colors";
export const PATREON_URL = "https://www.patreon.com/c/shatteredcodex";
export const DISCORD_URL = "https://discord.gg/6mWCQEJEwG";

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
  VERY_RARE: "veryRare",
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
  // Tidy 5e 13+: `.tidy-table-row-container` on the default sheets,
  // `.item-table-row-container` on classic ones. The last selector covers
  // releases from before Tidy 13.
  TIDY5E_ITEM_CONTAINER: [
    ".tidy-table-row-container[data-item-id]",
    ".item-table-row-container[data-item-id]",
    ".items-section .items-list .item-list-container",
  ].join(", "),
  TIDY5E_ITEM_ROW: ".tidy-table-row, .item-table-row",
  TIDY5E_ITEM_IMAGE: ".item-image",
  ITEM_NAME: ".item-name",
  ITEM_TITLE: ".title",
  ITEM_SUBTITLE: ".subtitle",
  ITEM_DETAIL: ".item-detail",
};
