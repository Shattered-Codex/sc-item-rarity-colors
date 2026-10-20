import { ItemRaritySettingsApp } from "../apps/ItemRaritySettingsApp.js";

/**
 * Settings menu entry: Foundry instantiates the menu `type` and renders it;
 * this opens the item rarity editor instead of a window of its own.
 */
export class ItemRaritySettingsLauncher extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
  _openTargetApp(force = false, options = {}) {
    const moduleId = this.constructor.MODULE_ID || ItemRaritySettingsApp.MODULE_ID;
    const app = new ItemRaritySettingsApp("general", {}, moduleId);
    app.render(force, options);
  }

  render(force = false, options = {}) {
    this._openTargetApp(force, options);
    return this;
  }

  // Safety net: prevent ApplicationV2 from rendering a window if render() is bypassed.
  _render() {
    return this;
  }
}
