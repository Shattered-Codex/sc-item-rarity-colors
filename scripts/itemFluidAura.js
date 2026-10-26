import { MODULE_ID, DISABLE_EFFECTS_SETTING_KEY } from "../core/constants.js";
import { FluidAura } from "./FluidAura.js";
import { FluidRenderer } from "./FluidRenderer.js";

export const AURA_QUALITY_SETTING_KEY = "itemAuraQuality";

// Every shown Fluid sheet animates; the focused one at full rate, the rest at
// half. Past the cap, sheets beyond it wait until one closes or is minimized.
const FOCUSED_FPS = 30;
const BACKGROUND_FPS = 15;
const MAX_RUNNING_AURAS = 6;

// Fluid styles, scaled from the Distance and Intensity settings. Wide spreads
// the same energy over a larger area, so it emits more to stay as bright.
const FLUID_STYLES = Object.freeze({
  fluid: Object.freeze({ reach: 1, emission: 1 }),
  "fluid-wide": Object.freeze({ reach: 2, emission: 1.6 }),
});

/** root element → { root, host, signature, options } for sheets showing Fluid. */
const sheets = new Map();
/** root element → { aura, entry } for the sheets currently animating. */
const running = new Map();
let renderer = null;
let rendererFailed = false;
let frame = 0;
let initialized = false;
let quality = "off";
let enabled = false;
let reducedMotion;

function isShown(root) {
  if (root.offsetWidth === 0 || root.offsetHeight === 0) return false;
  const windowElement = root.closest(".application") ?? root;
  return !windowElement.classList.contains("minimized") && !windowElement.classList.contains("minimizing");
}

function stopAura(root) {
  running.get(root)?.aura.detach();
  running.delete(root);
}

/** Frees every aura and the shared context. */
function releaseAll() {
  for (const root of [...running.keys()]) stopAura(root);
  renderer?.destroy();
  renderer = null;
}

function failRenderer(message, error) {
  releaseAll();
  rendererFailed = true;
  console.warn(`${MODULE_ID} | ${message}`, ...(error ? [error] : []));
}

/** Whether the shared renderer can draw now: false while its shaders compile, or after it failed. */
function rendererReady() {
  // Do not fight a GPU reset or a browser that keeps dropping the context.
  if (renderer?.lost) failRenderer("Fluid aura lost its WebGL context.");
  if (rendererFailed) return false;
  if (!renderer) {
    try {
      renderer = FluidRenderer.create();
    } catch (error) {
      failRenderer("Unable to initialize fluid aura.", error);
      return false;
    }
    if (!renderer) {
      failRenderer("Fluid aura requires WebGL2 and floating-point render targets.");
      return false;
    }
  }
  try {
    return renderer.ready;
  } catch (error) {
    failRenderer("Unable to initialize fluid aura.", error);
    return false;
  }
}

/** The sheets to animate this frame, focused first, within the cap. */
function selectShownSheets() {
  const focusedWindow = ui.activeWindow?.element;
  const shown = [];
  for (const entry of sheets.values()) {
    if (!entry.root.isConnected) {
      sheets.delete(entry.root);
      continue;
    }
    if (!isShown(entry.root)) continue;
    const focused = Boolean(focusedWindow) && (focusedWindow === entry.root || focusedWindow.contains(entry.root));
    if (focused) shown.unshift({ entry, focused });
    else shown.push({ entry, focused });
  }
  return shown.slice(0, MAX_RUNNING_AURAS);
}

function syncAura(entry) {
  let state = running.get(entry.root);
  if (!state) {
    state = { aura: new FluidAura(renderer, { ...entry.options, quality }), entry };
    state.aura.moveTo(entry.host, entry.options.layer);
    running.set(entry.root, state);
  } else if (state.entry !== entry) {
    state.aura.setOptions(entry.options);
    if (state.entry.host !== entry.host || state.entry.options.layer !== entry.options.layer) {
      state.aura.moveTo(entry.host, entry.options.layer);
    }
    state.entry = entry;
  }
  return state.aura;
}

// The focused sheet follows its window every frame (it may be dragged);
// the others only when their next step is due.
function drawShownSheets(shown, now) {
  const due = [];
  for (const { entry, focused } of shown) {
    const aura = syncAura(entry);
    const fps = focused ? FOCUSED_FPS : BACKGROUND_FPS;
    if (focused || aura.isDue(now, fps)) due.push({ aura, fps });
  }
  for (const { aura } of due) aura.measure();
  for (const { aura, fps } of due) aura.render(now, fps);
}

