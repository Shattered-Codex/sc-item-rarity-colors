/**
 * Derives the accent fields of a theme (gold accent, table header, table
 * header text) from the colors the theme already defines, so every preset
 * gets matching values without hand-picking three more colors per tier.
 *
 * - Gold accent: on dark sheets, the secondary color lightened until it reads
 *   as a trim line over the sheet; on light (pastel) sheets, the primary color
 *   darkened instead, since a darkened pastel turns muddy grey. Either way the
 *   shift is capped so vivid palettes keep their hue instead of turning white.
 * - Table header: a deep shade of the primary color, like the system's
 *   maroon bar, dark enough to carry light text.
 * - Table header text: near-white, lightly tinted with the secondary color.
 */

const WHITE = "#FFFFFF";
const BLACK = "#000000";

// Contrast targets (WCAG ratios). The accent is decorative trim, so it needs
// less than text does.
const ACCENT_MIN_CONTRAST = 3;
const ACCENT_MAX_SHIFT = 0.7;
const HEADER_TEXT_MIN_CONTRAST = 4.5;
const DARK_SHEET_LUMINANCE = 0.32;

function hexToRgb(hex) {
  const value = String(hex || "").trim().replace(/^#/, "");
  if (!/^[0-9a-f]{6}$/i.test(value)) return null;
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  };
}

function rgbToHex({ r, g, b }) {
  const channel = (value) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, "0");
  return `#${channel(r)}${channel(g)}${channel(b)}`.toUpperCase();
}

export function mixHex(colorA, colorB, ratio) {
  const left = hexToRgb(colorA);
  const right = hexToRgb(colorB);
  if (!left || !right) return String(left ? colorA : colorB || BLACK).toUpperCase();
  const weight = Math.max(0, Math.min(1, ratio));
  return rgbToHex({
    r: left.r + (right.r - left.r) * weight,
    g: left.g + (right.g - left.g) * weight,
    b: left.b + (right.b - left.b) * weight,
  });
}

function rgbToHsl({ r, g, b }) {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255];
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const lightness = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: lightness };

  const delta = max - min;
  const saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
  let hue;
  if (max === rn) hue = (gn - bn) / delta + (gn < bn ? 6 : 0);
  else if (max === gn) hue = (bn - rn) / delta + 2;
  else hue = (rn - gn) / delta + 4;
  return { h: hue / 6, s: saturation, l: lightness };
}

function hslToHex({ h, s, l }) {
  if (s === 0) return rgbToHex({ r: l * 255, g: l * 255, b: l * 255 });
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const channel = (t) => {
    let x = t;
    if (x < 0) x += 1;
    if (x > 1) x -= 1;
    if (x < 1 / 6) return p + (q - p) * 6 * x;
    if (x < 1 / 2) return q;
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
    return p;
  };
  return rgbToHex({ r: channel(h + 1 / 3) * 255, g: channel(h) * 255, b: channel(h - 1 / 3) * 255 });
}

/**
 * A deep shade of `hex` that keeps its hue. Mixing a pastel with black
 * greys it out; setting the lightness in HSL while lifting the saturation
 * keeps it recognisably the same color.
 */
function deepShade(hex, lightness, saturationBoost = 1.05) {
  const rgb = hexToRgb(hex);
  if (!rgb) return BLACK;
  const { h, s } = rgbToHsl(rgb);
  return hslToHex({ h, s: Math.min(1, s * saturationBoost + (s > 0.05 ? 0.04 : 0)), l: lightness });
}

export function relativeLuminance(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const linear = (channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(rgb.r) + 0.7152 * linear(rgb.g) + 0.0722 * linear(rgb.b);
}

export function contrastRatio(colorA, colorB) {
  const a = relativeLuminance(colorA);
  const b = relativeLuminance(colorB);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/**
 * Moves `color` toward `target` in small steps from `startRatio` until it
 * reaches `minContrast` against `background`, never past `maxRatio`.
 */
function pushForContrast(color, target, background, minContrast, { startRatio = 0, maxRatio = 1 } = {}) {
  for (let ratio = startRatio; ratio <= maxRatio + 0.0001; ratio += 0.05) {
    const candidate = mixHex(color, target, ratio);
    if (contrastRatio(candidate, background) >= minContrast) return candidate;
  }
  return mixHex(color, target, maxRatio);
}

/**
 * @param {object} colors
 * @param {string} colors.primary   Sheet background color.
 * @param {string} [colors.secondary] Gradient / highlight color.
 * @param {boolean} [colors.gradient] Whether the sheet runs primary → secondary.
 * @returns {{gold: string, tableHeader: string, tableHeaderText: string}}
 */
export function deriveThemeAccents({ primary, secondary = primary, gradient = false }) {
  const darkSheet = relativeLuminance(primary) < DARK_SHEET_LUMINANCE;

  // The trim (tab underline, divider, ampersand) sits on the left half of a
  // gradient sheet, so it is measured against a point a third of the way in.
  const accentBackground = gradient ? mixHex(primary, secondary, 0.33) : primary;
  // Lighter trim suits dark sheets and darker trim light ones; mid-tone sheets
  // (bright teal, orange) can go either way, so the other direction is used
  // when it reads clearly better.
  const lighter = pushForContrast(secondary, WHITE, accentBackground, ACCENT_MIN_CONTRAST, { startRatio: 0.25, maxRatio: ACCENT_MAX_SHIFT });
  const darker = pushForContrast(deepShade(primary, 0.4), BLACK, accentBackground, ACCENT_MIN_CONTRAST, { maxRatio: 0.5 });
  const [preferred, other] = darkSheet ? [lighter, darker] : [darker, lighter];
  const preferredContrast = contrastRatio(preferred, accentBackground);
  const gold = preferredContrast >= ACCENT_MIN_CONTRAST || preferredContrast >= contrastRatio(other, accentBackground)
    ? preferred
    : other;

  // Dark sheets already have a deep primary; light (pastel) sheets get a
  // saturated shade of it so the bar reads as the same hue, not grey.
  const tableHeaderText = mixHex(secondary, WHITE, 0.9);
  const headerBase = darkSheet ? mixHex(primary, BLACK, 0.35) : deepShade(primary, 0.32);
  const tableHeader = pushForContrast(headerBase, BLACK, tableHeaderText, HEADER_TEXT_MIN_CONTRAST);

  return { gold, tableHeader, tableHeaderText };
}

/** The accent fields of a theme entry, ready to spread into its values. */
export function buildThemeAccentFields(colors) {
  const { gold, tableHeader, tableHeaderText } = deriveThemeAccents(colors);
  return {
    "enable-gold-accent-color": true,
    "gold-accent-color": gold,
    "enable-table-header-color": true,
    "table-header-color": tableHeader,
    "enable-table-header-text-color": true,
    "table-header-text-color": tableHeaderText,
  };
}
