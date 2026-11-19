/**
 * Color intensity: per-rarity (and per spell profile) sliders, one for each
 * surface (item sheet, inventory row, sidebar row), that soften how the
 * background and border colors are shown there, without changing the stored
 * colors.
 *
 * Softening scales the color's chroma (saturation) in OKLab, keeps its hue,
 * and keeps its relative luminance (what WCAG contrast is computed from), so
 * the contrast with the configured text colors holds at any intensity. At 100% (the default) settings pass through untouched, so worlds
 * with a configured theme look exactly as before.
 *
 * Animated effects keep their color: an effect without its own color follows
 * the stored background, as at 100%.
 *
 * Apply it only where colors are shown (runtime CSS, inline spell styles, the
 * editor preview). Code that reads the stored colors, such as the Tidy 5e
 * rarity color sync, uses the settings as built.
 */

import { resolveEffectColor } from "./itemEffects.js";

const FULL_COLOR_INTENSITY = 100;

// The settings property holding each surface's intensity
// (core/appearanceSettingFields.js).
const INTENSITY_BY_SURFACE = Object.freeze({
  sheet: "sheetColorIntensity",
  inventory: "inventoryColorIntensity",
  sidebar: "sidebarColorIntensity",
});

// Settings colors that are shown as surfaces and borders. Text, accent, and
// explicit effect colors keep their stored value.
const SOFTENED_COLOR_KEYS = Object.freeze([
  "backgroundColor",
  "gradientColor",
  "inventoryBorderColor",
  "inventoryBorderSecondaryColor",
]);

/**
 * The settings as shown on one surface ("sheet", "inventory", or "sidebar"):
 * the same object at full intensity, otherwise a copy with the surface and
 * border colors softened by that surface's intensity and the effect color
 * pinned to the one the stored colors give. Use the result on that surface
 * only.
 */
export function withColorIntensity(settings, surface) {
  const intensity = Number(settings?.[INTENSITY_BY_SURFACE[surface]]);
  if (!Number.isFinite(intensity) || intensity >= FULL_COLOR_INTENSITY) return settings;

  const shown = { ...settings, enableEffectColor: true, effectColor: resolveEffectColor(settings) };
  for (const key of SOFTENED_COLOR_KEYS) {
    if (typeof shown[key] === "string") shown[key] = softenColor(shown[key], intensity);
  }
  return shown;
}

/**
 * A hex color with its chroma scaled to `intensity` percent, its hue kept, and
 * its relative luminance kept. Invalid colors, full intensity, and colors that
 * do not change (grays) are returned as given.
 */
export function softenColor(color, intensity) {
  const factor = Math.min(1, Math.max(0, Number(intensity) / 100));
  if (!Number.isFinite(factor) || factor >= 1) return color;

  const parsed = parseHexColor(color);
  if (!parsed) return color;

  const linear = parsed.rgb.map(srgbToLinear);
  const [, a, b] = linearRgbToOklab(linear);
  const softened = matchLuminance(a * factor, b * factor, relativeLuminance(linear)).map(linearToSrgb);
  const hex = `#${softened.map(toHexByte).join("")}${parsed.alpha}`;
  return hex === parsed.normalized ? color : hex;
}

// Less chroma at the same OKLab lightness shifts the luminance a little (most
// for saturated reds and blues), so the lightness is searched instead: the
// luminance grows with it, and 24 halvings are well below one 8-bit step.
function matchLuminance(a, b, targetLuminance) {
  let low = 0;
  let high = 1;
  let rgb = null;
  for (let step = 0; step < 24; step += 1) {
    const lightness = (low + high) / 2;
    rgb = oklabToLinearRgb([lightness, a, b]).map((channel) => Math.min(1, Math.max(0, channel)));
    if (relativeLuminance(rgb) < targetLuminance) low = lightness;
    else high = lightness;
  }
  return rgb;
}

function relativeLuminance([r, g, b]) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function parseHexColor(color) {
  const match = /^#?([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(String(color ?? "").trim());
  if (!match) return null;
  let digits = match[1].toLowerCase();
  if (digits.length <= 4) digits = [...digits].map((digit) => digit + digit).join("");
  const rgb = [0, 2, 4].map((offset) => parseInt(digits.slice(offset, offset + 2), 16) / 255);
  return { rgb, alpha: digits.slice(6), normalized: `#${digits}` };
}

function toHexByte(channel) {
  return Math.round(Math.min(1, Math.max(0, channel)) * 255).toString(16).padStart(2, "0");
}

function srgbToLinear(channel) {
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

function linearToSrgb(channel) {
  const clamped = Math.min(1, Math.max(0, channel));
  return clamped <= 0.0031308 ? clamped * 12.92 : 1.055 * clamped ** (1 / 2.4) - 0.055;
}

// OKLab conversions (Björn Ottosson, https://bottosson.github.io/posts/oklab/).
function linearRgbToOklab([r, g, b]) {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s,
  ];
}

function oklabToLinearRgb([L, a, b]) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
  ];
}
