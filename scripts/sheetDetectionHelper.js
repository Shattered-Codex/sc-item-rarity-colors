/**
 * Sheet Type Detection Helper
 * Utilities to detect what type of sheet is being rendered.
 */

/**
 * Get the type of sheet being rendered.
 * @param {Application|HTMLElement|jQuery} element - Sheet application or HTML element
 * @returns {string} Sheet type: 'tidy5e', 'dnd5e', or null if unknown
 */
export function getSheetType(element) {
  if (!element) return null;
  
  // Check if it's a Foundry Application instance
  if (element.element) {
    const $el = element.element instanceof jQuery ? element.element : $(element.element);
    if ($el.hasClass("tidy5e-sheet") || $el.find(".tidy5e-sheet").length > 0) {
      return "tidy5e";
    }
  }
  
  // Check if it's a jQuery object or HTMLElement
  try {
    const $el = element instanceof jQuery ? element : $(element);
    if ($el.hasClass("tidy5e-sheet") || $el.find(".tidy5e-sheet").length > 0) {
      return "tidy5e";
    }
  } catch (e) {
    return null;
  }
  
  // Default to dnd5e if no specific type detected
  return "dnd5e";
}

