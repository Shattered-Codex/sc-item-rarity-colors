const TRANSACTION_DEPTH = new Map();
const TRANSACTION_COMPLETE_HOOK_SUFFIX = "settingsTransactionComplete";

function getTransactionCompleteHookName(moduleId) {
  return `${moduleId}.${TRANSACTION_COMPLETE_HOOK_SUFFIX}`;
}

function beginSettingsTransaction(moduleId) {
  const currentDepth = TRANSACTION_DEPTH.get(moduleId) || 0;
  TRANSACTION_DEPTH.set(moduleId, currentDepth + 1);
}

function endSettingsTransaction(moduleId) {
  const currentDepth = TRANSACTION_DEPTH.get(moduleId) || 0;
  const nextDepth = Math.max(0, currentDepth - 1);
  if (nextDepth === 0) {
    TRANSACTION_DEPTH.delete(moduleId);
    return true;
  }
  TRANSACTION_DEPTH.set(moduleId, nextDepth);
  return false;
}

export function isSettingsTransactionActive(moduleId) {
  return (TRANSACTION_DEPTH.get(moduleId) || 0) > 0;
}

export function registerSettingsTransactionCompleteHook(moduleId, handler) {
  if (!moduleId || typeof handler !== "function") return;
  Hooks.on(getTransactionCompleteHookName(moduleId), handler);
}

export async function runSettingsTransaction(moduleId, operation, context = {}) {
  if (!moduleId || typeof operation !== "function") {
    return operation?.();
  }

  beginSettingsTransaction(moduleId);
  try {
    return await operation();
  } finally {
    const completed = endSettingsTransaction(moduleId);
    if (completed) {
      Hooks.callAll(getTransactionCompleteHookName(moduleId), context);
    }
  }
}
