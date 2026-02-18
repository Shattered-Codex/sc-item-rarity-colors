import { MODULE_ID } from "../core/constants.js";
import { getMergedRarityEntries, normalizeRarityKey } from "../core/rarityListConfig.js";
import { buildRaritySettings } from "../core/settingsManager.js";

const TIDY_MODULE_ID = "tidy5e-sheet";
const TIDY_WORLD_THEME_SETTING_KEY = "worldThemeSettings";
const TIDY_SYNC_MENU_KEY = `${MODULE_ID}.tidyRaritySync`;
const TIDY_DEFAULT_WORLD_THEME_SETTINGS = {
  accentColor: "#f4d588",
  useHeaderBackground: false,
  actorHeaderBackground: "",
  itemSidebarBackground: "",
  portraitShape: undefined,
  rarityColors: {},
  spellPreparationMethodColors: {},
};

const api = foundry?.applications?.api ?? {};
const { ApplicationV2 } = api;
if (!ApplicationV2) {
  throw new Error(`${MODULE_ID}: ApplicationV2 is required to run TidyRaritySyncMenu.`);
}

function normalizeHexColor(value, { allowShort = true, expandShort = true } = {}) {
  if (typeof value !== "string") return null;

  let normalized = value.trim().toUpperCase();
  if (!normalized) return null;
  if (!normalized.startsWith("#")) normalized = `#${normalized}`;
  const pattern = allowShort ? /^#([0-9A-F]{3}|[0-9A-F]{6})$/ : /^#[0-9A-F]{6}$/;
  if (!pattern.test(normalized)) return null;

  if (expandShort && normalized.length === 4) {
    const shortHex = normalized.slice(1);
    normalized = `#${shortHex.split("").map((char) => `${char}${char}`).join("")}`;
  }

  return normalized;
}

export class TidyRaritySyncMenu extends ApplicationV2 {
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {
    id: `${MODULE_ID}-tidy-rarity-sync-menu`,
    window: {
      title: "Sync Rarity Colors to Tidy",
      resizable: false,
      icon: "fas fa-arrows-rotate",
    },
    position: {
      width: 420,
      height: "auto",
    },
  }, { inplace: false });

  render(...args) {
    void TidyRaritySyncMenu.run();
    return this;
  }

  static isTidyInstalled() {
    return Boolean(game?.modules?.get?.(TIDY_MODULE_ID));
  }

  static isTidyActive() {
    return game?.modules?.get?.(TIDY_MODULE_ID)?.active === true;
  }

  static canWriteTidyWorldThemeSettings() {
    return game?.settings?.settings?.has?.(`${TIDY_MODULE_ID}.${TIDY_WORLD_THEME_SETTING_KEY}`) === true;
  }

  static shouldShowSettingsMenu() {
    return this.isTidyActive();
  }

  static bindSettingsRowVisibility(html) {
    const root = this.#resolveRoot(html);
    if (!root) return;

    const selectors = [
      `[data-setting-id="${TIDY_SYNC_MENU_KEY}"]`,
      `[data-menu-id="${TIDY_SYNC_MENU_KEY}"]`,
      `[data-key="${TIDY_SYNC_MENU_KEY}"]`,
      `[data-setting="${TIDY_SYNC_MENU_KEY}"]`,
    ];
    const show = this.shouldShowSettingsMenu();
    const rows = root.querySelectorAll(selectors.join(","));
    for (const row of rows) {
      row.style.display = show ? "" : "none";
    }
  }

  static resolveTidyRarityKey(rarityKey) {
    const normalized = normalizeRarityKey(rarityKey);
    if (!normalized) return null;

    const configKeys = Object.keys(CONFIG?.DND5E?.itemRarity ?? {});
    const normalizedToConfigKey = new Map(
      configKeys.map((key) => [normalizeRarityKey(key), key])
    );

    return normalizedToConfigKey.get(normalized) || rarityKey;
  }

  static buildPrimaryRarityColorSyncMap() {
    const rarityColors = {};
    const entries = getMergedRarityEntries(MODULE_ID, { includeHidden: false });

    for (const entry of entries) {
      const rarity = entry?.key;
      if (!rarity) continue;

      const tidyRarityKey = this.resolveTidyRarityKey(rarity);
      if (!tidyRarityKey) continue;

      const settings = buildRaritySettings(rarity);
      if (!settings?.enableItemColor) continue;

      const normalizedColor = normalizeHexColor(settings.backgroundColor, {
        allowShort: true,
        expandShort: true,
      });
      if (!normalizedColor) continue;

      rarityColors[tidyRarityKey] = normalizedColor;
    }

    return rarityColors;
  }

  static async confirmSync() {
    const content = `
      <p>This will change Tidy 5e rarity colors using the primary Item Sheet color from SC Item Rarity Colors.</p>
      <p>Do you want to continue?</p>
    `;

    const dialogV2 = foundry?.applications?.api?.DialogV2;
    if (dialogV2?.confirm) {
      return dialogV2.confirm({
        window: { title: "Confirm Tidy Rarity Sync" },
        content,
        modal: true,
        rejectClose: false,
      });
    }

    if (typeof Dialog !== "undefined" && typeof Dialog.confirm === "function") {
      return Dialog.confirm({
        title: "Confirm Tidy Rarity Sync",
        content,
        yes: () => true,
        no: () => false,
      });
    }

    return window.confirm("This will change Tidy 5e rarity colors. Continue?");
  }

  static async run() {
    if (!this.isTidyInstalled()) {
      ui.notifications.warn("Tidy 5e is not installed.");
      return;
    }
    if (!this.isTidyActive()) {
      ui.notifications.warn("Activate Tidy 5e before syncing rarity colors.");
      return;
    }
    if (!this.canWriteTidyWorldThemeSettings()) {
      ui.notifications.warn("Tidy 5e world theme settings are not available.");
      return;
    }

    const confirmed = await this.confirmSync();
    if (!confirmed) return;

    const rarityColorUpdates = this.buildPrimaryRarityColorSyncMap();
    const keysToSync = Object.keys(rarityColorUpdates);
    if (!keysToSync.length) {
      ui.notifications.warn("No enabled primary rarity colors were found to sync.");
      return;
    }

    const existing = game.settings.get(TIDY_MODULE_ID, TIDY_WORLD_THEME_SETTING_KEY);
    const baseSettings = foundry.utils.mergeObject(
      TIDY_DEFAULT_WORLD_THEME_SETTINGS,
      existing && typeof existing === "object" ? existing : {},
      { inplace: false, recursive: true }
    );

    baseSettings.rarityColors = {
      ...(baseSettings.rarityColors && typeof baseSettings.rarityColors === "object"
        ? baseSettings.rarityColors
        : {}),
      ...rarityColorUpdates,
    };

    await game.settings.set(TIDY_MODULE_ID, TIDY_WORLD_THEME_SETTING_KEY, baseSettings);
    ui.notifications.info(`Synced ${keysToSync.length} rarity color(s) to Tidy 5e.`);
  }

  static #resolveRoot(html) {
    if (!html) return null;
    if (html.jquery || typeof html.get === "function") {
      return html[0] ?? html.get(0) ?? null;
    }
    if (html instanceof Element || html?.querySelector) {
      return html;
    }
    return null;
  }
}
