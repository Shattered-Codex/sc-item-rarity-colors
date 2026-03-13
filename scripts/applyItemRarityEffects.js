import { applyRarityStyles, getItemRarity, removeRarityStyles } from "./itemRarityHelper.js";
import { getActiveSpellStyleForItem } from "./spellSchoolHelper.js";
import { buildRaritySettings } from "../core/settingsManager.js";
import { isModuleSettingChange, registerSettingChangeHooks } from "../core/settingChangeHelper.js";
import { debugLog, debugWarn } from "../core/debug.js";
import { getSheetType } from "./sheetDetectionHelper.js";
import { getItemSheetTextStyleStrategy } from "../sheets/itemSheetTextStrategies.js";
import { ensureRuntimeRarityStyles } from "../core/runtimeRarityStyles.js";
import { createDebouncedRefreshRequester, REFRESH_DELAYS_MS } from "../core/refreshScheduler.js";
import {
  isSettingsTransactionActive,
  registerSettingsTransactionCompleteHook,
} from "../core/settingsTransaction.js";

const SC_SIMPLE_SOCKETS_TIDY_DESCRIPTIONS_RENDERED_HOOK = "sc-simple-sockets.tidySocketDescriptionsRendered";

/**
 * Applies rarity-based visual effects to item sheets.
 *
 * @param {string} moduleId - The module's unique identifier.
 */
