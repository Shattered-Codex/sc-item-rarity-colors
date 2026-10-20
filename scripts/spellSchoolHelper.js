import { MODULE_ID } from "../core/constants.js";
import {
  buildSpellStyleSettingsFromFields,
  getSpellStyleProfileForItem,
  isSpellStyleSettingsActive,
} from "../core/spellSchoolConfig.js";

// Resolved settings per profile `fields` object. Those objects are cached and
// replaced when the spell styles change, so a WeakMap keyed on them needs no
// separate invalidation.
const resolvedSettingsByFields = new WeakMap();

function resolveSpellStyleSettings(fields) {
  let resolved = resolvedSettingsByFields.get(fields);
  if (!resolved) {
    const settings = Object.freeze(buildSpellStyleSettingsFromFields(fields));
    resolved = { settings, active: isSpellStyleSettingsActive(settings) };
    resolvedSettingsByFields.set(fields, resolved);
  }
  return resolved;
}

export function getActiveSpellStyleForItem(item, moduleId = MODULE_ID) {
  const profile = getSpellStyleProfileForItem(item, moduleId);
  if (!profile) return null;

  const { settings, active } = resolveSpellStyleSettings(profile.fields);
  if (!active) return null;

  return {
    ...profile,
    settings,
  };
}
