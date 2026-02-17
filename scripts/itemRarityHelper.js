import { normalizeRarityKey } from "../core/rarityListConfig.js";
import { applyInventoryBorder, clearInventoryBorder } from "../core/styleAppliers.js";

const SHEET_GLOW_CLASS = "scirc-glow";
const BORDER_GLOW_CLASS_REGEX = /(^|\s)(?:scirc-)?glow-fade-border-\S+/g;

/**
 * Normalize a rarity string to match module settings.
 *
 * @param {string} rawRarity - The original rarity string.
 * @returns {string|null} - Normalized rarity or null if invalid.
 */
export function normalizeRarity(rawRarity) {
  return normalizeRarityKey(rawRarity);
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
  return normalizeRarity(extractRawItemRarity(item));
}

/**
 * Apply rarity styles (background, gradient, glow, and text color) to an HTML element.
 *
 * @param {HTMLElement|JQuery} element - Target element or jQuery wrapper.
 * @param {object} settings - Rarity visual configuration.
 */
export function applyRarityStyles(element, settings) {
  if (!element) return;

  const $element = element instanceof jQuery ? element : $(element);

  // Background & Gradient
  if (settings.enableItemColor !== false) {
    if (settings.gradientEnabled) {
      $element.css({
        "background-image": `linear-gradient(to right, ${settings.backgroundColor}, ${settings.gradientColor})`,
        "background-color": "",
      });
    } else {
      $element.css({
        "background-image": "",
        "background-color": settings.backgroundColor,
      });
    }
  } else {
    // Clear background if disabled - also clear gradient and glow
    $element.css({
      "background-image": "",
      "background-color": "",
    });
    // Also remove glow when background color is disabled
    $element.removeClass(SHEET_GLOW_CLASS);
    $element.css("--glow-primary", "");
    $element.css("--glow-secondary", "");
    // Remove any glow animation classes
    $element.removeClass((_, className) => (className.match(BORDER_GLOW_CLASS_REGEX) || []).join(" "));
  }

  // Text Color - Support both itemSheetTextColor (new) and textColor (legacy/preview)
  const textColor = settings.itemSheetTextColor || settings.textColor;
  if (settings.enableTextColor !== false && textColor) {
    const textColorClasses = [
      ".middle.identity-info",
      ".right.common-fields.physical",
      ".sheet-tabs",
      ".info-block",
      ".pills",
      ".header-control",
      ".source-book"
    ];
    
    textColorClasses.forEach(selector => {
      const $target = $element.find(selector);
      if ($target.length) {
        $target.css("color", textColor);
        $target.find("*").each(function() {
          const $el = $(this);
          if ($el.is("select, option") || $el.closest("select, .card.resource-bar-config").length) {
            return;
          }
          $el.css("color", textColor);
        });
      }
    });
    
    const $detailsTab = $element.find(".details.tab");
    if ($detailsTab.length && textColor) {
      $detailsTab.find("label, .form-group:not(:has(select)):not(:has(input)), .hint, legend, fieldset > legend, .form-fields p").each(function() {
        const $el = $(this);
        if ($el.closest("select, input, .card.resource-bar-config").length) {
          return;
        }
        $el.css("color", textColor);
      });
      
      $detailsTab.find("fieldset").each(function() {
        const $fieldset = $(this);
        const $emptyDiv = $fieldset.find("div.empty");
        if ($emptyDiv.length) {
          $emptyDiv.css("color", "#000000");
          $emptyDiv.find("*").each(function() {
            const $el = $(this);
            if ($el.closest("select, input, .card.resource-bar-config").length) {
              return;
            }
            $el.css("color", "#000000");
          });
          
          $fieldset.find("label, legend, .hint").each(function() {
            const $el = $(this);
            if ($el.closest("select, input, .card.resource-bar-config").length) {
              return;
            }
            $el.css("color", "#000000");
          });
        }
      });
    }
  } else {
    const textColorClasses = [
      ".middle.identity-info",
      ".right.common-fields.physical",
      ".sheet-tabs",
      ".info-block",
      ".pills",
      ".header-control",
      ".source-book"
    ];
    
    textColorClasses.forEach(selector => {
      const $target = $element.find(selector);
      if ($target.length) {
        $target.css("color", "");
        $target.find("*").each(function() {
          const $el = $(this);
          if ($el.is("select, option") || 
              $el.closest("select, .card.resource-bar-config").length) {
            return;
          }
          $el.css("color", "");
        });
      }
    });
    
    const $detailsTab = $element.find(".details.tab");
    if ($detailsTab.length) {
      $detailsTab.find("label, .form-group:not(:has(select)):not(:has(input)), .hint, legend, fieldset > legend, .form-fields p").each(function() {
        const $el = $(this);
        if ($el.closest("select, input, .card.resource-bar-config").length) {
          return;
        }
        $el.css("color", "");
      });
    }
  }

  // Glow
  if (settings.enableItemColor !== false && settings.glowEnabled) {
    $element.addClass(SHEET_GLOW_CLASS);
    $element.css("--glow-primary", settings.backgroundColor);
    $element.css("--glow-secondary", settings.gradientEnabled ? settings.gradientColor : "#000000");
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
 */
export function removeRarityStyles(element) {
  if (!element) return;

  const $element = element instanceof jQuery ? element : $(element);

  // Remove all rarity-related styles from the main element
  $element.css({
    "background-color": "",
    "background-image": "",
  });

  // Remove text color from specific elements and their children
  // Excluding select elements and resource-bar-config cards which have their own styling
  const textColorClasses = [
    ".middle.identity-info",
    ".right.common-fields.physical",
    ".sheet-tabs",
    ".info-block",
    ".pills",
    ".header-control",
    ".source-book"
  ];
  
  textColorClasses.forEach(selector => {
    const $target = $element.find(selector);
    if ($target.length) {
      // Remove color from the element itself
      $target.css("color", "");
      
      // Remove color from children, excluding selects, options, and resource-bar-config cards
      // Use a function to check each element
      $target.find("*").each(function() {
        const $el = $(this);
        // Skip if it's a select, option, or inside a select/resource-bar-config
        if ($el.is("select, option") || 
            $el.closest("select, .card.resource-bar-config").length) {
          return;
        }
        $el.css("color", "");
      });
    }
  });
  
  // For .details.tab, remove color from the same specific child elements we applied it to
  const $detailsTab = $element.find(".details.tab");
  if ($detailsTab.length) {
    $detailsTab.find("label, .form-group:not(:has(select)):not(:has(input)), .hint, legend, fieldset > legend, .form-fields p").each(function() {
      const $el = $(this);
      if ($el.closest("select, input, .card.resource-bar-config").length) {
        return;
      }
      $el.css("color", "");
    });
    
    // Also remove black color from fieldsets with empty divs
    $detailsTab.find("fieldset").each(function() {
      const $fieldset = $(this);
      const $emptyDiv = $fieldset.find("div.empty");
      if ($emptyDiv.length) {
        // Remove color from the empty div itself and its children
        $emptyDiv.css("color", "");
        $emptyDiv.find("*").each(function() {
          const $el = $(this);
          if ($el.closest("select, input, .card.resource-bar-config").length) {
            return;
          }
          $el.css("color", "");
        });
        
        // Remove color from other elements in the fieldset
        $fieldset.find("label, legend, .hint").each(function() {
          const $el = $(this);
          if ($el.closest("select, input, .card.resource-bar-config").length) {
            return;
          }
          $el.css("color", "");
        });
      }
    });
  }

  // Remove glow class and related CSS variables
  $element.removeClass(SHEET_GLOW_CLASS);
  $element.css("--glow-primary", "");
  $element.css("--glow-secondary", "");

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
  applyInventoryBorder(element, settings, intensity);
}

/**
 * Remove any previously applied glow/border from one or more elements.
 *
 * @param {HTMLElement|JQuery} element - Target element(s) or jQuery wrapper.
 */
export function clearActorSheetItemBorder(element) {
  clearInventoryBorder(element);
}