export function applyItemRarityEffects(moduleId) {
  ensureRuntimeRarityStyles(moduleId);
  function resolveSheetRootElement(app, html) {
    const candidates = [
      html,
      app?.element,
    ];

    for (const candidate of candidates) {
      if (!candidate) continue;

      const root = candidate?.jquery
        ? candidate[0]
        : (Array.isArray(candidate) ? candidate[0] : candidate);
      if (!root) continue;

      const sheetRoot = root.closest?.(".application.sheet.item");
      return sheetRoot || root;
    }

    return null;
  }

  /**
   * Apply rarity styles to a given item sheet.
   *
   * @param {Application} app - The rendered application instance.
   * @param {jQuery|HTMLElement} html - The rendered HTML element.
   */
  function applyStylesToSheet(app, html) {
    const item = app.document;
    if (!item || item.documentName !== "Item") return;
    const itemId = item.id ?? item._id ?? null;
    const itemName = item.name ?? "(unnamed item)";

    // Normalize rarity value (handles both new and legacy system fields)
    const rarity = getItemRarity(item);
    debugLog("Item sheet render detected", {
      itemId,
      itemName,
      sheetId: app?.id ?? null,
      rarity,
    });

    // Find the sheet root element
    const sheetEl = resolveSheetRootElement(app, html);
    if (!sheetEl) {
      debugWarn("Unable to resolve item sheet root element", { itemId, itemName, sheetId: app?.id ?? null });
      return;
    }
    const sheetType = getSheetType(app) || getSheetType(html);
    const textStyleStrategy = getItemSheetTextStyleStrategy(sheetType);
    const spellStyle = getActiveSpellStyleForItem(item, moduleId);
    if (spellStyle) {
      applyRarityStyles(sheetEl, spellStyle.settings, {
        textStyleStrategy,
        preview: true,
      });
      debugLog("Item sheet spell style applied", {
        itemId,
        itemName,
        sheetType,
        profileKey: spellStyle.profileKey,
        school: spellStyle.school,
        level: spellStyle.level,
        useLevelVariants: spellStyle.useLevelVariants,
      });
      return;
    }

    // If no rarity, remove all rarity styles and restore default
    if (!rarity) {
      removeRarityStyles(sheetEl, { textStyleStrategy });
      debugLog("Item sheet styles cleared (no rarity)", {
        itemId,
        itemName,
        sheetType,
        textStrategy: textStyleStrategy?.constructor?.name ?? null,
      });
    } else {
      // Retrieve rarity-specific settings (colors, gradients, etc.)
      const settings = buildRaritySettings(rarity);
      if (!settings) {
        debugWarn("Rarity settings not found for item sheet", { itemId, itemName, rarity });
        removeRarityStyles(sheetEl, { textStyleStrategy });
      } else {
        // Apply visual styles (border, glow, etc.)
        applyRarityStyles(sheetEl, settings, { textStyleStrategy, rarity });
        debugLog("Item sheet styles applied", {
          itemId,
          itemName,
          sheetType,
          rarity,
          textStrategy: textStyleStrategy?.constructor?.name ?? null,
          enableItemColor: settings.enableItemColor,
          gradientEnabled: settings.gradientEnabled,
          glowEnabled: settings.glowEnabled,
          enableTextColor: settings.enableTextColor,
        });
      }
    }

  }

  /**
   * Refresh all open item sheets to reapply rarity styles.
   * Useful after settings change or system updates.
   */
  function refreshAllItemSheets() {
    let refreshedCount = 0;
    for (const app of Object.values(ui.windows)) {
      if (app.document?.documentName === "Item") {
        applyStylesToSheet(app, app.element);
        refreshedCount += 1;
      }
    }
    debugLog("Refreshed all open item sheets", { refreshedCount });
  }

  const itemSheetRefresh = createDebouncedRefreshRequester({
    execute: refreshAllItemSheets,
    label: "Item sheet refresh",
    defaultDelayMs: REFRESH_DELAYS_MS.SETTINGS_CHANGE,
    log: debugLog,
  });

  /**
   * Refresh only open sheets for a specific item document.
   * Falls back to full refresh if document id is unavailable.
   */
  function refreshOpenSheetsForItem(itemDocument) {
    const itemId = itemDocument?.id ?? itemDocument?._id;
    if (!itemId) {
      debugWarn("updateItem without item id, falling back to full item sheet refresh");
      refreshAllItemSheets();
      return;
    }
    refreshOpenSheetsForItemId(itemId);
  }

  function refreshOpenSheetsForItemId(itemId) {
    let refreshedCount = 0;
    for (const app of Object.values(ui.windows)) {
      if (app.document?.documentName !== "Item") continue;
      if (app.document.id !== itemId) continue;
      applyStylesToSheet(app, app.element);
      refreshedCount += 1;
    }
    debugLog("Refreshed open item sheets for updated item", { itemId, refreshedCount });
  }

  // Hook registrations
  Hooks.on("renderItemSheet", applyStylesToSheet);
  Hooks.on("renderItemSheet5e", applyStylesToSheet);
  Hooks.on("renderItemSheetV2", applyStylesToSheet);
  Hooks.on("renderItemSheet5e2", applyStylesToSheet);

  registerSettingChangeHooks((moduleOrSetting, maybeKey) => {
    if (!isModuleSettingChange(moduleOrSetting, maybeKey, moduleId)) return;
    if (isSettingsTransactionActive(moduleId)) return;
    debugLog("setting change matched module for item sheets; queued refresh");
    itemSheetRefresh.request("setting-change");
  });

  registerSettingsTransactionCompleteHook(moduleId, () => {
    itemSheetRefresh.request("settings-transaction-complete");
  });

  Hooks.on("updateItem", (itemDocument) => {
    debugLog("updateItem hook received for item sheet effects", {
      itemId: itemDocument?.id ?? itemDocument?._id ?? null,
      itemName: itemDocument?.name ?? null,
    });
    refreshOpenSheetsForItem(itemDocument);
  });

  Hooks.on(SC_SIMPLE_SOCKETS_TIDY_DESCRIPTIONS_RENDERED_HOOK, (payload = {}) => {
    const app = payload?.app;
    if (app?.document?.documentName === "Item") {
      debugLog("Received sc-simple-sockets tidy socket descriptions render hook (app payload)", {
        itemId: app.document?.id ?? null,
        appId: app?.id ?? null,
      });
      applyStylesToSheet(app, app.element ?? payload?.section ?? payload?.root ?? null);
      return;
    }

    const itemId = payload?.item?.id ?? payload?.item?._id ?? null;
    if (!itemId) return;

    debugLog("Received sc-simple-sockets tidy socket descriptions render hook (item payload)", {
      itemId,
    });
    refreshOpenSheetsForItemId(itemId);
  });

  debugLog("Item sheet rarity hooks registered");
}
