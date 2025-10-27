import {
  normalizeRarity,
  getItemRaritySettings,
  applyActorSheetItemRarityGradient,
  clearActorSheetItemRarityGradient,
  applyActorSheetItemBorder,
  clearActorSheetItemBorder
} from "./itemRarityHelper.js";

/**
 * Applies rarity-based visual effects to all items
 * within an actor's inventory sheet.
 *
 * @param {string} MODULE_ID - The module's unique identifier.
 */
export function applyActorInventoryEffects(MODULE_ID) {

  /**
   * Apply rarity effects to a single actor's inventory sheet.
   *
   * @param {Application} actorApp - The rendered actor sheet instance.
   * @param {jQuery|HTMLElement} html - The rendered HTML content of the sheet.
   */
  function applyStylesToActorInventory(actorApp, html) {
    const actor = actorApp.document;

    if (!actor || actor.documentName !== "Actor") return;

    const items = actor.items;
    if (!items?.size) return;

    const enabledGradient = game.settings.get(MODULE_ID, "enableActorInventoryGradientEffects");
    const enabledBorder = game.settings.get(MODULE_ID, "enableActorInventoryBorders");

    // Iterate through all displayed items in the sheet
    $(html)
      .find(".item")
      .each((_, li) => {
        const $li = $(li);

        // Try to get the item ID from dataset attributes
        const itemId = $li.data("documentId") || $li.data("item-id");
        const item = items.get(itemId);
        if (!item) return;

        // Determine and normalize item rarity
        const rarity = normalizeRarity(item.system?.rarity?.value || item.system?.rarity);
        if (!rarity) return;

        // Fetch rarity-based settings (colors, glow intensity, etc.)
        const settings = getItemRaritySettings(rarity, MODULE_ID);
        if (!settings) return;

        // Check if applying gradient effects is enabled.
        if (!enabledGradient) {
          // Clear any existing gradient/background styles.
          clearActorSheetItemRarityGradient($li);
        } else {
          // Apply the gradient background.
          applyActorSheetItemRarityGradient($li, settings);
        }

        const border = $li.find(".item-image.gold-icon");

        if (!enabledBorder) {
          // Clear any existing glowing borders.
          clearActorSheetItemBorder(border);
        } else {
          // Apply a glowing border around rarity icons
          border.each((_, icon) => {
            applyActorSheetItemBorder(icon, settings, 8);
          });
        }
      });
  }

  /**
   * Reapplies rarity effects to all open actor sheets.
   * Triggered when settings are changed.
   */
  function refreshAllActorSheets() {
    for (const app of Object.values(ui.windows)) {
      if (app.document?.documentName === "Actor") {
        applyStylesToActorInventory(app, app.element);
      }
    }
  }

  // ---- Hook registrations ----

  // Apply rarity effects whenever an Actor sheet is rendered.
  // Add hooks for different systems as needed.
  Hooks.on("renderActorSheet", applyStylesToActorInventory);
  Hooks.on("renderActorSheetV2", applyStylesToActorInventory);
  Hooks.on("renderActorSheet5e", applyStylesToActorInventory);

  // Reapply effects when module settings change.
  Hooks.on("setSetting", (module) => {
    if (module === MODULE_ID) refreshAllActorSheets();
  });
}
