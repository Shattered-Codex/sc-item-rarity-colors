import { MODULE_ID } from "./constants.js";

export const DEBUG_LOGS_SETTING_KEY = "debugLogsEnabled";

function hasDebugSettingRegistered() {
  return game?.settings?.settings?.has?.(`${MODULE_ID}.${DEBUG_LOGS_SETTING_KEY}`) === true;
}

export function isDebugEnabled() {
  try {
    if (!hasDebugSettingRegistered()) return false;
    return game.settings.get(MODULE_ID, DEBUG_LOGS_SETTING_KEY) === true;
  } catch (_error) {
    return false;
  }
}

export function debugLog(message, details = null) {
  if (!isDebugEnabled()) return;
  if (details === null) {
    console.log(`${MODULE_ID} | ${message}`);
    return;
  }
  console.log(`${MODULE_ID} | ${message}`, details);
}

export function debugWarn(message, details = null) {
  if (!isDebugEnabled()) return;
  if (details === null) {
    console.warn(`${MODULE_ID} | ${message}`);
    return;
  }
  console.warn(`${MODULE_ID} | ${message}`, details);
}
