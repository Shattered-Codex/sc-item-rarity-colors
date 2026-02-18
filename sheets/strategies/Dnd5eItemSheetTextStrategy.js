import { BaseItemSheetTextStrategy } from "./BaseItemSheetTextStrategy.js";

/**
 * Text color strategy for default dnd5e item sheets.
 */
export class Dnd5eItemSheetTextStrategy extends BaseItemSheetTextStrategy {
  getRootClass() {
    return "scirc-item-sheet-text-dnd5e";
  }
}
