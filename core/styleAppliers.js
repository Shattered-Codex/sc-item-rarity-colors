/**
 * Style Appliers
 * Centralized functions for applying visual styles to elements
 */

import { DEFAULT_COLORS, DEFAULT_GLOW_INTENSITY } from "./constants.js";

/**
 * Apply gradient background to an actor inventory item
 * @param {jQuery|HTMLElement} element - Target element
 * @param {object} settings - Settings object with backgroundColor, gradientColor, etc.
 */
export function applyInventoryGradient(element, settings) {
  if (!element) return;

  const $element = element instanceof jQuery ? element : $(element);
  const primaryColor = settings.backgroundColor || DEFAULT_COLORS.BACKGROUND_FALLBACK;
  const secondaryColor = settings.gradientEnabled && settings.gradientColor && settings.gradientColor !== DEFAULT_COLORS.BACKGROUND_FALLBACK
    ? settings.gradientColor
    : DEFAULT_COLORS.BACKGROUND_DEFAULT;
  const fallbackColor = DEFAULT_COLORS.BACKGROUND_DEFAULT;

  $element.css({
    "background": `linear-gradient(-135deg, ${primaryColor} 10%, ${secondaryColor} 30%, ${fallbackColor} 50%)`,
    "box-shadow": "none",
    "color": "#fff",
  });
}

/**
 * Clear gradient background from an element
 * @param {jQuery|HTMLElement} element - Target element
 */
export function clearInventoryGradient(element) {
  if (!element) return;

  const $element = element instanceof jQuery ? element : $(element);
  $element.css({
    "background": "",
    "background-color": "",
    "background-image": "",
    "box-shadow": "",
  });
}

/**
 * Apply border with optional gradient and glow effects
 * @param {HTMLElement|jQuery} element - Target element
 * @param {object} settings - Settings with backgroundColor, gradientColor, gradientEnabled, glowEnabled
 * @param {number} intensity - Glow intensity (default: DEFAULT_GLOW_INTENSITY)
 */
export function applyInventoryBorder(element, settings, intensity = DEFAULT_GLOW_INTENSITY) {
  if (!element) return;

  const $element = element instanceof jQuery ? element : $(element);
  const primaryColor = settings.backgroundColor || DEFAULT_COLORS.BACKGROUND_FALLBACK;
  
  const secondaryColor = (settings.gradientColor && 
                          settings.gradientColor.trim() !== "" && 
                          settings.gradientColor !== primaryColor)
    ? settings.gradientColor
    : primaryColor;

  if (settings.gradientEnabled) {
    $element.css({
      "border": `2px solid transparent`,
      "border-image": `linear-gradient(135deg, ${primaryColor} 50%, ${secondaryColor} 50%) 1`,
    });
  } else {
    $element.css({
      "border": `2px solid ${primaryColor}`,
      "border-image": "none",
    });
  }

  $element.removeClass((_, className) => {
    return (className.match(/(^|\s)glow-fade-border-\S+/g) || []).join(" ");
  });
  $element.css("box-shadow", "");

  if (settings.glowEnabled) {
    $element.css("border", "none");
    const animationName = `glow-fade-border-${primaryColor.replace("#", "")}-${secondaryColor.replace("#", "")}`;

    if (!document.getElementById(animationName)) {
      const styleTag = document.createElement("style");
      styleTag.id = animationName;
      styleTag.innerHTML = `
        @keyframes ${animationName} {
          0% {
            border-color: ${primaryColor};
            box-shadow: 0 0 ${intensity}px ${secondaryColor}, 0 0 ${intensity * 1.5}px ${secondaryColor};
          }
          50% {
            border-color: ${secondaryColor};
            box-shadow: 0 0 ${intensity}px ${primaryColor}, 0 0 ${intensity * 1.5}px ${primaryColor};
          }
          100% {
            border-color: ${primaryColor};
            box-shadow: 0 0 ${intensity}px ${secondaryColor}, 0 0 ${intensity * 1.5}px ${secondaryColor};
          }
        }
        .${animationName} {
          animation: ${animationName} 6s infinite ease-in-out;
        }
      `;
      document.head.appendChild(styleTag);
    }

    $element.addClass(animationName);
  }
}

/**
 * Clear border and glow effects from an element
 * @param {jQuery|HTMLElement} element - Target element
 */
export function clearInventoryBorder(element) {
  if (!element) return;

  const $element = element instanceof jQuery ? element : $(element);
  
  // Remove glow animation classes
  $element.removeClass((_, className) => {
    return (className.match(/(^|\s)glow-fade-border-\S+/g) || []).join(" ");
  });
  
  // Clear border styles
  $element.css({
    "border": "",
    "border-image": "",
    "border-radius": "",
    "box-shadow": "",
  });
}

/**
 * Apply text color to title/subtitle elements
 * @param {jQuery|HTMLElement} container - Container element
 * @param {string} color - Color value
 * @param {string[]} selectors - Array of CSS selectors to target
 */
export function applyTitleColor(container, color, selectors) {
  if (!container || !color) return;

  const $container = container instanceof jQuery ? container : $(container);
  selectors.forEach(selector => {
    $container.find(selector).css("color", color);
  });
}

/**
 * Clear text color from title/subtitle elements
 * @param {jQuery|HTMLElement} container - Container element
 * @param {string[]} selectors - Array of CSS selectors to target
 */
export function clearTitleColor(container, selectors) {
  if (!container) return;

  const $container = container instanceof jQuery ? container : $(container);
  selectors.forEach(selector => {
    $container.find(selector).css("color", "");
  });
}

/**
 * Apply text color to details elements
 * @param {jQuery|HTMLElement} container - Container element
 * @param {string} color - Color value
 * @param {string[]} selectors - Array of CSS selectors to target
 */
export function applyDetailsColor(container, color, selectors) {
  if (!container || !color) return;

  const $container = container instanceof jQuery ? container : $(container);
  selectors.forEach(selector => {
    $container.find(selector).css("color", color);
  });
}

/**
 * Clear text color from details elements
 * @param {jQuery|HTMLElement} container - Container element
 * @param {string[]} selectors - Array of CSS selectors to target
 */
export function clearDetailsColor(container, selectors) {
  if (!container) return;

  const $container = container instanceof jQuery ? container : $(container);
  selectors.forEach(selector => {
    $container.find(selector).css("color", "");
  });
}

