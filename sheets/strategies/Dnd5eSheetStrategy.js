import { SELECTORS } from "../../core/constants.js";
import { BaseSheetStrategy } from "./BaseSheetStrategy.js";

/**
 * D&D 5e Sheet Strategy.
 */
export class Dnd5eSheetStrategy extends BaseSheetStrategy {
  getItemSelector() {
    return SELECTORS.DND5E_ITEM;
  }

  extractItemId($itemElement) {
    return $itemElement.data("documentId") || $itemElement.data("item-id");
  }

  getGradientElement($itemElement) {
    return $itemElement;
  }

  getBorderElement($itemElement) {
    return $itemElement.find(SELECTORS.DND5E_ITEM_IMAGE);
  }
}
