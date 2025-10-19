// settings/launchers.js
import { DynamicApp } from "../apps/DynamicApp.js";

// Base launcher class for item rarity settings.
export class BaseItemSettingsLauncher extends FormApplication {
  constructor(context) {
    super();
    this.context = context;
  }

  render() {
    new DynamicApp(this.context, {}, this.constructor.MODULE_ID).render(true);
    return null;
  }
}

// Specific launchers for each item rarity tier.
export class CommonItemSettingsLauncher extends BaseItemSettingsLauncher { constructor() { super("common"); } }
export class UncommonItemSettingsLauncher extends BaseItemSettingsLauncher { constructor() { super("uncommon"); } }
export class RareItemSettingsLauncher extends BaseItemSettingsLauncher { constructor() { super("rare"); } }
export class VeryRareItemSettingsLauncher extends BaseItemSettingsLauncher { constructor() { super("very-rare"); } }
export class LegendaryItemSettingsLauncher extends BaseItemSettingsLauncher { constructor() { super("legendary"); } }
export class ArtifactItemSettingsLauncher extends BaseItemSettingsLauncher { constructor() { super("artifact"); } }