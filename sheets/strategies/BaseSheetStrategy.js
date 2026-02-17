import { DEFAULT_GLOW_INTENSITY } from "../../core/constants.js";
import {
  applyDetailsColor,
  applyInventoryBorder,
  applyInventoryGradient,
  applyTitleColor,
  clearDetailsColor,
  clearInventoryBorder,
  clearInventoryGradient,
  clearTitleColor,
} from "../../core/styleAppliers.js";
import { raritySupportsBorderGlow, raritySupportsBorderGradient } from "../../core/rarityConfig.js";
import { buildRaritySettings } from "../../core/settingsManager.js";
import { getItemRarity } from "../../scripts/itemRarityHelper.js";

/**
 * Base Sheet Strategy
 * Abstract class for sheet-specific implementations.
 */
export class BaseSheetStrategy {
  /**
   * Get the selector for items container.
   * @returns {string}
   */
  getItemSelector() {
    throw new Error("getItemSelector must be implemented by subclass");
  }

  /**
   * Extract item ID from element.
   * @param {jQuery} $itemElement - Item element.
   * @returns {string|null}
   */
  extractItemId($itemElement) {
    throw new Error("extractItemId must be implemented by subclass");
  }

  /**
   * Get the element that should receive gradient styling.
   * @param {jQuery} $itemElement - Item container element.
   * @returns {jQuery}
   */
  getGradientElement($itemElement) {
    throw new Error("getGradientElement must be implemented by subclass");
  }

  /**
   * Get the element that should receive border styling (usually item image).
   * @param {jQuery} $itemElement - Item container element.
   * @returns {jQuery}
   */
  getBorderElement($itemElement) {
    throw new Error("getBorderElement must be implemented by subclass");
  }

  /**
   * Get selectors for title/subtitle elements.
   * @returns {string[]}
   */
  getTitleSelectors() {
    throw new Error("getTitleSelectors must be implemented by subclass");
  }

  /**
   * Get selectors for detail elements.
   * @returns {string[]}
   */
  getDetailsSelectors() {
    throw new Error("getDetailsSelectors must be implemented by subclass");
  }

  /**
   * Prepare element before applying border (sheet-specific adjustments).
   * @param {jQuery} _borderElement - Border element.
   */
  prepareBorderElement(_borderElement) {
    // Default: no-op, override if needed.
  }

  /**
   * Apply styles to a single item.
   * @param {jQuery} $itemElement - Item container element.
   * @param {object} item - Item document.
   * @param {string} _moduleId - Module ID (reserved for future use).
   */
  applyItemStyles($itemElement, item, _moduleId) {
    const $gradientElement = this.getGradientElement($itemElement);
    const $borderElement = this.getBorderElement($itemElement);
    const titleSelectors = this.getTitleSelectors();
    const detailsSelectors = this.getDetailsSelectors();

    const rarity = getItemRarity(item);
    if (!rarity) {
      clearInventoryGradient($gradientElement);
      clearInventoryBorder($borderElement);
      clearTitleColor($itemElement, titleSelectors);
      clearDetailsColor($itemElement, detailsSelectors);
      $itemElement.removeClass("scirc-managed-item-row");
      return;
    }

    const raritySettings = buildRaritySettings(rarity);
    $itemElement.addClass("scirc-managed-item-row");

    if (!raritySettings.enableInventoryGradientEffects || !raritySettings.enableItemColor) {
      clearInventoryGradient($gradientElement);
    } else {
      applyInventoryGradient($gradientElement, raritySettings);
    }

    this.prepareBorderElement($borderElement);

    if (!raritySettings.enableInventoryBorders) {
      clearInventoryBorder($borderElement);
    } else if (raritySettings.enableItemColor) {
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
      const hasBorderGradient = raritySupportsBorderGradient(rarity);
      const hasBorderGlow = raritySupportsBorderGlow(rarity);

      if (hasBorderGradient) {
        const hasSecondaryColor = raritySettings.inventoryBorderSecondaryColor
          && raritySettings.inventoryBorderSecondaryColor !== raritySettings.inventoryBorderColor;
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

    if (raritySettings.enableInventoryTitleColor && raritySettings.inventoryTitleColor) {
      applyTitleColor($itemElement, raritySettings.inventoryTitleColor, titleSelectors);
    } else {
      clearTitleColor($itemElement, titleSelectors);
    }

    if (raritySettings.enableInventoryDetailsColor && raritySettings.inventoryDetailsColor) {
      applyDetailsColor($itemElement, raritySettings.inventoryDetailsColor, detailsSelectors);
    } else {
      clearDetailsColor($itemElement, detailsSelectors);
    }
  }
}
