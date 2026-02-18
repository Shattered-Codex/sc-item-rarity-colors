import { ItemRaritySettingsLauncher, ItemRaritySourceSettingsLauncher } from "./settingsLaunchers.js";
import { ItemRaritySettingsApp } from "../apps/ItemRaritySettingsApp.js";
import { SupportMenu } from "./SupportMenu.js";
import { TidyRaritySyncMenu } from "./TidyRaritySyncMenu.js";

// Main function to register all module menus.
export function registerMenus(MODULE_ID) {
  // Set MODULE_ID for ItemRaritySettingsApp first
  ItemRaritySettingsApp.MODULE_ID = MODULE_ID;

  game.settings.registerMenu(MODULE_ID, "supportMenu", {
    name: "Support the developer",
    label: "Patreon support",
    hint: "Support Shattered Codex and help us keep building modules.",
    icon: "fas fa-heart",
    type: SupportMenu,
    restricted: true,
  });

  ItemRaritySettingsLauncher.MODULE_ID = MODULE_ID;
  game.settings.registerMenu(MODULE_ID, "raritySettingsConfig", {
    name: "Item Rarity Configuration",
    label: "Configure Rarity Colors",
    icon: "fas fa-palette",
    type: ItemRaritySettingsLauncher,
    restricted: false,
    hint: "Open a single configuration window and switch rarities from the selector at the top.",
  });

  ItemRaritySourceSettingsLauncher.MODULE_ID = MODULE_ID;
  game.settings.registerMenu(MODULE_ID, "raritySourceConfig", {
    name: "Rarity Source Configuration",
    label: "Configure Rarity List",
    icon: "fas fa-list",
    type: ItemRaritySourceSettingsLauncher,
    restricted: true,
    hint: "Manage rarity keys and labels in SC Item Rarity Colors. Changes are synced with Custom DND5E when available.",
  });

  game.settings.registerMenu(MODULE_ID, "tidyRaritySync", {
    name: "Tidy Rarity Sync",
    label: "Sync Colors to Tidy",
    icon: "fas fa-arrows-rotate",
    type: TidyRaritySyncMenu,
    restricted: true,
    hint: "Sync primary rarity colors from SC Item Rarity Colors to Tidy 5e rarity colors.",
  });

  Hooks.on("renderSettingsConfig", (_app, html) => {
    SupportMenu.bindSettingsButton(html);
    TidyRaritySyncMenu.bindSettingsRowVisibility(html);
  });
}
