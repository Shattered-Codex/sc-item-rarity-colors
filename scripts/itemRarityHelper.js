import { normalizeRarityKey } from "../core/rarityListConfig.js";
import { applyInventoryBorder, clearInventoryBorder } from "../core/styleAppliers.js";
import { getItemSheetTextStyleStrategyForElement } from "../sheets/itemSheetTextStrategies.js";
import { applyRarityClass, clearRarityClasses } from "../core/runtimeRarityStyles.js";

const SHEET_GLOW_CLASS = "scirc-glow";
const SHEET_BG_CLASS = "scirc-item-sheet-bg-enabled";
const SHEET_BG_GRADIENT_CLASS = "scirc-item-sheet-bg-gradient-enabled";
const SHEET_TEXT_COLOR_VAR = "--scirc-item-sheet-text-color";
const SHEET_BG_PRIMARY_VAR = "--scirc-item-sheet-bg-primary";
const SHEET_BG_SECONDARY_VAR = "--scirc-item-sheet-bg-secondary";
const BORDER_GLOW_CLASS_REGEX = /(^|\s)(?:scirc-)?glow-fade-border-\S+/g;

function clearSheetBackgroundState($element) {
  $element.removeClass(SHEET_BG_CLASS);
  $element.removeClass(SHEET_BG_GRADIENT_CLASS);
  $element.css(SHEET_BG_PRIMARY_VAR, "");
  $element.css(SHEET_BG_SECONDARY_VAR, "");

  // Legacy inline cleanup.
  $element.css({
    "background-image": "",
    "background-color": "",
  });
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
    ?? item?.system?.details?.rarity
    ?? item?.rarity
    ?? null;
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
    $element.addClass(SHEET_BG_CLASS);
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
    // Remove any glow animation classes
    $element.removeClass((_, className) => (className.match(BORDER_GLOW_CLASS_REGEX) || []).join(" "));
  }

  // Text Color - Support both itemSheetTextColor (new) and textColor (legacy/preview)
  const textColor = settings.itemSheetTextColor || settings.textColor;
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

  // Glow
  if (settings.enableItemColor !== false && settings.glowEnabled) {
    $element.addClass(SHEET_GLOW_CLASS);
    if (preview) {
      $element.css("--glow-primary", settings.backgroundColor);
      $element.css("--glow-secondary", settings.gradientEnabled ? settings.gradientColor : "#000000");
    } else {
      $element.css("--glow-primary", "");
      $element.css("--glow-secondary", "");
    }
  } else {
    $element.removeClass(SHEET_GLOW_CLASS);
    $element.css("--glow-primary", "");
    $element.css("--glow-secondary", "");
    // Remove any glow animation classes
    $element.removeClass((_, className) => (className.match(BORDER_GLOW_CLASS_REGEX) || []).join(" "));
  }
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

  // Remove glow class and related CSS variables
  $element.removeClass(SHEET_GLOW_CLASS);

  // Remove any glow animation classes
  $element.removeClass((_, className) => (className.match(BORDER_GLOW_CLASS_REGEX) || []).join(" "));
}

/**
 * Apply a border and optional glow animation based on rarity settings.
 *
 * @param {HTMLElement|JQuery} element - Target item container.
 * @param {object} settings - Must include backgroundColor, gradientColor, etc.
 * @param {number} intensity - Glow intensity (default: 6px).
 */
export function applyActorSheetItemBorder(element, settings, intensity = 6) {
  applyInventoryBorder(element, settings, intensity, { preview: true });
}

/**
 * Remove any previously applied glow/border from one or more elements.
 *
 * @param {HTMLElement|JQuery} element - Target element(s) or jQuery wrapper.
 */
export function clearActorSheetItemBorder(element) {
  clearInventoryBorder(element);
}
