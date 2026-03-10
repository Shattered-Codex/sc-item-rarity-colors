import { MODULE_ID } from "../core/constants.js";
import {
  buildSpellStyleSettingsFromFields,
  getSpellStyleProfileForItem,
  isSpellStyleSettingsActive,
  isSpellItem,
} from "../core/spellSchoolConfig.js";

export { isSpellItem };

export function getActiveSpellStyleForItem(item, moduleId = MODULE_ID) {
  const profile = getSpellStyleProfileForItem(item, moduleId);
  if (!profile) return null;

  const settings = buildSpellStyleSettingsFromFields(profile.fields);
  if (!isSpellStyleSettingsActive(settings)) return null;

  return {
    ...profile,
    settings,
  };
}
