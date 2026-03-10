import { DEFAULT_GLOW_INTENSITY } from "../../core/constants.js";
import { debugLog } from "../../core/debug.js";
import { applyRarityClass, clearRarityClasses } from "../../core/runtimeRarityStyles.js";
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
import { getActiveSpellStyleForItem } from "../../scripts/spellSchoolHelper.js";

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

  _applyResolvedStyles($itemElement, $gradientElement, $borderElement, titleSelectors, detailsSelectors, settings, options = {}) {
    const rarity = options?.rarity ?? null;
    const preview = options?.preview === true;
    const useRarityCapabilities = options?.useRarityCapabilities === true;
    let borderMode = "none";

    if (!settings.enableInventoryGradientEffects || !settings.enableItemColor) {
      clearInventoryGradient($gradientElement);
    } else {
      applyInventoryGradient($gradientElement, settings, { rarity, preview });
    }

    this.prepareBorderElement($borderElement);

    if (!settings.enableInventoryBorders) {
      clearInventoryBorder($borderElement);
    } else if (settings.enableItemColor) {
      borderMode = "item-color";
      $borderElement.each((_, icon) => {
        const borderSettings = {
          ...settings,
          backgroundColor: settings.backgroundColor,
          gradientColor: settings.gradientColor,
          gradientEnabled: settings.gradientEnabled,
          glowEnabled: settings.glowEnabled,
        };
        applyInventoryBorder(icon, borderSettings, DEFAULT_GLOW_INTENSITY, { rarity, preview });
      });
    } else if (settings.enableInventoryBorderColor && settings.inventoryBorderColor) {
      const hasBorderGradient = useRarityCapabilities
        ? raritySupportsBorderGradient(rarity)
        : true;
      const hasBorderGlow = useRarityCapabilities
        ? raritySupportsBorderGlow(rarity)
        : true;

      if (hasBorderGradient) {
        const hasSecondaryColor = settings.inventoryBorderSecondaryColor
          && settings.inventoryBorderSecondaryColor !== settings.inventoryBorderColor;
        const secondaryColor = hasSecondaryColor
          ? settings.inventoryBorderSecondaryColor
          : settings.inventoryBorderColor;
        borderMode = hasSecondaryColor && settings.enableInventoryBorderGlow && hasBorderGlow
          ? "border-color-glow"
          : (hasSecondaryColor ? "border-color-gradient" : "border-color-solid");

        const borderSettings = {
          ...settings,
          backgroundColor: settings.inventoryBorderColor,
          gradientColor: secondaryColor,
          gradientEnabled: hasSecondaryColor && (!settings.enableInventoryBorderGlow || !hasBorderGlow),
          glowEnabled: settings.enableInventoryBorderGlow && hasSecondaryColor && hasBorderGlow,
        };
        $borderElement.each((_, icon) => {
          applyInventoryBorder(icon, borderSettings, DEFAULT_GLOW_INTENSITY, { rarity, preview });
        });
      } else {
        borderMode = "border-color-solid";
        const borderSettings = {
          ...settings,
          backgroundColor: settings.inventoryBorderColor,
          gradientColor: settings.inventoryBorderColor,
          gradientEnabled: false,
          glowEnabled: false,
        };
        $borderElement.each((_, icon) => {
          applyInventoryBorder(icon, borderSettings, DEFAULT_GLOW_INTENSITY, { rarity, preview });
        });
      }
    } else {
      clearInventoryBorder($borderElement);
    }

    if (settings.enableInventoryTitleColor && settings.inventoryTitleColor) {
      applyTitleColor($itemElement, settings.inventoryTitleColor, titleSelectors, { preview });
    } else {
      clearTitleColor($itemElement, titleSelectors);
    }

    if (settings.enableInventoryDetailsColor && settings.inventoryDetailsColor) {
      applyDetailsColor($itemElement, settings.inventoryDetailsColor, detailsSelectors, { preview });
    } else {
      clearDetailsColor($itemElement, detailsSelectors);
    }

    return {
      borderMode,
      gradientApplied: settings.enableInventoryGradientEffects && settings.enableItemColor,
      titleColorApplied: settings.enableInventoryTitleColor && Boolean(settings.inventoryTitleColor),
      detailsColorApplied: settings.enableInventoryDetailsColor && Boolean(settings.inventoryDetailsColor),
    };
  }

  /**
   * Apply styles to a single item.
   * @param {jQuery} $itemElement - Item container element.
   * @param {object} item - Item document.
   * @param {string} moduleId - Module ID.
   */
  applyItemStyles($itemElement, item, moduleId) {
    const $gradientElement = this.getGradientElement($itemElement);
    const $borderElement = this.getBorderElement($itemElement);
    const titleSelectors = this.getTitleSelectors();
    const detailsSelectors = this.getDetailsSelectors();
    const itemId = item?.id ?? item?._id ?? null;
    const itemName = item?.name ?? null;

    const spellStyle = getActiveSpellStyleForItem(item, moduleId);
    if (spellStyle) {
      clearRarityClasses($itemElement);
      $itemElement.addClass("scirc-managed-item-row");

      const summary = this._applyResolvedStyles(
        $itemElement,
        $gradientElement,
        $borderElement,
        titleSelectors,
        detailsSelectors,
        spellStyle.settings,
        { preview: true, useRarityCapabilities: false }
      );

      debugLog("Actor spell styles applied", {
        strategy: this.constructor.name,
        itemId,
        itemName,
        profileKey: spellStyle.profileKey,
        school: spellStyle.school,
        level: spellStyle.level,
        useLevelVariants: spellStyle.useLevelVariants,
        ...summary,
      });
      return;
    }

    const rarity = getItemRarity(item);
    if (!rarity) {
      clearRarityClasses($itemElement);
      clearInventoryGradient($gradientElement);
      clearInventoryBorder($borderElement);
      clearTitleColor($itemElement, titleSelectors);
      clearDetailsColor($itemElement, detailsSelectors);
      $itemElement.removeClass("scirc-managed-item-row");
      debugLog("Actor item styles cleared (no rarity)", {
        strategy: this.constructor.name,
        itemId,
        itemName,
      });
      return;
    }

    const raritySettings = buildRaritySettings(rarity);
    $itemElement.addClass("scirc-managed-item-row");
    applyRarityClass($itemElement, rarity);

    const summary = this._applyResolvedStyles(
      $itemElement,
      $gradientElement,
      $borderElement,
      titleSelectors,
      detailsSelectors,
      raritySettings,
      { rarity, preview: false, useRarityCapabilities: true }
    );

    debugLog("Actor item styles applied", {
      strategy: this.constructor.name,
      itemId,
      itemName,
      rarity,
      ...summary,
    });
  }
}
