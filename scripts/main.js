import { registerModuleSettings } from "../settings/settingsRegistration.js";
import { registerMenus } from "../settings/settingsMenus.js";
import { applyItemRarityEffects } from "./applyItemRarityEffects.js";
import { applyActorInventoryEffects } from "./applyActorInventoryEffects.js";
import { registerModulePartials } from "./partialsHelper.js";
import { MODULE_ID } from "../core/constants.js";

/**
 * - Registers module settings and menus.
 * - Registers partial templates for use in item sheets.
 */
Hooks.once("init", async () => {
  // Register Handlebars helper for equality comparison
  Handlebars.registerHelper('eq', function(a, b) {
    return a === b;
  });

  // Register Handlebars helper for greater than comparison
  Handlebars.registerHelper('gt', function(a, b) {
    return a > b;
  });

  // Register Handlebars helper for array length
  Handlebars.registerHelper('length', function(array) {
    return array ? array.length : 0;
  });

  registerModuleSettings(MODULE_ID);
  registerMenus(MODULE_ID);

  // Register all partial templates for this module.
  await registerModulePartials(MODULE_ID, [
    "item-template.html",
    // Add more templates here later if needed.
  ]);
});

/**
 * - Applies visual and data-driven effects based on item rarity.
 * - Extends inventory display and logic.
 */
Hooks.once("ready", () => {
  applyItemRarityEffects(MODULE_ID);
  applyActorInventoryEffects(MODULE_ID);
});
