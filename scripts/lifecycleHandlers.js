import { MODULE_ID } from "../core/constants.js";
import { debugLog } from "../core/debug.js";
import { ensureRuntimeRarityStyles } from "../core/runtimeRarityStyles.js";
import {
  applyMergedRarityConfigToDnd5e,
  initializeSystemRarityBaseline,
  RARITY_LIST_ENABLED_SETTING_KEY,
  RARITY_LIST_SETTING_KEY,
} from "../core/rarityListConfig.js";
import { getSettingKeyFromHookPayload, isModuleSettingChange } from "../core/settingChangeHelper.js";
import { isSettingsTransactionActive } from "../core/settingsTransaction.js";
import { registerMenus } from "../settings/settingsMenus.js";
import { registerModuleSettings } from "../settings/settingsRegistration.js";
import { applyActorInventoryEffects } from "./applyActorInventoryEffects.js";
import { applyItemDirectoryEffects } from "./applyItemDirectoryEffects.js";
import { applyItemRarityEffects } from "./applyItemRarityEffects.js";
import { registerModulePartials } from "./partialsHelper.js";
import { maybeShowSupportCard } from "./supportCard.js";

export async function onInit() {
  debugLog("Lifecycle: init start");
  initializeSystemRarityBaseline();

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

  debugLog("Lifecycle: init complete");
}

export function onSetup() {
  debugLog("Lifecycle: setup");
  applyMergedRarityConfigToDnd5e(MODULE_ID);
  ensureRuntimeRarityStyles(MODULE_ID);
}

export function onReady() {
  debugLog("Lifecycle: ready start");
  applyMergedRarityConfigToDnd5e(MODULE_ID);
  ensureRuntimeRarityStyles(MODULE_ID);
  applyItemRarityEffects(MODULE_ID);
  applyActorInventoryEffects(MODULE_ID);
  applyItemDirectoryEffects(MODULE_ID);
  void maybeShowSupportCard();
  debugLog("Lifecycle: ready complete");
}

export function onSettingChange(moduleOrSetting, maybeKey) {
  if (!isModuleSettingChange(moduleOrSetting, maybeKey, MODULE_ID)) return;
  if (isSettingsTransactionActive(MODULE_ID)) return;
  ensureRuntimeRarityStyles(MODULE_ID);

  const fullSettingKey = getSettingKeyFromHookPayload(moduleOrSetting, maybeKey);
  if (fullSettingKey !== `${MODULE_ID}.${RARITY_LIST_SETTING_KEY}`
    && fullSettingKey !== `${MODULE_ID}.${RARITY_LIST_ENABLED_SETTING_KEY}`) return;

  debugLog("Lifecycle: setting change detected", { fullSettingKey });
  applyMergedRarityConfigToDnd5e(MODULE_ID);
}

export function onSettingsTransactionComplete(context = {}) {
  debugLog("Lifecycle: settings transaction complete", context);
  applyMergedRarityConfigToDnd5e(MODULE_ID);
  ensureRuntimeRarityStyles(MODULE_ID);
}

export function onCustomDnd5eRarityConfig() {
  debugLog("Lifecycle: customDnd5e rarity config hook fired");
  applyMergedRarityConfigToDnd5e(MODULE_ID);
  ensureRuntimeRarityStyles(MODULE_ID);
}
