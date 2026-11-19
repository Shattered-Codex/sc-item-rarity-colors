import { MODULE_ID } from "../core/constants.js";
import {
  buildSpellStyleSettingsFromFields,
  getSpellStyleProfileForItem,
  isSpellStyleSettingsActive,
} from "../core/spellSchoolConfig.js";
import { withColorIntensity } from "../core/colorIntensity.js";

// Resolved settings per profile `fields` object. Those objects are cached and
// replaced when the spell styles change, so a WeakMap keyed on them needs no
// separate invalidation.
const resolvedSettingsByFields = new WeakMap();

const SURFACES = Object.freeze(["sheet", "inventory", "sidebar"]);

function resolveSpellStyleSettings(fields) {
  let resolved = resolvedSettingsByFields.get(fields);
  if (!resolved) {
    const settings = buildSpellStyleSettingsFromFields(fields);
    // Spell styles are applied inline, so each surface gets its colors as
    // shown there (core/colorIntensity.js).
    const bySurface = Object.fromEntries(
      SURFACES.map((surface) => [surface, Object.freeze(withColorIntensity(settings, surface))])
    );
    resolved = { bySurface, active: isSpellStyleSettingsActive(settings) };
    resolvedSettingsByFields.set(fields, resolved);
  }
  return resolved;
}

/**
 * The spell style of an item, with its settings as shown on `surface`
 * ("sheet", "inventory", or "sidebar").
 */
export function getActiveSpellStyleForItem(item, moduleId = MODULE_ID, surface = "sheet") {
  const profile = getSpellStyleProfileForItem(item, moduleId);
  if (!profile) return null;

  const { bySurface, active } = resolveSpellStyleSettings(profile.fields);
  if (!active) return null;

  return {
    ...profile,
    settings: bySurface[surface] ?? bySurface.sheet,
  };
}
