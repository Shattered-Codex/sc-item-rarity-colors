/**
 * Animated item sheet effects (Effects tab).
 *
 * "Placement" decides where everything is drawn:
 * - "sheet" (default): the item sheet itself radiates. Particles escape from
 *   behind the window's edges, Energy flames flicker around its outline, and
 *   the Pulse / Halo / waves / runes light its frame — all in an overlay
 *   behind the window (frameOverlay.js), plus a sheen across the sheet.
 * - "image": the same effects around the item image, in a layer behind it
 *   (the image container, the same on D&D 5e and Tidy 5e sheets).
 *
 * Inventory rows and the Items sidebar get a lightweight version on the icon:
 * one element with two pseudo-elements per row.
 *
 * Everything animates in CSS (transform/opacity, composited by the GPU); this
 * file only toggles classes and builds the layers once, with each particle's
 * randomized properties written as CSS variables. Users can switch effects
 * off per browser, and the OS "reduce motion" preference stops them too
 * (see item-effects.css).
 */

import { RARITY_CLASS_PREFIX } from "./constants.js";
import { ensureFrameOverlay, FRAME_MARGIN as FRAME_EDGE, removeFrameOverlay } from "./frameOverlay.js";
import {
  buildParticles,
  PARTICLE_MOTIONS,
  PARTICLE_TYPE_KEYS,
  randomOutlinePoint,
  resolveParticleMotion,
} from "./particleSystem.js";

const FX_ROOT_CLASS = "scirc-fx-enabled";
const FX_ANCHOR_CLASS = "scirc-fx-anchor";
const FX_LAYER_CLASS = "scirc-fx-layer";
const FX_EMITTER_CLASS = "scirc-fx-emitter";
const FX_SHEEN_CLASS = "scirc-fx-sheen";
const FX_SHEET_SHEEN_CLASS = "scirc-fx-sheet-sheen";
const FX_ICON_CLASS = "scirc-fx-icon";
const FX_ICON_HOST_CLASS = "scirc-fx-icon-host";
const FX_COLOR_VAR = "--scirc-fx-color";
const FX_PARTICLE_COLOR_VAR = "--scirc-fx-pcolor";
const FX_CLASS_PREFIX = "scirc-fx-";
const ICON_PULSE_CLASS = "scirc-inv-icon-pulse";
const FX_DISABLED_BODY_CLASS = "scirc-fx-disabled";

export const DISABLE_EFFECTS_SETTING_KEY = "disableAnimatedEffects";

/** Per-browser off switch: a body class the effects stylesheet keys on. */
export function applyAnimatedEffectsPreference(disabled) {
  globalThis.document?.body?.classList.toggle(FX_DISABLED_BODY_CLASS, disabled === true);
}

export const AURA_STYLES = Object.freeze(["energy", "fire", "void", "pulse", "halo", "corona", "storm"]);
export const WAVE_STYLES = Object.freeze(["energy", "ripples", "shockwave", "arcane", "mist", "sonar", "prism", "burst"]);
const WAVE_DISTANCES = Object.freeze(["short", "normal", "far"]);
const WAVE_SHAPES = Object.freeze(["outline", "organic"]);
// Auras drawn around the sheet as tongues rooted on the window outline.
const FLAME_AURAS = Object.freeze(["energy", "fire", "void"]);
const INTENSITIES = Object.freeze(["subtle", "normal", "strong"]);
const SPEEDS = Object.freeze(["slow", "normal", "fast"]);
const PLACEMENTS = Object.freeze(["sheet", "image"]);

// Particle emitter tuning. Around the image, distances are in % of the
// effect layer's shorter side (container query units), so they scale with
// the image; around the sheet they are in pixels from the window's edge.
const PARTICLE_COUNTS = Object.freeze({ few: 10, normal: 18, many: 28 });
const PARTICLE_TRAVEL = Object.freeze({ short: [8, 14], normal: [12, 22], far: [20, 34] });
const FRAME_PARTICLE_COUNTS = Object.freeze({ few: 26, normal: 44, many: 70 });
const FRAME_PARTICLE_TRAVEL = Object.freeze({ short: [16, 32], normal: [26, 54], far: [44, 86] });
// One Energy flame per this many pixels of window outline, within bounds.
const FRAME_FLAME_SPACING = 30;
const FRAME_FLAME_LIMITS = Object.freeze([20, 64]);

