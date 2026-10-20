/**
 * Sizes the elements placed next to an icon (the inventory pulse and
 * emanation, the unidentified image cover) to that icon, through one shared
 * ResizeObserver.
 *
 * Measuring while a sheet renders is unreliable: before layout an icon reads
 * 0 wide, and an <img> then reports its file's natural size (256-512px for
 * Foundry's icons), which once blew the pulse up across the inventory. The
 * observer reports after layout instead, with no forced reflow per row, and
 * again whenever the icon's size changes, such as when a hidden tab opens.
 *
 * Each companion gets:
 * - --fx-size: the icon's width;
 * - --scirc-cover-w / -h: the icon's whole box;
 * - --scirc-cover-x / -y: the icon's border and padding, so a cover can draw
 *   inside it.
 */

const companionsByIcon = new Map();
let resizeObserver = null;
let pruneQueued = false;

function writeSize(companion, border, content) {
  const style = companion.style;
  style.setProperty("--fx-size", `${border.inlineSize}px`);
  style.setProperty("--scirc-cover-w", `${border.inlineSize}px`);
  style.setProperty("--scirc-cover-h", `${border.blockSize}px`);
  style.setProperty("--scirc-cover-x", `${(border.inlineSize - (content?.inlineSize ?? border.inlineSize)) / 2}px`);
  style.setProperty("--scirc-cover-y", `${(border.blockSize - (content?.blockSize ?? border.blockSize)) / 2}px`);
}

function onIconsResized(entries) {
  for (const { target: icon, borderBoxSize, contentBoxSize } of entries) {
    const companions = companionsByIcon.get(icon);
    if (!companions || !pruneIcon(icon, companions)) continue;
    const border = borderBoxSize?.[0];
    // A hidden icon (an inactive tab) reports 0; it is measured again once shown.
    if (!border?.inlineSize || !border?.blockSize) continue;
    for (const companion of companions) writeSize(companion, border, contentBoxSize?.[0]);
  }
}

function stopObservingIcon(icon) {
  resizeObserver?.unobserve(icon);
  companionsByIcon.delete(icon);
}

function pruneIcon(icon, companions) {
  for (const companion of companions) {
    if (!companion.isConnected) companions.delete(companion);
  }
  if (icon.isConnected && companions.size) return true;
  stopObservingIcon(icon);
  return false;
}

// Sheets replace their rows on every render, so stale companions are dropped
// once per batch, and resize callbacks also release icons after a sheet closes.
function prune() {
  pruneQueued = false;
  for (const [icon, companions] of companionsByIcon) {
    pruneIcon(icon, companions);
  }
}

function queuePrune() {
  if (pruneQueued) return;
  pruneQueued = true;
  queueMicrotask(prune);
}

/** Keeps `companion` sized to `icon` until either leaves the page. */
export function followIconSize(icon, companion) {
  if (!icon || !companion || typeof ResizeObserver !== "function") return;
  queuePrune();
  let companions = companionsByIcon.get(icon);
  if (companions?.has(companion)) return;
  if (!companions) {
    companions = new Set();
    companionsByIcon.set(icon, companions);
  }
  companions.add(companion);
  resizeObserver ??= new ResizeObserver(onIconsResized);
  // Observing again makes the observer report the current size, so a
  // companion added to an icon already followed is sized too.
  resizeObserver.unobserve(icon);
  resizeObserver.observe(icon);
}

/** Stops sizing a companion that is being removed. */
export function unfollowIconSize(icon, companion) {
  const companions = companionsByIcon.get(icon);
  if (!companions) return;
  companions.delete(companion);
  if (!companions.size) stopObservingIcon(icon);
}
