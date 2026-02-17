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

  getTitleSelectors() {
    return [
      "a.item-name",
      ".item-name a",
      "h4.item-name",
      ".item-name",
      ".item-type",
      ".item-subtitle",
      ".subtitle",
      ".item-type-text",
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
      ".separator",
      ".max",
      ".unbutton",
      ".item-weight",
      ".item-weight .fa-weight-hanging",
      ".item-uses",
      ".item-charges",
      ".item-controls",
      ".item-properties",
      ".item-quantity",
      ".item-formula dnd5e-icon",
    ];
  }
}
