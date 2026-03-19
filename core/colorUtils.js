/**
 * Normalize a hex color value, returning a fallback on invalid input.
 * Accepts values with or without leading '#'. Preserves original casing.
 *
 * @param {*} value
 * @param {string} fallback
 * @returns {string}
 */
export function normalizeColorWithFallback(value, fallback) {
  const raw = String(value ?? "").trim();
  if (!raw) return fallback;
  if (/^#[0-9a-fA-F]{3,8}$/.test(raw)) return raw;
  if (/^[0-9a-fA-F]{3,8}$/.test(raw)) return `#${raw}`;
  return fallback;
}

/**
 * Normalize hex color values for settings and UI controls.
 *
 * @param {string} value
 * @param {object} [options]
 * @param {boolean} [options.allowShort=true] Allow 3-digit hex values.
 * @param {boolean} [options.expandShort=true] Expand 3-digit hex to 6-digit.
 * @param {boolean} [options.uppercase=true] Return uppercase output.
 * @returns {string|null}
 */
export function normalizeHexColor(value, {
  allowShort = true,
  expandShort = true,
  uppercase = true,
} = {}) {
  if (typeof value !== "string") return null;

  let normalized = value.trim();
  if (!normalized) return null;

  if (!normalized.startsWith("#")) normalized = `#${normalized}`;
  const pattern = allowShort ? /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/ : /^#[0-9a-fA-F]{6}$/;
  if (!pattern.test(normalized)) return null;

  if (expandShort && normalized.length === 4) {
    const shortHex = normalized.slice(1);
    normalized = `#${shortHex.split("").map((char) => `${char}${char}`).join("")}`;
  }

  return uppercase ? normalized.toUpperCase() : normalized.toLowerCase();
}
