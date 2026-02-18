import { MODULE_ID } from "./constants.js";
import { getMergedRarityEntries, normalizeRarityKey } from "./rarityListConfig.js";
import { buildRaritySettings } from "./settingsManager.js";
import { ActorInventoryRuntimeStyleStrategy } from "./runtimeStyleStrategies/ActorInventoryRuntimeStyleStrategy.js";
import { ItemDirectoryRuntimeStyleStrategy } from "./runtimeStyleStrategies/ItemDirectoryRuntimeStyleStrategy.js";
import { ItemSheetRuntimeStyleStrategy } from "./runtimeStyleStrategies/ItemSheetRuntimeStyleStrategy.js";

const STYLE_ELEMENT_ID = "scirc-runtime-rarity-styles";
const RARITY_CLASS_PREFIX = "scirc-rarity-";
const runtimeStrategies = [
  new ItemSheetRuntimeStyleStrategy(),
  new ActorInventoryRuntimeStyleStrategy(),
  new ItemDirectoryRuntimeStyleStrategy(),
];

function normalizeColor(value, fallback) {
  const raw = String(value ?? "").trim();
  if (!raw) return fallback;
  if (/^#[0-9a-f]{3,8}$/i.test(raw)) return raw;
  if (/^[0-9a-f]{3,8}$/i.test(raw)) return `#${raw}`;
  return fallback;
}

export function toRarityClassKey(rarity) {
  return String(rarity || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

export function getRarityClassName(rarity) {
  const key = toRarityClassKey(rarity);
  return key ? `${RARITY_CLASS_PREFIX}${key}` : null;
}

export function clearRarityClasses(elementOrCollection) {
  if (!elementOrCollection) return;
  const $elements = elementOrCollection instanceof jQuery ? elementOrCollection : $(elementOrCollection);
  if (!$elements.length) return;

  $elements.each((_, element) => {
    if (!element?.classList) return;
    for (const className of [...element.classList]) {
      if (className.startsWith(RARITY_CLASS_PREFIX)) {
        element.classList.remove(className);
      }
    }
  });
}

export function applyRarityClass(elementOrCollection, rarity) {
  if (!elementOrCollection) return;
  const $elements = elementOrCollection instanceof jQuery ? elementOrCollection : $(elementOrCollection);
  if (!$elements.length) return;

  const className = getRarityClassName(rarity);
  clearRarityClasses($elements);
  if (!className) return;

  $elements.each((_, element) => {
    if (!element?.classList) return;
    element.classList.add(className);
  });
}

function buildRuntimeStyleText(moduleId = MODULE_ID) {
  const entries = getMergedRarityEntries(moduleId, { includeHidden: true });
  const blocks = [];

  for (const entry of entries) {
    const normalizedRarity = normalizeRarityKey(entry?.key);
    if (!normalizedRarity) continue;

    const rarityClass = getRarityClassName(normalizedRarity);
    if (!rarityClass) continue;

    const settings = buildRaritySettings(normalizedRarity);
    const sheetPrimary = normalizeColor(settings.backgroundColor, "#000000");
    const sheetSecondary = normalizeColor(settings.gradientColor, "#ffffff");
    const sheetText = normalizeColor(settings.itemSheetTextColor, "#000000");
    const dirText = normalizeColor(settings.foundryInterfaceTextColor, "#000000");
    const inventoryTitle = normalizeColor(settings.inventoryTitleColor, "#000000");
    const inventoryDetails = normalizeColor(settings.inventoryDetailsColor, "#000000");
    const inventoryBorderPrimary = normalizeColor(settings.inventoryBorderColor, "#ffffff");
    const inventoryBorderSecondary = normalizeColor(settings.inventoryBorderSecondaryColor, inventoryBorderPrimary);

    const colors = {
      sheetPrimary,
      sheetSecondary,
      sheetText,
      directoryText: dirText,
      inventoryTitle,
      inventoryDetails,
      inventoryBorderPrimary,
      inventoryBorderSecondary,
    };

    for (const strategy of runtimeStrategies) {
      const rules = strategy.buildRules({
        rarity: normalizedRarity,
        rarityClass,
        settings,
        colors,
      });
      if (Array.isArray(rules) && rules.length) {
        blocks.push(...rules);
      }
    }
  }

  return `/* sc-item-rarity-colors: runtime rarity styles */\n${blocks.join("\n")}`;
}

export function ensureRuntimeRarityStyles(moduleId = MODULE_ID) {
  if (!document?.head) return;
  const cssText = buildRuntimeStyleText(moduleId);
  let styleEl = document.getElementById(STYLE_ELEMENT_ID);
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = STYLE_ELEMENT_ID;
    document.head.appendChild(styleEl);
  }
  styleEl.textContent = cssText;
}
