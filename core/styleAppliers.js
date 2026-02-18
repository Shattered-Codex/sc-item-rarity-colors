/**
 * Style Appliers
 * Centralized functions for applying visual styles to elements.
 */

import { DEFAULT_COLORS, DEFAULT_GLOW_INTENSITY } from "./constants.js";
import { applyRarityClass } from "./runtimeRarityStyles.js";

const LEGACY_BORDER_GLOW_CLASS_REGEX = /(^|\s)(?:scirc-)?glow-fade-border-\S+/g;
const INVENTORY_GRADIENT_CLASS = "scirc-inv-gradient-enabled";
const INVENTORY_BORDER_MANAGED_CLASS = "scirc-inv-border-managed";
const INVENTORY_BORDER_SOLID_CLASS = "scirc-inv-border-solid";
const INVENTORY_BORDER_GRADIENT_CLASS = "scirc-inv-border-gradient";
const INVENTORY_BORDER_GLOW_CLASS = "scirc-inv-border-glow";
const INVENTORY_TITLE_COLOR_CLASS = "scirc-inv-title-color-enabled";
const INVENTORY_DETAILS_COLOR_CLASS = "scirc-inv-details-color-enabled";

const INVENTORY_BG_PRIMARY_VAR = "--scirc-inv-bg-primary";
const INVENTORY_BG_SECONDARY_VAR = "--scirc-inv-bg-secondary";
const INVENTORY_BG_FALLBACK_VAR = "--scirc-inv-bg-fallback";
const INVENTORY_BORDER_PRIMARY_VAR = "--scirc-inv-border-primary";
const INVENTORY_BORDER_SECONDARY_VAR = "--scirc-inv-border-secondary";
const INVENTORY_BORDER_GLOW_INTENSITY_VAR = "--scirc-inv-border-glow-intensity";
const INVENTORY_TITLE_COLOR_VAR = "--scirc-inv-title-color";
const INVENTORY_DETAILS_COLOR_VAR = "--scirc-inv-details-color";

const INVENTORY_BORDER_MODE_CLASSES = [
  INVENTORY_BORDER_SOLID_CLASS,
  INVENTORY_BORDER_GRADIENT_CLASS,
  INVENTORY_BORDER_GLOW_CLASS,
];

function removeLegacyGlowClasses($element) {
  $element.removeClass((_, className) => (className.match(LEGACY_BORDER_GLOW_CLASS_REGEX) || []).join(" "));
}

function setCssVariable(element, name, value) {
  if (!element) return;
  if (value === undefined || value === null || value === "") {
    element.style.removeProperty(name);
    return;
  }
  element.style.setProperty(name, value);
}

function applyPreviewGradientVariables(element, settings) {
  const primaryColor = settings.backgroundColor || DEFAULT_COLORS.BACKGROUND_FALLBACK;
  const secondaryColor = settings.gradientEnabled && settings.gradientColor && settings.gradientColor !== DEFAULT_COLORS.BACKGROUND_FALLBACK
    ? settings.gradientColor
    : DEFAULT_COLORS.BACKGROUND_DEFAULT;

  setCssVariable(element, INVENTORY_BG_PRIMARY_VAR, primaryColor);
  setCssVariable(element, INVENTORY_BG_SECONDARY_VAR, secondaryColor);
  setCssVariable(element, INVENTORY_BG_FALLBACK_VAR, DEFAULT_COLORS.BACKGROUND_DEFAULT);
}

function clearPreviewGradientVariables(element) {
  setCssVariable(element, INVENTORY_BG_PRIMARY_VAR, "");
  setCssVariable(element, INVENTORY_BG_SECONDARY_VAR, "");
  setCssVariable(element, INVENTORY_BG_FALLBACK_VAR, "");
}

/**
 * Apply gradient background to an actor inventory item.
 * @param {jQuery|HTMLElement} element - Target element
 * @param {object} settings - Settings object with backgroundColor, gradientColor, etc.
 * @param {object} [options]
 * @param {string} [options.rarity] - Rarity key used to apply class-based styling.
 * @param {boolean} [options.preview=false] - When true, applies unsaved preview vars inline.
 */
