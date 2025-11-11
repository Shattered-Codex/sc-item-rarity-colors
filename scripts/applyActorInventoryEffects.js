/**
 * Actor Inventory Effects Application
 * Applies rarity-based visual effects to items within actor inventory sheets
 */

import { normalizeRarity } from "./itemRarityHelper.js";
import { getSheetType } from "./sheetDetectionHelper.js";
import { getSheetStrategy } from "../sheets/sheetStrategies.js";
import { isGradientEffectsEnabled, isBordersEnabled } from "../core/settingsManager.js";

/**
 * Apply rarity effects to all items in an actor sheet
 * 
 * @param {Application} actorApp - The rendered actor sheet instance
 * @param {jQuery|HTMLElement} html - The rendered HTML content of the sheet
 * @param {string} moduleId - Module identifier
 */
function applyStylesToActorInventory(actorApp, html, moduleId) {
  const actor = actorApp.document;

  if (!actor || actor.documentName !== "Actor") return;

  const items = actor.items;
  if (!items?.size) return;

  // Detect sheet type and get appropriate strategy
  const sheetType = getSheetType(actorApp) || getSheetType(html);
  const strategy = getSheetStrategy(sheetType);

  // Get main menu settings
  const mainMenuSettings = {
    enabledGradient: isGradientEffectsEnabled(),
    enabledBorder: isBordersEnabled(),
  };

  // Get item selector for this sheet type
  const itemSelector = strategy.getItemSelector();

  // Iterate through all displayed items
  $(html)
    .find(itemSelector)
    .each((_, itemElement) => {
      const $itemElement = $(itemElement);
      const itemId = strategy.extractItemId($itemElement);
      const item = items.get(itemId);
      
      if (!item) return;

      // Apply styles using the strategy
      strategy.applyItemStyles($itemElement, item, mainMenuSettings, moduleId);
    });
}

/**
 * Reapply rarity effects to all open actor sheets
 * Triggered when settings are changed
 */
function refreshAllActorSheets(moduleId) {
  for (const app of Object.values(ui.windows)) {
    if (app.document?.documentName === "Actor") {
      applyStylesToActorInventory(app, app.element, moduleId);
    }
  }
}

/**
 * Initialize actor inventory effects for a module
 * 
 * @param {string} moduleId - Module identifier
 */
export function applyActorInventoryEffects(moduleId) {
  /**
   * Handle actor sheet render
   * @param {Application} actorApp - The rendered actor sheet instance
   * @param {jQuery|HTMLElement} html - The rendered HTML content
   */
  function handleActorSheetRender(actorApp, html) {
    applyStylesToActorInventory(actorApp, html, moduleId);
  }

  // Apply rarity effects whenever an Actor sheet is rendered
  Hooks.on("renderActorSheet", handleActorSheetRender);
  Hooks.on("renderActorSheetV2", handleActorSheetRender);
  Hooks.on("renderActorSheet5e", handleActorSheetRender);

  // Reapply effects when module settings change
  Hooks.on("setSetting", (module) => {
    if (module === moduleId) {
      refreshAllActorSheets(moduleId);
    }
  });
}
