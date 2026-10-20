/**
 * The full key ("module.key") of a changed setting: the key itself, or the
 * key of a Setting document.
 *
 * @param {string|{key?: string}} payload
 * @returns {string|null}
 */
function getSettingKeyFromHookPayload(payload) {
  if (typeof payload === "string") return payload || null;
  const key = payload?.key;
  return typeof key === "string" && key ? key : null;
}

/**
 * Whether a changed setting belongs to a given module.
 *
 * @param {string|{key?: string}} payload
 * @param {string} moduleId
 * @returns {boolean}
 */
export function isModuleSettingChange(payload, moduleId) {
  const fullSettingKey = getSettingKeyFromHookPayload(payload);
  return typeof fullSettingKey === "string" && fullSettingKey.startsWith(`${moduleId}.`);
}

const DEDUPE_WINDOW_MS = 80;

/**
 * Calls `handler` with the full key of each world setting created or updated
 * (Setting document hooks), at most once per key in a short window.
 *
 * @param {(settingKey: string) => void} handler
 */
export function registerSettingChangeHooks(handler) {
  if (typeof handler !== "function") return;

  const pendingEvents = new Set();
  const recentlyDispatchedAt = new Map();
  let flushScheduled = false;

  const enqueue = (setting) => {
    const fullSettingKey = getSettingKeyFromHookPayload(setting);
    if (!fullSettingKey) return;
    const now = Date.now();
    const lastDispatchedAt = recentlyDispatchedAt.get(fullSettingKey);
    if (lastDispatchedAt !== undefined && now - lastDispatchedAt < DEDUPE_WINDOW_MS) return;
    if (pendingEvents.has(fullSettingKey)) return;

    pendingEvents.add(fullSettingKey);

    if (flushScheduled) return;
    flushScheduled = true;

    queueMicrotask(() => {
      flushScheduled = false;
      const settingKeys = Array.from(pendingEvents);
      pendingEvents.clear();

      const dispatchedAt = Date.now();
      for (const settingKey of settingKeys) {
        recentlyDispatchedAt.set(settingKey, dispatchedAt);
        handler(settingKey);
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

  Hooks.on("updateSetting", (setting) => {
    enqueue(setting);
  });

  Hooks.on("createSetting", (setting) => {
    enqueue(setting);
  });
}
