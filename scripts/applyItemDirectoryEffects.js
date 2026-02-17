/**
 * Foundry Item Directory Effects
 * Applies rarity-based visual effects to item rows in the world Items sidebar tab.
 */

import { normalizeRarity } from "./itemRarityHelper.js";
import { buildRaritySettings } from "../core/settingsManager.js";

const DIRECTORY_ROW_SELECTOR = ".directory-item.entry.document.item, .directory-item.document.item, .directory-item.item";
const RARITY_CLASS_PREFIX = "scirc-rarity-";
const DIRECTORY_STATE_CLASSES = ["scirc-dir-gradient-enabled", "scirc-dir-text-enabled"];

function getItemIdFromElement(element) {
  const fromDataset = element?.dataset?.documentId
    || element?.dataset?.entryId
    || element?.dataset?.itemId
    || element?.dataset?.id;
  if (fromDataset) return fromDataset;

  const fromAttributes = element?.getAttribute?.("data-document-id")
    || element?.getAttribute?.("data-entry-id")
    || element?.getAttribute?.("data-item-id");
  if (fromAttributes) return fromAttributes;

  const rawHtml = element?.outerHTML || "";
  const match = rawHtml.match(/data-(?:document-id|entry-id|item-id)="(.*?)"/i);
  return match?.[1] || null;
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

function toRarityClassKey(rarity) {
  return String(rarity || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function clearRowVisuals(rowElement) {
  if (!rowElement) return;

  DIRECTORY_STATE_CLASSES.forEach((stateClass) => rowElement.classList.remove(stateClass));
  for (const className of [...rowElement.classList]) {
    if (className.startsWith(RARITY_CLASS_PREFIX)) {
      rowElement.classList.remove(className);
    }
  }

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
  const raritySettingsCache = new Map();

  const getCachedRaritySettings = (rarity) => {
    if (!rarity) return null;
    if (raritySettingsCache.has(rarity)) return raritySettingsCache.get(rarity);
    const settings = buildRaritySettings(rarity);
    raritySettingsCache.set(rarity, settings);
    return settings;
  };

  const applyStylesToDirectoryRow = (item, rowElement) => {
    if (!rowElement) return;

    clearRowVisuals(rowElement);

    const rawRarity = item?.system?.rarity?.value
      ?? item?.system?.rarity
      ?? item?.system?.details?.rarity
      ?? item?.rarity;
    const rarity = normalizeRarity(rawRarity);
    if (!rarity) return;

    const settings = getCachedRaritySettings(rarity);
    if (!settings) return;

    const rarityClassKey = toRarityClassKey(rarity);
    if (rarityClassKey) {
      rowElement.classList.add(`${RARITY_CLASS_PREFIX}${rarityClassKey}`);
    }

    const primaryColor = settings.backgroundColor || "#ffffff";
    const secondaryColor = settings.gradientEnabled && settings.gradientColor && settings.gradientColor !== "#ffffff"
      ? settings.gradientColor
      : "#252830";

    rowElement.style.setProperty("--scirc-dir-bg-primary", primaryColor);
    rowElement.style.setProperty("--scirc-dir-bg-secondary", secondaryColor);
    rowElement.style.setProperty("--scirc-dir-bg-fallback", "#252830");

    if (settings.enableFoundryInterfaceGradientEffects && settings.enableItemColor) {
      rowElement.classList.add("scirc-dir-gradient-enabled");
      rowElement.style.background = `linear-gradient(100deg, #252830 0%, #252830 46%, ${primaryColor} 72%, ${secondaryColor} 100%)`;
    }

    if (settings.enableFoundryInterfaceTextColor && settings.foundryInterfaceTextColor) {
      rowElement.style.setProperty("--scirc-dir-text-color", settings.foundryInterfaceTextColor);
      rowElement.classList.add("scirc-dir-text-enabled");
      rowElement
        .querySelectorAll(".entry-name, .entry-name a, .document-name, .document-name a")
        .forEach((el) => {
          el.style.color = settings.foundryInterfaceTextColor;
          el.style.textShadow = "none";
        });
    }
  };

  const applyStylesToItemDirectoryRoot = (rootElement, app = null) => {
    const rows = getRowsFromRoot(rootElement);
    if (!rows.length) return;

    for (const rowElement of rows) {
      const item = resolveItemForRow(rowElement, app);
      if (!item) {
        clearRowVisuals(rowElement);
        continue;
      }
      applyStylesToDirectoryRow(item, rowElement);
    }
  };

  const refreshAllKnownItemDirectories = () => {
    const roots = getKnownItemDirectoryRoots();
    if (!roots.length) {
      // Fallback for Foundry render timings where sidebar roots are not available yet.
      applyStylesToItemDirectoryRoot(document);
      return;
    }

    for (const root of roots) {
      applyStylesToItemDirectoryRoot(root.element, root.app);
    }
  };

  let refreshTimer = null;
  const requestRefresh = () => {
    if (refreshTimer) clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => {
      refreshAllKnownItemDirectories();
      refreshTimer = null;
    }, 30);
  };

  const scheduleApply = (htmlOrElement, app) => {
    const root = resolveRootElement(htmlOrElement);
    if (root) {
      applyStylesToItemDirectoryRoot(root, app);
      requestAnimationFrame(() => applyStylesToItemDirectoryRoot(root, app));
    }
    // Extra pass to catch delayed DOM injections in sidebar render cycle.
    setTimeout(() => requestRefresh(), 80);
  };

  Hooks.on("renderItemDirectory", (app, html) => {
    scheduleApply(html, app);
  });

  Hooks.on("renderSidebarTab", (app, html) => {
    if (isItemsSidebarContext(app, html)) {
      scheduleApply(html, app);
      return;
    }
    // If context can't be reliably identified, do a debounced global refresh.
    requestRefresh();
  });

  Hooks.on("renderSidebar", () => {
    if (ui?.sidebar?.activeTab !== "items") return;
    requestRefresh();
  });

  Hooks.on("setSetting", (moduleOrSetting, maybeKey) => {
    const moduleMatch = moduleOrSetting === moduleId;
    const fullKey = typeof moduleOrSetting === "string"
      ? (moduleOrSetting.includes(".") ? moduleOrSetting : `${moduleOrSetting}.${maybeKey ?? ""}`)
      : moduleOrSetting?.key;
    const keyMatch = typeof fullKey === "string" && fullKey.startsWith(`${moduleId}.`);
    if (!moduleMatch && !keyMatch) return;

    raritySettingsCache.clear();
    requestRefresh();
  });

  Hooks.on("createItem", requestRefresh);
  Hooks.on("updateItem", requestRefresh);
  Hooks.on("deleteItem", requestRefresh);

  requestRefresh();
}
