import { ItemRaritySettingsLauncher, ItemRaritySourceSettingsLauncher } from "./settingsLaunchers.js";
import { ItemRaritySettingsApp } from "../apps/ItemRaritySettingsApp.js";
import { SupportMenu } from "./SupportMenu.js";

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
    label: "Configure Rarities",
    type: ItemRaritySettingsLauncher,
    restricted: false,
    hint: "Open a single configuration window and switch rarities from the selector at the top.",
  });

  ItemRaritySourceSettingsLauncher.MODULE_ID = MODULE_ID;
  game.settings.registerMenu(MODULE_ID, "raritySourceConfig", {
    name: "Rarity Source Configuration",
    label: "Configure Rarity List",
    type: ItemRaritySourceSettingsLauncher,
    restricted: true,
    hint: "Manage rarity keys and labels in SC Item Rarity Colors. Changes are synced with Custom DND5E when available.",
  });

  Hooks.on("renderSettingsConfig", (_app, html) => {
    SupportMenu.bindSettingsButton(html);
  });
}
