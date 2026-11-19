import { normalizeRangeFieldValue, RARITY_FIELD_DEFINITIONS } from "./rarityFieldSchema.js";

/**
 * The Colors tab sliders as the display code reads them: settings property →
 * schema field key. The rarity, spell school, and editor preview readers all
 * build them from this map, like the effect settings
 * (core/effectSettingFields.js). Values are normalized to each field's range.
 */
export const APPEARANCE_SETTING_FIELDS = Object.freeze({
  sheetColorIntensity: "sheet-color-intensity",
  inventoryColorIntensity: "inventory-color-intensity",
  sidebarColorIntensity: "sidebar-color-intensity",
  inventoryGradientCoverage: "inventory-gradient-coverage",
  sidebarGradientCoverage: "sidebar-gradient-coverage",
});

const FIELDS_BY_KEY = new Map(RARITY_FIELD_DEFINITIONS.map((field) => [field.key, field]));

/**
 * Reads every appearance setting.
 * @param {(fieldKey: string, field: object) => *} read - returns the stored
 *   value of one field; `field` is its schema definition.
 * @returns {object} settings properties
 */
export function readAppearanceSettings(read) {
  const settings = {};
  for (const [property, fieldKey] of Object.entries(APPEARANCE_SETTING_FIELDS)) {
    const field = FIELDS_BY_KEY.get(fieldKey);
    settings[property] = normalizeRangeFieldValue(field, read(fieldKey, field));
  }
  return settings;
}