export function applyInventoryGradient(element, settings, options = {}) {
  if (!element) return;

  const $element = element instanceof jQuery ? element : $(element);
  const rarity = options?.rarity;
  const preview = options?.preview === true;

  $element.each((_, node) => {
    if (!node) return;
    node.classList.add(INVENTORY_GRADIENT_CLASS);
    if (rarity !== undefined && rarity !== null) {
      applyRarityClass(node, rarity);
    }

    if (preview) {
      applyPreviewGradientVariables(node, settings || {});
    } else {
      clearPreviewGradientVariables(node);
    }

    // Legacy inline cleanup.
    node.style.removeProperty("background");
    node.style.removeProperty("background-color");
    node.style.removeProperty("background-image");
    node.style.removeProperty("box-shadow");
  });
}

/**
 * Clear gradient background from an element.
 * @param {jQuery|HTMLElement} element - Target element
 */
export function clearInventoryGradient(element) {
  if (!element) return;

  const $element = element instanceof jQuery ? element : $(element);
  $element.each((_, node) => {
    if (!node) return;
    node.classList.remove(INVENTORY_GRADIENT_CLASS);
    clearPreviewGradientVariables(node);

    // Legacy inline cleanup.
    node.style.removeProperty("background");
    node.style.removeProperty("background-color");
    node.style.removeProperty("background-image");
    node.style.removeProperty("box-shadow");
  });
}

/**
 * Apply border with optional gradient and glow effects.
 * @param {HTMLElement|jQuery} element - Target element
 * @param {object} settings - Settings with backgroundColor, gradientColor, gradientEnabled, glowEnabled
 * @param {number} intensity - Glow intensity (default: DEFAULT_GLOW_INTENSITY)
 * @param {object} [options]
 * @param {string} [options.rarity] - Rarity key used to apply class-based styling.
 * @param {boolean} [options.preview=false] - When true, applies unsaved preview vars inline.
 */
export function applyInventoryBorder(element, settings, intensity = DEFAULT_GLOW_INTENSITY, options = {}) {
  if (!element) return;

  const $element = element instanceof jQuery ? element : $(element);
  const rarity = options?.rarity;
  const preview = options?.preview === true;

  const primaryColor = settings?.backgroundColor || DEFAULT_COLORS.BACKGROUND_FALLBACK;
  const secondaryColor = (settings?.gradientColor
    && settings.gradientColor.trim() !== ""
    && settings.gradientColor !== primaryColor)
    ? settings.gradientColor
    : primaryColor;

  $element.each((_, node) => {
    if (!node) return;

    node.classList.add(INVENTORY_BORDER_MANAGED_CLASS);
    node.classList.remove(...INVENTORY_BORDER_MODE_CLASSES);
    if (rarity !== undefined && rarity !== null) {
      applyRarityClass(node, rarity);
    }
    removeLegacyGlowClasses($(node));

    if (settings?.glowEnabled) {
      node.classList.add(INVENTORY_BORDER_GLOW_CLASS);
    } else if (settings?.gradientEnabled) {
      node.classList.add(INVENTORY_BORDER_GRADIENT_CLASS);
    } else {
      node.classList.add(INVENTORY_BORDER_SOLID_CLASS);
    }

    if (preview) {
      setCssVariable(node, INVENTORY_BORDER_PRIMARY_VAR, primaryColor);
      setCssVariable(node, INVENTORY_BORDER_SECONDARY_VAR, secondaryColor);
      setCssVariable(node, INVENTORY_BORDER_GLOW_INTENSITY_VAR, `${intensity}px`);
    } else {
      setCssVariable(node, INVENTORY_BORDER_PRIMARY_VAR, "");
      setCssVariable(node, INVENTORY_BORDER_SECONDARY_VAR, "");
      setCssVariable(node, INVENTORY_BORDER_GLOW_INTENSITY_VAR, "");
    }

    // Legacy inline cleanup.
    node.style.removeProperty("border");
    node.style.removeProperty("border-image");
    node.style.removeProperty("box-shadow");
  });
}

/**
 * Clear border and glow effects from an element.
 * @param {jQuery|HTMLElement} element - Target element
 */
