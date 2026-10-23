import { MODULE_ID } from "../core/constants.js";
import { debugLog } from "../core/debug.js";
import { applyAnimatedEffectsPreference, DISABLE_EFFECTS_SETTING_KEY } from "../core/itemEffects.js";
import { ensureRuntimeRarityStyles } from "../core/runtimeRarityStyles.js";
import {
  applyMergedRarityConfigToDnd5e,
  clearNormalizeRarityKeyCache,
  initializeSystemRarityBaseline,
  RARITY_LIST_ENABLED_SETTING_KEY,
  RARITY_LIST_SETTING_KEY,
} from "../core/rarityListConfig.js";
import { invalidateRaritySettingsCache } from "../core/settingsManager.js";
import { invalidateSpellStyleCache } from "../core/spellSchoolConfig.js";
import { isModuleSettingChange } from "../core/settingChangeHelper.js";
import { isSettingsTransactionActive } from "../core/settingsTransaction.js";
import { registerMenus } from "../settings/settingsMenus.js";
import { registerModuleSettings } from "../settings/settingsRegistration.js";
import { applyActorInventoryEffects } from "./applyActorInventoryEffects.js";
import { applyItemDirectoryEffects } from "./applyItemDirectoryEffects.js";
import { applyItemRarityEffects } from "./applyItemRarityEffects.js";
import { registerModulePartials } from "./partialsHelper.js";
import { PublicApi } from "./PublicApi.js";

export async function onInit() {
  debugLog("Lifecycle: init start");
  initializeSystemRarityBaseline();

  registerModuleSettings(MODULE_ID);
  registerMenus(MODULE_ID);
  applyMergedRarityConfigToDnd5e(MODULE_ID);

  const module = game.modules.get(MODULE_ID);
  if (module) module.api = PublicApi.create(MODULE_ID);

  await registerModulePartials(MODULE_ID, [
    "item-template.html",
    "spell-template.html",
    "tidy-item-template.html",
    "tidy-spell-template.html",
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
  applyAnimatedEffectsPreference(game.settings.get(MODULE_ID, DISABLE_EFFECTS_SETTING_KEY));
  debugLog("Lifecycle: ready complete");
}

export function onSettingChange(settingKey) {
  if (!isModuleSettingChange(settingKey, MODULE_ID)) return;
  if (isSettingsTransactionActive(MODULE_ID)) return;

  invalidateRaritySettingsCache();
  invalidateSpellStyleCache();
  ensureRuntimeRarityStyles(MODULE_ID);

  const isRarityListChange = settingKey === `${MODULE_ID}.${RARITY_LIST_SETTING_KEY}`
    || settingKey === `${MODULE_ID}.${RARITY_LIST_ENABLED_SETTING_KEY}`;
  if (!isRarityListChange) return;

  clearNormalizeRarityKeyCache();
  debugLog("Lifecycle: setting change detected", { settingKey });
  applyMergedRarityConfigToDnd5e(MODULE_ID);
}

export function onSettingsTransactionComplete(context = {}) {
  debugLog("Lifecycle: settings transaction complete", context);
  invalidateRaritySettingsCache();
  invalidateSpellStyleCache();
  applyMergedRarityConfigToDnd5e(MODULE_ID);
  ensureRuntimeRarityStyles(MODULE_ID);
}

export function onCustomDnd5eRarityConfig() {
  debugLog("Lifecycle: customDnd5e rarity config hook fired");
  clearNormalizeRarityKeyCache();
  invalidateRaritySettingsCache();
  invalidateSpellStyleCache();
  applyMergedRarityConfigToDnd5e(MODULE_ID);
  ensureRuntimeRarityStyles(MODULE_ID);
}
