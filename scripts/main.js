import {
  onCustomDnd5eRarityConfig,
  onInit,
  onReady,
  onSettingChange,
  onSetup,
} from "./lifecycleHandlers.js";

Hooks.once("init", onInit);
Hooks.once("setup", onSetup);
Hooks.once("ready", onReady);
Hooks.on("setSetting", onSettingChange);
Hooks.on("customDnd5e.setItemRarityConfig", onCustomDnd5eRarityConfig);