// The image container: Tidy's sidebar, else the D&D 5e header column.
const ANCHOR_SELECTORS = Object.freeze([
  "aside.sidebar .item-image-container",
  ".sheet-header > .left",
]);

const pick = (value, allowed, fallback) => (allowed.includes(value) ? value : fallback);
const random = (min, max) => min + Math.random() * (max - min);

/**
 * The color effects are drawn in: the custom effect color when set, else the
 * secondary color with a gradient, else the background color.
 */
export function resolveEffectColor(settings = {}) {
  if (settings.enableEffectColor && settings.effectColor) return settings.effectColor;
  if (settings.gradientEnabled && settings.gradientColor) return settings.gradientColor;
  return settings.backgroundColor || "#a77bff";
}

/** Which item sheet effects are on, normalized. */
export function resolveSheetEffects(settings = {}) {
  const effects = {
    shimmer: settings.shimmerEnabled === true,
    particles: settings.particlesEnabled === true ? pick(settings.particlesStyle, PARTICLE_TYPE_KEYS, "arcane") : null,
    particleAmount: pick(settings.particleAmount, Object.keys(PARTICLE_COUNTS), "normal"),
    particleDistance: pick(settings.particleDistance, Object.keys(PARTICLE_TRAVEL), "normal"),
    particleMotion: pick(settings.particleMotion, PARTICLE_MOTIONS, "auto"),
    aura: settings.auraEnabled === true ? pick(settings.auraStyle, AURA_STYLES, "energy") : null,
    waves: settings.wavesEnabled === true ? pick(settings.wavesStyle, WAVE_STYLES, "energy") : null,
    wavesDistance: pick(settings.wavesDistance, WAVE_DISTANCES, "normal"),
    wavesShape: pick(settings.wavesShape, WAVE_SHAPES, "outline"),
    runes: settings.runesEnabled === true,
    intensity: pick(settings.effectIntensity, INTENSITIES, "normal"),
    speed: pick(settings.effectSpeed, SPEEDS, "normal"),
    placement: pick(settings.effectPlacement, PLACEMENTS, "sheet"),
  };

  effects.motion = effects.particles ? resolveParticleMotion(effects.particles, effects.particleMotion) : null;
  effects.any = effects.shimmer || Boolean(effects.particles) || Boolean(effects.aura) || Boolean(effects.waves) || effects.runes;
  effects.needsImageLayer = effects.any && effects.placement === "image";
  effects.needsFrame = effects.any && effects.placement === "sheet";
  return effects;
}

/** Whether any effect needs the effect color variable (runtime CSS). */
export function settingsUseEffectColor(settings = {}) {
  return resolveSheetEffects(settings).any || settings.enableInventoryIconPulse === true;
}

/** The particles' own color, when set; they use the effect color otherwise. */
export function resolveParticleColor(settings = {}) {
  return settings.enableParticleColor && settings.particleColor ? settings.particleColor : null;
}

const particleSignature = (effects) =>
  `${effects.particles}:${effects.motion}:${effects.particleAmount}:${effects.particleDistance}`;

// --- Image layer --------------------------------------------------------------

function findAnchor(root) {
  for (const selector of ANCHOR_SELECTORS) {
    const anchor = root.querySelector(selector);
    if (anchor) return anchor;
  }
  return null;
}

/** (Re)builds the image emitter's particles when what they depend on changed. */
function syncEmitter(layer, effects) {
  let emitter = layer.querySelector(`:scope > .${FX_EMITTER_CLASS}`);
  if (!effects.particles) {
    emitter?.remove();
    return;
  }

  const signature = particleSignature(effects);
  if (emitter?.dataset.signature === signature) return;

  emitter?.remove();
  emitter = document.createElement("div");
  emitter.className = FX_EMITTER_CLASS;
  emitter.dataset.signature = signature;
  emitter.append(...buildParticles({
    placement: "image",
    type: effects.particles,
    motion: effects.motion,
    count: PARTICLE_COUNTS[effects.particleAmount],
    travel: PARTICLE_TRAVEL[effects.particleDistance],
  }));
  layer.append(emitter);
}

