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
  void maybeShowSupportCard();
});

async function maybeShowSupportCard() {
  if (!game.user?.isGM) return;
  if (!game.settings.settings.has(`${MODULE_ID}.supportCardDisabled`)) return;

  const isDisabled = game.settings.get(MODULE_ID, "supportCardDisabled");
  if (isDisabled) return;

  const userId = game.user?._id ?? game.user?.id ?? game.userId;

  await ChatMessage.create({
    user: userId,
    speaker: ChatMessage.getSpeaker(),
    content: buildSupportCard(),
  });

  await game.settings.set(MODULE_ID, "supportCardDisabled", true);
}

function buildSupportCard() {
  return `
    <div style="padding: 5px;">
      <div style="color: #e7e7e7; padding: 10px; background-color: #212121; border: 3px solid #18c26a; border-radius: 10px;">
        <h2 style="margin: 0 0 10px 0; text-align: center; color: #ffffff;">SC Item Rarity Colors</h2>
        <p style="text-align: center;">
          <a href="https://www.patreon.com/c/shatteredcodex" target="_blank" rel="noopener">
            <img src="modules/sc-item-rarity-colors/assets/imgs/shattered-codex.png" alt="Shattered Codex" style="display: block; margin: 0 auto;">
          </a>
        </p>
        <hr>
        <div>
          <p style="text-align: justify;">Support us on Patreon to help us keep creating.</p>
          <p style="text-align: justify;">There you can find exclusive modules and content from Shattered Codex.</p>
          <p style="text-align: center; line-height: 150%;">
            <a href="https://www.patreon.com/c/shatteredcodex" target="_blank" rel="noopener">Patreon</a>
          </p>
        </div>
        <hr>
        <div style="font-style: italic;">
          <p style="text-align: justify;">This chat card will only be shown once. Enable it again in the settings if needed.</p>
        </div>
      </div>
    </div>
  `;
}
