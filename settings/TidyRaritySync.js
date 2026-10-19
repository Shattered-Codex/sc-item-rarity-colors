import { MODULE_ID } from "../core/constants.js";
import { normalizeHexColor } from "../core/colorUtils.js";
import { getMergedRarityEntries, normalizeRarityKey } from "../core/rarityListConfig.js";
import { buildRaritySettings } from "../core/settingsManager.js";

const TIDY_MODULE_ID = "tidy5e-sheet";
const TIDY_WORLD_THEME_SETTING_KEY = "worldThemeSettings";

/**
 * Copies the primary item-sheet rarity colors into Tidy 5e's world theme.
 * Run from the Integrations tab of the module settings window.
 */
export class TidyRaritySync {
  static isTidyInstalled() {
    return Boolean(game?.modules?.get?.(TIDY_MODULE_ID));
  }

  static isTidyActive() {
    return game?.modules?.get?.(TIDY_MODULE_ID)?.active === true;
  }

  static canWriteTidyWorldThemeSettings() {
    return game?.settings?.settings?.has?.(`${TIDY_MODULE_ID}.${TIDY_WORLD_THEME_SETTING_KEY}`) === true;
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

    // Tidy stores only the theme values a GM changed and fills in its own
    // defaults when reading, so only the rarity colors are touched here.
    // Seeding other keys would override Tidy's defaults, e.g. a gold accent
    // that recolors every Tidy table header.
    const existing = game.settings.get(TIDY_MODULE_ID, TIDY_WORLD_THEME_SETTING_KEY);
    const baseSettings = existing && typeof existing === "object"
      ? foundry.utils.deepClone(existing)
      : {};

    baseSettings.rarityColors = {
      ...(baseSettings.rarityColors && typeof baseSettings.rarityColors === "object"
        ? baseSettings.rarityColors
        : {}),
      ...rarityColorUpdates,
    };

    await game.settings.set(TIDY_MODULE_ID, TIDY_WORLD_THEME_SETTING_KEY, baseSettings);
    ui.notifications.info(`Synced ${keysToSync.length} rarity color(s) to Tidy 5e.`);
  }
}
