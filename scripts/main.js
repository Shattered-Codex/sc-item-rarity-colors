import {
  onCustomDnd5eRarityConfig,
  onInit,
  onReady,
  onSettingChange,
  onSettingsTransactionComplete,
  onSetup,
} from "./lifecycleHandlers.js";
import { registerSettingChangeHooks } from "../core/settingChangeHelper.js";
import { MODULE_ID } from "../core/constants.js";
import { registerSettingsTransactionCompleteHook } from "../core/settingsTransaction.js";

Hooks.once("init", onInit);
Hooks.once("setup", onSetup);
Hooks.once("ready", onReady);
registerSettingChangeHooks(onSettingChange);
registerSettingsTransactionCompleteHook(MODULE_ID, onSettingsTransactionComplete);
Hooks.on("customDnd5e.setItemRarityConfig", onCustomDnd5eRarityConfig);
