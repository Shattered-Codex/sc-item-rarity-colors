import { registerModuleSettings } from "../settings/settings.js";
import { registerMenus } from "../settings/menus.js";

const MODULE_ID = "sc-item-rarity-colors";

Hooks.once("init", async function () {
  registerModuleSettings(MODULE_ID);
  registerMenus(MODULE_ID);

 const templateHtml = await renderTemplate(`modules/${MODULE_ID}/templates/item-template.html`);

  // Register the partial item preview template.
  Handlebars.registerPartial("item-template", templateHtml);
});