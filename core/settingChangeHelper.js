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
