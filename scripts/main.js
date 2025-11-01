import { registerModuleSettings } from "../settings/settingsRegistration.js";
import { registerMenus } from "../settings/settingsMenus.js";
import { applyItemRarityEffects } from "./applyItemRarityEffects.js";
import { applyActorInventoryEffects } from "./applyActorInventoryEffects.js";
import { registerModulePartials } from "./partialsHelper.js";

// Define the unique ID of this module for consistent referencing.
const MODULE_ID = "sc-item-rarity-colors";

/**
 * - Registers module settings and menus.
 * - Registers partial templates for use in item sheets.
 */
Hooks.once("init", async () => {
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
