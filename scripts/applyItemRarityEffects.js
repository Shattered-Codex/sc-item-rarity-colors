import { normalizeRarity, getItemRaritySettings, applyRarityStyles, removeRarityStyles } from "./itemRarityHelper.js";

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
    const settings = getItemRaritySettings(rarity, MODULE_ID);
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

  // ---- Hook registrations ----

  // Apply rarity effects whenever an Item sheet is rendered.
  // Add hooks for different systems as needed.
  Hooks.on("renderItemSheet", applyStylesToSheet);
  Hooks.on("renderItemSheet5e", applyStylesToSheet);
  Hooks.on("renderItemSheetV2", applyStylesToSheet);

  // Reapply styles when settings related to this module are updated.
  Hooks.on("setSetting", (module, key) => {
    if (module === MODULE_ID) refreshAllItemSheets();
  });

  // Ensure styles reapply when the new dnd5e v2 sheet refreshes.
  Hooks.on("renderItemSheet5e2", applyStylesToSheet);
}
