/**
 * Sheet Strategies entrypoint.
 * Picks the inventory styling strategy for a sheet; strategies live in dedicated files.
 */

import { Dnd5eSheetStrategy } from "./strategies/Dnd5eSheetStrategy.js";
import { Tidy5eSheetStrategy } from "./strategies/Tidy5eSheetStrategy.js";
import { debugLog, debugWarn } from "../core/debug.js";

const STRATEGY_REGISTRY = new Map([
  ["dnd5e", () => new Dnd5eSheetStrategy()],
  ["tidy5e", () => new Tidy5eSheetStrategy()],
]);

/**
 * Sheet Strategy Factory.
 * Returns the appropriate strategy based on sheet type.
 * @param {string} sheetType
 * @returns {BaseSheetStrategy}
 */
export function getSheetStrategy(sheetType) {
  const factory = STRATEGY_REGISTRY.get(sheetType);
  if (factory) {
    debugLog("Selected sheet strategy", { sheetType, strategy: `${sheetType}SheetStrategy` });
    return factory();
  }
  debugWarn("Unknown sheet type; falling back to Dnd5eSheetStrategy", { sheetType: sheetType ?? null });
  return new Dnd5eSheetStrategy();
}
