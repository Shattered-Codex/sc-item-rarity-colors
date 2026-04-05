import { getRarityFieldDefinitions } from "./rarityFieldSchema.js";
import {
  buildSpellProfileKey,
  getSpellLevelEntries,
  getSpellSchoolEntries,
  normalizeSpellSchoolKey,
} from "./spellSchoolConfig.js";

export const CUSTOM_SPELL_THEME_ID = "custom";

const SPELL_THEME_COMPARE_LEVELS = Object.freeze(getSpellLevelEntries().map((entry) => entry.value));
const SPELL_DARK_TEXT_COOL = "#182334";
const SPELL_DARK_TEXT_WARM = "#2B2418";
const SPELL_LIGHT_TEXT_COOL = "#F4F8FC";
const SPELL_LIGHT_TEXT_WARM = "#FFF8EE";
const SPELL_LIGHT_TEXT_VIOLET = "#FAF6FF";
const SPELL_LIGHT_TEXT_ROSE = "#FFF6FB";

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
  foundryText = text,
  inventoryTitle = text,
  inventoryDetails = text,
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
    "inventory-title-color": inventoryTitle,
    "enable-inventory-details-color": details,
    "inventory-details-color": inventoryDetails,
    "enable-foundry-interface-gradient-effects": foundryGradient,
    "enable-foundry-interface-text-color": true,
    "foundry-interface-text-color": foundryText,
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

function resolveSpellTextColor(palette, level, config) {
  const baseText = palette.text || "#F6FAFF";
  const textMode = palette.textMode || "light";

  if (textMode === "adaptive-dark") {
    const darkTextLevel = Number.isFinite(palette.darkTextLevel) ? palette.darkTextLevel : 5;
    if ((Number(level) || 0) >= darkTextLevel) {
      return String(palette.darkText || SPELL_DARK_TEXT_COOL).toUpperCase();
    }
  }

  const textTarget = palette.textMixTarget
    || (textMode === "dark" ? "#0B0F18" : "#FFFFFF");
  const textMixRatio = Number.isFinite(palette.textMixRatio)
    ? palette.textMixRatio
    : (textMode === "dark"
      ? Math.min(0.12, config.lightMix * 0.2)
      : Math.min(0.28, config.lightMix * 0.5));

  return mixColors(baseText, textTarget, textMixRatio);
}