function renderFrame(now) {
  frame = 0;
  if (!enabled || document.hidden || !sheets.size) {
    releaseAll();
    return;
  }
  const shown = selectShownSheets();
  // Selecting drops sheets that left the page without a close hook; the last one frees the context.
  if (!sheets.size) {
    releaseAll();
    return;
  }
  const shownRoots = new Set(shown.map(({ entry }) => entry.root));
  for (const root of [...running.keys()]) {
    if (!shownRoots.has(root)) stopAura(root);
  }
  if (shown.length && !rendererReady()) {
    if (!rendererFailed) frame = requestAnimationFrame(renderFrame);
    return;
  }

  try {
    drawShownSheets(shown, now);
  } catch (error) {
    // One broken aura must not leave the others or the context half alive.
    failRenderer("Fluid aura stopped after a drawing error.", error);
    return;
  }
  // Keeps polling while sheets are only minimized or hidden, to pick them back up.
  if (sheets.size) frame = requestAnimationFrame(renderFrame);
}

function requestFrame() {
  if (!initialized || frame || rendererFailed) return;
  if (enabled && sheets.size && !document.hidden) frame = requestAnimationFrame(renderFrame);
  else releaseAll();
}

/** Whether an aura style is drawn by the Fluid simulation instead of CSS. */
export function isFluidAuraStyle(style) {
  return Object.hasOwn(FLUID_STYLES, style);
}

export function refreshItemAuraPreferences() {
  if (!initialized) return;
  const value = game.settings.get(MODULE_ID, AURA_QUALITY_SETTING_KEY);
  const nextQuality = Object.hasOwn(FluidAura.QUALITY, value) ? value : "off";
  enabled = nextQuality !== "off" && !reducedMotion.matches
    && !game.settings.get(MODULE_ID, DISABLE_EFFECTS_SETTING_KEY);
  // A new quality rebuilds the auras; a preference change also retries a failed context.
  if (!enabled || document.hidden || nextQuality !== quality) releaseAll();
  quality = nextQuality;
  rendererFailed = false;
  requestFrame();
}

/** Called by the shared effects pipeline for real sheets and editor previews. */
export function syncItemFluidAura(root, effects, { host = root, layer = document.body } = {}) {
  if (!isFluidAuraStyle(effects.aura)
    || !host || root.ownerDocument !== document) {
    // Most sheets never use Fluid; leave the loop alone for them.
    if (!sheets.delete(root)) return;
    stopAura(root);
  } else {
    const color = effects.color || "#a77bff";
    const distance = effects.wavesDistance || "normal";
    const { reach: reachScale, emission } = FLUID_STYLES[effects.aura];
    const signature = `${effects.aura}:${color}:${distance}:${effects.intensity}:${effects.speed}:${effects.placement}`;
    const existing = sheets.get(root);
    if (!existing || existing.signature !== signature || existing.host !== host || existing.options.layer !== layer) {
      const local = layer !== document.body;
      const reach = ({ short: 32, normal: 56, far: 88 }[distance] ?? 56) * reachScale;
      sheets.set(root, { root, host, signature, options: {
        layer, color,
        distanceScale: ({ short: 0.6, normal: 1, far: 1.6 }[distance] ?? 1) * reachScale,
        margin: { top: reach, right: reach, bottom: reach, left: reach },
        intensity: ({ subtle: 0.35, normal: 0.6, strong: 0.9 }[effects.intensity] ?? 0.6) * emission,
        speed: { slow: 0.65, normal: 1, fast: 1.4 }[effects.speed] ?? 1,
        zIndex: local ? -1 : null,
      } });
    }
  }
  requestFrame();
}

export function registerItemFluidAura() {
  if (initialized) return;
  initialized = true;
  reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  reducedMotion.addEventListener("change", refreshItemAuraPreferences);
  document.addEventListener("visibilitychange", refreshItemAuraPreferences);
  // Includes ItemSheet5e, Tidy ItemSheetV2, and both style editor applications.
  Hooks.on("closeApplicationV2", (app) => {
    const windowRoot = app.element;
    for (const root of [...sheets.keys()]) {
      if (!root.isConnected || windowRoot === root || windowRoot?.contains(root)) {
        sheets.delete(root);
        stopAura(root);
      }
    }
    if (!sheets.size) releaseAll();
  });
  refreshItemAuraPreferences();
}