function ensureImageLayer(root, effects) {
  const anchor = findAnchor(root);
  if (!anchor) return;
  anchor.classList.add(FX_ANCHOR_CLASS);

  let layer = anchor.querySelector(`:scope > .${FX_LAYER_CLASS}`);
  if (!layer) {
    layer = document.createElement("div");
    layer.className = FX_LAYER_CLASS;
    layer.setAttribute("aria-hidden", "true");
    layer.innerHTML = [
      '<span class="scirc-fx-aura"><b></b><b></b><b></b></span>',
      '<span class="scirc-fx-waves"><i></i><i></i><i></i></span>',
      '<span class="scirc-fx-runes"></span>',
    ].join("");
    anchor.prepend(layer);
  }
  syncEmitter(layer, effects);

  if (!anchor.querySelector(`:scope > .${FX_SHEEN_CLASS}`)) {
    const sheen = document.createElement("div");
    sheen.className = FX_SHEEN_CLASS;
    sheen.setAttribute("aria-hidden", "true");
    anchor.append(sheen);
  }
}

function removeImageLayer(root) {
  root.querySelectorAll(`.${FX_LAYER_CLASS}, .${FX_SHEEN_CLASS}`).forEach((node) => node.remove());
  root.querySelectorAll(`.${FX_ANCHOR_CLASS}`).forEach((node) => node.classList.remove(FX_ANCHOR_CLASS));
}

// --- Sheet frame --------------------------------------------------------------

/** Shortest signed turn from angle `from` to `to`, in degrees. */
const turnBetween = (from, to) => ((to - from + 540) % 360) - 180;

/**
 * One tongue of energy rooted on the outline, pointing outward and leaning
 * upward like an anime power aura; those on the bottom edge stay short.
 */
/**
 * One tongue of an aura around the sheet. Energy: all around, leaning up a
 * little. Fire: mostly from the top and sides, leaning up hard, longer and
 * quicker. Void: all around, straight out, wide and slow.
 */
function buildFrameFlame(width, height, style = "energy") {
  const fire = style === "fire";
  const voidAura = style === "void";
  const point = randomOutlinePoint(width, height, fire && Math.random() < 0.85 ? ["top", "left", "right"] : undefined);
  const lean = fire ? 0.8 : voidAura ? 0 : 0.35;
  const angle = point.normal + turnBetween(point.normal, 270) * lean + random(-12, 12);
  const reach = fire ? random(40, 96) : voidAura ? random(40, 88) : random(30, 72);
  const length = reach * (point.edge === "bottom" ? 0.55 : 1);
  const duration = fire ? random(0.5, 1.15) : voidAura ? random(1.8, 3.4) : random(0.9, 1.9);

  const flame = document.createElement("b");
  flame.className = "scirc-fx-ff";
  flame.style.cssText = [
    `--x:${point.x.toFixed(4)}`,
    `--y:${point.y.toFixed(4)}`,
    `--n:${angle.toFixed(1)}deg`,
    `--n2:${(angle + random(-14, 14)).toFixed(1)}deg`,
    `--len:${length.toFixed(0)}px`,
    `--w:${(voidAura ? random(50, 84) : random(34, 62)).toFixed(0)}px`,
    `--t:${duration.toFixed(2)}s`,
    `--delay:${(-random(0, duration * 2)).toFixed(2)}s`,
  ].join(";");
  return flame;
}

/** (Re)builds a frame emitter when what it depends on changed. */
function syncFrameEmitter(overlay, className, signature, build) {
  let container = overlay.querySelector(`:scope > .${className}`);
  if (!build) {
    container?.remove();
    return;
  }
  if (container?.dataset.signature === signature) return;

  container?.remove();
  container = document.createElement("div");
  container.className = className;
  container.dataset.signature = signature;
  build(container);
  overlay.append(container);
}

function syncFrameEmanations(overlay, effects) {
  // The window's size when built; positions are fractions, so they follow
  // later resizes, and the counts are good enough until the next rebuild.
  const width = Math.max(200, overlay.offsetWidth - FRAME_EDGE * 2 || 0);
  const height = Math.max(200, overlay.offsetHeight - FRAME_EDGE * 2 || 0);

  syncFrameEmitter(
    overlay,
    "scirc-fx-frame__emitter",
    particleSignature(effects),
    effects.particles && ((container) => {
      container.append(...buildParticles({
        placement: "sheet",
        type: effects.particles,
        motion: effects.motion,
        count: FRAME_PARTICLE_COUNTS[effects.particleAmount],
        travel: FRAME_PARTICLE_TRAVEL[effects.particleDistance],
        width,
        height,
      }));
    })
  );

  const flameCount = Math.round(Math.min(
    FRAME_FLAME_LIMITS[1],
    Math.max(FRAME_FLAME_LIMITS[0], (2 * (width + height)) / FRAME_FLAME_SPACING)
  ));
  syncFrameEmitter(
    overlay,
    "scirc-fx-frame__flames",
    `${effects.aura}:${flameCount}`,
    FLAME_AURAS.includes(effects.aura) && ((container) => {
      for (let index = 0; index < flameCount; index += 1) {
        container.append(buildFrameFlame(width, height, effects.aura));
      }
    })
  );
}

