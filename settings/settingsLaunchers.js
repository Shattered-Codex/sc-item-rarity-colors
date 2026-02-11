// settings/settingsLaunchers.js
import { ItemRaritySettingsApp } from "../apps/ItemRaritySettingsApp.js";
import { RarityListManagerApp } from "../apps/RarityListManagerApp.js";

// Base launcher class for item rarity settings.
// Uses ApplicationV2 with HandlebarsApplicationMixin for compatibility with FoundryVTT v13+
export class ItemRaritySettingsLauncher extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
  constructor() {
    super();
    // Prevent this window from being registered in ui.windows
    this._rendered = false;
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "sc-item-rarity-launcher",
      template: "modules/sc-item-rarity-colors/templates/empty.html",
      popOut: false,
      minimizable: false,
      resizable: false,
      width: 1,
      height: 1,
      left: -9999, // Position off-screen
      top: -9999,
      classes: ["hidden-launcher"],
    });
  }

  getData() {
    // Return empty data - this launcher doesn't render itself
    return {};
  }

  _openTargetApp(force = false, options = {}) {
    const moduleId = this.constructor.MODULE_ID || ItemRaritySettingsApp.MODULE_ID;
    const app = new ItemRaritySettingsApp("general", {}, moduleId);
    app.render(force, options);
  }

  render(force = false, options = {}) {
    // Don't render the launcher itself - just open ItemRaritySettingsApp directly
    this._openTargetApp(force, options);
    // Return this to satisfy the render contract, but don't actually render
    return this;
  }

  // Override to prevent any internal rendering - this is called by ApplicationV2's render()
  async _render(force = false, options = {}) {
    // Do nothing - prevent ApplicationV2 from rendering a window
    // Mark as rendered to prevent multiple attempts
    this._rendered = true;
    return this;
  }

  // Override _renderHTML to prevent any HTML rendering
  _renderHTML() {
    // Return empty jQuery object - prevents window from showing content
    return Promise.resolve($());
  }

  // Override _replaceHTML to prevent any HTML replacement
  _replaceHTML(element, html) {
    // Do nothing - prevents DOM updates
    return Promise.resolve();
  }

  // Prevent the window from being registered or displayed
  getHTML() {
    // Return empty to prevent template rendering
    return Promise.resolve($());
  }

  // Override lifecycle hooks to prevent window from showing
  async _preFirstRender() {
    // Open ItemRaritySettingsApp before any rendering happens
    await this._openTargetApp(true);
    // Don't call super - prevent any rendering
  }

  onFirstRender() {
    // Remove/hide the element immediately if it was created
    if (this.element?.length) {
      this.element.remove();
      // Also close to clean up
      this.close();
    }
  }

  onRender() {
    // Remove/hide the element if it appears
    if (this.element?.length) {
      this.element.remove();
      this.close();
    }
  }
}

export class ItemRaritySourceSettingsLauncher extends ItemRaritySettingsLauncher {
  _openTargetApp(force = false, options = {}) {
    const moduleId = this.constructor.MODULE_ID || RarityListManagerApp.MODULE_ID;
    const app = new RarityListManagerApp({}, moduleId);
    app.render(force, options);
  }
}
