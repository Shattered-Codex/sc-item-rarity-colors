import { SpellSchoolSettingsApp } from "../apps/SpellSchoolSettingsApp.js";
import { ItemRaritySettingsLauncher } from "./ItemRaritySettingsLauncher.js";

/** Settings menu entry that opens the spell school editor. */
export class SpellSchoolSettingsLauncher extends ItemRaritySettingsLauncher {
  _openTargetApp(force = false, options = {}) {
    const moduleId = this.constructor.MODULE_ID || SpellSchoolSettingsApp.MODULE_ID;
    const app = new SpellSchoolSettingsApp("general", {}, moduleId);
    app.render(force, options);
  }
}
