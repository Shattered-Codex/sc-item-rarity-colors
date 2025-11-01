/**
 * Sheet Strategies
 * Strategy pattern implementation for different sheet types
 */

import { SELECTORS } from "../core/constants.js";
import { 
  applyInventoryGradient, 
  clearInventoryGradient,
  applyInventoryBorder,
  clearInventoryBorder,
  applyTitleColor,
  clearTitleColor,
  applyDetailsColor,
  clearDetailsColor
} from "../core/styleAppliers.js";
import { buildRaritySettings } from "../core/settingsManager.js";
import { normalizeRarity } from "../scripts/itemRarityHelper.js";
import { raritySupportsBorderGradient, raritySupportsBorderGlow } from "../core/rarityConfig.js";
import { DEFAULT_GLOW_INTENSITY } from "../core/constants.js";

/**
 * Base Sheet Strategy
 * Abstract class for sheet-specific implementations
 */
export class BaseSheetStrategy {
  /**
   * Get the selector for items container
   * @returns {string}
   */
  getItemSelector() {
    throw new Error("getItemSelector must be implemented by subclass");
  }

  /**
   * Extract item ID from element
   * @param {jQuery} $itemElement - Item element
   * @returns {string|null}
   */
  extractItemId($itemElement) {
    throw new Error("extractItemId must be implemented by subclass");
  }

  /**
   * Get the element that should receive gradient styling
   * @param {jQuery} $itemElement - Item container element
   * @returns {jQuery}
   */
  getGradientElement($itemElement) {
    throw new Error("getGradientElement must be implemented by subclass");
  }

  /**
   * Get the element that should receive border styling (usually item image)
   * @param {jQuery} $itemElement - Item container element
   * @returns {jQuery}
   */
  getBorderElement($itemElement) {
    throw new Error("getBorderElement must be implemented by subclass");
  }

  /**
   * Get selectors for title/subtitle elements
   * @returns {string[]}
   */
  getTitleSelectors() {
    throw new Error("getTitleSelectors must be implemented by subclass");
  }

  /**
   * Get selectors for detail elements
   * @returns {string[]}
   */
  getDetailsSelectors() {
    throw new Error("getDetailsSelectors must be implemented by subclass");
  }

  /**
   * Prepare element before applying border (sheet-specific adjustments)
   * @param {jQuery} $borderElement - Border element
   */
  prepareBorderElement($borderElement) {
    // Default: no-op, override if needed
  }

  /**
   * Apply styles to a single item
   * @param {jQuery} $itemElement - Item container element
   * @param {object} item - Item document
   * @param {object} settings - Main menu settings
   * @param {string} moduleId - Module ID
   */
  applyItemStyles($itemElement, item, settings, moduleId) {
    const rarity = normalizeRarity(item.system?.rarity?.value || item.system?.rarity);
    if (!rarity) return;

    const raritySettings = buildRaritySettings(rarity);

    // Apply gradient
    const $gradientElement = this.getGradientElement($itemElement);
    if (!settings.enabledGradient || !raritySettings.enableItemColor) {
      clearInventoryGradient($gradientElement);
    } else {
      applyInventoryGradient($gradientElement, raritySettings);
    }

    // Apply border
    const $borderElement = this.getBorderElement($itemElement);
    this.prepareBorderElement($borderElement);

    if (!settings.enabledBorder) {
      clearInventoryBorder($borderElement);
    } else if (raritySettings.enableItemColor) {
      // Use background color for border
      $borderElement.each((_, icon) => {
        const borderSettings = {
          ...raritySettings,
          backgroundColor: raritySettings.backgroundColor,
          gradientColor: raritySettings.gradientColor,
          gradientEnabled: raritySettings.gradientEnabled,
          glowEnabled: raritySettings.glowEnabled,
        };
        applyInventoryBorder(icon, borderSettings, DEFAULT_GLOW_INTENSITY);
      });
    } else if (raritySettings.enableInventoryBorderColor && raritySettings.inventoryBorderColor) {
      // Use inventory border color
      const hasBorderGradient = raritySupportsBorderGradient(rarity);
      const hasBorderGlow = raritySupportsBorderGlow(rarity);

      if (hasBorderGradient) {
        const hasSecondaryColor = raritySettings.inventoryBorderSecondaryColor && 
                                  raritySettings.inventoryBorderSecondaryColor !== raritySettings.inventoryBorderColor;
        const secondaryColor = hasSecondaryColor
          ? raritySettings.inventoryBorderSecondaryColor
          : raritySettings.inventoryBorderColor;

        const borderSettings = {
          ...raritySettings,
          backgroundColor: raritySettings.inventoryBorderColor,
          gradientColor: secondaryColor,
          gradientEnabled: hasSecondaryColor && (!raritySettings.enableInventoryBorderGlow || !hasBorderGlow),
          glowEnabled: raritySettings.enableInventoryBorderGlow && hasSecondaryColor && hasBorderGlow,
        };
        $borderElement.each((_, icon) => {
          applyInventoryBorder(icon, borderSettings, DEFAULT_GLOW_INTENSITY);
        });
      } else {
        // Simple single-color border for rarities without gradient support
        const borderSettings = {
          ...raritySettings,
          backgroundColor: raritySettings.inventoryBorderColor,
          gradientColor: raritySettings.inventoryBorderColor,
          gradientEnabled: false,
          glowEnabled: false,
        };
        $borderElement.each((_, icon) => {
          applyInventoryBorder(icon, borderSettings, DEFAULT_GLOW_INTENSITY);
        });
      }
    } else {
      clearInventoryBorder($borderElement);
    }

    // Apply title color
    const titleSelectors = this.getTitleSelectors();
    if (raritySettings.enableInventoryTitleColor && raritySettings.inventoryTitleColor) {
      applyTitleColor($itemElement, raritySettings.inventoryTitleColor, titleSelectors);
    } else {
      clearTitleColor($itemElement, titleSelectors);
    }

    // Apply details color
    const detailsSelectors = this.getDetailsSelectors();
    if (raritySettings.enableInventoryDetailsColor && raritySettings.inventoryDetailsColor) {
      applyDetailsColor($itemElement, raritySettings.inventoryDetailsColor, detailsSelectors);
    } else {
      clearDetailsColor($itemElement, detailsSelectors);
    }
  }
}

