/**
 * Hides an unidentified item's image on screen (Image tab of the unidentified
 * style): darkened, as a silhouette, blurred, or behind a stand-in image per
 * item kind, with an optional question mark over it.
 *
 * A cover placed right before the image (like the icon effects) draws what
 * players see, and the image itself only stops drawing its pixels. The image
 * element keeps its box, so the inventory border and the clicks on it still
 * work, and filters never reach that border. The look comes from
 * unidentified-image.css; colors and stand-in images from the runtime CSS
 * (the editor preview writes them inline). The item document is never touched.
 */

import { normalizeHexColor } from "./colorUtils.js";
import { IMAGE_COVER_CLASS } from "./constants.js";
import { followIconSize, unfollowIconSize } from "./iconSizeObserver.js";
import { findIconCompanion, resolveEffectColor } from "./itemEffects.js";
import { buildRaritySettings } from "./settingsManager.js";
import { resolveItemImageKind } from "./unidentifiedImageConfig.js";
import { UNIDENTIFIED_STYLE_KEY } from "./unidentifiedStyle.js";

const CONCEALED_CLASS = "scirc-concealed-image";
const MARK_CLASS = `${IMAGE_COVER_CLASS}__mark`;
const KIND_ATTRIBUTE = "data-scirc-image-kind";
// The real image, drawn by the cover in silhouette or blurred. It is already
// in the image's src, so writing it inline reveals nothing new.
const SOURCE_VAR = "--scirc-conceal-source";
const IMAGE_VAR = "--scirc-conceal-image";
const MARK_COLOR_VAR = "--scirc-conceal-mark";
// Modes the cover draws from the real image.
const DRAWS_SOURCE = new Set(["shadow", "silhouette", "blur"]);
const GLOW_VAR = "--scirc-conceal-glow";
const MARK_SVG = `<svg class="${MARK_CLASS}" viewBox="0 0 100 100" aria-hidden="true"><text x="50" y="50">?</text></svg>`;

// Shadowed and Silhouette are each one SVG color matrix: a single cheap pass
// per hidden icon, with no blur and no blended layer, so even a long list
// stays light. Their tint follows the effect color, so the filters are
// written into the page and updated in place when it changes. The editor
// preview has its own pair, so dragging its color picker never touches the
// filters live icons use.
const FILTER_HOST_ID = "scirc-conceal-filters";
const FALLBACK_TINT = "#ffd27a";
const SVG_NS = "http://www.w3.org/2000/svg";

function tintChannels(color) {
  const hex = normalizeHexColor(color, { uppercase: false }) ?? FALLBACK_TINT;
  return [1, 3, 5].map((start) => Number.parseInt(hex.slice(start, start + 2), 16) / 255);
}

const round = (value) => Number(value.toFixed(4));

/**
 * Shadowed: each pixel's luminance, darkened and tinted in the effect color;
 * alpha untouched, so a transparent background stays clear.
 * Silhouette: a flat shade of the effect color, opaque where the pixel is
 * bright enough, so painted icons keep their lit object and lose their dark
 * background (tuned on Foundry's core icons; deep red or very dark parts can
 * drop out).
 */
function buildFilterMatrix(mode, color) {
  const tint = tintChannels(color);
  if (mode === "silhouette") {
    // Light enough to read on a dark row without any glow around it.
    const [r, g, b] = tint.map((channel) => round(0.08 + 0.42 * channel));
    return `0 0 0 0 ${r}  0 0 0 0 ${g}  0 0 0 0 ${b}  4 13 1.4 0 -2.6`;
  }
  const rows = tint.map((channel) => {
    const weight = 1.2 * (0.18 + 0.55 * channel);
    return `${round(0.2126 * weight)} ${round(0.7152 * weight)} ${round(0.0722 * weight)} 0 -0.03`;
  });
  return `${rows.join("  ")}  0 0 0 1 0`;
}

function filterHost() {
  let host = document.getElementById(FILTER_HOST_ID);
  if (host) return host;
  host = document.createElementNS(SVG_NS, "svg");
  host.id = FILTER_HOST_ID;
  host.setAttribute("aria-hidden", "true");
  host.setAttribute("width", "0");
  host.setAttribute("height", "0");
  host.style.position = "absolute";
  document.body.append(host);
  return host;
}

/** Creates the filter `id`, or updates its matrix when the color changed. */
function upsertFilter(id, values) {
  let matrix = document.getElementById(id)?.firstElementChild;
  if (!matrix) {
    const filter = document.createElementNS(SVG_NS, "filter");
    filter.id = id;
    filter.setAttribute("color-interpolation-filters", "sRGB");
    matrix = document.createElementNS(SVG_NS, "feColorMatrix");
    matrix.setAttribute("type", "matrix");
    filter.append(matrix);
    filterHost().append(filter);
  }
  if (matrix.getAttribute("values") !== values) matrix.setAttribute("values", values);
}

function ensureModeFilter(mode, color, preview) {
  if (mode !== "shadow" && mode !== "silhouette") return;
  upsertFilter(`scirc-conceal-${mode}${preview ? "-preview" : ""}`, buildFilterMatrix(mode, color));
}

