import { MODULE_ID } from "./constants.js";

/**
 * Unidentified items can be shown with their own style instead of their real
 * rarity, so the colors do not reveal what the dnd5e system itself hides from
 * players (rarity and price of unidentified items).
 *
 * The style is stored like a rarity under a reserved key, which lets it reuse
 * the rarity settings, runtime CSS, editor, preview, and import/export. The
 * key is namespaced so it cannot clash with a world's own rarity (a custom
 * rarity may well be called "unidentified").
 */
export const UNIDENTIFIED_STYLE_KEY = "scirc-unidentified-style";
export const UNIDENTIFIED_STYLE_LABEL = "Unidentified";

export const UNIDENTIFIED_VIEWERS_SETTING_KEY = "unidentifiedStyleViewers";

export const UNIDENTIFIED_VIEWERS = Object.freeze({
  PLAYERS: "players",
  EVERYONE: "everyone",
  NOBODY: "nobody",
});

/**
 * Starting look: a muted slate sheet that reads as "unknown" next to any
 * palette, with a mysterious purple energy escaping from the item: an
 * Energy aura, particles, and occasional waves on the sheet, and a small
 * emanation on its icon in inventories and the sidebar.
 */
export const UNIDENTIFIED_STYLE_DEFAULTS = Object.freeze({
  "enable-item-color": true,
  "item-color": "#2f3440",
  "secondary-item-color": "#5b6273",
  "gradient-option": true,
  "glow-option": false,
  "enable-text-color": true,
  "text-color": "#e8eaf0",
  "enable-gold-accent-color": true,
  "gold-accent-color": "#8b93a7",
  "enable-table-header-color": true,
  "table-header-color": "#22262f",
  "enable-table-header-text-color": true,
  "table-header-text-color": "#e8eaf0",
  "enable-inventory-gradient-effects": true,
  "enable-inventory-borders": true,
  "enable-inventory-title-color": true,
  "inventory-title-color": "#e8eaf0",
  "enable-inventory-details-color": true,
  "inventory-details-color": "#c9cdd6",
  "enable-foundry-interface-gradient-effects": true,
  "enable-foundry-interface-text-color": true,
  "foundry-interface-text-color": "#e8eaf0",
  "enable-effect-color": true,
  "effect-color": "#a77bff",
  "aura-option": true,
  "aura-style": "energy",
  "particles-option": true,
  "particles-style": "arcane",
  "waves-option": true,
  "effect-placement": "sheet",
  "enable-inventory-icon-emanation": true,
  "enable-foundry-interface-icon-emanation": true,
});

export function getUnidentifiedViewers(moduleId = MODULE_ID) {
  try {
    if (!game?.settings?.settings?.has?.(`${moduleId}.${UNIDENTIFIED_VIEWERS_SETTING_KEY}`)) {
      return UNIDENTIFIED_VIEWERS.PLAYERS;
    }
    const value = game.settings.get(moduleId, UNIDENTIFIED_VIEWERS_SETTING_KEY);
    return Object.values(UNIDENTIFIED_VIEWERS).includes(value) ? value : UNIDENTIFIED_VIEWERS.PLAYERS;
  } catch (_error) {
    return UNIDENTIFIED_VIEWERS.PLAYERS;
  }
}

/** Whether this user should see `item` with the unidentified style. */
export function shouldUseUnidentifiedStyle(item, moduleId = MODULE_ID) {
  if (item?.system?.identified !== false) return false;

  switch (getUnidentifiedViewers(moduleId)) {
    case UNIDENTIFIED_VIEWERS.EVERYONE:
      return true;
    case UNIDENTIFIED_VIEWERS.PLAYERS:
      return game?.user?.isGM !== true;
    default:
      return false;
  }
}
