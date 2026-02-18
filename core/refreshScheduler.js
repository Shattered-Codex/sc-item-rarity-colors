export const REFRESH_DELAYS_MS = Object.freeze({
  SETTINGS_CHANGE: 120,
  DIRECTORY_EVENT: 30,
  SIDEBAR_DOM_INJECTION: 80,
});

function scheduleAnimationFrameInternal(callback) {
  if (typeof requestAnimationFrame === "function") {
    return { id: requestAnimationFrame(callback), type: "raf" };
  }
  return { id: setTimeout(callback, 0), type: "timeout" };
}

function cancelAnimationFrameInternal(handle) {
  if (!handle || handle.id == null) return false;
  if (handle.type === "raf" && typeof cancelAnimationFrame === "function") {
    cancelAnimationFrame(handle.id);
    return true;
  }
  clearTimeout(handle.id);
  return true;
}

/**
 * Create a debounced refresh requester for hook-heavy update flows.
 *
 * @param {object} options
 * @param {Function} options.execute
 * @param {string} [options.label]
 * @param {number} [options.defaultDelayMs]
 * @param {Function|null} [options.log]
 * @returns {{request: Function, cancel: Function, isPending: Function}}
 */
export function createDebouncedRefreshRequester({
  execute,
  label = "Refresh",
  defaultDelayMs = REFRESH_DELAYS_MS.SETTINGS_CHANGE,
  log = null,
}) {
  let timerId = null;

  const request = (reason = "unspecified", delayMs = defaultDelayMs) => {
    const hadPendingRefresh = Boolean(timerId);
    if (timerId) clearTimeout(timerId);

    if (typeof log === "function") {
      log(`${label} requested`, { reason, debounced: hadPendingRefresh, delayMs });
    }

    timerId = setTimeout(() => {
      timerId = null;
      if (typeof log === "function") {
        log(`${label} executing`, { reason });
      }
      execute();
    }, delayMs);
  };

  const cancel = () => {
    if (!timerId) return false;
    clearTimeout(timerId);
    timerId = null;
    return true;
  };

  const isPending = () => Boolean(timerId);

  return { request, cancel, isPending };
}

/**
 * Schedule a callback for the next animation frame (with timeout fallback).
 *
 * @param {Function} callback
 * @returns {Function} cancel function
 */
export function scheduleOnNextAnimationFrame(callback) {
  if (typeof callback !== "function") return () => false;
  const handle = scheduleAnimationFrameInternal(() => callback());
  return () => cancelAnimationFrameInternal(handle);
}

/**
 * Run once immediately and once on the next animation frame.
 *
 * @param {Function} callback
 * @returns {Function} cancel next-frame pass
 */
export function runNowAndOnNextAnimationFrame(callback) {
  if (typeof callback !== "function") return () => false;
  callback();
  return scheduleOnNextAnimationFrame(callback);
}

/**
 * Create a frame scheduler that collapses multiple requests into one pass/frame.
 *
 * @param {Function} callback
 * @returns {{request: Function, cancel: Function, isPending: Function}}
 */
export function createAnimationFrameScheduler(callback) {
  let pendingHandle = null;

  const request = () => {
    if (pendingHandle || typeof callback !== "function") return false;
    pendingHandle = scheduleAnimationFrameInternal(() => {
      pendingHandle = null;
      callback();
    });
    return true;
  };

  const cancel = () => {
    const cancelled = cancelAnimationFrameInternal(pendingHandle);
    pendingHandle = null;
    return cancelled;
  };

  const isPending = () => Boolean(pendingHandle);

  return { request, cancel, isPending };
}
