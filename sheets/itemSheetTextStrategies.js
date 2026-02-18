import { debugLog, debugWarn } from "../core/debug.js";
import { getSheetType } from "../scripts/sheetDetectionHelper.js";
import { Dnd5eItemSheetTextStrategy } from "./strategies/Dnd5eItemSheetTextStrategy.js";
import { Tidy5eItemSheetTextStrategy } from "./strategies/Tidy5eItemSheetTextStrategy.js";

export { Dnd5eItemSheetTextStrategy, Tidy5eItemSheetTextStrategy };

/**
 * Returns the proper item sheet text strategy for a known sheet type.
 * @param {string} sheetType
 * @returns {Dnd5eItemSheetTextStrategy|Tidy5eItemSheetTextStrategy}
 */
export function getItemSheetTextStyleStrategy(sheetType) {
  switch (sheetType) {
    case "tidy5e":
      debugLog("Selected item sheet text strategy", {
        sheetType: "tidy5e",
        strategy: "Tidy5eItemSheetTextStrategy",
      });
      return new Tidy5eItemSheetTextStrategy();
    case "dnd5e":
      debugLog("Selected item sheet text strategy", {
        sheetType: "dnd5e",
        strategy: "Dnd5eItemSheetTextStrategy",
      });
      return new Dnd5eItemSheetTextStrategy();
    default:
      debugWarn("Unknown item sheet type; falling back to dnd5e text strategy", {
        sheetType: sheetType ?? null,
      });
      return new Dnd5eItemSheetTextStrategy();
  }
}

/**
 * Detects sheet type from element/app and returns a text strategy.
 * @param {Application|HTMLElement|jQuery} element
 * @returns {Dnd5eItemSheetTextStrategy|Tidy5eItemSheetTextStrategy}
 */
export function getItemSheetTextStyleStrategyForElement(element) {
  const sheetType = getSheetType(element);
  return getItemSheetTextStyleStrategy(sheetType);
}

