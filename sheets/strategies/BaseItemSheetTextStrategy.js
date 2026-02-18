/**
 * Base strategy for applying Item Sheet text colors.
 */
export class BaseItemSheetTextStrategy {
  /**
   * CSS class to toggle themed text styles for a sheet type.
   * @returns {string}
   */
  getRootClass() {
    throw new Error("getRootClass must be implemented by subclass");
  }

  /**
   * Strategy-specific hooks after color application.
   * @param {jQuery} _container
   * @param {string} _color
   */
  afterApplyTextColor(_container, _color) {
    // No-op by default.
  }

  /**
   * Strategy-specific hooks after color clearing.
   * @param {jQuery} _container
   */
  afterClearTextColor(_container) {
    // No-op by default.
  }

  applyTextColor(container, color) {
    if (!container || !color) return;
    const $container = container instanceof jQuery ? container : $(container);
    if (!$container.length) return;

    const root = $container[0];
    if (!root) return;
    root.classList.add(this.getRootClass());

    this.afterApplyTextColor($container, color);
  }

  clearTextColor(container) {
    if (!container) return;
    const $container = container instanceof jQuery ? container : $(container);
    if (!$container.length) return;

    const root = $container[0];
    if (root) {
      root.classList.remove(this.getRootClass());
    }

    this.afterClearTextColor($container);
  }
}