/**
 * D&D 5e Sheet Strategy
 */
export class Dnd5eSheetStrategy extends BaseSheetStrategy {
  getItemSelector() {
    return SELECTORS.DND5E_ITEM;
  }

  extractItemId($itemElement) {
    return $itemElement.data("documentId") || $itemElement.data("item-id");
  }

  getGradientElement($itemElement) {
    return $itemElement;
  }

  getBorderElement($itemElement) {
    return $itemElement.find(SELECTORS.DND5E_ITEM_IMAGE);
  }

  getTitleSelectors() {
    return [
      "a.item-name",
      ".item-name a",
      "h4.item-name",
      ".item-name",
      ".item-type",
      ".item-subtitle",
      ".subtitle",
      ".item-type-text"
    ];
  }

  getDetailsSelectors() {
    return [
      ".item-detail",
      ".item-detail input",
      ".item-detail.empty",
      ".item-detail .value",
      ".item-detail .sign",
      ".item-detail .formula",
      ".separator",
      ".max",
      ".unbutton",
      ".item-weight",
      ".item-weight .fa-weight-hanging",
      ".item-uses",
      ".item-charges",
      ".item-controls",
      ".item-properties",
      ".item-quantity",
      ".item-formula dnd5e-icon"
    ];
  }
}

/**
 * Tidy5e Sheet Strategy
 */
export class Tidy5eSheetStrategy extends BaseSheetStrategy {
  getItemSelector() {
    return SELECTORS.TIDY5E_ITEM_CONTAINER;
  }

  extractItemId($itemElement) {
    return $itemElement.data("documentId") || $itemElement.data("item-id");
  }

  getGradientElement($itemElement) {
    const $row = $itemElement.find(SELECTORS.TIDY5E_ITEM_ROW);
    // Clear background before applying gradient
    $row.attr("style", "background: none");
    return $row;
  }

  getBorderElement($itemElement) {
    return $itemElement.find(SELECTORS.TIDY5E_ITEM_IMAGE);
  }

  prepareBorderElement($borderElement) {
    $borderElement.attr("style", "margin: 0; height: auto;");
  }

  getTitleSelectors() {
    return [
      ".item-name",
      ".item-name a",
      "h4.item-name"
    ];
  }

  getDetailsSelectors() {
    return [
      ".item-detail",
      ".item-detail input",
      ".item-detail.empty",
      ".item-detail .value",
      ".item-detail .sign",
      ".item-detail .formula",
      ".item-detail .separator",
      ".item-detail .max",
      ".item-detail .currency",
      ".item-detail .adjustment-button"
    ];
  }
}

/**
 * Sheet Strategy Factory
 * Returns the appropriate strategy based on sheet type
 */
export function getSheetStrategy(sheetType) {
  switch (sheetType) {
    case "tidy5e":
      return new Tidy5eSheetStrategy();
    case "dnd5e":
    default:
      return new Dnd5eSheetStrategy();
  }
}

