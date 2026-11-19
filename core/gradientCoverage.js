/**
 * Gradient coverage: how much of an inventory or sidebar row the rarity
 * colors cover, as a percentage of the gradient the module has always drawn.
 *
 * The static CSS reads each gradient stop from a variable whose fallback is
 * the original stop. At 100% (the default) no variable is set, so rows look
 * exactly as before; other values move the stops so the colors reach further
 * into the row (above 100%) or stay closer to its edge (below).
 */

const DEFAULT_COVERAGE = 100;

// Inventory rows fade from the corner: primary at 10%, secondary at 30%, the
// row color from 50% (styles/strategies/actor-inventory.css).
const INVENTORY_STOPS = Object.freeze({
  "--scirc-inv-bg-primary-stop": 10,
  "--scirc-inv-bg-secondary-stop": 30,
  "--scirc-inv-bg-fallback-stop": 50,
});

// Sidebar rows keep the row color up to 46% and end on the secondary color at
// the right edge, with the primary at 72% (styles/strategies/item-directory.css).
// Coverage widens or narrows that colored band, anchored at the right edge.
const SIDEBAR_STOPS = Object.freeze({
  "--scirc-dir-bg-fallback-stop": 46,
  "--scirc-dir-bg-primary-stop": 72,
});

const STOPS_BY_SURFACE = Object.freeze({ inventory: INVENTORY_STOPS, sidebar: SIDEBAR_STOPS });

function toPercent(value) {
  const clamped = Math.min(100, Math.max(0, value));
  return `${Math.round(clamped * 10) / 10}%`;
}

function scaleStop(surface, stop, scale) {
  // Inventory stops grow from the corner; sidebar stops from the right edge.
  return surface === "sidebar" ? 100 - (100 - stop) * scale : stop * scale;
}

/**
 * The stop variables for a surface's coverage, or an empty object at 100%
 * (or for an unreadable value).
 * @param {"inventory"|"sidebar"} surface
 * @param {number} coverage
 * @returns {Record<string, string>}
 */
export function gradientStopVariables(surface, coverage) {
  const stops = STOPS_BY_SURFACE[surface];
  const value = Number(coverage);
  if (!stops || !Number.isFinite(value) || value === DEFAULT_COVERAGE) return {};

  const scale = value / DEFAULT_COVERAGE;
  const variables = {};
  for (const [name, stop] of Object.entries(stops)) variables[name] = toPercent(scaleStop(surface, stop, scale));
  return variables;
}

/** The stop variables as CSS declarations, for the runtime rarity styles. */
export function gradientStopDeclarations(surface, coverage) {
  return Object.entries(gradientStopVariables(surface, coverage))
    .map(([name, value]) => `\n  ${name}: ${value};`)
    .join("");
}

/**
 * Sets a surface's stop variables inline (spell styles and the editor
 * preview), or removes them at 100% or when `coverage` is null.
 */
export function setGradientStopVariables(element, surface, coverage) {
  if (!element?.style) return;
  const variables = coverage === null ? {} : gradientStopVariables(surface, coverage);
  for (const name of Object.keys(STOPS_BY_SURFACE[surface] ?? {})) {
    if (variables[name]) element.style.setProperty(name, variables[name]);
    else element.style.removeProperty(name);
  }
}
