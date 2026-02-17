import { MODULE_ID } from "../core/constants.js";
import {
  applyMergedRarityConfigToDnd5e,
  RARITY_LIST_ENABLED_SETTING_KEY,
  RARITY_LIST_SETTING_KEY,
} from "../core/rarityListConfig.js";
import { getSettingKeyFromHookPayload } from "../core/settingChangeHelper.js";
import { registerMenus } from "../settings/settingsMenus.js";
import { registerModuleSettings } from "../settings/settingsRegistration.js";
import { applyActorInventoryEffects } from "./applyActorInventoryEffects.js";
import { applyItemDirectoryEffects } from "./applyItemDirectoryEffects.js";
import { applyItemRarityEffects } from "./applyItemRarityEffects.js";
import { registerModulePartials } from "./partialsHelper.js";
import { maybeShowSupportCard } from "./supportCard.js";

export async function onInit() {
  Handlebars.registerHelper("eq", function(a, b) {
    return a === b;
  });

  Handlebars.registerHelper("gt", function(a, b) {
    return a > b;
  });

  Handlebars.registerHelper("length", function(array) {
    return array ? array.length : 0;
  });

  registerModuleSettings(MODULE_ID);
  registerMenus(MODULE_ID);
  applyMergedRarityConfigToDnd5e(MODULE_ID);

  await registerModulePartials(MODULE_ID, [
    "item-template.html",
  ]);
}

export function onSetup() {
  applyMergedRarityConfigToDnd5e(MODULE_ID);
}

export function onReady() {
  applyMergedRarityConfigToDnd5e(MODULE_ID);
  applyItemRarityEffects(MODULE_ID);
  applyActorInventoryEffects(MODULE_ID);
  applyItemDirectoryEffects(MODULE_ID);
  void maybeShowSupportCard();
}

export function onSettingChange(moduleOrSetting, maybeKey) {
  const fullSettingKey = getSettingKeyFromHookPayload(moduleOrSetting, maybeKey);
  if (fullSettingKey !== `${MODULE_ID}.${RARITY_LIST_SETTING_KEY}`
    && fullSettingKey !== `${MODULE_ID}.${RARITY_LIST_ENABLED_SETTING_KEY}`) return;

  applyMergedRarityConfigToDnd5e(MODULE_ID);
}

export function onCustomDnd5eRarityConfig() {
  applyMergedRarityConfigToDnd5e(MODULE_ID);
}
