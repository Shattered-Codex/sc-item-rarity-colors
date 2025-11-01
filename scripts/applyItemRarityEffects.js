import { normalizeRarity, applyRarityStyles, removeRarityStyles } from "./itemRarityHelper.js";
import { buildRaritySettings } from "../core/settingsManager.js";
import { MODULE_ID } from "../core/constants.js";

/**
 * Applies rarity-based visual effects to item sheets.
 *
 * @param {string} MODULE_ID - The module's unique identifier.
 */
export function applyItemRarityEffects(MODULE_ID) {

  /**
   * Apply rarity styles to a given item sheet.
   *
   * @param {Application} app - The rendered application instance.
   * @param {jQuery|HTMLElement} html - The rendered HTML element.
   */
  function applyStylesToSheet(app, html) {
    const item = app.document;
    if (!item || item.documentName !== "Item") return;

    // Normalize rarity value (handles both new and legacy system fields)
    const rarity = normalizeRarity(item.system?.rarity?.value || item.system?.rarity);

    // Find the sheet root element
    const sheetEl = html[0]?.closest?.(".application.sheet.item") || html[0];
    if (!sheetEl) return;

    // If no rarity, remove all rarity styles and restore default
    if (!rarity) {
      removeRarityStyles(sheetEl);
      return;
    }

    // Retrieve rarity-specific settings (colors, gradients, etc.)
    const settings = buildRaritySettings(rarity);
    if (!settings) return;

    // Apply visual styles (border, glow, etc.)
    applyRarityStyles(sheetEl, settings);
  }

  /**
   * Refresh all open item sheets to reapply rarity styles.
   * Useful after settings change or system updates.
   */
  function refreshAllItemSheets() {
    for (const app of Object.values(ui.windows)) {
      if (app.document?.documentName === "Item") {
        applyStylesToSheet(app, app.element);
      }
    }
  }

  // Hook registrations
  Hooks.on("renderItemSheet", applyStylesToSheet);
  Hooks.on("renderItemSheet5e", applyStylesToSheet);
  Hooks.on("renderItemSheetV2", applyStylesToSheet);
  Hooks.on("renderItemSheet5e2", applyStylesToSheet);

  Hooks.on("setSetting", (module) => {
    if (module === MODULE_ID) refreshAllItemSheets();
  });
}
