import { MODULE_ID } from "./constants.js";

export const DEBUG_LOGS_SETTING_KEY = "debugLogsEnabled";

// Logging is checked on hot paths (every inventory row on every render), and
// reading a client setting builds a Setting document each time, so the flag
// is read once and then kept in sync by the setting's onChange.
let debugEnabled = null;

function readDebugSetting() {
  try {
    if (!game?.settings?.settings?.has?.(`${MODULE_ID}.${DEBUG_LOGS_SETTING_KEY}`)) return null;
    return game.settings.get(MODULE_ID, DEBUG_LOGS_SETTING_KEY) === true;
  } catch (_error) {
    return null;
  }
}

/** Called by the debug setting's onChange. */
export function setDebugEnabled(value) {
  debugEnabled = value === true;
}

export function isDebugEnabled() {
  // Until the setting is registered the answer is not cached, so the first
  // read after registration picks up the stored value.
  debugEnabled ??= readDebugSetting();
  return debugEnabled === true;
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
