/**
 * Sheet Strategies entrypoint.
 * Keeps factory + public exports stable while strategies live in dedicated files.
 */

import { BaseSheetStrategy } from "./strategies/BaseSheetStrategy.js";
import { Dnd5eSheetStrategy } from "./strategies/Dnd5eSheetStrategy.js";
import { Tidy5eSheetStrategy } from "./strategies/Tidy5eSheetStrategy.js";
import { debugLog, debugWarn } from "../core/debug.js";

export { BaseSheetStrategy, Dnd5eSheetStrategy, Tidy5eSheetStrategy };

/**
 * Sheet Strategy Factory.
 * Returns the appropriate strategy based on sheet type.
 * @param {string} sheetType
 * @returns {BaseSheetStrategy}
 */
export function getSheetStrategy(sheetType) {
  switch (sheetType) {
    case "tidy5e":
      debugLog("Selected sheet strategy", { sheetType: "tidy5e", strategy: "Tidy5eSheetStrategy" });
      return new Tidy5eSheetStrategy();
    case "dnd5e":
      debugLog("Selected sheet strategy", { sheetType: "dnd5e", strategy: "Dnd5eSheetStrategy" });
      return new Dnd5eSheetStrategy();
    default:
      debugWarn("Unknown sheet type; falling back to Dnd5eSheetStrategy", { sheetType: sheetType ?? null });
      return new Dnd5eSheetStrategy();
  }
}
