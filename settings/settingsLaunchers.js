// settings/settingsLaunchers.js
import { ItemRaritySettingsApp } from "../apps/ItemRaritySettingsApp.js";

// Base launcher class for item rarity settings.
// Uses ApplicationV2 with HandlebarsApplicationMixin for compatibility with FoundryVTT v13+
export class BaseItemSettingsLauncher extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
  constructor(context) {
    super();
    this.context = context;
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

  render(force = false, options = {}) {
    // Don't render the launcher itself - just open ItemRaritySettingsApp directly
    const moduleId = this.constructor.MODULE_ID || ItemRaritySettingsApp.MODULE_ID;
    const app = new ItemRaritySettingsApp(this.context, {}, moduleId);
    app.render(force, options);
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
    const moduleId = this.constructor.MODULE_ID || ItemRaritySettingsApp.MODULE_ID;
    const app = new ItemRaritySettingsApp(this.context, {}, moduleId);
    await app.render(true);
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

// Specific launchers for each item rarity tier.
export class CommonItemSettingsLauncher extends BaseItemSettingsLauncher { constructor() { super("common"); } }
export class UncommonItemSettingsLauncher extends BaseItemSettingsLauncher { constructor() { super("uncommon"); } }
export class RareItemSettingsLauncher extends BaseItemSettingsLauncher { constructor() { super("rare"); } }
export class VeryRareItemSettingsLauncher extends BaseItemSettingsLauncher { constructor() { super("veryrare"); } }
export class LegendaryItemSettingsLauncher extends BaseItemSettingsLauncher { constructor() { super("legendary"); } }
export class ArtifactItemSettingsLauncher extends BaseItemSettingsLauncher { constructor() { super("artifact"); } }

