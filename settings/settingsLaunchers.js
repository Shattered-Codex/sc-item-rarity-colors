// settings/settingsLaunchers.js
import { ItemRaritySettingsApp } from "../apps/ItemRaritySettingsApp.js";
import { RarityListManagerApp } from "../apps/RarityListManagerApp.js";
import { SpellSchoolSettingsApp } from "../apps/SpellSchoolSettingsApp.js";

// Base launcher class — intercepts Foundry's render call and opens the real app instead.
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

export class ItemRaritySourceSettingsLauncher extends ItemRaritySettingsLauncher {
  _openTargetApp(force = false, options = {}) {
    const moduleId = this.constructor.MODULE_ID || RarityListManagerApp.MODULE_ID;
    const app = new RarityListManagerApp({}, moduleId);
    app.render(force, options);
  }
}

export class SpellSchoolSettingsLauncher extends ItemRaritySettingsLauncher {
  _openTargetApp(force = false, options = {}) {
    const moduleId = this.constructor.MODULE_ID || SpellSchoolSettingsApp.MODULE_ID;
    const app = new SpellSchoolSettingsApp("general", {}, moduleId);
    app.render(force, options);
  }
}
