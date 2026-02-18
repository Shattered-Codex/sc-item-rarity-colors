/**
 * Actor Inventory Effects Application
 * Applies rarity-based visual effects to items within actor inventory sheets
 */

import { getSheetType } from "./sheetDetectionHelper.js";
import { getSheetStrategy } from "../sheets/sheetStrategies.js";
import { isModuleSettingChange, registerSettingChangeHooks } from "../core/settingChangeHelper.js";
import { debugLog, debugWarn } from "../core/debug.js";
import { ensureRuntimeRarityStyles } from "../core/runtimeRarityStyles.js";

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

  // Get item selector for this sheet type
  const itemSelector = strategy.getItemSelector();
  const itemElements = $(html).find(itemSelector);
  let appliedCount = 0;
  let missingItemIdCount = 0;
  let missingItemCount = 0;

  // Iterate through all displayed items
  itemElements
    .each((_, itemElement) => {
      const $itemElement = $(itemElement);
      const itemId = strategy.extractItemId($itemElement);
      if (!itemId) {
        missingItemIdCount += 1;
        return;
      }
      const item = items.get(itemId);
      
      if (!item) {
        missingItemCount += 1;
        return;
      }

      // Apply styles using the strategy
      strategy.applyItemStyles($itemElement, item, moduleId);
      appliedCount += 1;
    });

  debugLog("Actor inventory styles pass complete", {
    actorId: actor.id ?? null,
    actorName: actor.name ?? null,
    sheetType,
    selector: itemSelector,
    renderedRows: itemElements.length,
    actorItems: items.size,
    appliedCount,
    missingItemIdCount,
    missingItemCount,
  });

  if (missingItemIdCount > 0) {
    debugWarn("Actor inventory rows without item id detected", {
      actorId: actor.id ?? null,
      actorName: actor.name ?? null,
      missingItemIdCount,
      sheetType,
    });
  }
}

/**
 * Reapply rarity effects to all open actor sheets
 * Triggered when settings are changed
 */
function refreshAllActorSheets(moduleId) {
  let refreshedCount = 0;
  for (const app of Object.values(ui.windows)) {
    if (app.document?.documentName === "Actor") {
      applyStylesToActorInventory(app, app.element, moduleId);
      refreshedCount += 1;
    }
  }
  debugLog("Refreshed all open actor sheets", { refreshedCount });
}

/**
 * Initialize actor inventory effects for a module
 * 
 * @param {string} moduleId - Module identifier
 */
export function applyActorInventoryEffects(moduleId) {
  ensureRuntimeRarityStyles(moduleId);
  /**
   * Handle actor sheet render
   * @param {Application} actorApp - The rendered actor sheet instance
   * @param {jQuery|HTMLElement} html - The rendered HTML content
   */
  function handleActorSheetRender(actorApp, html) {
    debugLog("Actor sheet render detected", {
      actorId: actorApp?.document?.id ?? null,
      actorName: actorApp?.document?.name ?? null,
      appId: actorApp?.id ?? null,
    });
    applyStylesToActorInventory(actorApp, html, moduleId);
  }

  // Apply rarity effects whenever an Actor sheet is rendered
  Hooks.on("renderActorSheet", handleActorSheetRender);
  Hooks.on("renderActorSheetV2", handleActorSheetRender);
  Hooks.on("renderActorSheet5e", handleActorSheetRender);

  // Reapply effects when module settings change
  registerSettingChangeHooks((moduleOrSetting, maybeKey) => {
    if (!isModuleSettingChange(moduleOrSetting, maybeKey, moduleId)) return;
    ensureRuntimeRarityStyles(moduleId);
    debugLog("setting change matched module for actor inventory; refreshing actor sheets");
    refreshAllActorSheets(moduleId);
  });

  debugLog("Actor inventory rarity hooks registered");
}
