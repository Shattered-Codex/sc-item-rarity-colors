import { RARITY_CLASS_PREFIX } from "./constants.js";

/**
 * A decorative layer drawn around a whole item sheet.
 *
 * Foundry clips everything inside an application window (`overflow: hidden`),
 * so effects that reach past the frame cannot live inside it. The overlay is
 * a sibling placed just behind the window, a margin larger on every side, and
 * kept in step with it: moved, resized, raised, minimized, or closed. Being
 * behind the window, its effects only show around the frame.
 *
 * The same code serves the editor preview, where the mock sheet sits in a
 * positioned wrapper instead of the page.
 */

export const FRAME_MARGIN = 48;

const FRAME_CLASS = "scirc-fx-frame";

/** root element → { overlay, mutationObserver, resizeObserver, frame } */
const tracked = new Map();
let removalObserver = null;

function buildOverlay() {
  const overlay = document.createElement("div");
  overlay.className = FRAME_CLASS;
  overlay.setAttribute("aria-hidden", "true");
  overlay.innerHTML = [
    '<span class="scirc-fx-frame__aura"></span>',
    '<span class="scirc-fx-frame__waves"><i></i><i></i><i></i></span>',
    '<span class="scirc-fx-frame__halo"></span>',
    '<span class="scirc-fx-frame__corona"></span>',
    // Storm: four bands of crackling arcs along the edges.
    '<span class="scirc-fx-frame__storm">',
    '<i class="scirc-fx-arc scirc-fx-arc--top"></i>',
    '<i class="scirc-fx-arc scirc-fx-arc--right"></i>',
    '<i class="scirc-fx-arc scirc-fx-arc--bottom"></i>',
    '<i class="scirc-fx-arc scirc-fx-arc--left"></i>',
    "</span>",
    // Runic frame: four bands of runes flowing clockwise.
    '<span class="scirc-fx-frame__runes">',
    '<i class="scirc-fx-rune-band scirc-fx-rune-band--top"></i>',
    '<i class="scirc-fx-rune-band scirc-fx-rune-band--right"></i>',
    '<i class="scirc-fx-rune-band scirc-fx-rune-band--bottom"></i>',
    '<i class="scirc-fx-rune-band scirc-fx-rune-band--left"></i>',
    "</span>",
  ].join("");
  return overlay;
}

function sync(root) {
  const entry = tracked.get(root);
  if (!entry) return;
  entry.frame = null;

  if (!root.isConnected) {
    removeFrameOverlay(root);
    return;
  }

  const { overlay } = entry;
  const hidden = root.classList.contains("minimized")
    || root.classList.contains("minimizing")
    || root.offsetWidth === 0;
  overlay.hidden = hidden;
  if (hidden) return;

  if (overlay.parentElement !== root.parentElement || overlay.nextElementSibling !== root) {
    root.before(overlay);
  }

  const width = root.offsetWidth + FRAME_MARGIN * 2;
  const height = root.offsetHeight + FRAME_MARGIN * 2;
  overlay.style.left = `${root.offsetLeft - FRAME_MARGIN}px`;
  overlay.style.top = `${root.offsetTop - FRAME_MARGIN}px`;
  overlay.style.width = `${width}px`;
  overlay.style.height = `${height}px`;
  overlay.style.setProperty("--scirc-frame-diag", `${Math.ceil(Math.hypot(width, height))}px`);
  // Unitless window size, so waves can grow by the same distance on every side.
  overlay.style.setProperty("--scirc-frame-w", String(root.offsetWidth));
  overlay.style.setProperty("--scirc-frame-h", String(root.offsetHeight));

  const style = getComputedStyle(root);
  syncTransform(overlay, style);

  // Just under the window, so other windows still stack normally.
  const zIndex = Number.parseInt(style.zIndex, 10);
  overlay.style.zIndex = Number.isFinite(zIndex) ? String(zIndex - 1) : "";
}

/**
 * The sizes above are layout sizes, which ignore transforms; Foundry scales a
 * window (position.scale) with `transform: scale()` from its top left corner.
 * The overlay takes the same transform about the matching point (the window's
 * origin, shifted by the margin), so the effects scale and line up with the
 * window as drawn.
 */
function syncTransform(overlay, style) {
  if (!style.transform || style.transform === "none") {
    overlay.style.removeProperty("transform");
    overlay.style.removeProperty("transform-origin");
    return;
  }
  const [originX = 0, originY = 0] = style.transformOrigin.split(" ").map((value) => Number.parseFloat(value) || 0);
  overlay.style.transformOrigin = `${originX + FRAME_MARGIN}px ${originY + FRAME_MARGIN}px`;
  overlay.style.transform = style.transform;
}

function requestSync(root) {
  const entry = tracked.get(root);
  if (!entry || entry.frame) return;
  entry.frame = requestAnimationFrame(() => sync(root));
}

// Sheets replaced without leaving <body> (e.g. the editor preview re-rendering)
// are not seen by the removal observer; they are dropped on the next call.
function pruneDisconnected() {
  for (const root of [...tracked.keys()]) {
    if (!root.isConnected) removeFrameOverlay(root);
  }
}

function ensureRemovalObserver() {
  if (removalObserver || typeof MutationObserver !== "function") return;
  // Windows are removed from the page when they close; drop their overlays.
  removalObserver = new MutationObserver(() => pruneDisconnected());
  removalObserver.observe(document.body, { childList: true });
}

/**
 * Creates (or refreshes) the overlay for `root` and mirrors the effect
 * classes and color onto it, since it lives outside the sheet.
 */
export function ensureFrameOverlay(root) {
  if (!root?.parentElement) return null;
  pruneDisconnected();

  let entry = tracked.get(root);
  if (!entry) {
    const overlay = buildOverlay();
    root.before(overlay);
    entry = { overlay, frame: null, mutationObserver: null, resizeObserver: null };
    tracked.set(root, entry);

    if (typeof MutationObserver === "function") {
      entry.mutationObserver = new MutationObserver(() => requestSync(root));
      entry.mutationObserver.observe(root, { attributes: true, attributeFilter: ["style", "class"] });
    }
    if (typeof ResizeObserver === "function") {
      entry.resizeObserver = new ResizeObserver(() => requestSync(root));
      entry.resizeObserver.observe(root);
    }
    ensureRemovalObserver();
  }

  const mirrored = [...root.classList].filter((name) => name.startsWith("scirc-fx-") || name.startsWith(RARITY_CLASS_PREFIX));
  entry.overlay.className = [FRAME_CLASS, ...mirrored].join(" ");
  for (const variable of ["--scirc-fx-color", "--scirc-fx-pcolor"]) {
    const value = root.style.getPropertyValue(variable);
    if (value) entry.overlay.style.setProperty(variable, value);
    else entry.overlay.style.removeProperty(variable);
  }

  sync(root);
  return entry.overlay;
}

export function removeFrameOverlay(root) {
  const entry = tracked.get(root);
  if (!entry) return;
  if (entry.frame) cancelAnimationFrame(entry.frame);
  entry.mutationObserver?.disconnect();
  entry.resizeObserver?.disconnect();
  entry.overlay.remove();
  tracked.delete(root);

  if (!tracked.size && removalObserver) {
    removalObserver.disconnect();
    removalObserver = null;
  }
}
