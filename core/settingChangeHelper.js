/**
 * Normalize Foundry's setSetting hook payload into a full setting key.
 * Supports both legacy payloads ("module", "key") and object payloads ({ key }).
 *
 * @param {unknown} moduleOrSetting
 * @param {unknown} maybeKey
 * @returns {string|null}
 */
export function getSettingKeyFromHookPayload(moduleOrSetting, maybeKey) {
  if (typeof moduleOrSetting === "string") {
    if (moduleOrSetting.includes(".")) return moduleOrSetting;
    if (typeof maybeKey === "string" && maybeKey) return `${moduleOrSetting}.${maybeKey}`;
    return moduleOrSetting;
  }

  const key = moduleOrSetting?.key;
  return typeof key === "string" && key ? key : null;
}

/**
 * Check whether a setSetting payload belongs to a given module namespace.
 *
 * @param {unknown} moduleOrSetting
 * @param {unknown} maybeKey
 * @param {string} moduleId
 * @returns {boolean}
 */
export function isModuleSettingChange(moduleOrSetting, maybeKey, moduleId) {
  if (moduleOrSetting === moduleId) return true;

  const fullSettingKey = getSettingKeyFromHookPayload(moduleOrSetting, maybeKey);
  return typeof fullSettingKey === "string" && fullSettingKey.startsWith(`${moduleId}.`);
}

const DEDUPE_WINDOW_MS = 80;

function scheduleMicrotask(callback) {
  if (typeof queueMicrotask === "function") {
    queueMicrotask(callback);
    return;
  }
  Promise.resolve().then(callback);
}

/**
 * Register setting-change hooks for both legacy and modern Foundry payloads.
 * Some environments emit "setSetting", while others emit Setting document hooks.
 *
 * @param {(moduleOrSetting: unknown, maybeKey?: unknown) => void} handler
 */
export function registerSettingChangeHooks(handler) {
  if (typeof handler !== "function") return;

  const pendingEvents = new Map();
  const recentlyDispatchedAt = new Map();
  let flushScheduled = false;

  const enqueue = (moduleOrSetting, maybeKey) => {
    const fullSettingKey = getSettingKeyFromHookPayload(moduleOrSetting, maybeKey);
    const dedupeKey = fullSettingKey ?? `${String(moduleOrSetting)}::${String(maybeKey ?? "")}`;
    const now = Date.now();
    const lastDispatchedAt = recentlyDispatchedAt.get(dedupeKey);
    if (lastDispatchedAt !== undefined && now - lastDispatchedAt < DEDUPE_WINDOW_MS) return;
    if (pendingEvents.has(dedupeKey)) return;

    pendingEvents.set(dedupeKey, {
      dedupeKey,
      fullSettingKey,
      moduleOrSetting,
      maybeKey,
    });

    if (flushScheduled) return;
    flushScheduled = true;

    scheduleMicrotask(() => {
      flushScheduled = false;
      const events = Array.from(pendingEvents.values());
      pendingEvents.clear();

      const dispatchedAt = Date.now();
      for (const event of events) {
        recentlyDispatchedAt.set(event.dedupeKey, dispatchedAt);
        if (event.fullSettingKey) {
          handler(event.fullSettingKey);
        } else {
          handler(event.moduleOrSetting, event.maybeKey);
        }
      }

      if (recentlyDispatchedAt.size > 256) {
        for (const [key, timestamp] of recentlyDispatchedAt.entries()) {
          if (dispatchedAt - timestamp > DEDUPE_WINDOW_MS * 4) {
            recentlyDispatchedAt.delete(key);
          }
        }
      }
    });
  };

  Hooks.on("setSetting", (moduleOrSetting, maybeKey) => {
    enqueue(moduleOrSetting, maybeKey);
  });

  Hooks.on("updateSetting", (setting) => {
    enqueue(setting);
  });

  Hooks.on("createSetting", (setting) => {
    enqueue(setting);
  });
}