/** Sheet placement: the overlay around the window and a sheen across it. */
function ensureSheetLayers(root, effects) {
  const overlay = ensureFrameOverlay(root);
  if (overlay) syncFrameEmanations(overlay, effects);
  let sheen = root.querySelector(`:scope > .${FX_SHEET_SHEEN_CLASS}`);
  if (effects.shimmer && !sheen) {
    sheen = document.createElement("div");
    sheen.className = FX_SHEET_SHEEN_CLASS;
    sheen.setAttribute("aria-hidden", "true");
    root.append(sheen);
  } else if (!effects.shimmer) {
    sheen?.remove();
  }
}

function removeSheetLayers(root) {
  removeFrameOverlay(root);
  root.querySelectorAll(`:scope > .${FX_SHEET_SHEEN_CLASS}`).forEach((node) => node.remove());
}

function clearEffectClasses(root) {
  for (const className of [...root.classList]) {
    if (className.startsWith(FX_CLASS_PREFIX)) root.classList.remove(className);
  }
}

/**
 * Applies the item sheet effects to a sheet root element. Safe to call on
 * every render: layers are reused, never duplicated.
 * @param {HTMLElement} root
 * @param {object} settings - resolved rarity / spell settings
 * @param {{preview?: boolean}} [options] - preview writes the color inline;
 *   at runtime it comes from the generated per-rarity CSS.
 */
export function applySheetEffects(root, settings, { preview = false } = {}) {
  if (!root?.classList) return;
  const effects = resolveSheetEffects(settings);

  clearEffectClasses(root);
  if (!effects.any) {
    root.style.removeProperty(FX_COLOR_VAR);
    root.style.removeProperty(FX_PARTICLE_COLOR_VAR);
    removeImageLayer(root);
    removeSheetLayers(root);
    return;
  }

  root.classList.add(
    FX_ROOT_CLASS,
    `${FX_CLASS_PREFIX}intensity--${effects.intensity}`,
    `${FX_CLASS_PREFIX}speed--${effects.speed}`,
    `${FX_CLASS_PREFIX}place--${effects.placement}`
  );
  if (effects.shimmer) root.classList.add(`${FX_CLASS_PREFIX}shimmer`);
  if (effects.particles) root.classList.add(`${FX_CLASS_PREFIX}particles`, `${FX_CLASS_PREFIX}particles--${effects.particles}`);
  if (effects.aura) root.classList.add(`${FX_CLASS_PREFIX}aura`, `${FX_CLASS_PREFIX}aura--${effects.aura}`);
  if (effects.waves) {
    root.classList.add(
      `${FX_CLASS_PREFIX}waves`,
      `${FX_CLASS_PREFIX}waves--${effects.waves}`,
      `${FX_CLASS_PREFIX}waves-dist--${effects.wavesDistance}`,
      `${FX_CLASS_PREFIX}waves-shape--${effects.wavesShape}`
    );
  }
  if (effects.runes) root.classList.add(`${FX_CLASS_PREFIX}runes`);

  const particleColor = resolveParticleColor(settings);
  if (preview) root.style.setProperty(FX_COLOR_VAR, resolveEffectColor(settings));
  else root.style.removeProperty(FX_COLOR_VAR);
  if (preview && particleColor) root.style.setProperty(FX_PARTICLE_COLOR_VAR, particleColor);
  else root.style.removeProperty(FX_PARTICLE_COLOR_VAR);

  if (effects.needsImageLayer) ensureImageLayer(root, effects);
  else removeImageLayer(root);

  if (effects.needsFrame) ensureSheetLayers(root, effects);
  else removeSheetLayers(root);
}

export function clearSheetEffects(root) {
  if (!root?.classList) return;
  clearEffectClasses(root);
  root.style.removeProperty(FX_COLOR_VAR);
  root.style.removeProperty(FX_PARTICLE_COLOR_VAR);
  removeImageLayer(root);
  removeSheetLayers(root);
}

