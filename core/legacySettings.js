import { MODULE_ID } from "./constants.js";
import { debugLog } from "./debug.js";

/**
 * World settings this module no longer registers. Foundry keeps a stored
 * value for an unregistered key forever, so they are deleted once by a GM.
 */
const LEGACY_WORLD_SETTING_KEYS = Object.freeze([
  // Global "Tidy 5e: color the sidebar" option, replaced by the per-rarity
  // "Tidy 5e area" field.
  "tidySidebarColor",
]);

export async function removeLegacyWorldSettings(moduleId = MODULE_ID) {
  if (!game?.user?.isGM) return;

  const storage = game.settings?.storage?.get?.("world");
  if (!storage) return;

  for (const key of LEGACY_WORLD_SETTING_KEYS) {
    const fullKey = `${moduleId}.${key}`;
    if (game.settings.settings.has(fullKey)) continue;

    const stored = storage.getSetting?.(fullKey) ?? storage.find?.((setting) => setting.key === fullKey);
    if (!stored) continue;

    try {
      await stored.delete();
      debugLog("Removed legacy world setting", { key: fullKey });
    } catch (error) {
      console.warn(`${moduleId} | Could not remove legacy setting ${fullKey}.`, error);
    }
  }
}
