import { normalizeRarityKey } from "../core/rarityListConfig.js";
import { shouldUseUnidentifiedStyle, UNIDENTIFIED_STYLE_KEY } from "../core/unidentifiedStyle.js";
import { applySheetEffects, clearSheetEffects, resolveEffectColor } from "../core/itemEffects.js";
import { getItemSheetTextStyleStrategyForElement } from "../sheets/itemSheetTextStrategies.js";
import { applyRarityClass, clearRarityClasses } from "../core/runtimeRarityStyles.js";

const SHEET_GLOW_CLASS = "scirc-glow";
const SHEET_BG_CLASS = "scirc-item-sheet-bg-enabled";
const SHEET_BG_GRADIENT_CLASS = "scirc-item-sheet-bg-gradient-enabled";
// Tidy 5e only: the background colors also (or only) paint the sidebar.
const SHEET_TIDY_SIDEBAR_BG_CLASS = "scirc-tidy-sidebar-bg";
const SHEET_TEXT_COLOR_VAR = "--scirc-item-sheet-text-color";
// Optional single-color accents: each toggles a class whose CSS re-points the
// system/Tidy variables at the accent variable (see item sheet strategy CSS).
const SHEET_ACCENTS = Object.freeze([
  Object.freeze({
    enabledKey: "enableGoldAccentColor",
    colorKey: "goldAccentColor",
    className: "scirc-item-sheet-gold-enabled",
    variable: "--scirc-item-sheet-gold",
  }),
  Object.freeze({
    enabledKey: "enableTableHeaderColor",
    colorKey: "tableHeaderColor",
    className: "scirc-item-sheet-table-header-enabled",
    variable: "--scirc-item-sheet-table-header",
  }),
  Object.freeze({
    enabledKey: "enableTableHeaderTextColor",
    colorKey: "tableHeaderTextColor",
    className: "scirc-item-sheet-table-header-text-enabled",
    variable: "--scirc-item-sheet-table-header-text",
  }),
]);
const SHEET_BG_PRIMARY_VAR = "--scirc-item-sheet-bg-primary";
const SHEET_BG_SECONDARY_VAR = "--scirc-item-sheet-bg-secondary";

function clearSheetBackgroundState($element) {
  $element.removeClass(SHEET_BG_CLASS);
  $element.removeClass(SHEET_TIDY_SIDEBAR_BG_CLASS);
  $element.removeClass(SHEET_BG_GRADIENT_CLASS);
  $element.css(SHEET_BG_PRIMARY_VAR, "");
  $element.css(SHEET_BG_SECONDARY_VAR, "");
}

/**
 * Extract raw rarity from supported item schema variants.
 *
 * @param {object} item - Item document or plain item-like object.
 * @returns {*}
 */
export function extractRawItemRarity(item) {
  return item?.system?.rarity?.value
    ?? item?.system?.rarity
    ?? firstRarity(item?.system?.rarities)
    ?? item?.system?.details?.rarity
    ?? item?.rarity
    ?? null;
}

/**
 * D&D 5e 6.0 stores a set of rarities (`system.rarities`) instead of one
 * string. On documents `system.rarity` still returns its first (lowest)
 * entry, but raw data such as a compendium index only has the set, as an
 * array; this reads the same first entry from either form.
 */
function firstRarity(rarities) {
  if (Array.isArray(rarities)) return rarities[0] ?? null;
  if (rarities instanceof Set) return rarities.values().next().value ?? null;
  return null;
}

/**
 * Get normalized rarity directly from an item object.
 *
 * @param {object} item - Item document or plain item-like object.
 * @returns {string|null}
 */
export function getItemRarity(item) {
  return normalizeRarityKey(extractRawItemRarity(item));
}

/**
 * The rarity whose style this user should see on `item`: the unidentified
 * style when the item is unidentified for them (see Module Settings), else
 * the item's own rarity.
 *
 * @param {object} item - Item document or plain item-like object.
 * @returns {string|null}
 */
export function getDisplayRarity(item) {
  if (shouldUseUnidentifiedStyle(item)) return UNIDENTIFIED_STYLE_KEY;
  return getItemRarity(item);
}

/**
 * Apply rarity styles (background, gradient, glow, and text color) to an HTML element.
 *
 * @param {HTMLElement|JQuery} element - Target element or jQuery wrapper.
 * @param {object} settings - Rarity visual configuration.
 * @param {object} [options] - Optional overrides.
 * @param {object} [options.textStyleStrategy] - Pre-resolved item sheet text strategy.
 */