function buildProfileFromPalette(palette, level) {
  const config = levelVisualConfig(level);
  const primary = mixColors(palette.primary, "#0B0F18", config.darkMix);
  const secondary = mixColors(palette.secondary, "#FFFFFF", config.lightMix);
  const text = resolveSpellTextColor(palette, level, config);
  const foundryText = String(palette.foundryText || "#F6FAFF").toUpperCase();
  const inventoryTitle = String(palette.inventoryTitle || text).toUpperCase();
  const inventoryDetails = String(palette.inventoryDetails || text).toUpperCase();

  return buildSpellThemeFieldValues({
    primary,
    secondary,
    text,
    foundryText,
    inventoryTitle,
    inventoryDetails,
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
  defineSpellPreset(
    "luminous-codex",
    "Luminous Codex",
    "Bright grimoire pigments that shift to ink-dark lettering on higher-level spells for stronger contrast.",
    {
      abj: { primary: "#4878D8", secondary: "#D8E8FF", text: "#F4F9FF", foundryText: "#F2F7FF", inventoryTitle: SPELL_LIGHT_TEXT_COOL, inventoryDetails: SPELL_DARK_TEXT_COOL, textMode: "adaptive-dark", darkText: SPELL_DARK_TEXT_COOL, darkTextLevel: 3 },
      con: { primary: "#3AA78D", secondary: "#D6FFF3", text: "#F2FFFB", foundryText: "#F1FFFA", inventoryTitle: SPELL_LIGHT_TEXT_COOL, inventoryDetails: SPELL_DARK_TEXT_COOL, textMode: "adaptive-dark", darkText: SPELL_DARK_TEXT_COOL, darkTextLevel: 3 },
      div: { primary: "#C69034", secondary: "#FFF0C5", text: "#FFFBEF", foundryText: "#FFF9EF", inventoryTitle: SPELL_LIGHT_TEXT_WARM, inventoryDetails: SPELL_DARK_TEXT_WARM, textMode: "adaptive-dark", darkText: SPELL_DARK_TEXT_WARM, darkTextLevel: 3 },
      enc: { primary: "#D75CA7", secondary: "#FFE0F1", text: "#FFF7FC", foundryText: "#FFF6FC", inventoryTitle: SPELL_LIGHT_TEXT_ROSE, inventoryDetails: SPELL_DARK_TEXT_COOL, textMode: "adaptive-dark", darkText: SPELL_DARK_TEXT_COOL, darkTextLevel: 3 },
      evo: { primary: "#DA7642", secondary: "#FFE2CC", text: "#FFF8F1", foundryText: "#FFF7F0", inventoryTitle: SPELL_LIGHT_TEXT_WARM, inventoryDetails: SPELL_DARK_TEXT_WARM, textMode: "adaptive-dark", darkText: SPELL_DARK_TEXT_WARM, darkTextLevel: 3 },
      ill: { primary: "#9070E0", secondary: "#ECE1FF", text: "#FAF7FF", foundryText: "#FAF7FF", inventoryTitle: SPELL_LIGHT_TEXT_VIOLET, inventoryDetails: SPELL_DARK_TEXT_COOL, textMode: "adaptive-dark", darkText: SPELL_DARK_TEXT_COOL, darkTextLevel: 3 },
      nec: { primary: "#55607C", secondary: "#DDE1EC", text: "#F8FAFF", foundryText: "#F3F7FF", inventoryTitle: SPELL_LIGHT_TEXT_COOL, inventoryDetails: SPELL_DARK_TEXT_COOL, textMode: "adaptive-dark", darkText: SPELL_DARK_TEXT_COOL, darkTextLevel: 3 },
      trs: { primary: "#6EA06E", secondary: "#E4F7DB", text: "#F7FFF3", foundryText: "#F6FFF2", inventoryTitle: SPELL_LIGHT_TEXT_COOL, inventoryDetails: SPELL_DARK_TEXT_COOL, textMode: "adaptive-dark", darkText: SPELL_DARK_TEXT_COOL, darkTextLevel: 3 },
    }
  ),
  defineSpellPreset(
    "sunscribe-archive",
    "Sunscribe Archive",
    "Pastel ceremonial gradients with earlier dark-text transitions on brighter mid and high spell levels.",
    {
      abj: { primary: "#5E86DE", secondary: "#E4ECFF", text: "#F6FAFF", foundryText: "#F4F8FF", inventoryTitle: SPELL_LIGHT_TEXT_COOL, inventoryDetails: SPELL_DARK_TEXT_COOL, textMode: "adaptive-dark", darkText: SPELL_DARK_TEXT_COOL, darkTextLevel: 3 },
      con: { primary: "#52AFBF", secondary: "#E1FBFF", text: "#F4FEFF", foundryText: "#F2FDFF", inventoryTitle: SPELL_LIGHT_TEXT_COOL, inventoryDetails: SPELL_DARK_TEXT_COOL, textMode: "adaptive-dark", darkText: SPELL_DARK_TEXT_COOL, darkTextLevel: 3 },
      div: { primary: "#D2A04E", secondary: "#FFF1CF", text: "#FFFCEF", foundryText: "#FFF9EE", inventoryTitle: SPELL_LIGHT_TEXT_WARM, inventoryDetails: SPELL_DARK_TEXT_WARM, textMode: "adaptive-dark", darkText: SPELL_DARK_TEXT_WARM, darkTextLevel: 3 },
      enc: { primary: "#C96FB8", secondary: "#FFE7F7", text: "#FFF8FD", foundryText: "#FFF7FC", inventoryTitle: SPELL_LIGHT_TEXT_ROSE, inventoryDetails: SPELL_DARK_TEXT_COOL, textMode: "adaptive-dark", darkText: SPELL_DARK_TEXT_COOL, darkTextLevel: 3 },
      evo: { primary: "#E08A5B", secondary: "#FFE8D9", text: "#FFF8F2", foundryText: "#FFF7F0", inventoryTitle: SPELL_LIGHT_TEXT_WARM, inventoryDetails: SPELL_DARK_TEXT_WARM, textMode: "adaptive-dark", darkText: SPELL_DARK_TEXT_WARM, darkTextLevel: 3 },
      ill: { primary: "#A184EA", secondary: "#F3EAFF", text: "#FCF8FF", foundryText: "#FAF7FF", inventoryTitle: SPELL_LIGHT_TEXT_VIOLET, inventoryDetails: SPELL_DARK_TEXT_COOL, textMode: "adaptive-dark", darkText: SPELL_DARK_TEXT_COOL, darkTextLevel: 3 },
      nec: { primary: "#69728C", secondary: "#E6E9F3", text: "#FAFBFF", foundryText: "#F4F7FF", inventoryTitle: SPELL_LIGHT_TEXT_COOL, inventoryDetails: SPELL_DARK_TEXT_COOL, textMode: "adaptive-dark", darkText: SPELL_DARK_TEXT_COOL, darkTextLevel: 3 },
      trs: { primary: "#7FB28A", secondary: "#EAF8E6", text: "#F9FFF7", foundryText: "#F7FFF5", inventoryTitle: SPELL_LIGHT_TEXT_COOL, inventoryDetails: SPELL_DARK_TEXT_COOL, textMode: "adaptive-dark", darkText: SPELL_DARK_TEXT_COOL, darkTextLevel: 3 },
    }
  ),
  defineSpellPreset(
    "stormglass-lexicon",
    "Stormglass Lexicon",
    "Rain-soaked blues, sea-glass greens and charged highlights that sharpen dramatically as levels rise.",
    {
      abj: { primary: "#275FA8", secondary: "#8FD9FF", text: "#F2F9FF", foundryText: "#F0F7FF", inventoryTitle: SPELL_LIGHT_TEXT_COOL, inventoryDetails: SPELL_DARK_TEXT_COOL },
      con: { primary: "#1C7F7A", secondary: "#7FF0C7", text: "#F0FFF9", foundryText: "#EEFFF8", inventoryTitle: SPELL_LIGHT_TEXT_COOL, inventoryDetails: SPELL_DARK_TEXT_COOL },
      div: { primary: "#4B78A6", secondary: "#F6E27D", text: "#FFFBEF", foundryText: "#FFF8EA", inventoryTitle: SPELL_LIGHT_TEXT_WARM, inventoryDetails: SPELL_DARK_TEXT_WARM },
      enc: { primary: "#3C6AA8", secondary: "#FF9ED8", text: "#FFF5FB", foundryText: "#FFF3FA", inventoryTitle: SPELL_LIGHT_TEXT_ROSE, inventoryDetails: SPELL_DARK_TEXT_COOL },
      evo: { primary: "#0F6B8C", secondary: "#FFB15C", text: "#FFF7EF", foundryText: "#FFF5EC", inventoryTitle: SPELL_LIGHT_TEXT_WARM, inventoryDetails: SPELL_DARK_TEXT_WARM },
      ill: { primary: "#3651B5", secondary: "#C7B0FF", text: "#F7F4FF", foundryText: "#F5F2FF", inventoryTitle: SPELL_LIGHT_TEXT_VIOLET, inventoryDetails: SPELL_DARK_TEXT_COOL },
      nec: { primary: "#111E30", secondary: "#6E8FB3", text: "#EEF5FF", foundryText: "#ECF3FF", inventoryTitle: SPELL_LIGHT_TEXT_COOL, inventoryDetails: SPELL_DARK_TEXT_COOL },
      trs: { primary: "#2C7D56", secondary: "#98D6FF", text: "#F1FBFF", foundryText: "#EFF9FF", inventoryTitle: SPELL_LIGHT_TEXT_COOL, inventoryDetails: SPELL_DARK_TEXT_COOL },
    }
  ),
  defineSpellPreset(
    "ember-canticles",
    "Ember Canticles",
    "Ash, brass and furnace-lit gradients with warm metallic highs and controlled readability at every tier.",
    {
      abj: { primary: "#6A4028", secondary: "#E4B27B", text: "#FFF7F0", foundryText: "#FFF4ED", inventoryTitle: SPELL_LIGHT_TEXT_WARM, inventoryDetails: SPELL_DARK_TEXT_WARM },
      con: { primary: "#7A4B1E", secondary: "#F0C86E", text: "#FFF9F0", foundryText: "#FFF6EB", inventoryTitle: SPELL_LIGHT_TEXT_WARM, inventoryDetails: SPELL_DARK_TEXT_WARM },
      div: { primary: "#A45E18", secondary: "#FFE08E", text: "#FFFBEF", foundryText: "#FFF8EA", inventoryTitle: SPELL_LIGHT_TEXT_WARM, inventoryDetails: SPELL_DARK_TEXT_WARM, textMode: "adaptive-dark", darkText: SPELL_DARK_TEXT_WARM, darkTextLevel: 5 },
      enc: { primary: "#8F3D22", secondary: "#F7A37C", text: "#FFF5F1", foundryText: "#FFF2EE", inventoryTitle: SPELL_LIGHT_TEXT_ROSE, inventoryDetails: SPELL_DARK_TEXT_WARM },
      evo: { primary: "#A32B14", secondary: "#FF8A52", text: "#FFF3EE", foundryText: "#FFF1EB", inventoryTitle: SPELL_LIGHT_TEXT_WARM, inventoryDetails: SPELL_DARK_TEXT_WARM },
      ill: { primary: "#7A3A2B", secondary: "#E2A37E", text: "#FFF5F0", foundryText: "#FFF2ED", inventoryTitle: SPELL_LIGHT_TEXT_ROSE, inventoryDetails: SPELL_DARK_TEXT_WARM },
      nec: { primary: "#231713", secondary: "#9C6A58", text: "#FFF4F0", foundryText: "#FFF0EB", inventoryTitle: SPELL_LIGHT_TEXT_WARM, inventoryDetails: SPELL_DARK_TEXT_WARM },
      trs: { primary: "#8C5A1B", secondary: "#DDBA6E", text: "#FFF8EF", foundryText: "#FFF5EA", inventoryTitle: SPELL_LIGHT_TEXT_WARM, inventoryDetails: SPELL_DARK_TEXT_WARM },
    }
  ),
  defineSpellPreset(
    "verdigris-archive",
    "Verdigris Archive",
    "Oxidized copper, mineral inks and botanical undertones that feel scholarly rather than luminous.",
    {
      abj: { primary: "#2C5F70", secondary: "#99C8C8", text: "#F1FCFC", foundryText: "#EFF9F9", inventoryTitle: SPELL_LIGHT_TEXT_COOL, inventoryDetails: SPELL_DARK_TEXT_COOL, textMode: "adaptive-dark", darkText: SPELL_DARK_TEXT_COOL, darkTextLevel: 3 },
      con: { primary: "#1A725F", secondary: "#8ED5AE", text: "#F1FFF7", foundryText: "#EEFFF5", inventoryTitle: SPELL_LIGHT_TEXT_COOL, inventoryDetails: SPELL_DARK_TEXT_COOL, textMode: "adaptive-dark", darkText: SPELL_DARK_TEXT_COOL, darkTextLevel: 3 },
      div: { primary: "#73833C", secondary: "#D8D39A", text: "#FBFCEE", foundryText: "#F8F9E8", inventoryTitle: SPELL_LIGHT_TEXT_WARM, inventoryDetails: SPELL_DARK_TEXT_WARM, textMode: "adaptive-dark", darkText: SPELL_DARK_TEXT_WARM, darkTextLevel: 3 },
      enc: { primary: "#4C6F5E", secondary: "#D6B6A2", text: "#FFF7F2", foundryText: "#FFF4EF", inventoryTitle: SPELL_LIGHT_TEXT_ROSE, inventoryDetails: SPELL_DARK_TEXT_WARM, textMode: "adaptive-dark", darkText: SPELL_DARK_TEXT_WARM, darkTextLevel: 3 },
      evo: { primary: "#3B6A4C", secondary: "#E2B86F", text: "#FFF8F0", foundryText: "#FFF5EB", inventoryTitle: SPELL_LIGHT_TEXT_WARM, inventoryDetails: SPELL_DARK_TEXT_WARM, textMode: "adaptive-dark", darkText: SPELL_DARK_TEXT_WARM, darkTextLevel: 3 },
      ill: { primary: "#365A69", secondary: "#C0C3E8", text: "#F4F6FF", foundryText: "#F1F4FF", inventoryTitle: SPELL_LIGHT_TEXT_VIOLET, inventoryDetails: SPELL_DARK_TEXT_COOL, textMode: "adaptive-dark", darkText: SPELL_DARK_TEXT_COOL, darkTextLevel: 3 },
      nec: { primary: "#162126", secondary: "#8AA39D", text: "#EEF8F5", foundryText: "#EBF5F2", inventoryTitle: SPELL_LIGHT_TEXT_COOL, inventoryDetails: SPELL_DARK_TEXT_COOL, textMode: "adaptive-dark", darkText: SPELL_DARK_TEXT_COOL, darkTextLevel: 3 },
      trs: { primary: "#4B6D37", secondary: "#B0D48E", text: "#F6FFF0", foundryText: "#F3FFEC", inventoryTitle: SPELL_LIGHT_TEXT_COOL, inventoryDetails: SPELL_DARK_TEXT_COOL, textMode: "adaptive-dark", darkText: SPELL_DARK_TEXT_COOL, darkTextLevel: 3 },
    }
  ),
  defineSpellPreset(
    "violet-sanctum",
    "Violet Sanctum",
    "Cathedral purples, velvet blues and rose-lit halos built for luxurious endgame spell presentation.",
    {
      abj: { primary: "#2F3F8E", secondary: "#9AB7FF", text: "#F2F5FF", foundryText: "#EEF2FF", inventoryTitle: SPELL_LIGHT_TEXT_COOL, inventoryDetails: SPELL_DARK_TEXT_COOL },
      con: { primary: "#265C88", secondary: "#8EDBFF", text: "#F0FAFF", foundryText: "#EDF8FF", inventoryTitle: SPELL_LIGHT_TEXT_COOL, inventoryDetails: SPELL_DARK_TEXT_COOL },
      div: { primary: "#7A5AA8", secondary: "#F0D894", text: "#FFF9F0", foundryText: "#FFF6EB", inventoryTitle: SPELL_LIGHT_TEXT_WARM, inventoryDetails: SPELL_DARK_TEXT_WARM },
      enc: { primary: "#8A2E74", secondary: "#FF9DDA", text: "#FFF4FB", foundryText: "#FFF1F9", inventoryTitle: SPELL_LIGHT_TEXT_ROSE, inventoryDetails: SPELL_DARK_TEXT_COOL },
      evo: { primary: "#7A3489", secondary: "#FFB078", text: "#FFF5F2", foundryText: "#FFF2EE", inventoryTitle: SPELL_LIGHT_TEXT_WARM, inventoryDetails: SPELL_DARK_TEXT_WARM },
      ill: { primary: "#5827A0", secondary: "#C3A0FF", text: "#F7F1FF", foundryText: "#F4EDFF", inventoryTitle: SPELL_LIGHT_TEXT_VIOLET, inventoryDetails: SPELL_DARK_TEXT_COOL },
      nec: { primary: "#1F1638", secondary: "#8374B5", text: "#F0EEFF", foundryText: "#ECE9FF", inventoryTitle: SPELL_LIGHT_TEXT_COOL, inventoryDetails: SPELL_DARK_TEXT_COOL },
      trs: { primary: "#5E3D8A", secondary: "#8EC6C5", text: "#F2FFFE", foundryText: "#EEFBFA", inventoryTitle: SPELL_LIGHT_TEXT_COOL, inventoryDetails: SPELL_DARK_TEXT_COOL },
    }
  ),
  defineSpellPreset(
    "auric-tide",
    "Auric Tide",
    "Sunlit parchment, pale metals and bright ritual pigments that pivot to dark lettering on mid-high levels.",
    {
      abj: { primary: "#6B8FD6", secondary: "#E5EEFF", text: "#F6FAFF", foundryText: "#F3F8FF", inventoryTitle: SPELL_LIGHT_TEXT_COOL, inventoryDetails: SPELL_DARK_TEXT_COOL, textMode: "adaptive-dark", darkText: SPELL_DARK_TEXT_COOL, darkTextLevel: 3 },
      con: { primary: "#6DB9C1", secondary: "#E3FDFF", text: "#F5FEFF", foundryText: "#F1FCFF", inventoryTitle: SPELL_LIGHT_TEXT_COOL, inventoryDetails: SPELL_DARK_TEXT_COOL, textMode: "adaptive-dark", darkText: SPELL_DARK_TEXT_COOL, darkTextLevel: 3 },
      div: { primary: "#D4AA62", secondary: "#FFF0C8", text: "#FFFCEF", foundryText: "#FFF8EA", inventoryTitle: SPELL_LIGHT_TEXT_WARM, inventoryDetails: SPELL_DARK_TEXT_WARM, textMode: "adaptive-dark", darkText: SPELL_DARK_TEXT_WARM, darkTextLevel: 3 },
      enc: { primary: "#D38FB9", secondary: "#FFE7F4", text: "#FFF8FC", foundryText: "#FFF5FA", inventoryTitle: SPELL_LIGHT_TEXT_ROSE, inventoryDetails: SPELL_DARK_TEXT_COOL, textMode: "adaptive-dark", darkText: SPELL_DARK_TEXT_COOL, darkTextLevel: 3 },
      evo: { primary: "#E0A17C", secondary: "#FFE8D7", text: "#FFF9F2", foundryText: "#FFF5EE", inventoryTitle: SPELL_LIGHT_TEXT_WARM, inventoryDetails: SPELL_DARK_TEXT_WARM, textMode: "adaptive-dark", darkText: SPELL_DARK_TEXT_WARM, darkTextLevel: 3 },
      ill: { primary: "#A18FE0", secondary: "#F0E7FF", text: "#FCF8FF", foundryText: "#F8F4FF", inventoryTitle: SPELL_LIGHT_TEXT_VIOLET, inventoryDetails: SPELL_DARK_TEXT_COOL, textMode: "adaptive-dark", darkText: SPELL_DARK_TEXT_COOL, darkTextLevel: 3 },
      nec: { primary: "#8B92A8", secondary: "#ECEFF7", text: "#FAFBFF", foundryText: "#F5F7FF", inventoryTitle: SPELL_LIGHT_TEXT_COOL, inventoryDetails: SPELL_DARK_TEXT_COOL, textMode: "adaptive-dark", darkText: SPELL_DARK_TEXT_COOL, darkTextLevel: 3 },
      trs: { primary: "#8FB58B", secondary: "#EDF8E6", text: "#F9FFF7", foundryText: "#F5FFF2", inventoryTitle: SPELL_LIGHT_TEXT_COOL, inventoryDetails: SPELL_DARK_TEXT_COOL, textMode: "adaptive-dark", darkText: SPELL_DARK_TEXT_COOL, darkTextLevel: 3 },
    }
  ),
  defineSpellPreset(
    "obsidian-choir",
    "Obsidian Choir",
    "Near-black ritual surfaces with stained-glass accents, aimed at players who want strong mood and effortless contrast.",
    {
      abj: { primary: "#101C34", secondary: "#5E9CFF", text: "#EFF5FF", foundryText: "#ECF2FF", inventoryTitle: SPELL_LIGHT_TEXT_COOL, inventoryDetails: SPELL_DARK_TEXT_COOL },
      con: { primary: "#0E2B2A", secondary: "#59D9BD", text: "#EDFFFB", foundryText: "#EAFFF8", inventoryTitle: SPELL_LIGHT_TEXT_COOL, inventoryDetails: SPELL_DARK_TEXT_COOL },
      div: { primary: "#2B2413", secondary: "#D8BE63", text: "#FFF9EA", foundryText: "#FFF6E6", inventoryTitle: SPELL_LIGHT_TEXT_WARM, inventoryDetails: SPELL_DARK_TEXT_WARM },
      enc: { primary: "#2E1128", secondary: "#E26BC1", text: "#FFF1FB", foundryText: "#FFEFF9", inventoryTitle: SPELL_LIGHT_TEXT_ROSE, inventoryDetails: SPELL_DARK_TEXT_COOL },
      evo: { primary: "#351610", secondary: "#F07A42", text: "#FFF1EC", foundryText: "#FFEEE8", inventoryTitle: SPELL_LIGHT_TEXT_WARM, inventoryDetails: SPELL_DARK_TEXT_WARM },
      ill: { primary: "#24123E", secondary: "#A987FF", text: "#F2EEFF", foundryText: "#EFEAFF", inventoryTitle: SPELL_LIGHT_TEXT_VIOLET, inventoryDetails: SPELL_DARK_TEXT_COOL },
      nec: { primary: "#090B10", secondary: "#8A97B0", text: "#F1F5FF", foundryText: "#EDF1FB", inventoryTitle: SPELL_LIGHT_TEXT_COOL, inventoryDetails: SPELL_DARK_TEXT_COOL },
      trs: { primary: "#172816", secondary: "#8DC97F", text: "#F2FFF0", foundryText: "#EEFFEB", inventoryTitle: SPELL_LIGHT_TEXT_COOL, inventoryDetails: SPELL_DARK_TEXT_COOL },
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
