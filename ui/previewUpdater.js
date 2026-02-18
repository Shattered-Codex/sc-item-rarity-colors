/**
 * Preview Updater
 * Handles updating the mini item sheet and inventory preview
 */

import { 
  applyRarityStyles,
} from "../scripts/itemRarityHelper.js";
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
import { applyRarityClass, clearRarityClasses } from "../core/runtimeRarityStyles.js";
import { raritySupportsBorderGradient, raritySupportsBorderGlow } from "../core/rarityConfig.js";
import { DEFAULT_COLORS, DEFAULT_GLOW_INTENSITY } from "../core/constants.js";

/**
 * Update the mini item sheet preview
 * @param {HTMLElement} formElement - The form element
 * @param {string} rarity - Rarity tier
 */
export function updateMiniSheetPreview(formElement, rarity) {
  const $form = $(formElement);
  const $miniSheet = $form.find(".mini-item-sheet");

  if (!$miniSheet.length) return;

  const enableItemColor = $form.find(`input[type="checkbox"][name="${rarity}-enable-item-color"]`).is(":checked");
  const backgroundColor = $form.find(`input[type="color"][name="${rarity}-item-color"]`).val();
  const enableTextColor = $form.find(`input[type="checkbox"][name="${rarity}-enable-text-color"]`).is(":checked");
  const textColor = $form.find(`input[type="color"][name="${rarity}-text-color"]`).val();
  const gradientEnabled = $form.find(`input[type="checkbox"][name="${rarity}-gradient-option"]`).is(":checked");
  const gradientColor = $form.find(`input[type="color"][name="${rarity}-secondary-item-color"]`).val();
  const glowEnabled = $form.find(`input[type="checkbox"][name="${rarity}-glow-option"]`).is(":checked");

  const settings = {
    enableItemColor,
    backgroundColor: backgroundColor || DEFAULT_COLORS.BACKGROUND_FALLBACK,
    enableTextColor,
    itemSheetTextColor: textColor || DEFAULT_COLORS.TEXT_DEFAULT,
    gradientEnabled,
    gradientColor: gradientColor || DEFAULT_COLORS.BACKGROUND_FALLBACK,
    glowEnabled,
  };

  const $sheetContent = $miniSheet.find(".application.sheet.item");
  if ($sheetContent.length) {
    applyRarityStyles($sheetContent, settings, { rarity, preview: true });
  }

  updateInventoryPreview($form, rarity, settings);
  updateFoundryInterfacePreview($form, rarity, settings);
}

/**
 * Update the inventory item preview
 * @param {jQuery|HTMLElement} formElement - The form element
 * @param {string} rarity - Rarity tier
 * @param {object} itemSheetSettings - Settings from item sheet
 */
