import { SELECTORS } from "../../core/constants.js";
import { BaseSheetStrategy } from "./BaseSheetStrategy.js";

/**
 * Tidy5e Sheet Strategy.
 */
export class Tidy5eSheetStrategy extends BaseSheetStrategy {
  getItemSelector() {
    return SELECTORS.TIDY5E_ITEM_CONTAINER;
  }

  extractItemId($itemElement) {
    return $itemElement.data("itemId") || $itemElement.data("documentId") || $itemElement.data("item-id");
  }

  /**
   * The row itself, not the expandable summary below it. Only direct children
   * are considered so a container row never paints the rows nested in it.
   */
  getGradientElement($itemElement) {
    const $row = $itemElement.children(SELECTORS.TIDY5E_ITEM_ROW);
    return $row.length ? $row.first() : $itemElement.find(SELECTORS.TIDY5E_ITEM_ROW).first();
  }

  getBorderElement($itemElement) {
    return this.getGradientElement($itemElement).find(SELECTORS.TIDY5E_ITEM_IMAGE).first();
  }

  prepareBorderElement($borderElement) {
    $borderElement.addClass("scirc-inv-border-managed");
  }
}