export function clearInventoryBorder(element) {
  if (!element) return;

  const $element = element instanceof jQuery ? element : $(element);
  $element.each((_, node) => {
    if (!node) return;

    removeLegacyGlowClasses($(node));
    node.classList.remove(...INVENTORY_BORDER_MODE_CLASSES);

    setCssVariable(node, INVENTORY_BORDER_PRIMARY_VAR, "");
    setCssVariable(node, INVENTORY_BORDER_SECONDARY_VAR, "");
    setCssVariable(node, INVENTORY_BORDER_GLOW_INTENSITY_VAR, "");

    // Legacy inline cleanup.
    node.style.removeProperty("border");
    node.style.removeProperty("border-image");
    node.style.removeProperty("border-radius");
    node.style.removeProperty("box-shadow");
  });
}

/**
 * Apply text color to title/subtitle elements.
 * @param {jQuery|HTMLElement} container - Container element
 * @param {string} color - Color value
 * @param {string[]} selectors - Array of CSS selectors to target
 * @param {object} [options]
 * @param {boolean} [options.preview=false] - When true, applies unsaved preview vars inline.
 */
export function applyTitleColor(container, color, selectors, options = {}) {
  if (!container || !color) return;

  const $container = container instanceof jQuery ? container : $(container);
  const preview = options?.preview === true;

  $container.each((_, node) => {
    if (!node) return;
    node.classList.add(INVENTORY_TITLE_COLOR_CLASS);
    setCssVariable(node, INVENTORY_TITLE_COLOR_VAR, preview ? color : "");
  });

  // Clear legacy inline colors from prior versions/renders.
  const safeSelectors = Array.isArray(selectors) ? selectors : [];
  safeSelectors.forEach((selector) => $container.find(selector).css("color", ""));
}

/**
 * Clear text color from title/subtitle elements.
 * @param {jQuery|HTMLElement} container - Container element
 * @param {string[]} selectors - Array of CSS selectors to target
 */
export function clearTitleColor(container, selectors) {
  if (!container) return;

  const $container = container instanceof jQuery ? container : $(container);
  $container.each((_, node) => {
    if (!node) return;
    node.classList.remove(INVENTORY_TITLE_COLOR_CLASS);
    setCssVariable(node, INVENTORY_TITLE_COLOR_VAR, "");
  });
  const safeSelectors = Array.isArray(selectors) ? selectors : [];
  safeSelectors.forEach((selector) => $container.find(selector).css("color", ""));
}

/**
 * Apply text color to details elements.
 * @param {jQuery|HTMLElement} container - Container element
 * @param {string} color - Color value
 * @param {string[]} selectors - Array of CSS selectors to target
 * @param {object} [options]
 * @param {boolean} [options.preview=false] - When true, applies unsaved preview vars inline.
 */
export function applyDetailsColor(container, color, selectors, options = {}) {
  if (!container || !color) return;

  const $container = container instanceof jQuery ? container : $(container);
  const preview = options?.preview === true;
  $container.each((_, node) => {
    if (!node) return;
    node.classList.add(INVENTORY_DETAILS_COLOR_CLASS);
    setCssVariable(node, INVENTORY_DETAILS_COLOR_VAR, preview ? color : "");
  });

  // Clear legacy inline colors from prior versions/renders.
  const safeSelectors = Array.isArray(selectors) ? selectors : [];
  safeSelectors.forEach((selector) => $container.find(selector).css("color", ""));
}

/**
 * Clear text color from details elements.
 * @param {jQuery|HTMLElement} container - Container element
 * @param {string[]} selectors - Array of CSS selectors to target
 */
export function clearDetailsColor(container, selectors) {
  if (!container) return;

  const $container = container instanceof jQuery ? container : $(container);
  $container.each((_, node) => {
    if (!node) return;
    node.classList.remove(INVENTORY_DETAILS_COLOR_CLASS);
    setCssVariable(node, INVENTORY_DETAILS_COLOR_VAR, "");
  });
  const safeSelectors = Array.isArray(selectors) ? selectors : [];
  safeSelectors.forEach((selector) => $container.find(selector).css("color", ""));
}
