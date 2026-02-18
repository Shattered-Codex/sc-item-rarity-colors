import {
  onCustomDnd5eRarityConfig,
  onInit,
  onReady,
  onSettingChange,
  onSetup,
} from "./lifecycleHandlers.js";
import { registerSettingChangeHooks } from "../core/settingChangeHelper.js";

Hooks.once("init", onInit);
Hooks.once("setup", onSetup);
Hooks.once("ready", onReady);
registerSettingChangeHooks(onSettingChange);
Hooks.on("customDnd5e.setItemRarityConfig", onCustomDnd5eRarityConfig);
