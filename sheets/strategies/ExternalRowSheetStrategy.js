import { BaseSheetStrategy } from "./BaseSheetStrategy.js";

/**
 * Item rows drawn by other modules (through the public API). The row itself
 * takes the inventory gradient and text colors; the element matched by
 * `imageSelector` inside it takes the border, icon effects, and the
 * unidentified image cover, exactly as an actor inventory row would.
 */
export class ExternalRowSheetStrategy extends BaseSheetStrategy {
  #imageSelector;

  constructor({ imageSelector = "img" } = {}) {
    super();
    this.#imageSelector = imageSelector;
  }

  getItemSelector() {
    return "";
  }

  extractItemId() {
    return null;
  }

  getGradientElement($itemElement) {
    return $itemElement;
  }

  getBorderElement($itemElement) {
    return $itemElement.find(this.#imageSelector).first();
  }
}
