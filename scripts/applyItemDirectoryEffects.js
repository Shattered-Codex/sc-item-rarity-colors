/**
 * Foundry Item Directory Effects
 * Applies rarity-based visual effects to item rows in the world Items sidebar tab.
 */

import { getItemRarity } from "./itemRarityHelper.js";
import { getActiveSpellStyleForItem } from "./spellSchoolHelper.js";
import { buildRaritySettings } from "../core/settingsManager.js";
import { isModuleSettingChange, registerSettingChangeHooks } from "../core/settingChangeHelper.js";
import { debugLog, debugWarn } from "../core/debug.js";
import {
  createDebouncedRefreshRequester,
  REFRESH_DELAYS_MS,
  runNowAndOnNextAnimationFrame,
} from "../core/refreshScheduler.js";
import { applyRarityClass, clearRarityClasses, ensureRuntimeRarityStyles } from "../core/runtimeRarityStyles.js";
import {
  isSettingsTransactionActive,
  registerSettingsTransactionCompleteHook,
} from "../core/settingsTransaction.js";

const DIRECTORY_ROW_SELECTOR = ".directory-item.entry.document.item, .directory-item.document.item, .directory-item.item";
const DIRECTORY_STATE_CLASSES = ["scirc-dir-gradient-enabled", "scirc-dir-text-enabled"];

function getItemIdFromElement(element) {
  return element?.dataset?.documentId
    || element?.dataset?.entryId
    || element?.dataset?.itemId
    || element?.dataset?.id
    || element?.getAttribute?.("data-document-id")
    || element?.getAttribute?.("data-entry-id")
    || element?.getAttribute?.("data-item-id")
    || null;
}

function resolveItemFromCollection(collection, itemId) {
  if (!collection?.get || !itemId) return null;

  const entry = collection.get(itemId);
  if (!entry) return null;
  if (entry.documentName === "Item" || entry.system || entry.type) return entry;

  if (entry.uuid && typeof fromUuidSync === "function") {
    const resolved = fromUuidSync(entry.uuid);
    if (resolved?.documentName === "Item") return resolved;
  }

  return null;
}

function resolveItemFromRow(app, rowElement) {
  const itemId = getItemIdFromElement(rowElement);
  if (!itemId) return null;

  const candidates = [
    game?.items,
    app?.collection,
    app?.documents,
    ui?.sidebar?.tabs?.items?.collection,
  ];

  for (const collection of candidates) {
    const doc = resolveItemFromCollection(collection, itemId);
    if (doc) return doc;
  }

  const uuid = rowElement?.dataset?.uuid || rowElement?.dataset?.documentUuid || rowElement?.dataset?.entryUuid;
  if (uuid && typeof fromUuidSync === "function") {
    const resolved = fromUuidSync(uuid);
    if (resolved?.documentName === "Item") return resolved;
  }

  return null;
}

function clearRowVisuals(rowElement) {
  if (!rowElement) return;

  DIRECTORY_STATE_CLASSES.forEach((stateClass) => rowElement.classList.remove(stateClass));
  clearRarityClasses(rowElement);

  rowElement.style.removeProperty("--scirc-dir-bg-primary");
  rowElement.style.removeProperty("--scirc-dir-bg-secondary");
  rowElement.style.removeProperty("--scirc-dir-bg-fallback");
  rowElement.style.removeProperty("--scirc-dir-text-color");
  rowElement.style.removeProperty("background");
  rowElement.style.removeProperty("color");
  rowElement.style.removeProperty("text-shadow");

  rowElement
    .querySelectorAll(".entry-name, .entry-name a, .document-name, .document-name a")
    .forEach((el) => {
      el.style.removeProperty("color");
      el.style.removeProperty("text-shadow");
    });
}

function resolveRootElement(htmlOrElement) {
  if (!htmlOrElement) return null;

  if (htmlOrElement.jquery || typeof htmlOrElement.get === "function") {
    return htmlOrElement[0] ?? htmlOrElement.get(0) ?? null;
  }

  if (Array.isArray(htmlOrElement) && htmlOrElement.length) {
    return resolveRootElement(htmlOrElement[0]);
  }

  if (htmlOrElement instanceof Document || htmlOrElement instanceof Element || htmlOrElement instanceof DocumentFragment) {
    return htmlOrElement;
  }

  if (htmlOrElement?.element) {
    return resolveRootElement(htmlOrElement.element);
  }

  if (typeof htmlOrElement?.querySelectorAll === "function") {
    return htmlOrElement;
  }

  return null;
}

