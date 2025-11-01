import { 
  CommonItemSettingsLauncher,
  UncommonItemSettingsLauncher,
  RareItemSettingsLauncher,
  VeryRareItemSettingsLauncher,
  LegendaryItemSettingsLauncher,
  ArtifactItemSettingsLauncher
} from "./settingsLaunchers.js";

// Define menu configurations for each item rarity tier.
const MENU_CONFIGS = [
  { key: "commonItemConfig", label: "Common Item Configuration", launcher: CommonItemSettingsLauncher, hint: "Configure Common Item Rarity Tier Behavior." },
  { key: "uncommonItemConfig", label: "Uncommon Item Configuration", launcher: UncommonItemSettingsLauncher, hint: "Configure Uncommon Item Rarity Tier Behavior." },
  { key: "rareItemConfig", label: "Rare Item Configuration", launcher: RareItemSettingsLauncher, hint: "Configure Rare Item Rarity Tier Behavior." },
  { key: "veryRareItemConfig", label: "Very Rare Item Configuration", launcher: VeryRareItemSettingsLauncher, hint: "Configure Very Rare Item Rarity Tier Behavior." },
  { key: "legendaryItemConfig", label: "Legendary Item Configuration", launcher: LegendaryItemSettingsLauncher, hint: "Configure Legendary Item Rarity Tier Behavior." },
  { key: "artifactItemConfig", label: "Artifact Item Configuration", launcher: ArtifactItemSettingsLauncher, hint: "Configure Artifact Item Rarity Tier Behavior." }
];

// Main function to register all module menus.
export function registerMenus(MODULE_ID) {
   MENU_CONFIGS.forEach(menu => {
    menu.launcher.MODULE_ID = MODULE_ID;
    game.settings.registerMenu(MODULE_ID, menu.key, {
      name: menu.label,
      label: menu.label,
      type: menu.launcher,
      restricted: false,
      hint: menu.hint
    });
  });
}