export function applyRarityStyles(element, settings, options = {}) {
  if (!element) return;

  const $element = element instanceof jQuery ? element : $(element);
  const rarity = options.rarity ?? null;
  const preview = options.preview === true;
  applyRarityClass($element, rarity);

  // Background & Gradient
  if (settings.enableItemColor !== false) {
    // Tidy 5e sheets can put the color on the content (default), the sidebar,
    // or both; every other sheet colors the whole window as before.
    const tidyArea = $element.hasClass("tidy5e-sheet") ? settings.tidyBackgroundArea : null;
    $element.toggleClass(SHEET_BG_CLASS, tidyArea !== "sidebar");
    $element.toggleClass(SHEET_TIDY_SIDEBAR_BG_CLASS, tidyArea === "sidebar" || tidyArea === "sheet");
    if (preview) {
      $element.css(SHEET_BG_PRIMARY_VAR, settings.backgroundColor || "#ffffff");
    } else {
      $element.css(SHEET_BG_PRIMARY_VAR, "");
    }
    if (settings.gradientEnabled) {
      $element.addClass(SHEET_BG_GRADIENT_CLASS);
      if (preview) {
        $element.css(SHEET_BG_SECONDARY_VAR, settings.gradientColor || settings.backgroundColor || "#ffffff");
      } else {
        $element.css(SHEET_BG_SECONDARY_VAR, "");
      }
    } else {
      $element.removeClass(SHEET_BG_GRADIENT_CLASS);
      $element.css(SHEET_BG_SECONDARY_VAR, "");
    }
  } else {
    // Clear background if disabled - also clear gradient and glow
    clearSheetBackgroundState($element);
    // Also remove glow when background color is disabled
    $element.removeClass(SHEET_GLOW_CLASS);
    $element.css("--glow-primary", "");
    $element.css("--glow-secondary", "");
  }

  // Text color
  const textColor = settings.itemSheetTextColor;
  const textStyleStrategy = options.textStyleStrategy || getItemSheetTextStyleStrategyForElement($element);
  if (settings.enableTextColor !== false && textColor) {
    if (preview) {
      $element.css(SHEET_TEXT_COLOR_VAR, textColor);
    } else {
      $element.css(SHEET_TEXT_COLOR_VAR, "");
    }
    textStyleStrategy?.applyTextColor($element, textColor);
  } else {
    $element.css(SHEET_TEXT_COLOR_VAR, "");
    textStyleStrategy?.clearTextColor($element);
  }

  // Accents (gold details, table headers)
  for (const accent of SHEET_ACCENTS) {
    const color = settings[accent.enabledKey] ? settings[accent.colorKey] : null;
    $element.toggleClass(accent.className, Boolean(color));
    $element.css(accent.variable, color && preview ? color : "");
  }

  // Glow: independent of the background. Without a background it pulses in
  // the effect color.
  if (settings.glowEnabled) {
    $element.addClass(SHEET_GLOW_CLASS);
    if (preview) {
      const glowPrimary = settings.enableItemColor !== false ? settings.backgroundColor : resolveEffectColor(settings);
      $element.css("--glow-primary", glowPrimary);
      $element.css("--glow-secondary", settings.gradientEnabled ? settings.gradientColor : "#000000");
    } else {
      $element.css("--glow-primary", "");
      $element.css("--glow-secondary", "");
    }
  } else {
    $element.removeClass(SHEET_GLOW_CLASS);
    $element.css("--glow-primary", "");
    $element.css("--glow-secondary", "");
  }

  // Animated effects (shimmer, particles, aura, runes).
  $element.each((_, node) => applySheetEffects(node, settings, { preview }));
}

/**
 * Remove all rarity styles and restore default appearance.
 * Called when an item has no rarity or rarity is unset.
 *
 * @param {HTMLElement|JQuery} element - Target element or jQuery wrapper.
 * @param {object} [options] - Optional overrides.
 * @param {object} [options.textStyleStrategy] - Pre-resolved item sheet text strategy.
 */
export function removeRarityStyles(element, options = {}) {
  if (!element) return;

  const $element = element instanceof jQuery ? element : $(element);

  // Remove all rarity-related styles from the main element
  clearSheetBackgroundState($element);
  clearRarityClasses($element);
  $element.css(SHEET_TEXT_COLOR_VAR, "");

  const textStyleStrategy = options.textStyleStrategy || getItemSheetTextStyleStrategyForElement($element);
  textStyleStrategy?.clearTextColor($element);

  for (const accent of SHEET_ACCENTS) {
    $element.removeClass(accent.className);
    $element.css(accent.variable, "");
  }

  $element.each((_, node) => clearSheetEffects(node));

  // Remove glow class and related CSS variables
  $element.removeClass(SHEET_GLOW_CLASS);

}
