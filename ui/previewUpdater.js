/**
 * Preview Updater
 * Handles updating the mini item sheet and inventory preview
 */

import { 
  applyRarityStyles,
  applyActorSheetItemBorder,
  clearActorSheetItemBorder,
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
import { buildRaritySettings } from "../core/settingsManager.js";
import { raritySupportsBorderGradient, raritySupportsBorderGlow } from "../core/rarityConfig.js";
import { DEFAULT_COLORS, DEFAULT_GLOW_INTENSITY } from "../core/constants.js";
import { isGradientEffectsEnabled, isBordersEnabled } from "../core/settingsManager.js";

/**
 * Update the mini item sheet preview
 * @param {HTMLElement} formElement - The form element
 * @param {string} rarity - Rarity tier
 */
export function updateMiniSheetPreview(formElement, rarity) {
  const $form = $(formElement);
  const $miniSheet = $form.find(".mini-item-sheet");
  const $inventoryPreview = $form.find(".inventory-preview-item");

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
    applyRarityStyles($sheetContent, settings);
  }

  updateInventoryPreview($form, rarity, settings);
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

  const mainMenuGradientEnabled = isGradientEffectsEnabled();
  const mainMenuBorderEnabled = isBordersEnabled();
  const raritySettings = buildRaritySettings(rarity);
  const raritySupportsGradientForBorder = raritySupportsBorderGradient(rarity);
  const raritySupportsGlowForBorder = raritySupportsBorderGlow(rarity);
  const $inventoryRow = $inventoryPreview.find(".item-row");
  
  if (mainMenuGradientEnabled && itemSheetSettings.enableItemColor) {
    const gradientSettings = {
      backgroundColor: itemSheetSettings.backgroundColor,
      gradientEnabled: itemSheetSettings.gradientEnabled,
      gradientColor: itemSheetSettings.gradientColor,
    };
    applyInventoryGradient($inventoryRow, gradientSettings);
  } else {
    clearInventoryGradient($inventoryRow);
    $inventoryRow.css({ "background": DEFAULT_COLORS.BACKGROUND_DEFAULT });
  }

  const $inventoryImage = $inventoryPreview.find(".item-image");
  
  if (!mainMenuBorderEnabled) {
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
      applyInventoryBorder(icon, borderSettings, DEFAULT_GLOW_INTENSITY);
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
        applyInventoryBorder(icon, borderSettings, DEFAULT_GLOW_INTENSITY);
      });
    } else {
      const borderSettings = {
        backgroundColor: borderColor,
        gradientColor: borderColor,
        gradientEnabled: false,
        glowEnabled: false,
      };
      $inventoryImage.each((_, icon) => {
        applyInventoryBorder(icon, borderSettings, DEFAULT_GLOW_INTENSITY);
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
      applyTitleColor($inventoryPreview, titleColor, titleSelectors);
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
      applyDetailsColor($inventoryPreview, detailsColor, detailsSelectors);
    });
  } else {
    requestAnimationFrame(() => {
      clearDetailsColor($inventoryPreview, detailsSelectors);
    });
  }
}

