import { RARITY_FIELD_DEFINITIONS } from "./rarityFieldSchema.js";

/**
 * The Effects tab settings as the effect code reads them: settings property →
 * schema field key. The rarity, spell school, and editor preview readers all
 * build their effect settings from this map, so a new effect option is wired
 * in one place.
 */
export const EFFECT_SETTING_FIELDS = Object.freeze({
  shimmerEnabled: "shimmer-option",
  particlesEnabled: "particles-option",
  particlesStyle: "particles-style",
  particleMotion: "particle-motion",
  particleAmount: "particle-amount",
  particleDistance: "particle-distance",
  enableParticleColor: "enable-particle-color",
  particleColor: "particle-color",
  auraEnabled: "aura-option",
  auraStyle: "aura-style",
  wavesEnabled: "waves-option",
  wavesStyle: "waves-style",
  wavesDistance: "waves-distance",
  wavesShape: "waves-shape",
  runesEnabled: "runes-option",
  enableEffectColor: "enable-effect-color",
  effectColor: "effect-color",
  effectIntensity: "effect-intensity",
  effectSpeed: "effect-speed",
  effectPlacement: "effect-placement",
  enableInventoryIconPulse: "enable-inventory-icon-pulse",
  enableInventoryIconEmanation: "enable-inventory-icon-emanation",
  enableFoundryInterfaceIconEmanation: "enable-foundry-interface-icon-emanation",
});

const FIELDS_BY_KEY = new Map(RARITY_FIELD_DEFINITIONS.map((field) => [field.key, field]));

/**
 * Reads every effect setting.
 * @param {(fieldKey: string, field: object) => *} read - returns the stored
 *   value of one field; `field` is its schema definition (type, defaultValue).
 * @returns {object} settings properties for core/itemEffects.js
 */
export function readEffectSettings(read) {
  const settings = {};
  for (const [property, fieldKey] of Object.entries(EFFECT_SETTING_FIELDS)) {
    settings[property] = read(fieldKey, FIELDS_BY_KEY.get(fieldKey) ?? {});
  }
  return settings;
}
