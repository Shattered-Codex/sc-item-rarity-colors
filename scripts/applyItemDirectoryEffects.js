/**
 * Foundry Item Directory Effects
 * Applies rarity-based visual effects to item rows in the world Items sidebar and item compendium listings.
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

const DIRECTORY_ROW_SELECTOR = ".directory-item.entry.document, .directory-item.document, .directory-item";
const ITEM_DOCUMENT_ROW_SELECTOR = ".directory-item.entry.document.item, .directory-item.document.item, .directory-item.item";
const DIRECTORY_STATE_CLASSES = ["scirc-dir-gradient-enabled", "scirc-dir-text-enabled"];
const LIVE_DIRECTORY_ROOT_SELECTOR = [
  ".application.directory.compendium-directory",
  ".application.directory.sidebar-popout",
  ".sidebar-popout.directory",
  "#sidebar .sidebar-tab.directory[data-tab=\"items\"]",
  "#sidebar .tab.directory[data-tab=\"items\"]",
].join(", ");
const COMPENDIUM_INDEX_FIELDS = [
  "type",
  "system.rarity",
  "system.details.rarity",
  "system.school",
  "system.level",
  "system.details.level",
];

function getCompendiumApplicationClass() {
  return foundry?.applications?.sidebar?.apps?.Compendium ?? null;
}

function getCollectionDocumentName(collection) {
  return collection?.documentName
    || collection?.documentClass?.documentName
    || collection?.metadata?.type
    || collection?.metadata?.documentName
    || null;
}

function isItemCollection(collection) {
  return getCollectionDocumentName(collection) === "Item";
}

function isItemCompendiumApp(app) {
  const CompendiumApplication = getCompendiumApplicationClass();
  const isCompendiumInstance = CompendiumApplication ? app instanceof CompendiumApplication : false;
  if (!isCompendiumInstance) return false;
  return isItemCollection(app?.collection);
}

function isItemDirectoryApp(app) {
  if (!app) return false;
  if (isItemCompendiumApp(app)) return true;
  if (app?.tabName === "items") return true;
  if (app?.documentName === "Item") return true;
  if (app?.documentClass?.documentName === "Item") return true;
  if (isItemCollection(app?.collection)) return true;
  if (isItemCollection(app?.documents)) return true;
  const root = resolveRootElement(app?.element);
  if (isItemDirectoryRoot(root)) return true;
  return false;
}

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

function getItemUuidFromElement(element) {
  return element?.dataset?.uuid
    || element?.dataset?.documentUuid
    || element?.dataset?.entryUuid
    || element?.getAttribute?.("data-uuid")
    || element?.getAttribute?.("data-document-uuid")
    || element?.getAttribute?.("data-entry-uuid")
    || null;
}

function getObjectValueByPath(object, path) {
  if (!object || typeof object !== "object" || !path) return undefined;

  const nestedValue = String(path)
    .split(".")
    .reduce((value, key) => (value && typeof value === "object" ? value[key] : undefined), object);
  return nestedValue !== undefined ? nestedValue : object[path];
}

function buildCompendiumIndexItemLike(entry, rowElement = null) {
  if (!entry || typeof entry !== "object") return null;

  const rawRarity = getObjectValueByPath(entry, "system.rarity");
  const rawRarityValue = getObjectValueByPath(entry, "system.rarity.value");
  const detailsRarity = getObjectValueByPath(entry, "system.details.rarity");
  const rawSchool = getObjectValueByPath(entry, "system.school");
  const rawSchoolValue = getObjectValueByPath(entry, "system.school.value");
  const rawLevel = getObjectValueByPath(entry, "system.level");
  const detailsLevel = getObjectValueByPath(entry, "system.details.level");
  const type = entry.type ?? null;

  const itemLike = {
    _id: entry._id ?? entry.id ?? getItemIdFromElement(rowElement) ?? null,
    id: entry._id ?? entry.id ?? getItemIdFromElement(rowElement) ?? null,
    uuid: entry.uuid ?? getItemUuidFromElement(rowElement) ?? null,
    type,
    system: {},
  };

  if (rawRarityValue !== undefined) {
    itemLike.system.rarity = { value: rawRarityValue };
  } else if (rawRarity !== undefined) {
    itemLike.system.rarity = rawRarity;
  }

  if (detailsRarity !== undefined) {
    itemLike.system.details = itemLike.system.details || {};
    itemLike.system.details.rarity = detailsRarity;
  }

  if (rawSchoolValue !== undefined) {
    itemLike.system.school = { value: rawSchoolValue };
  } else if (rawSchool !== undefined) {
    itemLike.system.school = rawSchool;
  }

  if (rawLevel !== undefined) {
    itemLike.system.level = rawLevel;
  }

  if (detailsLevel !== undefined) {
    itemLike.system.details = itemLike.system.details || {};
    itemLike.system.details.level = detailsLevel;
  }

  const hasRarityData = rawRarityValue !== undefined || rawRarity !== undefined || detailsRarity !== undefined;
  const hasSpellData = type === "spell" || rawSchoolValue !== undefined || rawSchool !== undefined || rawLevel !== undefined || detailsLevel !== undefined;
  if (!hasRarityData && !hasSpellData) return null;

  return itemLike;
}

function resolveItemFromCompendiumIndex(collection, rowElement) {
  if (!isItemCollection(collection) || !collection?.index?.get) return null;

  const itemId = getItemIdFromElement(rowElement);
  if (!itemId) return null;

  const entry = collection.index.get(itemId);
  if (!entry) return null;

  return buildCompendiumIndexItemLike(entry, rowElement);
}

function resolveItemFromCollection(collection, itemId) {
  if (!collection?.get || !itemId) return null;

  const entry = collection.get(itemId);
  if (!entry) return null;
  if (entry.documentName === "Item" && entry.system) return entry;
  if (entry.system) return entry;

  if (entry.uuid && typeof fromUuidSync === "function") {
    const resolved = fromUuidSync(entry.uuid);
    if (resolved?.documentName === "Item") return resolved;
  }

  return null;
}

async function resolveItemFromCollectionAsync(collection, itemId, uuid = null) {
  const syncResolved = resolveItemFromCollection(collection, itemId);
  if (syncResolved) return syncResolved;

  if (uuid && typeof fromUuid === "function") {
    const resolved = await fromUuid(uuid);
    if (resolved?.documentName === "Item") return resolved;
  }

  if (itemId && typeof collection?.getDocument === "function") {
    const resolved = await collection.getDocument(itemId);
    if (resolved?.documentName === "Item") return resolved;
  }

  if (collection?.index?.get && itemId) {
    const entry = collection.index.get(itemId);
    if (entry?.uuid && typeof fromUuid === "function") {
      const resolved = await fromUuid(entry.uuid);
      if (resolved?.documentName === "Item") return resolved;
    }
  }

  return null;
}

function resolveItemFromRow(app, rowElement) {
  const itemId = getItemIdFromElement(rowElement);
  if (!itemId) return null;

  const candidates = [
    game?.items,
    app?.collection,
    app?.collection?.index,
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

function isPreviewRoot(rootElement) {
  const root = resolveRootElement(rootElement);
  if (!root?.closest) return false;
  return Boolean(root.closest(".sc-item-rarity-colors__preview, .foundry-interface-preview"));
}

function isItemDirectoryRoot(rootElement) {
  const root = resolveRootElement(rootElement);
  if (!root?.querySelector) return false;
  if (isPreviewRoot(root)) return false;
  if (!root.querySelector(ITEM_DOCUMENT_ROW_SELECTOR)) return false;
  return Boolean(root.matches?.(LIVE_DIRECTORY_ROOT_SELECTOR));
}

function findItemDirectoryRoots(rootElement) {
  const root = resolveRootElement(rootElement);
  if (!root?.querySelectorAll) return [];

  const roots = [];
  if (isItemDirectoryRoot(root)) roots.push(root);

  root.querySelectorAll(LIVE_DIRECTORY_ROOT_SELECTOR).forEach((candidate) => {
    if (isItemDirectoryRoot(candidate)) roots.push(candidate);
  });

  return roots;
}

function getRowsFromRoot(rootElement) {
  const root = resolveRootElement(rootElement);
  if (!root?.querySelectorAll) return [];

  const rows = Array.from(root.querySelectorAll(DIRECTORY_ROW_SELECTOR));
  if (root.matches?.(DIRECTORY_ROW_SELECTOR)) rows.unshift(root);

  return rows.filter((row) => !row.classList.contains("folder"));
}

function resolveItemForRow(rowElement, app = null) {
  const indexedCompendiumItem = resolveItemFromCompendiumIndex(app?.collection, rowElement);
  if (indexedCompendiumItem) return indexedCompendiumItem;

  if (app?.collection || app?.documents) {
    const scoped = resolveItemFromRow(app, rowElement);
    if (scoped) return scoped;
  }

  const itemId = getItemIdFromElement(rowElement);
  if (itemId) {
    const direct = game?.items?.get?.(itemId);
    if (direct) return direct;
  }

  return resolveItemFromRow(app, rowElement);
}

function buildAsyncResolutionCacheKey(rowElement, app = null) {
  const uuid = getItemUuidFromElement(rowElement);
  if (uuid) return `uuid:${uuid}`;

  const itemId = getItemIdFromElement(rowElement);
  const packId = app?.collection?.metadata?.id
    || app?.collection?.collection
    || app?.collection?.identifier
    || app?.id
    || null;

  if (packId && itemId) return `pack:${packId}:${itemId}`;
  if (itemId) return `item:${itemId}`;
  return null;
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
    if (!isItemDirectoryApp(win)) continue;
    addRoot(win?.element, win);
  }

  for (const popout of Object.values(ui?.sidebar?.popouts ?? {})) {
    if (!isItemDirectoryApp(popout)) continue;
    addRoot(popout?.element, popout);
  }

  // Foundry v13: ApplicationV2 apps live in foundry.applications.instances, not ui.windows.
  // Without this, item compendia are found via DOM scan below with app=null, causing
  // item resolution to fail (no app.collection) and styles to be cleared on every refresh.
  if (foundry?.applications?.instances) {
    for (const app of foundry.applications.instances.values()) {
      if (!isItemDirectoryApp(app)) continue;
      addRoot(app?.element, app);
    }
  }

  if (document?.querySelectorAll) {
    document.querySelectorAll(LIVE_DIRECTORY_ROOT_SELECTOR).forEach((element) => {
      if (!isItemDirectoryRoot(element)) return;
      addRoot(element, null);
    });
  }

  return roots;
}

function isItemsSidebarContext(app, html) {
  if (isItemDirectoryApp(app)) return true;
  if (app?.tabName) return app.tabName === "items";
  if (app?.id === "items" || app?.options?.id === "items") return true;
  if (typeof app?.id === "string" && app.id.toLowerCase().includes("item")) return true;
  if (typeof app?.constructor?.name === "string" && app.constructor.name.toLowerCase().includes("item")) return true;

  const root = resolveRootElement(html);
  return isItemDirectoryRoot(root);
}

export function applyItemDirectoryEffects(moduleId) {
  ensureRuntimeRarityStyles(moduleId);
  const raritySettingsCache = new Map();
  const resolvedDocumentCache = new Map();
  const compendiumIndexLoadCache = new Map();
  const observedRoots = new WeakMap();

  const getCollectionCacheKey = (collection) => collection?.metadata?.id
    || collection?.collection
    || collection?.identifier
    || null;

  const ensureCompendiumIndexFieldsLoaded = async (collection) => {
    if (!isItemCollection(collection) || typeof collection?.getIndex !== "function") return;

    const cacheKey = getCollectionCacheKey(collection);
    const loadIndex = async () => {
      await collection.getIndex({ fields: COMPENDIUM_INDEX_FIELDS });
    };

    if (!cacheKey) {
      await loadIndex();
      return;
    }

    if (!compendiumIndexLoadCache.has(cacheKey)) {
      compendiumIndexLoadCache.set(
        cacheKey,
        loadIndex().catch((error) => {
          compendiumIndexLoadCache.delete(cacheKey);
          debugWarn("Failed to preload item compendium index fields", {
            cacheKey,
            message: error?.message ?? String(error),
          });
          throw error;
        })
      );
    }

    await compendiumIndexLoadCache.get(cacheKey);
  };

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

  const resolveItemForRowAsync = async (rowElement, app = null) => {
    const syncResolved = resolveItemForRow(rowElement, app);
    if (syncResolved?.system) return syncResolved;

    const cacheKey = buildAsyncResolutionCacheKey(rowElement, app);
    if (cacheKey && resolvedDocumentCache.has(cacheKey)) {
      return resolvedDocumentCache.get(cacheKey);
    }

    const itemId = getItemIdFromElement(rowElement);
    const uuid = getItemUuidFromElement(rowElement);

    const indexedCompendiumItem = resolveItemFromCompendiumIndex(app?.collection, rowElement);
    if (indexedCompendiumItem) {
      if (cacheKey) resolvedDocumentCache.set(cacheKey, indexedCompendiumItem);
      return indexedCompendiumItem;
    }

    const scopedCollections = [app?.collection, app?.documents, app?.collection?.index];

    for (const collection of scopedCollections) {
      const resolved = await resolveItemFromCollectionAsync(collection, itemId, uuid);
      if (!resolved) continue;
      if (cacheKey) resolvedDocumentCache.set(cacheKey, resolved);
      return resolved;
    }

    if (uuid && typeof fromUuid === "function") {
      const resolved = await fromUuid(uuid);
      if (resolved?.documentName === "Item") {
        if (cacheKey) resolvedDocumentCache.set(cacheKey, resolved);
        return resolved;
      }
    }

    if (itemId) {
      const direct = game?.items?.get?.(itemId);
      if (direct?.system) {
        if (cacheKey) resolvedDocumentCache.set(cacheKey, direct);
        return direct;
      }
    }

    return null;
  };

  const applyStylesToItemDirectoryRoot = async (rootElement, app = null) => {
    const rows = getRowsFromRoot(rootElement);
    if (!rows.length) return;

    try {
      await ensureCompendiumIndexFieldsLoaded(app?.collection);
    } catch (error) {
      debugWarn("Compendium index preload failed; falling back to document resolution", {
        appId: app?.id ?? null,
        message: error?.message ?? String(error),
      });
    }

    let appliedCount = 0;
    let unresolvedCount = 0;
    let noRarityCount = 0;
    let noSettingsCount = 0;
    let spellStyleCount = 0;

    const items = await Promise.all(rows.map((rowElement) => resolveItemForRowAsync(rowElement, app)));

    rows.forEach((rowElement, index) => {
      const item = items[index];
      if (!item) {
        clearRowVisuals(rowElement);
        unresolvedCount += 1;
        return;
      }
      const result = applyStylesToDirectoryRow(item, rowElement);
      if (result?.source === "spell-style") spellStyleCount += 1;
      if (result?.applied) {
        appliedCount += 1;
        return;
      }
      if (result?.reason === "missing-rarity") noRarityCount += 1;
      if (result?.reason === "missing-settings") noSettingsCount += 1;
    });

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

  const refreshAllKnownItemDirectories = async () => {
    const roots = getKnownItemDirectoryRoots();
    if (!roots.length) return;

    for (const root of roots) {
      await applyStylesToItemDirectoryRoot(root.element, root.app);
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

  const observeDirectoryRoot = (rootElement, app = null, { allowLooseRoot = false } = {}) => {
    const root = resolveRootElement(rootElement);
    const isObservableRoot = allowLooseRoot ? !isPreviewRoot(root) : isItemDirectoryRoot(root);
    if (!root || observedRoots.has(root) || typeof MutationObserver !== "function" || !isObservableRoot) return;

    const observer = new MutationObserver(() => {
      if (!root.isConnected) {
        observer.disconnect();
        observedRoots.delete(root);
        return;
      }
      requestRefresh("item-directory-mutation");
    });

    observer.observe(root, {
      childList: true,
      subtree: true,
    });

    observedRoots.set(root, observer);
  };

  const disconnectObservedRoots = (rootElement) => {
    const roots = [
      resolveRootElement(rootElement),
      ...findItemDirectoryRoots(rootElement),
    ].filter(Boolean);
    roots.forEach((root) => {
      const observer = observedRoots.get(root);
      if (!observer) return;
      observer.disconnect();
      observedRoots.delete(root);
    });
  };

  const scheduleApply = (htmlOrElement, app) => {
    const root = resolveRootElement(htmlOrElement);
    const directoryRoots = findItemDirectoryRoots(root);
    const shouldUseLooseCompendiumRoot = Boolean(
      root
      && !directoryRoots.length
      && (isItemCompendiumApp(app) || isItemCollection(app?.collection))
    );
    debugLog("Item directory render scheduling styles", {
      appId: app?.id ?? null,
      tabName: app?.tabName ?? null,
      hasRoot: Boolean(root),
      directoryRootCount: directoryRoots.length,
      looseCompendiumRoot: shouldUseLooseCompendiumRoot,
    });
    if (directoryRoots.length) {
      directoryRoots.forEach((directoryRoot) => {
        observeDirectoryRoot(directoryRoot, app);
        runNowAndOnNextAnimationFrame(() => void applyStylesToItemDirectoryRoot(directoryRoot, app));
      });
    } else if (shouldUseLooseCompendiumRoot) {
      observeDirectoryRoot(root, app, { allowLooseRoot: true });
      runNowAndOnNextAnimationFrame(() => void applyStylesToItemDirectoryRoot(root, app));
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

  Hooks.on("renderCompendium", (app, html) => {
    const isItemApp = isItemDirectoryApp(app) || isItemCollection(app?.collection);
    const root = resolveRootElement(html);
    if (!isItemApp && !isItemDirectoryRoot(root)) return;
    scheduleApply(html, app);
  });

  Hooks.on("renderApplicationV2", (app, element) => {
    // isItemCompendiumApp relies on foundry.applications.sidebar.apps.Compendium existing,
    // which may not be present in all Foundry versions. Fall back to isItemCollection on the
    // collection, which is the actual reliable signal that this is an item compendium.
    const isItemComp = isItemCompendiumApp(app) || isItemCollection(app?.collection);
    if (!isItemComp) return;
    scheduleApply(element, app);
    // Compendium item lists in Foundry v13 load asynchronously after the initial render hook.
    // Schedule a delayed refresh so styles are applied once items are in the DOM.
    requestRefresh("compendium-async-load", 500);
  });

  Hooks.on("closeApplicationV2", (app, element) => {
    if (!isItemCompendiumApp(app)) return;
    disconnectObservedRoots(element ?? app?.element ?? null);
  });

  Hooks.on("updateCompendium", (collection) => {
    if (!isItemCollection(collection)) return;

    const cacheKey = getCollectionCacheKey(collection);
    if (cacheKey) compendiumIndexLoadCache.delete(cacheKey);
    resolvedDocumentCache.clear();
    requestRefresh("updateCompendium");
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
    resolvedDocumentCache.clear();
    debugLog("setting change matched module for item directory; cache cleared");
    requestRefresh("setting-change", REFRESH_DELAYS_MS.SETTINGS_CHANGE);
  });

  registerSettingsTransactionCompleteHook(moduleId, () => {
    raritySettingsCache.clear();
    resolvedDocumentCache.clear();
    requestRefresh("settings-transaction-complete", REFRESH_DELAYS_MS.SETTINGS_CHANGE);
  });

  Hooks.on("createItem", () => {
    resolvedDocumentCache.clear();
    requestRefresh("createItem");
  });
  Hooks.on("updateItem", () => {
    resolvedDocumentCache.clear();
    requestRefresh("updateItem");
  });
  Hooks.on("deleteItem", () => {
    resolvedDocumentCache.clear();
    requestRefresh("deleteItem");
  });

  debugLog("Item directory rarity hooks registered");
  requestRefresh("initialization");
}