function getRowsFromRoot(rootElement) {
  const root = resolveRootElement(rootElement);
  if (!root?.querySelectorAll) return [];

  const rows = Array.from(root.querySelectorAll(DIRECTORY_ROW_SELECTOR));
  if (root.matches?.(DIRECTORY_ROW_SELECTOR)) rows.unshift(root);

  return rows.filter((row) => !row.classList.contains("folder"));
}

function resolveItemForRow(rowElement, app = null) {
  const itemId = getItemIdFromElement(rowElement);
  if (itemId) {
    const direct = game?.items?.get?.(itemId);
    if (direct) return direct;
  }

  return resolveItemFromRow(app, rowElement);
}

function getKnownItemDirectoryRoots() {
  const roots = [];
  const seen = new Set();

  const addRoot = (elementOrApp, app = null) => {
    if (!elementOrApp) return;
    const dom = resolveRootElement(elementOrApp);
    if (!dom || seen.has(dom)) return;
    seen.add(dom);
    roots.push({ element: dom, app });
  };

  addRoot(ui?.sidebar?.tabs?.items?.element, ui?.sidebar?.tabs?.items ?? null);

  for (const win of Object.values(ui?.windows ?? {})) {
    if (win?.tabName !== "items") continue;
    addRoot(win?.element, win);
  }

  for (const popout of Object.values(ui?.sidebar?.popouts ?? {})) {
    if (popout?.tabName !== "items") continue;
    addRoot(popout?.element, popout);
  }

  return roots;
}

function isItemsSidebarContext(app, html) {
  if (app?.tabName) return app.tabName === "items";
  if (app?.id === "items" || app?.options?.id === "items") return true;
  if (typeof app?.id === "string" && app.id.toLowerCase().includes("item")) return true;
  if (typeof app?.constructor?.name === "string" && app.constructor.name.toLowerCase().includes("item")) return true;

  const root = resolveRootElement(html);
  if (!root?.querySelector) return false;
  return Boolean(root.querySelector(DIRECTORY_ROW_SELECTOR));
}

