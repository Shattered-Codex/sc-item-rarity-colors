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
    return $itemElement.data("documentId") || $itemElement.data("item-id");
  }

  getGradientElement($itemElement) {
    const $row = $itemElement.find(SELECTORS.TIDY5E_ITEM_ROW);
    // Clear background before applying gradient.
    $row.css("background", "none");
    return $row;
  }

  getBorderElement($itemElement) {
    return $itemElement.find(SELECTORS.TIDY5E_ITEM_IMAGE);
  }

  prepareBorderElement($borderElement) {
    $borderElement.css({
      margin: 0,
      height: "auto",
    });
  }

  getTitleSelectors() {
    return [
      ".item-name",
      ".item-name a",
      "h4.item-name",
    ];
  }

  getDetailsSelectors() {
    return [
      ".item-detail",
      ".item-detail input",
      ".item-detail.empty",
      ".item-detail .value",
      ".item-detail .sign",
      ".item-detail .formula",
      ".item-detail .separator",
      ".item-detail .max",
      ".item-detail .currency",
      ".item-detail .adjustment-button",
    ];
  }
}
