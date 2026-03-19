import { getRarityFieldDefinitions } from "./rarityFieldSchema.js";
import {
  buildSpellProfileKey,
  getSpellLevelEntries,
  getSpellSchoolEntries,
  normalizeSpellSchoolKey,
} from "./spellSchoolConfig.js";

export const CUSTOM_SPELL_THEME_ID = "custom";

const SPELL_THEME_COMPARE_LEVELS = Object.freeze(getSpellLevelEntries().map((entry) => entry.value));

function deepClone(value) {
  if (typeof foundry?.utils?.deepClone === "function") {
    return foundry.utils.deepClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}

function clampChannel(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function hexToRgb(hex) {
  const value = String(hex || "").trim().replace(/^#/, "");
  if (!/^[0-9a-f]{6}$/i.test(value)) return null;

  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  };
}

function rgbToHex({ r, g, b }) {
  return `#${[r, g, b]
    .map((channel) => clampChannel(channel).toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()}`;
}

function mixColors(colorA, colorB, ratio = 0.5) {
  const left = hexToRgb(colorA);
  const right = hexToRgb(colorB);
  if (!left) return String(colorB || "#000000").toUpperCase();
  if (!right) return String(colorA || "#000000").toUpperCase();

  const weight = Math.max(0, Math.min(1, Number(ratio) || 0));
  return rgbToHex({
    r: left.r + (right.r - left.r) * weight,
    g: left.g + (right.g - left.g) * weight,
    b: left.b + (right.b - left.b) * weight,
  });
}

function buildBaseSpellFieldValues() {
  const values = {};
  for (const field of getRarityFieldDefinitions("spell")) {
    values[field.key] = field.defaultValue;
  }
  return values;
}

function buildSpellThemeFieldValues({
  primary,
  secondary,
  text,
  gradient = false,
  glow = false,
  inventoryGradient = true,
  foundryGradient = true,
  details = true,
} = {}) {
  const defaults = buildBaseSpellFieldValues();
  return {
    ...defaults,
    "enable-item-color": true,
    "item-color": primary,
    "secondary-item-color": secondary,
    "gradient-option": gradient,
    "glow-option": glow,
    "enable-text-color": true,
    "text-color": text,
    "enable-inventory-gradient-effects": inventoryGradient,
    "enable-inventory-borders": true,
    "enable-inventory-title-color": true,
    "inventory-title-color": text,
    "enable-inventory-details-color": details,
    "inventory-details-color": text,
    "enable-foundry-interface-gradient-effects": foundryGradient,
    "enable-foundry-interface-text-color": true,
    "foundry-interface-text-color": text,
  };
}

function levelVisualConfig(level) {
  const numeric = Number(level) || 0;
  if (numeric <= 0) {
    return { darkMix: 0.38, lightMix: 0.04, gradient: false, glow: false };
  }
  if (numeric <= 2) {
    return { darkMix: 0.24, lightMix: 0.14, gradient: false, glow: false };
  }
  if (numeric <= 4) {
    return { darkMix: 0.12, lightMix: 0.34, gradient: true, glow: false };
  }
  if (numeric <= 6) {
    return { darkMix: 0.05, lightMix: 0.48, gradient: true, glow: true };
  }
  if (numeric <= 8) {
    return { darkMix: 0.01, lightMix: 0.6, gradient: true, glow: true };
  }

  return { darkMix: 0, lightMix: 0.72, gradient: true, glow: true };
}

function buildProfileFromPalette(palette, level) {
  const config = levelVisualConfig(level);
  const primary = mixColors(palette.primary, "#0B0F18", config.darkMix);
  const secondary = mixColors(palette.secondary, "#FFFFFF", config.lightMix);
  const text = mixColors(palette.text || "#F6FAFF", "#FFFFFF", Math.min(0.28, config.lightMix * 0.5));

  return buildSpellThemeFieldValues({
    primary,
    secondary,
    text,
    gradient: config.gradient,
    glow: config.glow,
    inventoryGradient: true,
    foundryGradient: true,
    details: true,
  });
}

function defineSpellPreset(id, label, description, schools) {
  return Object.freeze({
    id,
    label,
    description,
    schools: Object.freeze(schools),
  });
}

export const SPELL_THEME_PRESETS = Object.freeze([
  defineSpellPreset(
    "arcane-atlas",
    "Arcane Atlas",
    "Classic arcane pigments with clearer school separation and stronger late-level finishes.",
    {
      abj: { primary: "#2B4F92", secondary: "#8FD7FF", text: "#F3FAFF" },
      con: { primary: "#0F7E67", secondary: "#74F0D1", text: "#ECFFFB" },
      div: { primary: "#9E6A10", secondary: "#FFE18B", text: "#FFF9EC" },
      enc: { primary: "#B52477", secondary: "#FFA1D7", text: "#FFF4FB" },
      evo: { primary: "#C44912", secondary: "#FFB34D", text: "#FFF5ED" },
      ill: { primary: "#5932BC", secondary: "#B89DFF", text: "#F7F4FF" },
      nec: { primary: "#121216", secondary: "#E7DDD0", text: "#FFF8F1" },
      trs: { primary: "#935417", secondary: "#7ED3A4", text: "#F7FFF9" },
    }
  ),
  defineSpellPreset(
    "astral-lattice",
    "Astral Lattice",
    "Celestial contrasts with luminous complementary gradients and sharper astral highlights.",
    {
      abj: { primary: "#1E56C8", secondary: "#FFD679", text: "#FFF9EE" },
      con: { primary: "#0A7FA0", secondary: "#D8A7FF", text: "#F8F3FF" },
      div: { primary: "#4658C8", secondary: "#FFF1A6", text: "#FCFAEE" },
      enc: { primary: "#9F27C7", secondary: "#7FFFE2", text: "#F3FFFD" },
      evo: { primary: "#CE3926", secondary: "#7EDBFF", text: "#EFFBFF" },
      ill: { primary: "#6936E5", secondary: "#FFC8EE", text: "#FFF5FC" },
      nec: { primary: "#111421", secondary: "#5874C9", text: "#EFF3FF" },
      trs: { primary: "#0B8A69", secondary: "#FFB86D", text: "#FFF7EF" },
    }
  ),
  defineSpellPreset(
    "eldritch-nocturne",
    "Eldritch Nocturne",
    "Shadowed grimoires with deep pigments, eerie complementary accents and premium endgame glow.",
    {
      abj: { primary: "#16325E", secondary: "#63D6FF", text: "#EFF8FF" },
      con: { primary: "#0C5953", secondary: "#C7B06C", text: "#FFF8EA" },
      div: { primary: "#795B12", secondary: "#C7B0FF", text: "#F7F2FF" },
      enc: { primary: "#65154E", secondary: "#78E8DA", text: "#F2FFFC" },
      evo: { primary: "#7D1E12", secondary: "#FF943E", text: "#FFF4EC" },
      ill: { primary: "#351B73", secondary: "#A8B9FF", text: "#F4F5FF" },
      nec: { primary: "#0D0D10", secondary: "#D7CFC3", text: "#FFF9F2" },
      trs: { primary: "#6C4211", secondary: "#73D2B2", text: "#EEFFFA" },
    }
  ),
  defineSpellPreset(
    "runic-surge",
    "Runic Surge",
    "Hyper-saturated rune energy with aggressive complementary gradients and loud high-level impact.",
    {
      abj: { primary: "#005CFF", secondary: "#E9FF3E", text: "#F7FFEE" },
      con: { primary: "#00BFA7", secondary: "#FF7A6E", text: "#FFF6F3" },
      div: { primary: "#EFA400", secondary: "#6D63FF", text: "#F6F4FF" },
      enc: { primary: "#FF0DA0", secondary: "#56FFF0", text: "#F2FFFE" },
      evo: { primary: "#FF5A00", secondary: "#4AB0FF", text: "#EFF8FF" },
      ill: { primary: "#7200FF", secondary: "#B5FF36", text: "#FAFFEF" },
      nec: { primary: "#160B10", secondary: "#C61C45", text: "#FFF3F6" },
      trs: { primary: "#D87A00", secondary: "#26FF9C", text: "#EEFFF8" },
    }
  ),
  defineSpellPreset(
    "imperial-myth",
    "Imperial Myth",
    "Regal jewel tones, rare metals and ceremonial finishes that intensify sharply by level.",
    {
      abj: { primary: "#24449B", secondary: "#C7E6FF", text: "#F3FAFF" },
      con: { primary: "#0E7A5B", secondary: "#F0CE7A", text: "#FFF9EE" },
      div: { primary: "#A3670A", secondary: "#FFE8A9", text: "#FFFBEF" },
      enc: { primary: "#A61B49", secondary: "#FFD1B5", text: "#FFF6F1" },
      evo: { primary: "#A92B10", secondary: "#FFCA70", text: "#FFF6EE" },
      ill: { primary: "#5B259E", secondary: "#E1CBFF", text: "#FAF5FF" },
      nec: { primary: "#171015", secondary: "#8F1839", text: "#FFF4F7" },
      trs: { primary: "#875515", secondary: "#9EE0B4", text: "#F3FFF7" },
    }
  ),
]);

function getPresetPaletteForSchool(preset, schoolKey) {
  const normalized = normalizeSpellSchoolKey(schoolKey);
  if (!normalized) return null;
  return preset?.schools?.[normalized] ?? null;
}

function buildPresetProfiles(preset, schools = getSpellSchoolEntries(), levels = SPELL_THEME_COMPARE_LEVELS) {
  const profiles = {};

  for (const school of schools) {
    const palette = getPresetPaletteForSchool(preset, school.key);
    if (!palette) continue;

    const schoolProfileKey = buildSpellProfileKey(school.key, null, false);
    if (schoolProfileKey) {
      profiles[schoolProfileKey] = buildProfileFromPalette(palette, 3);
    }

    for (const level of levels) {
      const levelProfileKey = buildSpellProfileKey(school.key, level, true);
      if (!levelProfileKey) continue;
      profiles[levelProfileKey] = buildProfileFromPalette(palette, level);
    }
  }

  return profiles;
}

function normalizeSpellThemeFieldValue(field, value) {
  if (field?.type === "checkbox") {
    return value === true;
  }

  if (field?.type === "color") {
    return String(value || field.defaultValue || "")
      .trim()
      .toUpperCase();
  }

  return value;
}

function getComparableProfileKeys(schools = getSpellSchoolEntries(), levels = SPELL_THEME_COMPARE_LEVELS) {
  const keys = [];

  for (const school of schools) {
    const schoolProfileKey = buildSpellProfileKey(school.key, null, false);
    if (schoolProfileKey) keys.push(schoolProfileKey);

    for (const level of levels) {
      const levelProfileKey = buildSpellProfileKey(school.key, level, true);
      if (levelProfileKey) keys.push(levelProfileKey);
    }
  }

  return keys;
}

export function getSpellThemePresetOptions() {
  return SPELL_THEME_PRESETS.map((preset) => ({
    id: preset.id,
    label: preset.label,
    description: preset.description,
  }));
}

export function getSpellThemePreset(themeId) {
  return SPELL_THEME_PRESETS.find((preset) => preset.id === themeId) ?? null;
}

export function applySpellThemePresetToDraft(draftProfiles, themeId, {
  schools = getSpellSchoolEntries(),
  levels = SPELL_THEME_COMPARE_LEVELS,
} = {}) {
  const preset = getSpellThemePreset(themeId);
  if (!preset || !draftProfiles || typeof draftProfiles !== "object") return false;

  const presetProfiles = buildPresetProfiles(preset, schools, levels);
  for (const [profileKey, profileFields] of Object.entries(presetProfiles)) {
    draftProfiles[profileKey] = {
      ...(draftProfiles[profileKey] || {}),
      ...deepClone(profileFields),
    };
  }

  return true;
}

export function doesDraftMatchSpellThemePreset(draftProfiles, themeId, {
  schools = getSpellSchoolEntries(),
  levels = SPELL_THEME_COMPARE_LEVELS,
} = {}) {
  const preset = getSpellThemePreset(themeId);
  if (!preset || !draftProfiles || typeof draftProfiles !== "object") return false;

  const presetProfiles = buildPresetProfiles(preset, schools, levels);
  const comparableKeys = getComparableProfileKeys(schools, levels);
  const fields = getRarityFieldDefinitions("spell");

  for (const profileKey of comparableKeys) {
    const expectedFields = presetProfiles[profileKey];
    if (!expectedFields) continue;

    const draftFields = draftProfiles[profileKey];
    if (!draftFields || typeof draftFields !== "object") return false;

    for (const field of fields) {
      const expectedValue = normalizeSpellThemeFieldValue(field, expectedFields[field.key]);
      const draftValue = normalizeSpellThemeFieldValue(field, draftFields[field.key]);
      if (expectedValue !== draftValue) {
        return false;
      }
    }
  }

  return true;
}

export function detectSpellThemePresetId(draftProfiles, {
  schools = getSpellSchoolEntries(),
  levels = SPELL_THEME_COMPARE_LEVELS,
} = {}) {
  for (const preset of SPELL_THEME_PRESETS) {
    if (doesDraftMatchSpellThemePreset(draftProfiles, preset.id, { schools, levels })) {
      return preset.id;
    }
  }

  return CUSTOM_SPELL_THEME_ID;
}
