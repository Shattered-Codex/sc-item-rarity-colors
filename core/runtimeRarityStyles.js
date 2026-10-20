import { MODULE_ID, RARITY_CLASS_PREFIX } from "./constants.js";
import { UNIDENTIFIED_STYLE_KEY } from "./unidentifiedStyle.js";
import { normalizeColorWithFallback as normalizeColor } from "./colorUtils.js";
import { getMergedRarityEntries, normalizeRarityKey } from "./rarityListConfig.js";
import { buildRaritySettings } from "./settingsManager.js";
import { resolveEffectColor } from "./itemEffects.js";
import { ActorInventoryRuntimeStyleStrategy } from "./runtimeStyleStrategies/ActorInventoryRuntimeStyleStrategy.js";
import { ItemDirectoryRuntimeStyleStrategy } from "./runtimeStyleStrategies/ItemDirectoryRuntimeStyleStrategy.js";
import { ItemSheetRuntimeStyleStrategy } from "./runtimeStyleStrategies/ItemSheetRuntimeStyleStrategy.js";
import { UnidentifiedImageRuntimeStyleStrategy } from "./runtimeStyleStrategies/UnidentifiedImageRuntimeStyleStrategy.js";

const STYLE_ELEMENT_ID = "scirc-runtime-rarity-styles";
let _cachedCssText = null;

const runtimeStrategies = [
  new ItemSheetRuntimeStyleStrategy(),
  new ActorInventoryRuntimeStyleStrategy(),
  new ItemDirectoryRuntimeStyleStrategy(),
  new UnidentifiedImageRuntimeStyleStrategy(),
];

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

// Called for every row on every render: works on the elements directly (no
// jQuery wrapper) and leaves the class attribute alone when it is already
// right, since each classList change rewrites it.
function toElements(elementOrCollection) {
  if (!elementOrCollection) return [];
  if (elementOrCollection instanceof jQuery) return elementOrCollection.get();
  if (elementOrCollection.classList) return [elementOrCollection];
  return Array.from(elementOrCollection);
}

function setRarityClass(element, className) {
  if (!element?.classList) return;
  for (const existing of [...element.classList]) {
    if (existing !== className && existing.startsWith(RARITY_CLASS_PREFIX)) element.classList.remove(existing);
  }
  if (className && !element.classList.contains(className)) element.classList.add(className);
}

export function clearRarityClasses(elementOrCollection) {
  for (const element of toElements(elementOrCollection)) setRarityClass(element, null);
}

export function applyRarityClass(elementOrCollection, rarity) {
  const className = getRarityClassName(rarity);
  for (const element of toElements(elementOrCollection)) setRarityClass(element, className);
}

function buildRuntimeStyleText(moduleId = MODULE_ID) {
  const entries = [
    ...getMergedRarityEntries(moduleId, { includeHidden: true }),
    { key: UNIDENTIFIED_STYLE_KEY },
  ];
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
    const sheetGold = normalizeColor(settings.goldAccentColor, "#9f9275");
    const sheetTableHeader = normalizeColor(settings.tableHeaderColor, "#491d25");
    const sheetTableHeaderText = normalizeColor(settings.tableHeaderTextColor, "#ffffff");
    const effect = normalizeColor(resolveEffectColor(settings), "#ffd27a");
    const particle = settings.enableParticleColor ? normalizeColor(settings.particleColor, "#ffffff") : null;
    const dirText = normalizeColor(settings.foundryInterfaceTextColor, "#000000");
    const inventoryTitle = normalizeColor(settings.inventoryTitleColor, "#000000");
    const inventoryDetails = normalizeColor(settings.inventoryDetailsColor, "#000000");
    const inventoryBorderPrimary = normalizeColor(settings.inventoryBorderColor, "#ffffff");
    const inventoryBorderSecondary = normalizeColor(settings.inventoryBorderSecondaryColor, inventoryBorderPrimary);

    const colors = {
      sheetPrimary,
      sheetSecondary,
      sheetText,
      sheetGold,
      sheetTableHeader,
      sheetTableHeaderText,
      effect,
      particle,
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
  if (cssText === _cachedCssText) return;
  _cachedCssText = cssText;
  let styleEl = document.getElementById(STYLE_ELEMENT_ID);
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = STYLE_ELEMENT_ID;
    document.head.appendChild(styleEl);
  }
  styleEl.textContent = cssText;
}
