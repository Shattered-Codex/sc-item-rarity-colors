import { ExternalRowSheetStrategy } from "../sheets/strategies/ExternalRowSheetStrategy.js";

/**
 * The module's public API, published as `game.modules.get("sc-item-rarity-colors").api`.
 * Bump `version` whenever a method changes in a way callers can notice.
 */
export class PublicApi {
  static VERSION = 1;

  static create(moduleId) {
    return Object.freeze({
      version: PublicApi.VERSION,
      styleItemRow: (row, item, options) => PublicApi.#styleItemRow(moduleId, row, item, options),
    });
  }

  /**
   * Styles an item row drawn by another module as this module styles an actor
   * inventory row: rarity (or spell) gradient, text colors, icon border and
   * effects, and, for an item that is unidentified to this user, the
   * unidentified style with its image cover. Safe to call again on re-render.
   *
   * Text colors reach `.item-name` / `.item-type` (title) and `.item-detail` /
   * `.item-quantity` (details) inside the row. The image needs a positioned
   * parent, since its cover and effects are placed beside it.
   *
   * @param {HTMLElement} row
   * @param {Item} item
   * @param {object} [options]
   * @param {string} [options.imageSelector="img"] - The item image inside the row.
   */
  static #styleItemRow(moduleId, row, item, { imageSelector = "img" } = {}) {
    if (!row || !item) return;
    // The per-rarity runtime CSS is installed at setup and rebuilt by the lifecycle
    // on setting changes, so a row only needs its classes and effect layers here.
    new ExternalRowSheetStrategy({ imageSelector }).applyItemStyles($(row), item, moduleId);
  }
}
