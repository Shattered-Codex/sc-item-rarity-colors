import { RARITY_CONFIG } from "./rarityConfig.js";

export const RARITY_FIELD_DEFINITIONS = Object.freeze([
  {
    key: "enable-item-color",
    label: "Change Item Sheet Background Color",
    settingName: ": Enable Item Sheet Background Color",
    type: "checkbox",
    group: "item-sheet",
    defaultValue: false,
  },
  {
    key: "item-color",
    label: "Item Sheet Background Color",
    settingName: "Item Color",
    type: "color",
    group: "item-sheet",
    defaultValue: "#000000",
    visibleWhen: { all: ["enable-item-color"] },
  },
  {
    key: "secondary-item-color",
    label: "Secondary Color",
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
    settingName: "Glow Option",
    type: "checkbox",
    group: "item-sheet",
    defaultValue: false,
    requiredFlag: "supportsGlow",
    visibleWhen: { all: ["enable-item-color"] },
  },
  {
    key: "enable-text-color",
    label: "Change Item Sheet Text Color",
    settingName: ": Enable Item Sheet Text Color",
    type: "checkbox",
    group: "item-sheet",
    defaultValue: false,
  },
  {
    key: "text-color",
    label: "Item Sheet Text Color",
    settingName: "Item Sheet Text Color",
    type: "color",
    group: "item-sheet",
    defaultValue: "#000000",
    visibleWhen: { all: ["enable-text-color"] },
  },
  {
    key: "enable-inventory-gradient-effects",
    label: "Enable Inventory Item Gradient Effects",
    settingName: ": Enable Inventory Item Gradient Effects",
    type: "checkbox",
    group: "actor-sheet",
    defaultValue: false,
    visibleWhen: { all: ["enable-item-color"] },
  },
  {
    key: "enable-inventory-borders",
    label: "Enable Inventory Coloured Borders",
    settingName: ": Enable Inventory Coloured Borders",
    type: "checkbox",
    group: "actor-sheet",
    defaultValue: false,
  },
  {
    key: "enable-inventory-border-color",
    label: "Change Item Border Color in Inventory",
    settingName: ": Enable Inventory Border Color",
    type: "checkbox",
    group: "actor-sheet",
    defaultValue: false,
    visibleWhen: { all: ["enable-inventory-borders"], not: ["enable-item-color"] },
  },
  {
    key: "inventory-border-color",
    label: "Inventory Item Border Color",
    settingName: ": Inventory Border Color",
    type: "color",
    group: "actor-sheet",
    defaultValue: "#ffffff",
    visibleWhen: { all: ["enable-inventory-borders", "enable-inventory-border-color"], not: ["enable-item-color"] },
  },
  {
    key: "inventory-border-secondary-color",
    label: "Inventory Item Border Secondary Color",
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
    settingName: ": Enable Inventory Title/Subtitle Color",
    type: "checkbox",
    group: "actor-sheet",
    defaultValue: false,
  },
  {
    key: "inventory-title-color",
    label: "Inventory Item Title/Subtitle Color",
    settingName: ": Inventory Title/Subtitle Color",
    type: "color",
    group: "actor-sheet",
    defaultValue: "#000000",
    visibleWhen: { all: ["enable-inventory-title-color"] },
  },
  {
    key: "enable-inventory-details-color",
    label: "Change Item Details Text Color",
    settingName: ": Enable Inventory Details Text Color",
    type: "checkbox",
    group: "actor-sheet",
    defaultValue: false,
  },
  {
    key: "inventory-details-color",
    label: "Inventory Item Details Text Color",
    settingName: ": Inventory Details Text Color",
    type: "color",
    group: "actor-sheet",
    defaultValue: "#000000",
    visibleWhen: { all: ["enable-inventory-details-color"] },
  },
  {
    key: "enable-foundry-interface-gradient-effects",
    label: "Enable Foundry Interface Item Gradient Effects",
    settingName: ": Enable Foundry Interface Item Gradient Effects",
    type: "checkbox",
    group: "foundry-interface",
    defaultValue: false,
    visibleWhen: { all: ["enable-item-color"] },
  },
  {
    key: "enable-foundry-interface-text-color",
    label: "Change Foundry Interface Item Text Color",
    settingName: ": Enable Foundry Interface Item Text Color",
    type: "checkbox",
    group: "foundry-interface",
    defaultValue: false,
  },
  {
    key: "foundry-interface-text-color",
    label: "Foundry Interface Item Text Color",
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