function updateInventoryPreview(formElement, rarity, itemSheetSettings) {
  const $form = $(formElement);
  const $inventoryPreview = $form.find(".inventory-preview-item");
  
  if (!$inventoryPreview.length) return;

  const enableTitleColor = $form.find(`input[type="checkbox"][name="${rarity}-enable-inventory-title-color"]`).is(":checked");
  const titleColorInput = $form.find(`input[type="color"][name="${rarity}-inventory-title-color"]`);
  const titleColor = titleColorInput.length ? titleColorInput.val() : DEFAULT_COLORS.TEXT_DEFAULT;
  
  const enableDetailsColor = $form.find(`input[type="checkbox"][name="${rarity}-enable-inventory-details-color"]`).is(":checked");
  const detailsColorInput = $form.find(`input[type="color"][name="${rarity}-inventory-details-color"]`);
  const detailsColor = detailsColorInput.length ? detailsColorInput.val() : DEFAULT_COLORS.TEXT_DEFAULT;

  const enableBorderColor = $form.find(`input[type="checkbox"][name="${rarity}-enable-inventory-border-color"]`).is(":checked");
  const borderColorInput = $form.find(`input[type="color"][name="${rarity}-inventory-border-color"]`);
  const borderColor = borderColorInput.length ? borderColorInput.val() : DEFAULT_COLORS.BACKGROUND_FALLBACK;
  
  const borderSecondaryColorInput = $form.find(`input[type="color"][name="${rarity}-inventory-border-secondary-color"]`);
  const borderSecondaryColor = borderSecondaryColorInput.length ? borderSecondaryColorInput.val() : undefined;
  
  const enableBorderGlowCheckbox = $form.find(`input[type="checkbox"][name="${rarity}-enable-inventory-border-glow"]`);
  const enableBorderGlow = enableBorderGlowCheckbox.length ? enableBorderGlowCheckbox.is(":checked") : false;
  const enableInventoryGradientEffects = $form.find(`input[type="checkbox"][name="${rarity}-enable-inventory-gradient-effects"]`).is(":checked");
  const enableInventoryBorders = $form.find(`input[type="checkbox"][name="${rarity}-enable-inventory-borders"]`).is(":checked");

  const raritySupportsGradientForBorder = raritySupportsBorderGradient(rarity);
  const raritySupportsGlowForBorder = raritySupportsBorderGlow(rarity);
  const $inventoryRow = $inventoryPreview.find(".item-row");
  
  if (enableInventoryGradientEffects && itemSheetSettings.enableItemColor) {
    const gradientSettings = {
      backgroundColor: itemSheetSettings.backgroundColor,
      gradientEnabled: itemSheetSettings.gradientEnabled,
      gradientColor: itemSheetSettings.gradientColor,
    };
    applyInventoryGradient($inventoryRow, gradientSettings, { rarity, preview: true });
  } else {
    clearInventoryGradient($inventoryRow);
  }

  const $inventoryImage = $inventoryPreview.find(".item-image");
  
  if (!enableInventoryBorders) {
    clearInventoryBorder($inventoryImage);
  } else if (itemSheetSettings.enableItemColor) {
    const borderSettings = {
      ...itemSheetSettings,
      backgroundColor: itemSheetSettings.backgroundColor,
      gradientColor: itemSheetSettings.gradientColor,
      gradientEnabled: itemSheetSettings.gradientEnabled,
      glowEnabled: itemSheetSettings.glowEnabled,
    };
      $inventoryImage.each((_, icon) => {
      applyInventoryBorder(icon, borderSettings, DEFAULT_GLOW_INTENSITY, { rarity, preview: true });
    });
  } else if (enableBorderColor && borderColor) {
    if (raritySupportsGradientForBorder) {
      const hasSecondaryColor = borderSecondaryColor && borderSecondaryColor !== borderColor;
      const secondaryColor = hasSecondaryColor ? borderSecondaryColor : borderColor;

      const borderSettings = {
        backgroundColor: borderColor,
        gradientColor: secondaryColor,
        gradientEnabled: hasSecondaryColor && (!enableBorderGlow || !raritySupportsGlowForBorder),
        glowEnabled: enableBorderGlow && hasSecondaryColor && raritySupportsGlowForBorder,
      };
      $inventoryImage.each((_, icon) => {
        applyInventoryBorder(icon, borderSettings, DEFAULT_GLOW_INTENSITY, { rarity, preview: true });
      });
    } else {
      const borderSettings = {
        backgroundColor: borderColor,
        gradientColor: borderColor,
        gradientEnabled: false,
        glowEnabled: false,
      };
      $inventoryImage.each((_, icon) => {
        applyInventoryBorder(icon, borderSettings, DEFAULT_GLOW_INTENSITY, { rarity, preview: true });
      });
    }
  } else {
    clearInventoryBorder($inventoryImage);
  }

  const titleSelectors = [
    ".item-name .name-stacked .title",
    ".item-name .name-stacked .subtitle",
    ".item-name",
    ".item-name a",
  ];
  if (enableTitleColor && titleColor) {
    requestAnimationFrame(() => {
      applyTitleColor($inventoryPreview, titleColor, titleSelectors, { preview: true });
      applyRarityClass($inventoryPreview.find(".item-row"), rarity);
    });
  } else {
    requestAnimationFrame(() => {
      clearTitleColor($inventoryPreview, titleSelectors);
    });
  }

  const detailsSelectors = [
    ".item-detail",
    ".item-detail .value",
    ".item-detail .sign",
    ".item-detail .formula",
    ".item-detail .separator",
    ".item-detail .max",
    ".item-detail .currency",
    ".item-detail input",
    ".item-detail i",
  ];
  if (enableDetailsColor && detailsColor) {
    requestAnimationFrame(() => {
      applyDetailsColor($inventoryPreview, detailsColor, detailsSelectors, { preview: true });
      applyRarityClass($inventoryPreview.find(".item-row"), rarity);
    });
  } else {
    requestAnimationFrame(() => {
      clearDetailsColor($inventoryPreview, detailsSelectors);
    });
  }
}