// --- Icons (inventory rows, Items sidebar) ------------------------------------

// Icon companions (pulse, emanation) sit right before their icon.
const ICON_COMPANION_CLASSES = [ICON_PULSE_CLASS, FX_ICON_CLASS];
const isIconCompanion = (node) => ICON_COMPANION_CLASSES.some((name) => node?.classList?.contains(name));

function findIconCompanion(icon, className) {
  for (let node = icon.previousElementSibling; isIconCompanion(node); node = node.previousElementSibling) {
    if (node.classList.contains(className)) return node;
  }
  return null;
}

function releaseIconHost(icon) {
  const host = icon.parentElement;
  if (host && ![...host.children].some(isIconCompanion)) host.classList.remove(FX_ICON_HOST_CLASS);
}

/** Inventory icon pulse on the row's icon element(s). */
export function applyIconPulse($icons, settings, { preview = false } = {}) {
  const enabled = settings?.enableInventoryIconPulse === true;
  const color = enabled ? resolveEffectColor(settings) : "";
  $icons.each((_, icon) => {
    if (!icon?.parentElement) return;
    const existing = findIconCompanion(icon, ICON_PULSE_CLASS);
    if (!enabled) {
      existing?.remove();
      releaseIconHost(icon);
      return;
    }

    // A glow behind the icon fading in and out (opacity only); it takes the
    // icon's rarity class, whose runtime CSS carries the effect color.
    const pulse = existing ?? document.createElement("span");
    if (!existing) {
      pulse.setAttribute("aria-hidden", "true");
      icon.before(pulse);
    }
    const rarityClasses = [...icon.classList].filter((name) => name.startsWith(RARITY_CLASS_PREFIX));
    pulse.className = [ICON_PULSE_CLASS, ...rarityClasses].join(" ");
    const size = icon.offsetWidth || icon.width || 0;
    if (size) pulse.style.setProperty("--fx-size", `${size}px`);
    if (preview) pulse.style.setProperty(FX_COLOR_VAR, color);
    else pulse.style.removeProperty(FX_COLOR_VAR);
    icon.parentElement.classList.add(FX_ICON_HOST_CLASS);
  });
}

/**
 * Emanation on small icons: one element placed right behind each icon, whose
 * two pseudo-elements draw the aura and the escaping particles. Each icon gets
 * its own random rhythm so a list of items never pulses in step. The icon's
 * container isolates stacking so the emanation sits behind the icon (and any
 * hover controls drawn over it) without re-layering the icon itself.
 *
 * @param {Iterable<HTMLElement>|jQuery} icons - the icon <img> elements
 * @param {boolean} enabled
 * @param {object} settings - for the effect color
 */
export function applyIconEmanation(icons, enabled, settings = {}) {
  const color = resolveEffectColor(settings);
  for (const icon of icons ?? []) {
    if (!icon?.parentElement) continue;
    const existing = findIconCompanion(icon, FX_ICON_CLASS);

    if (!enabled) {
      existing?.remove();
      releaseIconHost(icon);
      continue;
    }

    const emanation = existing ?? document.createElement("span");
    if (!existing) {
      emanation.className = FX_ICON_CLASS;
      emanation.setAttribute("aria-hidden", "true");
      emanation.style.setProperty("--fx-t1", `${random(2.4, 3.6).toFixed(2)}s`);
      emanation.style.setProperty("--fx-t2", `${random(1.8, 2.8).toFixed(2)}s`);
      emanation.style.setProperty("--fx-delay", `${(-random(0, 3)).toFixed(2)}s`);
      emanation.style.setProperty("--fx-turn", `${random(0, 360).toFixed(0)}deg`);
      icon.before(emanation);
    }
    const size = icon.offsetWidth || icon.width || 0;
    if (size) emanation.style.setProperty("--fx-size", `${size}px`);
    emanation.style.setProperty(FX_COLOR_VAR, color);
    icon.parentElement.classList.add(FX_ICON_HOST_CLASS);
  }
}

/** Removes icon emanations under `root` (row or directory entry). */
export function clearIconEmanation(root) {
  root?.querySelectorAll?.(`:is(.${FX_ICON_CLASS}, .${ICON_PULSE_CLASS})`).forEach((node) => node.remove());
  root?.querySelectorAll?.(`.${FX_ICON_HOST_CLASS}`).forEach((node) => node.classList.remove(FX_ICON_HOST_CLASS));
}
