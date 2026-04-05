import { RARITY_TIERS } from "./constants.js";
import { getRarityFieldDefinitions } from "./rarityFieldSchema.js";

export const CUSTOM_ITEM_RARITY_THEME_ID = "custom";

export const ITEM_RARITY_THEME_RARITIES = Object.freeze([
  RARITY_TIERS.COMMON,
  RARITY_TIERS.UNCOMMON,
  RARITY_TIERS.RARE,
  RARITY_TIERS.VERY_RARE,
  RARITY_TIERS.LEGENDARY,
  RARITY_TIERS.ARTIFACT,
]);

const DARK_TEXT_COOL = "#1A2230";
const DARK_TEXT_WARM = "#2B2116";
const DARK_TEXT_VIOLET = "#241A33";
const DARK_TEXT_ROSE = "#2F1C2A";
const LIGHT_TEXT_COOL = "#F4F8FC";
const LIGHT_TEXT_WARM = "#FFF7EE";
const LIGHT_TEXT_VIOLET = "#FAF6FF";
const LIGHT_TEXT_ROSE = "#FFF6FB";

function deepClone(value) {
  if (typeof foundry?.utils?.deepClone === "function") {
    return foundry.utils.deepClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}

function buildBaseFieldValues(rarity) {
  const values = {};
  for (const field of getRarityFieldDefinitions(rarity)) {
    values[field.key] = field.defaultValue;
  }
  return values;
}

function buildThemeRarityValues(rarity, {
  primary,
  secondary = primary,
  text = "#f5f7fa",
  gradient = false,
  glow = false,
  inventoryGradient = true,
  inventoryBorders = true,
  inventoryTitleColor = text,
  inventoryDetailsColor = text,
  foundryTextColor = text,
} = {}) {
  return {
    ...buildBaseFieldValues(rarity),
    "enable-item-color": true,
    "item-color": primary,
    "secondary-item-color": secondary,
    "gradient-option": gradient,
    "glow-option": glow,
    "enable-text-color": true,
    "text-color": text,
    "enable-inventory-gradient-effects": inventoryGradient,
    "enable-inventory-borders": inventoryBorders,
    "enable-inventory-title-color": true,
    "inventory-title-color": inventoryTitleColor,
    "enable-inventory-details-color": true,
    "inventory-details-color": inventoryDetailsColor,
    "enable-foundry-interface-gradient-effects": true,
    "enable-foundry-interface-text-color": true,
    "foundry-interface-text-color": foundryTextColor,
  };
}

function definePreset(id, label, description, rarities) {
  return Object.freeze({
    id,
    label,
    description,
    rarities: Object.freeze(rarities),
  });
}

export const ITEM_RARITY_THEME_PRESETS = Object.freeze([
  definePreset(
    "classic-default",
    "Classic Default",
    "Classic D&D rarity colors with sheet and sidebar effects enabled.",
    {
      [RARITY_TIERS.COMMON]: buildThemeRarityValues(RARITY_TIERS.COMMON, {
        primary: "#4d5665",
        secondary: "#7c899d",
        text: "#f5f7fa",
      }),
      [RARITY_TIERS.UNCOMMON]: buildThemeRarityValues(RARITY_TIERS.UNCOMMON, {
        primary: "#216f3c",
        secondary: "#58ba77",
        text: "#f3fff5",
      }),
      [RARITY_TIERS.RARE]: buildThemeRarityValues(RARITY_TIERS.RARE, {
        primary: "#1f519d",
        secondary: "#4d94f1",
        text: "#f3f8ff",
      }),
      [RARITY_TIERS.VERY_RARE]: buildThemeRarityValues(RARITY_TIERS.VERY_RARE, {
        primary: "#4d2b87",
        secondary: "#8d63de",
        text: "#f8f4ff",
      }),
      [RARITY_TIERS.LEGENDARY]: buildThemeRarityValues(RARITY_TIERS.LEGENDARY, {
        primary: "#a55a0b",
        secondary: "#f2a62b",
        text: "#fff7ec",
        glow: true,
      }),
      [RARITY_TIERS.ARTIFACT]: buildThemeRarityValues(RARITY_TIERS.ARTIFACT, {
        primary: "#7d163d",
        secondary: "#df4f87",
        text: "#fff4f8",
        glow: true,
      }),
    }
  ),
  definePreset(
    "classic-gradients",
    "Classic Gradients",
    "The familiar rarity palette, but with softer gradients across each tier.",
    {
      [RARITY_TIERS.COMMON]: buildThemeRarityValues(RARITY_TIERS.COMMON, {
        primary: "#38475d",
        secondary: "#9ca9be",
        text: "#f5f7fb",
        gradient: true,
      }),
      [RARITY_TIERS.UNCOMMON]: buildThemeRarityValues(RARITY_TIERS.UNCOMMON, {
        primary: "#165837",
        secondary: "#72d89c",
        text: "#f4fff8",
        gradient: true,
      }),
      [RARITY_TIERS.RARE]: buildThemeRarityValues(RARITY_TIERS.RARE, {
        primary: "#123f86",
        secondary: "#64a7ff",
        text: "#f5f9ff",
        gradient: true,
      }),
      [RARITY_TIERS.VERY_RARE]: buildThemeRarityValues(RARITY_TIERS.VERY_RARE, {
        primary: "#43246f",
        secondary: "#b286ff",
        text: "#fbf7ff",
        gradient: true,
      }),
      [RARITY_TIERS.LEGENDARY]: buildThemeRarityValues(RARITY_TIERS.LEGENDARY, {
        primary: "#723d05",
        secondary: "#ffc14d",
        text: "#fff8ee",
        gradient: true,
        glow: true,
      }),
      [RARITY_TIERS.ARTIFACT]: buildThemeRarityValues(RARITY_TIERS.ARTIFACT, {
        primary: "#580b2b",
        secondary: "#f06aa4",
        text: "#fff5f8",
        gradient: true,
        glow: true,
      }),
    }
  ),
  definePreset(
    "gilded-relics",
    "Gilded Relics",
    "Treasured relics with restrained gold accents at the highest rarities.",
    {
      [RARITY_TIERS.COMMON]: buildThemeRarityValues(RARITY_TIERS.COMMON, {
        primary: "#3f4958",
        secondary: "#9aa5b8",
        text: "#f4f6f8",
        gradient: true,
      }),
      [RARITY_TIERS.UNCOMMON]: buildThemeRarityValues(RARITY_TIERS.UNCOMMON, {
        primary: "#38492c",
        secondary: "#97b96a",
        text: "#f7fff2",
        gradient: true,
      }),
      [RARITY_TIERS.RARE]: buildThemeRarityValues(RARITY_TIERS.RARE, {
        primary: "#19495b",
        secondary: "#69bad4",
        text: "#f2fdff",
        gradient: true,
      }),
      [RARITY_TIERS.VERY_RARE]: buildThemeRarityValues(RARITY_TIERS.VERY_RARE, {
        primary: "#40235f",
        secondary: "#aa82d3",
        text: "#fbf7ff",
        gradient: true,
      }),
      [RARITY_TIERS.LEGENDARY]: buildThemeRarityValues(RARITY_TIERS.LEGENDARY, {
        primary: "#7a4f06",
        secondary: "#ffbf38",
        text: "#fff8eb",
        gradient: true,
        glow: true,
      }),
      [RARITY_TIERS.ARTIFACT]: buildThemeRarityValues(RARITY_TIERS.ARTIFACT, {
        primary: "#7a1f2f",
        secondary: "#f0c56a",
        text: "#fff8f1",
        gradient: true,
        glow: true,
      }),
    }
  ),
  definePreset(
    "eldritch-vault",
    "Eldritch Vault",
    "Cold arcane tones leaning into teal, violet and spectral highlights.",
    {
      [RARITY_TIERS.COMMON]: buildThemeRarityValues(RARITY_TIERS.COMMON, {
        primary: "#334154",
        secondary: "#8d9bb6",
        text: "#eef5ff",
        gradient: true,
      }),
      [RARITY_TIERS.UNCOMMON]: buildThemeRarityValues(RARITY_TIERS.UNCOMMON, {
        primary: "#10483d",
        secondary: "#46b291",
        text: "#edfff9",
        gradient: true,
      }),
      [RARITY_TIERS.RARE]: buildThemeRarityValues(RARITY_TIERS.RARE, {
        primary: "#123e59",
        secondary: "#58b8e6",
        text: "#eef9ff",
        gradient: true,
      }),
      [RARITY_TIERS.VERY_RARE]: buildThemeRarityValues(RARITY_TIERS.VERY_RARE, {
        primary: "#31174f",
        secondary: "#9f73d8",
        text: "#f7f0ff",
        gradient: true,
      }),
      [RARITY_TIERS.LEGENDARY]: buildThemeRarityValues(RARITY_TIERS.LEGENDARY, {
        primary: "#0b4b45",
        secondary: "#5de1d6",
        text: "#f0fffd",
        gradient: true,
        glow: true,
      }),
      [RARITY_TIERS.ARTIFACT]: buildThemeRarityValues(RARITY_TIERS.ARTIFACT, {
        primary: "#112f4f",
        secondary: "#8ce3ff",
        text: "#f4fbff",
        gradient: true,
        glow: true,
      }),
    }
  ),
  definePreset(
    "forged-in-fire",
    "Forged in Fire",
    "Warm ember and forged-metal gradients with aggressive high-tier accents.",
    {
      [RARITY_TIERS.COMMON]: buildThemeRarityValues(RARITY_TIERS.COMMON, {
        primary: "#463e3a",
        secondary: "#9f887d",
        text: "#fff5f2",
        gradient: true,
      }),
      [RARITY_TIERS.UNCOMMON]: buildThemeRarityValues(RARITY_TIERS.UNCOMMON, {
        primary: "#523811",
        secondary: "#ca8b36",
        text: "#fff6ea",
        gradient: true,
      }),
      [RARITY_TIERS.RARE]: buildThemeRarityValues(RARITY_TIERS.RARE, {
        primary: "#5e1f14",
        secondary: "#ea7242",
        text: "#fff2ec",
        gradient: true,
      }),
      [RARITY_TIERS.VERY_RARE]: buildThemeRarityValues(RARITY_TIERS.VERY_RARE, {
        primary: "#521312",
        secondary: "#ef563c",
        text: "#fff0ec",
        gradient: true,
      }),
      [RARITY_TIERS.LEGENDARY]: buildThemeRarityValues(RARITY_TIERS.LEGENDARY, {
        primary: "#632305",
        secondary: "#ff972b",
        text: "#fff5ec",
        gradient: true,
        glow: true,
      }),
      [RARITY_TIERS.ARTIFACT]: buildThemeRarityValues(RARITY_TIERS.ARTIFACT, {
        primary: "#5a3302",
        secondary: "#ffc14a",
        text: "#fff8ef",
        gradient: true,
        glow: true,
      }),
    }
  ),
  definePreset(
    "arcane-convergence",
    "Arcane Convergence",
    "Complementary gradients that lean into magical contrast without losing readability.",
    {
      [RARITY_TIERS.COMMON]: buildThemeRarityValues(RARITY_TIERS.COMMON, {
        primary: "#2f4058",
        secondary: "#9b6431",
        text: "#f5f8fc",
        gradient: true,
      }),
      [RARITY_TIERS.UNCOMMON]: buildThemeRarityValues(RARITY_TIERS.UNCOMMON, {
        primary: "#0f5a3f",
        secondary: "#b53a6c",
        text: "#fff8fb",
        gradient: true,
      }),
      [RARITY_TIERS.RARE]: buildThemeRarityValues(RARITY_TIERS.RARE, {
        primary: "#123c78",
        secondary: "#f09534",
        text: "#fff8ef",
        gradient: true,
      }),
      [RARITY_TIERS.VERY_RARE]: buildThemeRarityValues(RARITY_TIERS.VERY_RARE, {
        primary: "#4b2163",
        secondary: "#c3a52f",
        text: "#fff9f0",
        gradient: true,
      }),
      [RARITY_TIERS.LEGENDARY]: buildThemeRarityValues(RARITY_TIERS.LEGENDARY, {
        primary: "#7c1e33",
        secondary: "#2fb8b3",
        text: "#fff7fb",
        gradient: true,
        glow: true,
      }),
      [RARITY_TIERS.ARTIFACT]: buildThemeRarityValues(RARITY_TIERS.ARTIFACT, {
        primary: "#163b74",
        secondary: "#ffb84a",
        text: "#fff8ef",
        gradient: true,
        glow: true,
      }),
    }
  ),
  definePreset(
    "verdant-alchemy",
    "Verdant Alchemy",
    "Botanical jewel tones with saturated mineral gradients and warm alchemical highlights.",
    {
      [RARITY_TIERS.COMMON]: buildThemeRarityValues(RARITY_TIERS.COMMON, {
        primary: "#394656",
        secondary: "#89a37a",
        text: "#f6faf7",
        gradient: true,
      }),
      [RARITY_TIERS.UNCOMMON]: buildThemeRarityValues(RARITY_TIERS.UNCOMMON, {
        primary: "#1a5d39",
        secondary: "#58c27e",
        text: "#f5fff7",
        gradient: true,
      }),
      [RARITY_TIERS.RARE]: buildThemeRarityValues(RARITY_TIERS.RARE, {
        primary: "#14606a",
        secondary: "#58d0bf",
        text: "#f0fffc",
        gradient: true,
      }),
      [RARITY_TIERS.VERY_RARE]: buildThemeRarityValues(RARITY_TIERS.VERY_RARE, {
        primary: "#3f2f69",
        secondary: "#8bc46b",
        text: "#fbfff7",
        gradient: true,
      }),
      [RARITY_TIERS.LEGENDARY]: buildThemeRarityValues(RARITY_TIERS.LEGENDARY, {
        primary: "#6f4b12",
        secondary: "#d8a948",
        text: "#fff8ee",
        gradient: true,
        glow: true,
      }),
      [RARITY_TIERS.ARTIFACT]: buildThemeRarityValues(RARITY_TIERS.ARTIFACT, {
        primary: "#285726",
        secondary: "#f1ce6d",
        text: "#fffcef",
        gradient: true,
        glow: true,
      }),
    }
  ),
  definePreset(
    "celestial-bloom",
    "Celestial Bloom",
    "Luminous jewel gradients with brighter highlights for a more fantastical finish.",
    {
      [RARITY_TIERS.COMMON]: buildThemeRarityValues(RARITY_TIERS.COMMON, {
        primary: "#3f4b69",
        secondary: "#a4b4d6",
        text: "#f8faff",
        gradient: true,
      }),
      [RARITY_TIERS.UNCOMMON]: buildThemeRarityValues(RARITY_TIERS.UNCOMMON, {
        primary: "#216252",
        secondary: "#7fe2c4",
        text: "#f3fffb",
        gradient: true,
      }),
      [RARITY_TIERS.RARE]: buildThemeRarityValues(RARITY_TIERS.RARE, {
        primary: "#184987",
        secondary: "#77b4ff",
        text: "#f5faff",
        gradient: true,
      }),
      [RARITY_TIERS.VERY_RARE]: buildThemeRarityValues(RARITY_TIERS.VERY_RARE, {
        primary: "#5a2576",
        secondary: "#e18cff",
        text: "#fff7ff",
        gradient: true,
      }),
      [RARITY_TIERS.LEGENDARY]: buildThemeRarityValues(RARITY_TIERS.LEGENDARY, {
        primary: "#824d12",
        secondary: "#ffd05e",
        text: "#fff8ef",
        gradient: true,
        glow: true,
      }),
      [RARITY_TIERS.ARTIFACT]: buildThemeRarityValues(RARITY_TIERS.ARTIFACT, {
        primary: "#7b1f58",
        secondary: "#7fd9ff",
        text: "#fff8fe",
        gradient: true,
        glow: true,
      }),
    }
  ),
  definePreset(
    "chromatic-surge",
    "Chromatic Surge",
    "Highly saturated fantasy gradients with strong hue separation across every tier.",
    {
      [RARITY_TIERS.COMMON]: buildThemeRarityValues(RARITY_TIERS.COMMON, {
        primary: "#4d5d7d",
        secondary: "#9ba8c7",
        text: "#f7f9ff",
        gradient: true,
      }),
      [RARITY_TIERS.UNCOMMON]: buildThemeRarityValues(RARITY_TIERS.UNCOMMON, {
        primary: "#0c7a3e",
        secondary: "#4eff9c",
        text: "#f2fff7",
        gradient: true,
      }),
      [RARITY_TIERS.RARE]: buildThemeRarityValues(RARITY_TIERS.RARE, {
        primary: "#0057cc",
        secondary: "#33b0ff",
        text: "#f3faff",
        gradient: true,
      }),
      [RARITY_TIERS.VERY_RARE]: buildThemeRarityValues(RARITY_TIERS.VERY_RARE, {
        primary: "#6a00c7",
        secondary: "#ff5cff",
        text: "#fff7ff",
        gradient: true,
      }),
      [RARITY_TIERS.LEGENDARY]: buildThemeRarityValues(RARITY_TIERS.LEGENDARY, {
        primary: "#c95300",
        secondary: "#ffd23a",
        text: "#fff9ef",
        gradient: true,
        glow: true,
      }),
      [RARITY_TIERS.ARTIFACT]: buildThemeRarityValues(RARITY_TIERS.ARTIFACT, {
        primary: "#d3005f",
        secondary: "#7a6bff",
        text: "#fff7fc",
        gradient: true,
        glow: true,
      }),
    }
  ),
  definePreset(
    "neon-royal",
    "Neon Royal",
    "Bold jewel-tone rarities with bright, almost enchanted neon edges.",
    {
      [RARITY_TIERS.COMMON]: buildThemeRarityValues(RARITY_TIERS.COMMON, {
        primary: "#45506f",
        secondary: "#95a6d4",
        text: "#f6f8ff",
        gradient: true,
      }),
      [RARITY_TIERS.UNCOMMON]: buildThemeRarityValues(RARITY_TIERS.UNCOMMON, {
        primary: "#007d58",
        secondary: "#43ffb0",
        text: "#effff9",
        gradient: true,
      }),
      [RARITY_TIERS.RARE]: buildThemeRarityValues(RARITY_TIERS.RARE, {
        primary: "#0052e0",
        secondary: "#2de2ff",
        text: "#eff9ff",
        gradient: true,
      }),
      [RARITY_TIERS.VERY_RARE]: buildThemeRarityValues(RARITY_TIERS.VERY_RARE, {
        primary: "#7b00d6",
        secondary: "#ff49e1",
        text: "#fff6ff",
        gradient: true,
      }),
      [RARITY_TIERS.LEGENDARY]: buildThemeRarityValues(RARITY_TIERS.LEGENDARY, {
        primary: "#d05a00",
        secondary: "#fff06a",
        text: "#fffcef",
        gradient: true,
        glow: true,
      }),
      [RARITY_TIERS.ARTIFACT]: buildThemeRarityValues(RARITY_TIERS.ARTIFACT, {
        primary: "#c00054",
        secondary: "#62d7ff",
        text: "#fff7fd",
        gradient: true,
        glow: true,
      }),
    }
  ),
  definePreset(
    "prismatic-crown",
    "Prismatic Crown",
    "Strong royal hues with saturated gradients built to feel premium and dramatic.",
    {
      [RARITY_TIERS.COMMON]: buildThemeRarityValues(RARITY_TIERS.COMMON, {
        primary: "#425171",
        secondary: "#b1bfdc",
        text: "#f8faff",
        gradient: true,
      }),
      [RARITY_TIERS.UNCOMMON]: buildThemeRarityValues(RARITY_TIERS.UNCOMMON, {
        primary: "#14763d",
        secondary: "#7dff7d",
        text: "#f4fff3",
        gradient: true,
      }),
      [RARITY_TIERS.RARE]: buildThemeRarityValues(RARITY_TIERS.RARE, {
        primary: "#0a42b8",
        secondary: "#49d0ff",
        text: "#f1faff",
        gradient: true,
      }),
      [RARITY_TIERS.VERY_RARE]: buildThemeRarityValues(RARITY_TIERS.VERY_RARE, {
        primary: "#5b11b0",
        secondary: "#ff68d8",
        text: "#fff7ff",
        gradient: true,
      }),
      [RARITY_TIERS.LEGENDARY]: buildThemeRarityValues(RARITY_TIERS.LEGENDARY, {
        primary: "#bc4a00",
        secondary: "#ffd447",
        text: "#fff9ee",
        gradient: true,
        glow: true,
      }),
      [RARITY_TIERS.ARTIFACT]: buildThemeRarityValues(RARITY_TIERS.ARTIFACT, {
        primary: "#8d005c",
        secondary: "#89f0ff",
        text: "#fff8fe",
        gradient: true,
        glow: true,
      }),
    }
  ),
  definePreset(
    "sunlit-regalia",
    "Sunlit Regalia",
    "Brighter rarity gradients with dark lettering tuned for stronger contrast across sheets, inventory, and sidebar rows.",
    {
      [RARITY_TIERS.COMMON]: buildThemeRarityValues(RARITY_TIERS.COMMON, {
        primary: "#8F9BAF",
        secondary: "#DDE6F3",
        text: DARK_TEXT_COOL,
        gradient: true,
        inventoryTitleColor: LIGHT_TEXT_COOL,
        inventoryDetailsColor: DARK_TEXT_COOL,
        foundryTextColor: "#F5F8FC",
      }),
      [RARITY_TIERS.UNCOMMON]: buildThemeRarityValues(RARITY_TIERS.UNCOMMON, {
        primary: "#7EBA93",
        secondary: "#D9F5E0",
        text: DARK_TEXT_COOL,
        gradient: true,
        inventoryTitleColor: LIGHT_TEXT_COOL,
        inventoryDetailsColor: DARK_TEXT_COOL,
        foundryTextColor: "#F4FFF8",
      }),
      [RARITY_TIERS.RARE]: buildThemeRarityValues(RARITY_TIERS.RARE, {
        primary: "#83ABE8",
        secondary: "#DCEBFF",
        text: DARK_TEXT_COOL,
        gradient: true,
        inventoryTitleColor: LIGHT_TEXT_COOL,
        inventoryDetailsColor: DARK_TEXT_COOL,
        foundryTextColor: "#F2F8FF",
      }),
      [RARITY_TIERS.VERY_RARE]: buildThemeRarityValues(RARITY_TIERS.VERY_RARE, {
        primary: "#B295E9",
        secondary: "#F0E5FF",
        text: DARK_TEXT_VIOLET,
        gradient: true,
        inventoryTitleColor: LIGHT_TEXT_VIOLET,
        inventoryDetailsColor: DARK_TEXT_VIOLET,
        foundryTextColor: "#FBF7FF",
      }),
      [RARITY_TIERS.LEGENDARY]: buildThemeRarityValues(RARITY_TIERS.LEGENDARY, {
        primary: "#DFAC67",
        secondary: "#FFE6B0",
        text: DARK_TEXT_WARM,
        gradient: true,
        glow: true,
        inventoryTitleColor: LIGHT_TEXT_WARM,
        inventoryDetailsColor: DARK_TEXT_WARM,
        foundryTextColor: "#FFF8EE",
      }),
      [RARITY_TIERS.ARTIFACT]: buildThemeRarityValues(RARITY_TIERS.ARTIFACT, {
        primary: "#D98FBD",
        secondary: "#FFE0F0",
        text: DARK_TEXT_ROSE,
        gradient: true,
        glow: true,
        inventoryTitleColor: LIGHT_TEXT_ROSE,
        inventoryDetailsColor: DARK_TEXT_ROSE,
        foundryTextColor: "#FFF7FC",
      }),
    }
  ),
  definePreset(
    "opal-scriptorium",
    "Opal Scriptorium",
    "Soft archive-inspired pastels with ink-dark text for a cleaner high-contrast fantasy look.",
    {
      [RARITY_TIERS.COMMON]: buildThemeRarityValues(RARITY_TIERS.COMMON, {
        primary: "#A5ADBA",
        secondary: "#EEF2F8",
        text: DARK_TEXT_COOL,
        gradient: true,
        inventoryTitleColor: LIGHT_TEXT_COOL,
        inventoryDetailsColor: DARK_TEXT_COOL,
        foundryTextColor: "#F5F8FC",
      }),
      [RARITY_TIERS.UNCOMMON]: buildThemeRarityValues(RARITY_TIERS.UNCOMMON, {
        primary: "#88B6A8",
        secondary: "#E1F6EE",
        text: DARK_TEXT_COOL,
        gradient: true,
        inventoryTitleColor: LIGHT_TEXT_COOL,
        inventoryDetailsColor: DARK_TEXT_COOL,
        foundryTextColor: "#F4FFF8",
      }),
      [RARITY_TIERS.RARE]: buildThemeRarityValues(RARITY_TIERS.RARE, {
        primary: "#84B6C9",
        secondary: "#DEF6FF",
        text: DARK_TEXT_COOL,
        gradient: true,
        inventoryTitleColor: LIGHT_TEXT_COOL,
        inventoryDetailsColor: DARK_TEXT_COOL,
        foundryTextColor: "#F2FBFF",
      }),
      [RARITY_TIERS.VERY_RARE]: buildThemeRarityValues(RARITY_TIERS.VERY_RARE, {
        primary: "#B8A0DA",
        secondary: "#F2E9FF",
        text: DARK_TEXT_VIOLET,
        gradient: true,
        inventoryTitleColor: LIGHT_TEXT_VIOLET,
        inventoryDetailsColor: DARK_TEXT_VIOLET,
        foundryTextColor: "#FBF7FF",
      }),
      [RARITY_TIERS.LEGENDARY]: buildThemeRarityValues(RARITY_TIERS.LEGENDARY, {
        primary: "#D5A382",
        secondary: "#FFE7D3",
        text: DARK_TEXT_WARM,
        gradient: true,
        glow: true,
        inventoryTitleColor: LIGHT_TEXT_WARM,
        inventoryDetailsColor: DARK_TEXT_WARM,
        foundryTextColor: "#FFF8F0",
      }),
      [RARITY_TIERS.ARTIFACT]: buildThemeRarityValues(RARITY_TIERS.ARTIFACT, {
        primary: "#CB96A9",
        secondary: "#FBE1EC",
        text: DARK_TEXT_ROSE,
        gradient: true,
        glow: true,
        inventoryTitleColor: LIGHT_TEXT_ROSE,
        inventoryDetailsColor: DARK_TEXT_ROSE,
        foundryTextColor: "#FFF8FC",
      }),
    }
  ),
]);

function normalizeThemeFieldValue(field, value) {
  if (field?.type === "checkbox") {
    return value === true;
  }

  if (field?.type === "color") {
    return String(value || field.defaultValue || "")
      .trim()
      .toLowerCase();
  }

  return value;
}

export function getItemRarityThemePresetOptions() {
  return ITEM_RARITY_THEME_PRESETS.map((preset) => ({
    id: preset.id,
    label: preset.label,
    description: preset.description,
  }));
}

export function getItemRarityThemePreset(themeId) {
  return ITEM_RARITY_THEME_PRESETS.find((preset) => preset.id === themeId) ?? null;
}

export function applyItemRarityThemePresetToDraft(draftSettings, themeId, rarityKeys = ITEM_RARITY_THEME_RARITIES) {
  const preset = getItemRarityThemePreset(themeId);
  if (!preset || !draftSettings || typeof draftSettings !== "object") return false;

  for (const rarity of rarityKeys) {
    const presetValues = preset.rarities?.[rarity];
    if (!presetValues) continue;

    const target = draftSettings[rarity] ?? {};
    draftSettings[rarity] = {
      ...target,
      ...deepClone(presetValues),
    };
  }

  return true;
}

export function doesDraftMatchItemRarityThemePreset(draftSettings, themeId, rarityKeys = ITEM_RARITY_THEME_RARITIES) {
  const preset = getItemRarityThemePreset(themeId);
  if (!preset || !draftSettings || typeof draftSettings !== "object") return false;

  for (const rarity of rarityKeys) {
    const presetValues = preset.rarities?.[rarity];
    if (!presetValues) continue;

    const draftValues = draftSettings[rarity];
    if (!draftValues || typeof draftValues !== "object") return false;

    for (const field of getRarityFieldDefinitions(rarity)) {
      if (!(field.key in presetValues)) continue;

      const presetValue = normalizeThemeFieldValue(field, presetValues[field.key]);
      const draftValue = normalizeThemeFieldValue(field, draftValues[field.key]);
      if (draftValue !== presetValue) {
        return false;
      }
    }
  }

  return true;
}

export function detectItemRarityThemePresetId(draftSettings, rarityKeys = ITEM_RARITY_THEME_RARITIES) {
  for (const preset of ITEM_RARITY_THEME_PRESETS) {
    if (doesDraftMatchItemRarityThemePreset(draftSettings, preset.id, rarityKeys)) {
      return preset.id;
    }
  }

  return CUSTOM_ITEM_RARITY_THEME_ID;
}
