/**
 * Style Appliers
 * Centralized functions for applying visual styles to elements.
 */

import { DEFAULT_COLORS, DEFAULT_GLOW_INTENSITY } from "./constants.js";
import { applyRarityClass } from "./runtimeRarityStyles.js";

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

// Inventory rows are restyled on every sheet render, most of them items with
// nothing to clear. classList.remove rewrites the class attribute even for a
// class that is not there, so only classes present are removed.
function removeClasses(node, classNames) {
  const present = classNames.filter((className) => node.classList.contains(className));
  if (present.length) node.classList.remove(...present);
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
    removeClasses(node, [INVENTORY_GRADIENT_CLASS]);
    clearPreviewGradientVariables(node);
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
    removeClasses(node, INVENTORY_BORDER_MODE_CLASSES);
    if (rarity !== undefined && rarity !== null) {
      applyRarityClass(node, rarity);
    }

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

    removeClasses(node, INVENTORY_BORDER_MODE_CLASSES);

    setCssVariable(node, INVENTORY_BORDER_PRIMARY_VAR, "");
    setCssVariable(node, INVENTORY_BORDER_SECONDARY_VAR, "");
    setCssVariable(node, INVENTORY_BORDER_GLOW_INTENSITY_VAR, "");
  });
}

/**
 * Apply text color to title/subtitle elements (the CSS picks them).
 * @param {jQuery|HTMLElement} container - Container element
 * @param {string} color - Color value
 * @param {object} [options]
 * @param {boolean} [options.preview=false] - When true, applies unsaved preview vars inline.
 */
export function applyTitleColor(container, color, options = {}) {
  if (!container || !color) return;

  const $container = container instanceof jQuery ? container : $(container);
  const preview = options?.preview === true;

  $container.each((_, node) => {
    if (!node) return;
    node.classList.add(INVENTORY_TITLE_COLOR_CLASS);
    setCssVariable(node, INVENTORY_TITLE_COLOR_VAR, preview ? color : "");
  });
}

/**
 * Clear text color from title/subtitle elements.
 * @param {jQuery|HTMLElement} container - Container element
 */
export function clearTitleColor(container) {
  if (!container) return;

  const $container = container instanceof jQuery ? container : $(container);
  $container.each((_, node) => {
    if (!node) return;
    removeClasses(node, [INVENTORY_TITLE_COLOR_CLASS]);
    setCssVariable(node, INVENTORY_TITLE_COLOR_VAR, "");
  });
}

/**
 * Apply text color to details elements (the CSS picks them).
 * @param {jQuery|HTMLElement} container - Container element
 * @param {string} color - Color value
 * @param {object} [options]
 * @param {boolean} [options.preview=false] - When true, applies unsaved preview vars inline.
 */
export function applyDetailsColor(container, color, options = {}) {
  if (!container || !color) return;

  const $container = container instanceof jQuery ? container : $(container);
  const preview = options?.preview === true;
  $container.each((_, node) => {
    if (!node) return;
    node.classList.add(INVENTORY_DETAILS_COLOR_CLASS);
    setCssVariable(node, INVENTORY_DETAILS_COLOR_VAR, preview ? color : "");
  });
}

/**
 * Clear text color from details elements.
 * @param {jQuery|HTMLElement} container - Container element
 */
export function clearDetailsColor(container) {
  if (!container) return;

  const $container = container instanceof jQuery ? container : $(container);
  $container.each((_, node) => {
    if (!node) return;
    removeClasses(node, [INVENTORY_DETAILS_COLOR_CLASS]);
    setCssVariable(node, INVENTORY_DETAILS_COLOR_VAR, "");
  });
}
