import { BaseItemSheetTextStrategy } from "./BaseItemSheetTextStrategy.js";

/**
 * Text color strategy for Tidy5e item sheets.
 */
export class Tidy5eItemSheetTextStrategy extends BaseItemSheetTextStrategy {
  getRootClass() {
    return "scirc-item-sheet-text-tidy";
  }
}
