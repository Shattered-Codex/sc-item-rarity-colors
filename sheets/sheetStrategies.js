/**
 * Sheet Strategies entrypoint.
 * Keeps factory + public exports stable while strategies live in dedicated files.
 */

import { BaseSheetStrategy } from "./strategies/BaseSheetStrategy.js";
import { Dnd5eSheetStrategy } from "./strategies/Dnd5eSheetStrategy.js";
import { Tidy5eSheetStrategy } from "./strategies/Tidy5eSheetStrategy.js";
import { debugLog, debugWarn } from "../core/debug.js";

export { BaseSheetStrategy, Dnd5eSheetStrategy, Tidy5eSheetStrategy };

const STRATEGY_REGISTRY = new Map([
  ["dnd5e", () => new Dnd5eSheetStrategy()],
  ["tidy5e", () => new Tidy5eSheetStrategy()],
]);

/**
 * Register a custom sheet strategy for a given sheet type.
 * Allows external code to extend without modifying this file.
 * @param {string} sheetType
 * @param {() => BaseSheetStrategy} factory
 */
export function registerSheetStrategy(sheetType, factory) {
  STRATEGY_REGISTRY.set(sheetType, factory);
}

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
