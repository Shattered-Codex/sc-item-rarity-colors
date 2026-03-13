import { MODULE_ID } from "./constants.js";
import { normalizeHexColor } from "./colorUtils.js";
import { getRarityFieldDefinitions } from "./rarityFieldSchema.js";

export const SPELL_SCHOOL_STYLES_SETTING_KEY = "spell-school-styles";

const SPELL_SCHOOL_FALLBACK_ENTRIES = Object.freeze([
  { key: "abj", label: "Abjuration" },
  { key: "con", label: "Conjuration" },
  { key: "div", label: "Divination" },
  { key: "enc", label: "Enchantment" },
  { key: "evo", label: "Evocation" },
  { key: "ill", label: "Illusion" },
  { key: "nec", label: "Necromancy" },
  { key: "trs", label: "Transmutation" },
]);

const SPELL_SCHOOL_KEY_ALIASES = Object.freeze({
  abj: "abj",
  abjuration: "abj",
  con: "con",
  conjuration: "con",
  div: "div",
  divination: "div",
  enc: "enc",
  enchantment: "enc",
  evo: "evo",
  evocation: "evo",
  ill: "ill",
  illusion: "ill",
  nec: "nec",
  necromancy: "nec",
  trs: "trs",
  tra: "trs",
  transmutation: "trs",
  transmut: "trs",
  trans: "trs",
});

const MIN_SPELL_LEVEL = 0;
const MAX_SPELL_LEVEL = 9;

function localizeSchoolLabel(rawLabel, fallbackLabel) {
  const value = String(rawLabel || "").trim();
  if (!value) return fallbackLabel;

  const localized = game?.i18n?.localize?.(value);
  if (typeof localized === "string" && localized && localized !== value) {
    return localized;
  }

  if (/^[A-Za-z0-9_.-]+$/.test(value) && value.includes(".")) {
    return fallbackLabel;
  }

  return value;
}

