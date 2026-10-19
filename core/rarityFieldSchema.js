import { RARITY_CONFIG } from "./rarityConfig.js";

/**
 * Field definitions shared by the item rarity and spell school editors.
 *
 * `label` and `settingName` describe the stored setting. The editor windows
 * use the `ui*` keys instead: `uiLabel` is the short row label, `inlineWith`
 * places a color on the same row as the checkbox that enables it, `nested`
 * indents a row under the option it depends on, and `uiHint` becomes a tooltip.
 * A `select` field lists its stored values and labels in `choices`; a field
 * with `requiresModule` is only offered while that module is active.
 */
export const RARITY_FIELD_DEFINITIONS = Object.freeze([
  {
    key: "enable-item-color",
    label: "Change Item Sheet Background Color",
    uiLabel: "Background color",
    settingName: ": Enable Item Sheet Background Color",
    type: "checkbox",
    group: "item-sheet",
    defaultValue: false,
  },
  {
    key: "item-color",
    label: "Item Sheet Background Color",
    uiLabel: "Background color",
    inlineWith: "enable-item-color",
    settingName: "Item Color",
    type: "color",
    group: "item-sheet",
    defaultValue: "#000000",
    visibleWhen: { all: ["enable-item-color"] },
  },
  {
    key: "secondary-item-color",
    label: "Secondary Color",
    uiLabel: "Secondary color",
    inlineWith: "gradient-option",
    settingName: "Secondary Item Color",
    type: "color",
    group: "item-sheet",
    defaultValue: "#ffffff",
    requiredFlag: "supportsGradient",
    visibleWhen: { all: ["enable-item-color", "gradient-option"] },
  },
  {
    key: "gradient-option",
    label: "Enable Gradient",
    uiLabel: "Gradient",
    nested: true,
    settingName: "Gradient Option",
    type: "checkbox",
    group: "item-sheet",
    defaultValue: false,
    requiredFlag: "supportsGradient",
    visibleWhen: { all: ["enable-item-color"] },
  },
  {
    key: "glow-option",
    label: "Enable Glow Effect",
    uiLabel: "Glow effect",
    nested: true,
    settingName: "Glow Option",
    type: "checkbox",
    group: "item-sheet",
    defaultValue: false,
    requiredFlag: "supportsGlow",
    visibleWhen: { all: ["enable-item-color"] },
  },
  {
    key: "tidy-background-area",
    label: "Tidy 5e Background Area",
    uiLabel: "Tidy 5e area",
    nested: true,
    uiHint: "Where the background color goes on Tidy 5e item sheets: the content, the sidebar behind the image, or the whole sheet.",
    settingName: ": Tidy 5e Background Area",
    type: "select",
    choices: Object.freeze({
      content: "Content",
      sidebar: "Sidebar",
      sheet: "Whole sheet",
    }),
    group: "item-sheet",
    defaultValue: "content",
    requiresModule: "tidy5e-sheet",
    visibleWhen: { all: ["enable-item-color"] },
  },
  {
    key: "enable-text-color",
    label: "Change Item Sheet Text Color",
    uiLabel: "Text color",
    settingName: ": Enable Item Sheet Text Color",
    type: "checkbox",
    group: "item-sheet",
    defaultValue: false,
  },
  {
    key: "text-color",
    label: "Item Sheet Text Color",
    uiLabel: "Text color",
    inlineWith: "enable-text-color",
    settingName: "Item Sheet Text Color",
    type: "color",
    group: "item-sheet",
    defaultValue: "#000000",
    visibleWhen: { all: ["enable-text-color"] },
  },
  {
    key: "enable-gold-accent-color",
    label: "Change Item Sheet Gold Accent Color",
    uiLabel: "Gold accent",
    uiHint: "Recolors the gold details of the item sheet: tab underline, dividers, borders, and the ampersand. Works on D&D 5e and Tidy 5e sheets.",
    settingName: ": Enable Item Sheet Gold Accent Color",
    type: "checkbox",
    group: "item-sheet",
    defaultValue: false,
  },
  {
    key: "gold-accent-color",
    label: "Item Sheet Gold Accent Color",
    uiLabel: "Gold accent",
    inlineWith: "enable-gold-accent-color",
    settingName: ": Item Sheet Gold Accent Color",
    type: "color",
    group: "item-sheet",
    defaultValue: "#9f9275",
    visibleWhen: { all: ["enable-gold-accent-color"] },
  },
  {
    key: "enable-table-header-color",
    label: "Change Item Sheet Table Header Color",
    uiLabel: "Table headers",
    uiHint: "Recolors the header bar of the item sheet tables (Activities, Effects, and others). Works on D&D 5e and Tidy 5e sheets.",
    settingName: ": Enable Item Sheet Table Header Color",
    type: "checkbox",
    group: "item-sheet",
    defaultValue: false,
  },
  {
    key: "table-header-color",
    label: "Item Sheet Table Header Color",
    uiLabel: "Table headers",
    inlineWith: "enable-table-header-color",
    settingName: ": Item Sheet Table Header Color",
    type: "color",
    group: "item-sheet",
    defaultValue: "#491d25",
    visibleWhen: { all: ["enable-table-header-color"] },
  },
  {
    key: "enable-table-header-text-color",
    label: "Change Item Sheet Table Header Text Color",
    uiLabel: "Table header text",
    uiHint: "Recolors the text and icons on the item sheet table headers. Independent from the header color.",
    settingName: ": Enable Item Sheet Table Header Text Color",
    type: "checkbox",
    group: "item-sheet",
    defaultValue: false,
  },
  {
    key: "table-header-text-color",
    label: "Item Sheet Table Header Text Color",
    uiLabel: "Table header text",
    inlineWith: "enable-table-header-text-color",
    settingName: ": Item Sheet Table Header Text Color",
    type: "color",
    group: "item-sheet",
    defaultValue: "#ffffff",
    visibleWhen: { all: ["enable-table-header-text-color"] },
  },
  {
    key: "enable-inventory-gradient-effects",
    label: "Enable Inventory Item Gradient Effects",
    uiLabel: "Row gradient",
    uiHint: "Paints the inventory row with the item sheet background colors.",
    settingName: ": Enable Inventory Item Gradient Effects",
    type: "checkbox",
    group: "actor-sheet",
    defaultValue: false,
    visibleWhen: { all: ["enable-item-color"] },
  },
  {
    key: "enable-inventory-borders",
    label: "Enable Inventory Coloured Borders",
    uiLabel: "Icon border",
    uiHint: "Outlines the item icon. While the item sheet background is on, the border follows those colors.",
    settingName: ": Enable Inventory Coloured Borders",
    type: "checkbox",
    group: "actor-sheet",
    defaultValue: false,
  },
  {
    key: "enable-inventory-border-color",
    label: "Change Item Border Color in Inventory",
    uiLabel: "Custom border color",
    nested: true,
    settingName: ": Enable Inventory Border Color",
    type: "checkbox",
    group: "actor-sheet",
    defaultValue: false,
    visibleWhen: { all: ["enable-inventory-borders"], not: ["enable-item-color"] },
  },
  {
    key: "inventory-border-color",
    label: "Inventory Item Border Color",
    uiLabel: "Border color",
    inlineWith: "enable-inventory-border-color",
    settingName: ": Inventory Border Color",
    type: "color",
    group: "actor-sheet",
    defaultValue: "#ffffff",
    visibleWhen: { all: ["enable-inventory-borders", "enable-inventory-border-color"], not: ["enable-item-color"] },
  },
  {
    key: "inventory-border-secondary-color",
    label: "Inventory Item Border Secondary Color",
    uiLabel: "Border secondary color",
    nested: true,
    settingName: ": Inventory Border Secondary Color",
    type: "color",
    group: "actor-sheet",
    defaultValue: "#ffffff",
    requiredFlag: "supportsBorderGradient",
    visibleWhen: { all: ["enable-inventory-borders", "enable-inventory-border-color"], not: ["enable-item-color"] },
  },
  {
    key: "enable-inventory-border-glow",
    label: "Enable Inventory Border Glow",
    uiLabel: "Border glow",
    nested: true,
    settingName: ": Enable Inventory Border Glow",
    type: "checkbox",
    group: "actor-sheet",
    defaultValue: false,
    requiredFlag: "supportsBorderGlow",
    visibleWhen: { all: ["enable-inventory-borders", "enable-inventory-border-color"], not: ["enable-item-color"] },
  },
  {
    key: "enable-inventory-title-color",
    label: "Change Item Title/Subtitle Color in Inventory",
    uiLabel: "Title and subtitle color",
    settingName: ": Enable Inventory Title/Subtitle Color",
    type: "checkbox",
    group: "actor-sheet",
    defaultValue: false,
  },
  {
    key: "inventory-title-color",
    label: "Inventory Item Title/Subtitle Color",
    uiLabel: "Title and subtitle color",
    inlineWith: "enable-inventory-title-color",
    settingName: ": Inventory Title/Subtitle Color",
    type: "color",
    group: "actor-sheet",
    defaultValue: "#000000",
    visibleWhen: { all: ["enable-inventory-title-color"] },
  },
  {
    key: "enable-inventory-details-color",
    label: "Change Item Details Text Color",
    uiLabel: "Details text color",
    settingName: ": Enable Inventory Details Text Color",
    type: "checkbox",
    group: "actor-sheet",
    defaultValue: false,
  },
  {
    key: "inventory-details-color",
    label: "Inventory Item Details Text Color",
    uiLabel: "Details text color",
    inlineWith: "enable-inventory-details-color",
    settingName: ": Inventory Details Text Color",
    type: "color",
    group: "actor-sheet",
    defaultValue: "#000000",
    visibleWhen: { all: ["enable-inventory-details-color"] },
  },
  {
    key: "enable-foundry-interface-gradient-effects",
    label: "Enable Foundry Interface Item Gradient Effects",
    uiLabel: "Row gradient",
    uiHint: "Paints the sidebar directory row with the item sheet background colors.",
    settingName: ": Enable Foundry Interface Item Gradient Effects",
    type: "checkbox",
    group: "foundry-interface",
    defaultValue: false,
    visibleWhen: { all: ["enable-item-color"] },
  },
  {
    key: "enable-foundry-interface-text-color",
    label: "Change Foundry Interface Item Text Color",
    uiLabel: "Text color",
    settingName: ": Enable Foundry Interface Item Text Color",
    type: "checkbox",
    group: "foundry-interface",
    defaultValue: false,
  },
  {
    key: "foundry-interface-text-color",
    label: "Foundry Interface Item Text Color",
    uiLabel: "Text color",
    inlineWith: "enable-foundry-interface-text-color",
    settingName: ": Foundry Interface Item Text Color",
    type: "color",
    group: "foundry-interface",
    defaultValue: "#000000",
    visibleWhen: { all: ["enable-foundry-interface-text-color"] },
  },
]);