export function applyItemDirectoryEffects(moduleId) {
  ensureRuntimeRarityStyles(moduleId);
  const raritySettingsCache = new Map();

  const getCachedRaritySettings = (rarity) => {
    if (!rarity) return null;
    if (raritySettingsCache.has(rarity)) return raritySettingsCache.get(rarity);
    const settings = buildRaritySettings(rarity);
    raritySettingsCache.set(rarity, settings);
    return settings;
  };

  const applyStylesToDirectoryRow = (item, rowElement) => {
    if (!rowElement) return { applied: false, reason: "missing-row" };

    clearRowVisuals(rowElement);

    const spellStyle = getActiveSpellStyleForItem(item, moduleId);
    if (spellStyle) {
      const spellSettings = spellStyle.settings;

      if (spellSettings.enableFoundryInterfaceGradientEffects && spellSettings.enableItemColor) {
        const primaryColor = spellSettings.backgroundColor || "#ffffff";
        const secondaryColor = spellSettings.gradientEnabled
          && spellSettings.gradientColor
          && spellSettings.gradientColor !== "#ffffff"
          ? spellSettings.gradientColor
          : "#252830";
        rowElement.classList.add("scirc-dir-gradient-enabled");
        rowElement.style.setProperty("--scirc-dir-bg-primary", primaryColor);
        rowElement.style.setProperty("--scirc-dir-bg-secondary", secondaryColor);
        rowElement.style.setProperty("--scirc-dir-bg-fallback", "#252830");
      }

      if (spellSettings.enableFoundryInterfaceTextColor && spellSettings.foundryInterfaceTextColor) {
        rowElement.classList.add("scirc-dir-text-enabled");
        rowElement.style.setProperty("--scirc-dir-text-color", spellSettings.foundryInterfaceTextColor);
      }

      return {
        applied: true,
        source: "spell-style",
        profileKey: spellStyle.profileKey,
        school: spellStyle.school,
        level: spellStyle.level,
      };
    }

    const rarity = getItemRarity(item);
    if (!rarity) {
      return {
        applied: false,
        reason: "missing-rarity",
      };
    }

    const settings = getCachedRaritySettings(rarity);
    if (!settings) {
      return {
        applied: false,
        reason: "missing-settings",
        rarity,
      };
    }

    applyRarityClass(rowElement, rarity);

    if (settings.enableFoundryInterfaceGradientEffects && settings.enableItemColor) {
      rowElement.classList.add("scirc-dir-gradient-enabled");
    }

    if (settings.enableFoundryInterfaceTextColor && settings.foundryInterfaceTextColor) {
      rowElement.classList.add("scirc-dir-text-enabled");
    }

    return {
      applied: true,
      source: "rarity",
      rarity,
      gradientApplied: settings.enableFoundryInterfaceGradientEffects && settings.enableItemColor,
      textColorApplied: settings.enableFoundryInterfaceTextColor && Boolean(settings.foundryInterfaceTextColor),
    };
  };

  const applyStylesToItemDirectoryRoot = (rootElement, app = null) => {
    const rows = getRowsFromRoot(rootElement);
    if (!rows.length) return;

    let appliedCount = 0;
    let unresolvedCount = 0;
    let noRarityCount = 0;
    let noSettingsCount = 0;
    let spellStyleCount = 0;

    for (const rowElement of rows) {
      const item = resolveItemForRow(rowElement, app);
      if (!item) {
        clearRowVisuals(rowElement);
        unresolvedCount += 1;
        continue;
      }
      const result = applyStylesToDirectoryRow(item, rowElement);
      if (result?.source === "spell-style") spellStyleCount += 1;
      if (result?.applied) {
        appliedCount += 1;
        continue;
      }
      if (result?.reason === "missing-rarity") noRarityCount += 1;
      if (result?.reason === "missing-settings") noSettingsCount += 1;
    }

    debugLog("Item directory styles pass complete", {
      appId: app?.id ?? null,
      tabName: app?.tabName ?? null,
      rowCount: rows.length,
      appliedCount,
      unresolvedCount,
      noRarityCount,
      noSettingsCount,
      spellStyleCount,
    });

    if (unresolvedCount > 0) {
      debugWarn("Item directory rows without resolvable Item document", {
        appId: app?.id ?? null,
        unresolvedCount,
      });
    }
  };

  const refreshAllKnownItemDirectories = () => {
    const roots = getKnownItemDirectoryRoots();
    if (!roots.length) {
      // Fallback for Foundry render timings where sidebar roots are not available yet.
      debugWarn("No known item directory roots found; using document fallback refresh");
      applyStylesToItemDirectoryRoot(document);
      return;
    }

    for (const root of roots) {
      applyStylesToItemDirectoryRoot(root.element, root.app);
    }
  };

  const directoryRefresh = createDebouncedRefreshRequester({
    execute: refreshAllKnownItemDirectories,
    label: "Item directory refresh",
    defaultDelayMs: REFRESH_DELAYS_MS.DIRECTORY_EVENT,
    log: debugLog,
  });

  const requestRefresh = (reason = "unspecified", delayMs = REFRESH_DELAYS_MS.DIRECTORY_EVENT) => {
    directoryRefresh.request(reason, delayMs);
  };

  const scheduleApply = (htmlOrElement, app) => {
    const root = resolveRootElement(htmlOrElement);
    debugLog("Item directory render scheduling styles", {
      appId: app?.id ?? null,
      tabName: app?.tabName ?? null,
      hasRoot: Boolean(root),
    });
    if (root) {
      runNowAndOnNextAnimationFrame(() => applyStylesToItemDirectoryRoot(root, app));
    }
    // Extra pass to catch delayed DOM injections in sidebar render cycle.
    setTimeout(
      () => requestRefresh("delayed-sidebar-dom-injection"),
      REFRESH_DELAYS_MS.SIDEBAR_DOM_INJECTION
    );
  };

  Hooks.on("renderItemDirectory", (app, html) => {
    scheduleApply(html, app);
  });

  Hooks.on("renderSidebarTab", (app, html) => {
    if (isItemsSidebarContext(app, html)) {
      scheduleApply(html, app);
      return;
    }

    // Limit fallback refreshes to moments where the Items tab is actually active.
    if (ui?.sidebar?.activeTab === "items") {
      requestRefresh("renderSidebarTab-active-items-fallback");
    }
  });

  Hooks.on("renderSidebar", () => {
    if (ui?.sidebar?.activeTab !== "items") return;
    requestRefresh("renderSidebar-active-items");
  });

  registerSettingChangeHooks((moduleOrSetting, maybeKey) => {
    if (!isModuleSettingChange(moduleOrSetting, maybeKey, moduleId)) return;
    if (isSettingsTransactionActive(moduleId)) return;

    raritySettingsCache.clear();
    debugLog("setting change matched module for item directory; cache cleared");
    requestRefresh("setting-change", REFRESH_DELAYS_MS.SETTINGS_CHANGE);
  });

  registerSettingsTransactionCompleteHook(moduleId, () => {
    raritySettingsCache.clear();
    requestRefresh("settings-transaction-complete", REFRESH_DELAYS_MS.SETTINGS_CHANGE);
  });

  Hooks.on("createItem", () => requestRefresh("createItem"));
  Hooks.on("updateItem", () => requestRefresh("updateItem"));
  Hooks.on("deleteItem", () => requestRefresh("deleteItem"));

  debugLog("Item directory rarity hooks registered");
  requestRefresh("initialization");
}
