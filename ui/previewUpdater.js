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
import { scheduleOnNextAnimationFrame } from "../core/refreshScheduler.js";
import { Tidy5eSheetStrategy } from "../sheets/strategies/Tidy5eSheetStrategy.js";

const tidyStrategy = new Tidy5eSheetStrategy();

/**
 * Update the mini item sheet preview
 * @param {HTMLElement} formElement - The form element
 * @param {string} rarity - Rarity tier, or the spell profile key
 * @param {object} [options]
 * @param {boolean} [options.isSpell=false] - Spell profiles skip rarity capability checks, as at runtime.
 */
export function updateMiniSheetPreview(formElement, rarity, options = {}) {
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
  const tidyBackgroundArea = $form.find(`select[name="${rarity}-tidy-background-area"]`).val() || "content";
  const enableGoldAccentColor = $form.find(`input[type="checkbox"][name="${rarity}-enable-gold-accent-color"]`).is(":checked");
  const goldAccentColor = $form.find(`input[type="color"][name="${rarity}-gold-accent-color"]`).val();
  const enableTableHeaderColor = $form.find(`input[type="checkbox"][name="${rarity}-enable-table-header-color"]`).is(":checked");
  const tableHeaderColor = $form.find(`input[type="color"][name="${rarity}-table-header-color"]`).val();
  const enableTableHeaderTextColor = $form.find(`input[type="checkbox"][name="${rarity}-enable-table-header-text-color"]`).is(":checked");
  const tableHeaderTextColor = $form.find(`input[type="color"][name="${rarity}-table-header-text-color"]`).val();

  const settings = {
    enableItemColor,
    backgroundColor: backgroundColor || DEFAULT_COLORS.BACKGROUND_FALLBACK,
    enableTextColor,
    itemSheetTextColor: textColor || DEFAULT_COLORS.TEXT_DEFAULT,
    gradientEnabled,
    gradientColor: gradientColor || DEFAULT_COLORS.BACKGROUND_FALLBACK,
    glowEnabled,
    tidyBackgroundArea,
    enableGoldAccentColor,
    goldAccentColor,
    enableTableHeaderColor,
    tableHeaderColor,
    enableTableHeaderTextColor,
    tableHeaderTextColor,
  };

  // One call per sheet: the D&D 5e and Tidy previews need different text
  // color strategies, which are detected from the element they are given.
  $miniSheet.find(".application.sheet.item").each((_, sheet) => {
    applyRarityStyles($(sheet), settings, { rarity, preview: true });
  });

  updateInventoryPreview($form, rarity, settings);
  updateTidyInventoryPreview($form, rarity, settings, options);
  updateFoundryInterfacePreview($form, rarity, settings);
}

/**
 * Update the Tidy 5e inventory row through the same strategy the actor sheet
 * uses at runtime, so the preview cannot drift from the real result.
 */
function updateTidyInventoryPreview($form, rarity, itemSheetSettings, options = {}) {
  const $rows = $form.find(".tidy-inventory-preview .tidy-table-row-container");
  if (!$rows.length) return;

  const isChecked = (key) => $form.find(`input[type="checkbox"][name="${rarity}-${key}"]`).is(":checked");
  const colorOf = (key, fallback) => $form.find(`input[type="color"][name="${rarity}-${key}"]`).val() || fallback;

  const settings = {
    ...itemSheetSettings,
    enableInventoryGradientEffects: isChecked("enable-inventory-gradient-effects"),
    enableInventoryBorders: isChecked("enable-inventory-borders"),
    enableInventoryBorderColor: isChecked("enable-inventory-border-color"),
    inventoryBorderColor: colorOf("inventory-border-color", DEFAULT_COLORS.BACKGROUND_FALLBACK),
    inventoryBorderSecondaryColor: colorOf("inventory-border-secondary-color", undefined),
    enableInventoryBorderGlow: isChecked("enable-inventory-border-glow"),
    enableInventoryTitleColor: isChecked("enable-inventory-title-color"),
    inventoryTitleColor: colorOf("inventory-title-color", DEFAULT_COLORS.TEXT_DEFAULT),
    enableInventoryDetailsColor: isChecked("enable-inventory-details-color"),
    inventoryDetailsColor: colorOf("inventory-details-color", DEFAULT_COLORS.TEXT_DEFAULT),
  };

  const isSpell = options.isSpell === true;
  $rows.each((_, row) => {
    const $row = $(row);
    $row.addClass("scirc-managed-item-row");
    if (isSpell) clearRarityClasses($row);
    else applyRarityClass($row, rarity);

    tidyStrategy._applyResolvedStyles(
      $row,
      tidyStrategy.getGradientElement($row),
      tidyStrategy.getBorderElement($row),
      tidyStrategy.getTitleSelectors(),
      tidyStrategy.getDetailsSelectors(),
      settings,
      isSpell
        ? { preview: true, useRarityCapabilities: false }
        : { rarity, preview: true, useRarityCapabilities: true }
    );
  });
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
    scheduleOnNextAnimationFrame(() => {
      applyTitleColor($inventoryPreview, titleColor, titleSelectors, { preview: true });
      applyRarityClass($inventoryPreview.find(".item-row"), rarity);
    });
  } else {
    scheduleOnNextAnimationFrame(() => {
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
    scheduleOnNextAnimationFrame(() => {
      applyDetailsColor($inventoryPreview, detailsColor, detailsSelectors, { preview: true });
      applyRarityClass($inventoryPreview.find(".item-row"), rarity);
    });
  } else {
    scheduleOnNextAnimationFrame(() => {
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