export function getRarityFieldDefinitions(rarity) {
  const rarityConfig = RARITY_CONFIG[rarity] || {};
  if (!Object.keys(rarityConfig).length) return RARITY_FIELD_DEFINITIONS;

  return RARITY_FIELD_DEFINITIONS.filter((field) => {
    if (!field.requiredFlag) return true;
    return Boolean(rarityConfig[field.requiredFlag]);
  });
}

export function buildRarityFieldSettingName(title, field) {
  const suffix = String(field?.settingName || "").trim();
  if (!suffix) return `${title} ${field?.label || ""}`.trim();
  if (suffix.startsWith(":")) return `${title}${suffix}`;
  return `${title} ${suffix}`;
}

export function isRarityFieldVisible(field, state = {}) {
  const rule = field?.visibleWhen;
  if (!rule || typeof rule !== "object") return true;

  const isEnabled = (key) => state?.[key] === true;

  if (Array.isArray(rule.all) && !rule.all.every((key) => isEnabled(key))) {
    return false;
  }

  if (Array.isArray(rule.any) && rule.any.length > 0 && !rule.any.some((key) => isEnabled(key))) {
    return false;
  }

  if (Array.isArray(rule.not) && rule.not.some((key) => isEnabled(key))) {
    return false;
  }

  return true;
}

/** The stored value for a select field, falling back to its default. */
export function normalizeSelectFieldValue(field, value) {
  return Object.hasOwn(field?.choices ?? {}, value) ? value : field?.defaultValue;
}