/**
 * Update the Foundry Item Directory preview row
 * @param {jQuery|HTMLElement} formElement - The form element
 * @param {string} rarity - Rarity tier
 * @param {object} itemSheetSettings - Settings from item sheet
 */
function updateFoundryInterfacePreview(formElement, rarity, itemSheetSettings) {
  const $form = $(formElement);
  const $foundryPreview = $form.find(".foundry-interface-preview");
  if (!$foundryPreview.length) return;

  const enableFoundryGradient = $form.find(`input[type="checkbox"][name="${rarity}-enable-foundry-interface-gradient-effects"]`).is(":checked");
  const enableFoundryTextColor = $form.find(`input[type="checkbox"][name="${rarity}-enable-foundry-interface-text-color"]`).is(":checked");
  const foundryTextColorInput = $form.find(`input[type="color"][name="${rarity}-foundry-interface-text-color"]`);
  const foundryTextColor = foundryTextColorInput.length ? foundryTextColorInput.val() : DEFAULT_COLORS.TEXT_DEFAULT;

  const $directoryItem = $foundryPreview.find(".directory-item.is-target");
  if (!$directoryItem.length) return;
  const $otherDirectoryItems = $foundryPreview.find(".directory-item").not($directoryItem);

  const clearDirectoryPreviewRow = ($rows) => {
    $rows.removeClass("scirc-dir-gradient-enabled scirc-dir-text-enabled");
    clearRarityClasses($rows);
    $rows.each((_, row) => {
      if (!row) return;
      // Legacy inline cleanup.
      row.style.removeProperty("--scirc-dir-bg-primary");
      row.style.removeProperty("--scirc-dir-bg-secondary");
      row.style.removeProperty("--scirc-dir-bg-fallback");
      row.style.removeProperty("--scirc-dir-text-color");
      row.style.removeProperty("background");
      row.style.removeProperty("color");
      row.style.removeProperty("text-shadow");
    });
  };

  clearDirectoryPreviewRow($otherDirectoryItems);
  clearDirectoryPreviewRow($directoryItem);

  if (enableFoundryGradient && itemSheetSettings.enableItemColor) {
    const primaryColor = itemSheetSettings.backgroundColor || DEFAULT_COLORS.BACKGROUND_FALLBACK;
    const secondaryColor = itemSheetSettings.gradientEnabled
      && itemSheetSettings.gradientColor
      && itemSheetSettings.gradientColor !== DEFAULT_COLORS.BACKGROUND_FALLBACK
      ? itemSheetSettings.gradientColor
      : "#252830";
    applyRarityClass($directoryItem, rarity);
    $directoryItem.addClass("scirc-dir-gradient-enabled");
    $directoryItem.css("--scirc-dir-bg-primary", primaryColor);
    $directoryItem.css("--scirc-dir-bg-secondary", secondaryColor);
    $directoryItem.css("--scirc-dir-bg-fallback", DEFAULT_COLORS.BACKGROUND_DEFAULT);
  } else {
    $directoryItem.removeClass("scirc-dir-gradient-enabled");
  }

  if (enableFoundryTextColor && foundryTextColor) {
    applyRarityClass($directoryItem, rarity);
    $directoryItem.addClass("scirc-dir-text-enabled");
    $directoryItem.css("--scirc-dir-text-color", foundryTextColor);
  } else {
    $directoryItem.removeClass("scirc-dir-text-enabled");
    $directoryItem.css("--scirc-dir-text-color", "");
  }
}
