import { ItemRaritySettingsLauncher } from "./ItemRaritySettingsLauncher.js";
import { SpellSchoolSettingsLauncher } from "./SpellSchoolSettingsLauncher.js";
import { ItemRaritySettingsApp } from "../apps/ItemRaritySettingsApp.js";
import { ModuleSettingsApp } from "../apps/ModuleSettingsApp.js";
import { SpellSchoolSettingsApp } from "../apps/SpellSchoolSettingsApp.js";
import { CommunityLinks } from "./CommunityLinks.js";

// Menu keys mapped to the modifier class their settings-list button receives.
const MENU_BUTTON_CLASSES = Object.freeze({
  moduleSettings: "scirc-menu-button--settings",
  raritySettingsConfig: "scirc-menu-button--items",
  spellSchoolSettingsConfig: "scirc-menu-button--spells",
});

/**
 * Foundry's settings list shows three buttons for this module, in registration
 * order: the settings window holding every general option, item colors, and
 * spell colors. The wiki, Patreon, and Discord links are injected below them
 * as one compact strip.
 */
export function registerMenus(MODULE_ID) {
  ItemRaritySettingsApp.MODULE_ID = MODULE_ID;
  ItemRaritySettingsLauncher.MODULE_ID = MODULE_ID;
  SpellSchoolSettingsApp.MODULE_ID = MODULE_ID;
  SpellSchoolSettingsLauncher.MODULE_ID = MODULE_ID;

  game.settings.registerMenu(MODULE_ID, "moduleSettings", {
    name: "Module Settings",
    label: "Open settings",
    hint: "Rarity list, unidentified items, Tidy 5e, animations, chat messages, and diagnostics in one window.",
    icon: "fas fa-sliders",
    type: ModuleSettingsApp,
    // Players still get the client-only sections, so this is not GM-gated.
    restricted: false,
  });

  game.settings.registerMenu(MODULE_ID, "raritySettingsConfig", {
    name: "Item Rarity Colors",
    label: "Configure items",
    hint: "Colors, gradients, and glow for item sheets, inventories, and the item directory, per rarity.",
    icon: "fas fa-palette",
    type: ItemRaritySettingsLauncher,
    restricted: false,
  });

  game.settings.registerMenu(MODULE_ID, "spellSchoolSettingsConfig", {
    name: "Spell School Colors",
    label: "Configure spells",
    hint: "Spell visuals by magic school, with optional school + level variants.",
    icon: "fas fa-book-sparkles",
    type: SpellSchoolSettingsLauncher,
    restricted: false,
  });

  Hooks.on("renderSettingsConfig", (_app, html) => {
    markMenuButtons(MODULE_ID, html);
    CommunityLinks.inject(html);
  });
}

function markMenuButtons(moduleId, html) {
  const root = html?.jquery ? html[0] : html;
  if (!root?.querySelectorAll) return;

  for (const [menuKey, className] of Object.entries(MENU_BUTTON_CLASSES)) {
    const key = `${moduleId}.${menuKey}`;
    const candidates = root.querySelectorAll([
      `[data-setting-id="${key}"]`,
      `[data-menu-id="${key}"]`,
      `[data-key="${key}"]`,
      `[data-setting="${key}"]`,
    ].join(","));

    for (const candidate of candidates) {
      const button = candidate instanceof HTMLButtonElement ? candidate : candidate.querySelector("button");
      button?.classList.add(className);
    }
  }
}