/** The item sheet image: the D&D 5e header, or the Tidy 5e sidebar. */
export const SHEET_IMAGE_SELECTOR = ".sheet-header img.document-image, .item-image-container > img";

/**
 * A file path as a CSS url(), quoted so spaces and parentheses are safe. It is
 * made absolute: a relative url() held in a CSS variable resolves against the
 * stylesheet that uses the variable (this module's folder), not the page.
 */
export function toCssUrl(path) {
  const raw = String(path ?? "").trim();
  let href = raw;
  try {
    href = raw ? new URL(raw, document.baseURI).href : "";
  } catch {
    // Not a valid URL: left as given.
  }
  return `url("${href.replace(/[\\"]/g, "\\$&").replace(/[\n\r]/g, "")}")`;
}

const toArray = (images) => (images?.jquery ? images.get() : Array.from(images ?? []));
const imageSource = (image) => image.currentSrc || image.getAttribute("src") || "";

function revealImage(image) {
  image.classList.remove(CONCEALED_CLASS);
  const cover = findIconCompanion(image, IMAGE_COVER_CLASS);
  if (!cover) return;
  unfollowIconSize(image, cover);
  cover.remove();
}

/** Sets an inline variable only when it changes, sparing a style recalc. */
function setCoverVariable(cover, variable, value) {
  if (!value) cover.style.removeProperty(variable);
  else if (cover.style.getPropertyValue(variable) !== value) cover.style.setProperty(variable, value);
}

function syncMark(cover, enabled) {
  const mark = cover.querySelector(`.${MARK_CLASS}`);
  if (enabled && !mark) cover.insertAdjacentHTML("beforeend", MARK_SVG);
  else if (!enabled) mark?.remove();
}

function concealImage(image, conceal, kind, surface, { preview = false, effectColor = null } = {}) {
  // "none" keeps the real image and only adds the question mark.
  image.classList.toggle(CONCEALED_CLASS, conceal.mode !== "none");

  const existing = findIconCompanion(image, IMAGE_COVER_CLASS);
  const cover = existing ?? document.createElement("span");
  if (!existing) {
    cover.setAttribute("aria-hidden", "true");
    image.before(cover);
  }
  const className = [
    IMAGE_COVER_CLASS,
    `${IMAGE_COVER_CLASS}--${surface}`,
    `${IMAGE_COVER_CLASS}--${conceal.mode}`,
    `${IMAGE_COVER_CLASS}--mark-${conceal.markSize}`,
  ].join(" ");
  if (cover.className !== className) cover.className = className;

  if (conceal.mode !== "type") cover.removeAttribute(KIND_ATTRIBUTE);
  else if (cover.getAttribute(KIND_ATTRIBUTE) !== kind) cover.setAttribute(KIND_ATTRIBUTE, kind);

  setCoverVariable(cover, SOURCE_VAR, DRAWS_SOURCE.has(conceal.mode) ? toCssUrl(imageSource(image)) : null);
  setCoverVariable(cover, IMAGE_VAR, preview ? toCssUrl(conceal.images?.[kind]) : null);
  setCoverVariable(cover, MARK_COLOR_VAR, preview ? conceal.markColor : null);
  setCoverVariable(cover, GLOW_VAR, preview ? effectColor : null);

  syncMark(cover, conceal.mark);
  // Sized to the image after layout (see core/iconSizeObserver.js).
  followIconSize(image, cover);
}

const isConcealing = (conceal, surface) =>
  conceal?.surfaces?.[surface] === true && (conceal.mode !== "none" || conceal.mark);

/**
 * Hides or reveals the images of one item on one surface. Safe to call on
 * every render: the cover is reused, never duplicated.
 * @param {Iterable<HTMLElement>|jQuery} images
 * @param {object|null} item - Item document or compendium index entry
 * @param {string|null} rarity - the rarity this user sees (getDisplayRarity)
 * @param {"sheet"|"inventory"|"sidebar"} surface
 */
export function syncImageConceal(images, item, rarity, surface) {
  const conceal = rarity === UNIDENTIFIED_STYLE_KEY ? buildRaritySettings(rarity)?.conceal : null;
  const active = isConcealing(conceal, surface);
  const kind = active ? resolveItemImageKind(item) : null;
  if (active) ensureModeFilter(conceal.mode, resolveEffectColor(buildRaritySettings(rarity)), false);
  for (const image of toArray(images)) {
    if (!image?.classList) continue;
    if (active) concealImage(image, conceal, kind, surface);
    else revealImage(image);
  }
}

/**
 * Editor preview: the same look from the form's current values, written
 * inline. Pass `conceal: null` to show the real images.
 */
export function previewImageConceal(images, conceal, kind, surface, effectColor) {
  const active = isConcealing(conceal, surface);
  if (active) ensureModeFilter(conceal.mode, effectColor, true);
  for (const image of toArray(images)) {
    if (!image?.classList) continue;
    if (active) concealImage(image, conceal, kind, surface, { preview: true, effectColor });
    else revealImage(image);
  }
}