function normalizeSchoolToken(rawSchool) {
  return String(rawSchool || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}

function parseBoolean(value, fallback = false) {
  if (value === true || value === false) return value;
  if (value === "true" || value === "on" || value === 1 || value === "1") return true;
  if (value === "false" || value === "off" || value === 0 || value === "0") return false;
  return fallback;
}

function getFallbackSchoolLabel(schoolKey) {
  return SPELL_SCHOOL_FALLBACK_ENTRIES.find((entry) => entry.key === schoolKey)?.label || schoolKey.toUpperCase();
}

function parseProfileKey(rawProfileKey) {
  const value = String(rawProfileKey || "").trim().toLowerCase();
  if (!value) return null;

  const match = value.match(/^school_([a-z]+)(?:_lvl_([0-9]+))?$/);
  if (!match) return null;

  const school = normalizeSpellSchoolKey(match[1]);
  if (!school) return null;

  const hasLevel = typeof match[2] === "string";
  const parsedLevel = hasLevel ? normalizeSpellLevel(Number(match[2])) : null;
  if (hasLevel && parsedLevel === null) return null;

  return buildSpellProfileKey(school, parsedLevel, hasLevel);
}

export function normalizeSpellSchoolKey(rawSchool) {
  const normalized = normalizeSchoolToken(rawSchool);
  if (!normalized) return null;
  return SPELL_SCHOOL_KEY_ALIASES[normalized] || null;
}

export function normalizeSpellLevel(rawLevel) {
  const numeric = Number(rawLevel);
  if (!Number.isFinite(numeric)) return null;

  const level = Math.trunc(numeric);
  if (level < MIN_SPELL_LEVEL || level > MAX_SPELL_LEVEL) return null;
  return level;
}

export function getSpellSchoolEntries() {
  const entries = [];
  const seen = new Set();

  const addEntry = (rawKey, rawLabel) => {
    const key = normalizeSpellSchoolKey(rawKey);
    if (!key || seen.has(key)) return;

    seen.add(key);
    entries.push({
      key,
      label: localizeSchoolLabel(rawLabel, getFallbackSchoolLabel(key)),
    });
  };

  const configuredSchools = CONFIG?.DND5E?.spellSchools;
  if (configuredSchools && typeof configuredSchools === "object") {
    for (const [rawKey, rawValue] of Object.entries(configuredSchools)) {
      if (typeof rawValue === "string") {
        addEntry(rawKey, rawValue);
        continue;
      }

      addEntry(rawKey, rawValue?.label || rawValue?.name || "");
    }
  }

  for (const fallback of SPELL_SCHOOL_FALLBACK_ENTRIES) {
    if (!seen.has(fallback.key)) {
      entries.push({ ...fallback });
      seen.add(fallback.key);
    }
  }

  return entries;
}

export function getSpellLevelEntries() {
  return Array.from({ length: MAX_SPELL_LEVEL + 1 }, (_, level) => ({
    value: level,
    label: level === 0 ? "Cantrip (0)" : `Level ${level}`,
  }));
}

export function buildSpellProfileKey(schoolKey, level = null, useLevelVariants = false) {
  const school = normalizeSpellSchoolKey(schoolKey);
  if (!school) return null;

  if (useLevelVariants) {
    const normalizedLevel = normalizeSpellLevel(level);
    if (normalizedLevel === null) return null;
    return `school_${school}_lvl_${normalizedLevel}`;
  }

  return `school_${school}`;
}

export function extractRawSpellSchoolFromItem(item) {
  return item?.system?.school?.value
    ?? item?.system?.school
    ?? item?.school
    ?? null;
}

export function extractRawSpellLevelFromItem(item) {
  return item?.system?.level
    ?? item?.system?.details?.level
    ?? item?.level
    ?? null;
}

export function isSpellItem(item) {
  return String(item?.type || "").toLowerCase() === "spell";
}

export function getDefaultSpellStyleFieldValues() {
  const defaults = {};
  for (const field of getRarityFieldDefinitions("spell")) {
    defaults[field.key] = field.defaultValue;
  }
  return defaults;
}

export function normalizeSpellStyleFieldValues(rawFields = {}, fallbackValues = null) {
  const fallback = {
    ...getDefaultSpellStyleFieldValues(),
    ...(fallbackValues && typeof fallbackValues === "object" ? fallbackValues : {}),
  };

  const normalized = {};
  for (const field of getRarityFieldDefinitions("spell")) {
    const rawValue = rawFields?.[field.key];

    if (field.type === "checkbox") {
      normalized[field.key] = parseBoolean(rawValue, parseBoolean(fallback[field.key], false));
      continue;
    }

    if (field.type === "color") {
      const normalizedColor = normalizeHexColor(rawValue, {
        allowShort: true,
        expandShort: true,
      });
      normalized[field.key] = normalizedColor || String(fallback[field.key] || "#000000");
      continue;
    }

    normalized[field.key] = rawValue ?? fallback[field.key];
  }

  return normalized;
}

export function buildSpellStyleSettingsFromFields(fields = {}) {
  const values = normalizeSpellStyleFieldValues(fields);

  return {
    enableItemColor: values["enable-item-color"],
    backgroundColor: values["item-color"],

    enableTextColor: values["enable-text-color"],
    itemSheetTextColor: values["text-color"],

    gradientEnabled: values["gradient-option"],
    gradientColor: values["secondary-item-color"],

    glowEnabled: values["glow-option"],

    enableInventoryGradientEffects: values["enable-inventory-gradient-effects"],
    enableInventoryBorders: values["enable-inventory-borders"],

    enableFoundryInterfaceGradientEffects: values["enable-foundry-interface-gradient-effects"],
    enableFoundryInterfaceTextColor: values["enable-foundry-interface-text-color"],
    foundryInterfaceTextColor: values["foundry-interface-text-color"],

    enableInventoryTitleColor: values["enable-inventory-title-color"],
    inventoryTitleColor: values["inventory-title-color"],

    enableInventoryDetailsColor: values["enable-inventory-details-color"],
    inventoryDetailsColor: values["inventory-details-color"],

    enableInventoryBorderColor: values["enable-inventory-border-color"],
    inventoryBorderColor: values["inventory-border-color"],
    inventoryBorderSecondaryColor: values["inventory-border-secondary-color"],
    enableInventoryBorderGlow: values["enable-inventory-border-glow"],
  };
}

export function isSpellStyleSettingsActive(settings = {}) {
  return Boolean(
    settings.enableItemColor
      || settings.enableTextColor
      || settings.enableInventoryGradientEffects
      || settings.enableInventoryBorders
      || settings.enableInventoryTitleColor
      || settings.enableInventoryDetailsColor
      || settings.enableFoundryInterfaceGradientEffects
      || settings.enableFoundryInterfaceTextColor
  );
}

export function getDefaultSpellSchoolStylesSetting() {
  const profiles = {};
  const defaults = getDefaultSpellStyleFieldValues();

  for (const school of getSpellSchoolEntries()) {
    const key = buildSpellProfileKey(school.key, null, false);
    if (!key) continue;
    profiles[key] = { ...defaults };
  }

  return {
    useLevelVariants: false,
    profiles,
  };
}

export function normalizeSpellSchoolStylesSetting(rawSetting = null) {
  const defaults = getDefaultSpellSchoolStylesSetting();
  const normalized = {
    useLevelVariants: parseBoolean(rawSetting?.useLevelVariants, false),
    profiles: { ...defaults.profiles },
  };

  const rawProfiles = rawSetting?.profiles;
  if (rawProfiles && typeof rawProfiles === "object") {
    for (const [rawProfileKey, rawFields] of Object.entries(rawProfiles)) {
      const profileKey = parseProfileKey(rawProfileKey);
      if (!profileKey) continue;

      const fallbackValues = normalized.profiles[profileKey] || getDefaultSpellStyleFieldValues();
      normalized.profiles[profileKey] = normalizeSpellStyleFieldValues(rawFields, fallbackValues);
    }
  }

  return normalized;
}

export function getSpellSchoolStylesSetting(moduleId = MODULE_ID) {
  const settingKey = `${moduleId}.${SPELL_SCHOOL_STYLES_SETTING_KEY}`;
  const hasSetting = game?.settings?.settings?.has?.(settingKey);
  if (!hasSetting) {
    return getDefaultSpellSchoolStylesSetting();
  }

  const raw = game.settings.get(moduleId, SPELL_SCHOOL_STYLES_SETTING_KEY);
  return normalizeSpellSchoolStylesSetting(raw);
}

export function ensureSpellProfileInSetting(setting, schoolKey, level = null, useLevelVariants = false) {
  const normalizedSetting = normalizeSpellSchoolStylesSetting(setting);
  const profileKey = buildSpellProfileKey(schoolKey, level, useLevelVariants);
  if (!profileKey) return normalizedSetting;

  if (!normalizedSetting.profiles[profileKey]) {
    const schoolProfileKey = buildSpellProfileKey(schoolKey, null, false);
    const schoolBase = schoolProfileKey ? normalizedSetting.profiles[schoolProfileKey] : null;
    normalizedSetting.profiles[profileKey] = normalizeSpellStyleFieldValues(
      {},
      schoolBase || getDefaultSpellStyleFieldValues()
    );
  }

  return normalizedSetting;
}

export function getSpellStyleProfileForItem(item, moduleId = MODULE_ID) {
  if (!isSpellItem(item)) return null;

  const school = normalizeSpellSchoolKey(extractRawSpellSchoolFromItem(item));
  if (!school) return null;

  const setting = getSpellSchoolStylesSetting(moduleId);
  const useLevelVariants = setting.useLevelVariants === true;
  const level = normalizeSpellLevel(extractRawSpellLevelFromItem(item));

  const levelProfileKey = buildSpellProfileKey(school, level, useLevelVariants);
  const schoolProfileKey = buildSpellProfileKey(school, null, false);

  const profileKey = levelProfileKey || schoolProfileKey;
  if (!profileKey) return null;

  const fallbackFields = schoolProfileKey ? setting.profiles[schoolProfileKey] : null;
  const rawFields = setting.profiles[profileKey] || fallbackFields || getDefaultSpellStyleFieldValues();

  return {
    school,
    level,
    profileKey,
    useLevelVariants,
    fields: normalizeSpellStyleFieldValues(rawFields, fallbackFields || undefined),
  };
}
