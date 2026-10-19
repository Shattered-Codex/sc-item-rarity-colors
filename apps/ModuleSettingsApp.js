import { MODULE_ID } from "../core/constants.js";
import {
  applyMergedRarityConfigToDnd5e,
  getFallbackRarityEntries,
  getMergedRarityEntries,
  isModuleRarityListEnabled,
  normalizeRarityKey,
  sanitizeRarityEntries,
  saveModuleRarityEntries,
  syncEntriesToCustomDnd5e,
} from "../core/rarityListConfig.js";
import { runSettingsTransaction } from "../core/settingsTransaction.js";
import { ModuleSettingsCatalog, SECTION_KINDS, SETTINGS_ACTIONS } from "../settings/ModuleSettingsCatalog.js";
import { ensureRaritySettingsRegistered } from "../settings/settingsRegistration.js";
import { TidyRaritySync } from "../settings/TidyRaritySync.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

const FORM_ID = `${MODULE_ID}-module-settings`;

/**
 * The module's configuration window: an icon rail on the left, one scrollable
 * panel per section, and a footer carrying an unsaved-changes pill next to the
 * actions.
 *
 * The Rarity list tab edits the list in place. Its rows are built here rather
 * than in the template so the initial render, "Add rarity", and "Reset
 * defaults" all produce identical markup.
 *
 * Saving keeps the window open, so the confirmation stays visible and a GM can
 * keep adjusting other tabs.
 */
export class ModuleSettingsApp extends HandlebarsApplicationMixin(ApplicationV2) {
  #root = null;
  #activeTab = null;
  #baselines = {};
  #saved = false;
  #rarityList = { enabled: true, entries: [] };
  #draggedRow = null;

  static DEFAULT_OPTIONS = {
    id: FORM_ID,
    classes: ["scirc-config-theme"],
    tag: "form",
    position: {
      width: 820,
      height: 600,
    },
    window: {
      contentClasses: ["scirc-config-theme"],
      icon: "fas fa-sliders",
      resizable: true,
      title: "Item Rarity Colors — Settings",
    },
  };

  static PARTS = {
    body: {
      template: `modules/${MODULE_ID}/templates/module-settings.html`,
    },
  };

  static open(options = {}) {
    const app = new ModuleSettingsApp(options);
    app.render(true);
    return app;
  }

  async _prepareContext() {
    if (this.#isGM()) {
      this.#rarityList = {
        enabled: isModuleRarityListEnabled(MODULE_ID) !== false,
        entries: sanitizeRarityEntries(getMergedRarityEntries(MODULE_ID, { includeHidden: true })),
      };
    }

    const context = ModuleSettingsCatalog.buildContext({
      isGM: this.#isGM(),
      readSetting: (key) => ModuleSettingsApp.#readSetting(key),
      actionState: (actionId) => ModuleSettingsApp.#actionState(actionId),
      activeTab: this.#activeTab,
      formId: FORM_ID,
    });
    context.rarityListEnabled = this.#rarityList.enabled;
    return context;
  }

  async _onRender(context, options) {
    await super._onRender(context, options);

    // The form element survives re-renders, so listeners are bound only once.
    if (this.#root !== this.element) {
      this.#root = this.element;
      this.#root.addEventListener("click", (event) => this.#handleClick(event));
      this.#root.addEventListener("input", () => this.#refreshDirtyUI());
      this.#root.addEventListener("change", () => this.#refreshDirtyUI());
      this.#root.addEventListener("keydown", (event) => this.#handleTabKeydown(event));
      // A form tag without a submit handler would reload the page on Enter.
      this.#root.addEventListener("submit", (event) => event.preventDefault());
      this.#bindRarityDragAndDrop(this.#root);
    }

    this.#activeTab = context?.activeTab ?? this.#activeTab;
    this.#renderRarityRows(this.#rarityList.entries);
    this.#captureBaselines();
    this.#saved = false;
    this.#syncResetButton();
    this.#refreshDirtyUI();
  }

  _onClose(options) {
    this.#root = null;
    super._onClose?.(options);
  }

  // ---------------------------------------------------------------------------
  // Tabs
  // ---------------------------------------------------------------------------

  selectTab(tabId) {
    const resolved = ModuleSettingsCatalog.resolveTab(tabId, this.#isGM());
    if (!resolved || resolved !== tabId) return;
    this.#activeTab = resolved;

    const root = this.#root;
    if (!root) return;

    for (const button of root.querySelectorAll("[data-tab-target]")) {
      const active = button.dataset.tabTarget === resolved;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-selected", active ? "true" : "false");
      button.setAttribute("tabindex", active ? "0" : "-1");
    }
    for (const panel of root.querySelectorAll("[data-tab-panel]")) {
      panel.hidden = panel.dataset.tabPanel !== resolved;
    }
    this.#syncResetButton();
  }

  #handleTabKeydown(event) {
    const tab = event.target instanceof HTMLElement ? event.target.closest('[role="tab"]') : null;
    const tablist = tab?.closest?.('[role="tablist"]');
    if (!tab || !tablist) return;

    const tabs = Array.from(tablist.querySelectorAll('[role="tab"]:not([disabled])'));
    const index = tabs.indexOf(tab);
    if (index < 0) return;

    let nextIndex = null;
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        nextIndex = (index + 1) % tabs.length;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        nextIndex = (index - 1 + tabs.length) % tabs.length;
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = tabs.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    const next = tabs[nextIndex];
    next?.focus?.();
    next?.click?.();
  }

  #syncResetButton() {
    const reset = this.#root?.querySelector?.('[data-action="resetActiveTab"]');
    if (reset) reset.hidden = !ModuleSettingsCatalog.isResettable(this.#activeTab);
  }

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  #handleClick(event) {
    const target = event.target instanceof Element ? event.target.closest("[data-action]") : null;
    if (!(target instanceof HTMLElement)) return;

    switch (target.dataset.action) {
      case "switchTab":
        event.preventDefault();
        this.selectTab(target.dataset.tabTarget);
        break;
      case "runAction":
        event.preventDefault();
        void this.#runAction(target.dataset.actionId);
        break;
      case "addRarity":
        event.preventDefault();
        this.#addRarityRow();
        break;
      case "removeRarity":
        event.preventDefault();
        target.closest("[data-rarity-row]")?.remove();
        this.#refreshDirtyUI();
        break;
      case "resetActiveTab":
        event.preventDefault();
        this.resetActiveTab();
        break;
      case "save":
        event.preventDefault();
        void this.#save();
        break;
      case "close":
        event.preventDefault();
        void this.close();
        break;
      default:
        break;
    }
  }

  async #runAction(actionId) {
    if (actionId === SETTINGS_ACTIONS.SYNC_TIDY) await TidyRaritySync.run();
  }

  /**
   * Restores the visible tab to its defaults. Nothing is written until the
   * user saves, so a reset stays cancellable.
   */
  resetActiveTab() {
    const panel = this.#root?.querySelector?.(`[data-tab-panel="${this.#activeTab}"]`);
    if (!panel) return;

    if (ModuleSettingsCatalog.kind(this.#activeTab) === SECTION_KINDS.RARITY_LIST) {
      const enabled = panel.querySelector("[data-rarity-enabled]");
      if (enabled) enabled.checked = true;
      this.#renderRarityRows(sanitizeRarityEntries(getFallbackRarityEntries()));
    } else {
      for (const input of panel.querySelectorAll("input[type='checkbox'][data-default-checked]")) {
        input.checked = input.dataset.defaultChecked === "true";
      }
    }
    this.#refreshDirtyUI();
  }

  async #save() {
    const isGM = this.#isGM();
    const rarityDirty = isGM && this.#isTabDirty("rarities", this.#readForm());

    if (rarityDirty && !this.#validateRarityKeys()) {
      ui.notifications?.warn?.("Fix the highlighted rarity keys before saving: each rarity needs a unique key.");
      this.selectTab("rarities");
      return;
    }

    try {
      for (const { key, value } of ModuleSettingsCatalog.collectWrites(this.#readForm(), { isGM })) {
        if (ModuleSettingsApp.#readSetting(key) === value) continue;
        await game.settings.set(MODULE_ID, key, value);
      }
      if (rarityDirty) await this.#saveRarityList();
    } catch (error) {
      ui.notifications?.error?.(`Could not save settings: ${error?.message ?? String(error)}`);
      return;
    }

    this.#captureBaselines();
    this.#saved = true;
    this.#refreshDirtyUI();
  }

  async #saveRarityList() {
    const { enabled, rows } = this.#readRarityList();
    const entries = sanitizeRarityEntries(rows);

    for (const entry of entries) {
      ensureRaritySettingsRegistered(MODULE_ID, entry.key, entry.label);
    }

    await runSettingsTransaction(MODULE_ID, async () => {
      await saveModuleRarityEntries(MODULE_ID, entries, enabled);
    }, {
      source: "module-settings-app",
      entryCount: entries.length,
    });
    await syncEntriesToCustomDnd5e(entries);
    applyMergedRarityConfigToDnd5e(MODULE_ID);

    // Show what was stored (normalized keys, filled-in labels), so the
    // baseline taken after saving matches the saved list.
    this.#rarityList = { enabled, entries };
    this.#renderRarityRows(entries);
  }

  // ---------------------------------------------------------------------------
  // Rarity list editor
  // ---------------------------------------------------------------------------

  #renderRarityRows(entries) {
    const list = this.#root?.querySelector?.("[data-rarity-list]");
    if (!list) return;
    list.replaceChildren(...entries.map((entry) => this.#buildRarityRow(entry)));
    this.#validateRarityKeys();
  }

  #addRarityRow() {
    const list = this.#root?.querySelector?.("[data-rarity-list]");
    if (!list) return;
    const row = this.#buildRarityRow({ key: "", label: "", visible: true, system: false });
    list.append(row);
    row.scrollIntoView?.({ block: "nearest" });
    row.querySelector('[data-rarity-field="key"]')?.focus?.();
    this.#refreshDirtyUI();
  }

  #buildRarityRow({ key, label, visible, system }) {
    const escape = foundry.utils.escapeHTML;
    const row = document.createElement("li");
    row.className = "scirc-rarity-row";
    row.dataset.rarityRow = "";
    row.dataset.system = system ? "true" : "false";
    row.innerHTML = `
      <span class="scirc-rarity-row__grip" draggable="true" data-tooltip="Drag to reorder" aria-hidden="true">
        <i class="fas fa-grip-vertical"></i>
      </span>
      <label class="scirc-check" data-tooltip="Visible">
        <input type="checkbox" data-rarity-field="visible" aria-label="Visible" ${visible ? "checked" : ""} />
        <span class="scirc-check__box"><i class="fas fa-check" aria-hidden="true"></i></span>
      </label>
      <input type="text"
             class="scirc-input"
             data-rarity-field="key"
             value="${escape(key)}"
             placeholder="e.g. mythic"
             aria-label="Key"
             autocomplete="off"
             ${system ? 'disabled data-tooltip="System rarities keep their key."' : ""} />
      <input type="text"
             class="scirc-input"
             data-rarity-field="label"
             value="${escape(label)}"
             placeholder="e.g. Mythic"
             aria-label="Label"
             autocomplete="off" />
      <button type="button"
              class="scirc-icon-btn scirc-icon-btn--danger"
              data-action="removeRarity"
              aria-label="Remove rarity"
              data-tooltip="${system ? "System rarities cannot be removed; hide them instead." : "Remove rarity"}"
              ${system ? "disabled" : ""}>
        <i class="fas fa-trash-can" aria-hidden="true"></i>
      </button>
    `;
    return row;
  }

  /** The editor's rows as typed, in display order. Blank new rows are ignored. */
  #readRarityList() {
    const root = this.#root;
    const enabledInput = root?.querySelector?.("[data-rarity-enabled]");
    const rows = [];
    for (const row of root?.querySelectorAll?.("[data-rarity-row]") ?? []) {
      const key = String(row.querySelector('[data-rarity-field="key"]')?.value ?? "").trim();
      const label = String(row.querySelector('[data-rarity-field="label"]')?.value ?? "").trim();
      if (!key && !label) continue;
      rows.push({
        key,
        label,
        visible: row.querySelector('[data-rarity-field="visible"]')?.checked !== false,
        system: row.dataset.system === "true",
      });
    }
    return { enabled: enabledInput ? enabledInput.checked : this.#rarityList.enabled, rows };
  }

  /** Flags rows whose key is missing or repeats an earlier one. */
  #validateRarityKeys() {
    const seen = new Set();
    let valid = true;
    for (const row of this.#root?.querySelectorAll?.("[data-rarity-row]") ?? []) {
      const keyInput = row.querySelector('[data-rarity-field="key"]');
      const label = String(row.querySelector('[data-rarity-field="label"]')?.value ?? "").trim();
      const raw = String(keyInput?.value ?? "").trim();
      const key = normalizeRarityKey(raw);
      const blank = !raw && !label;
      const invalid = !blank && (!key || seen.has(key));
      if (key) seen.add(key);
      keyInput?.classList.toggle("is-invalid", invalid);
      if (invalid) valid = false;
    }
    return valid;
  }

  #bindRarityDragAndDrop(root) {
    const clearIndicators = () => {
      for (const el of root.querySelectorAll(".is-drop-before, .is-drop-after, .is-dragging")) {
        el.classList.remove("is-drop-before", "is-drop-after", "is-dragging");
      }
    };
    const placement = (row, event) => {
      const rect = row.getBoundingClientRect();
      return event.clientY > rect.top + rect.height / 2 ? "after" : "before";
    };

    root.addEventListener("dragstart", (event) => {
      const grip = event.target instanceof Element ? event.target.closest(".scirc-rarity-row__grip") : null;
      if (!grip) return;
      this.#draggedRow = grip.closest("[data-rarity-row]");
      this.#draggedRow?.classList.add("is-dragging");
      if (event.dataTransfer && this.#draggedRow) {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setDragImage?.(this.#draggedRow, 16, 16);
        event.dataTransfer.setData("text/plain", "");
      }
    });

    root.addEventListener("dragover", (event) => {
      const row = event.target instanceof Element ? event.target.closest("[data-rarity-row]") : null;
      if (!row || !this.#draggedRow || row === this.#draggedRow) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
      for (const el of root.querySelectorAll(".is-drop-before, .is-drop-after")) {
        el.classList.remove("is-drop-before", "is-drop-after");
      }
      row.classList.add(placement(row, event) === "after" ? "is-drop-after" : "is-drop-before");
    });

    root.addEventListener("drop", (event) => {
      const row = event.target instanceof Element ? event.target.closest("[data-rarity-row]") : null;
      const dragged = this.#draggedRow;
      if (!row || !dragged || row === dragged) return;
      event.preventDefault();
      if (placement(row, event) === "after") row.after(dragged);
      else row.before(dragged);
      clearIndicators();
      this.#draggedRow = null;
      this.#refreshDirtyUI();
    });

    root.addEventListener("dragend", () => {
      this.#draggedRow = null;
      clearIndicators();
    });
  }

  // ---------------------------------------------------------------------------
  // Dirty tracking
  // ---------------------------------------------------------------------------

  #readForm() {
    const values = {};
    for (const field of ModuleSettingsCatalog.fields()) {
      const control = this.#root?.querySelector?.(`[name="${field.key}"]`);
      if (control) values[field.key] = control.checked;
    }
    return values;
  }

  #snapshot(tabId, values) {
    return ModuleSettingsCatalog.snapshot(tabId, values, {
      rarityListSnapshot: JSON.stringify(this.#readRarityList()),
    });
  }

  #isTabDirty(tabId, values) {
    return this.#snapshot(tabId, values) !== this.#baselines[tabId];
  }

  #captureBaselines() {
    const values = this.#readForm();
    this.#baselines = {};
    for (const tabId of ModuleSettingsCatalog.tabIds(this.#isGM())) {
      this.#baselines[tabId] = this.#snapshot(tabId, values);
    }
  }

  #refreshDirtyUI() {
    const root = this.#root;
    if (!root) return;

    this.#validateRarityKeys();

    const values = this.#readForm();
    let anyDirty = false;
    for (const tabId of ModuleSettingsCatalog.tabIds(this.#isGM())) {
      const dirty = this.#isTabDirty(tabId, values);
      anyDirty ||= dirty;
      const dot = root.querySelector(`[data-tab-dot="${tabId}"]`);
      if (dot) dot.hidden = !dirty;
    }
    if (anyDirty) this.#saved = false;

    root.querySelector("[data-save-button]")?.classList?.toggle("is-dirty", anyDirty);

    const pill = root.querySelector("[data-status-pill]");
    const label = root.querySelector("[data-status-pill-label]");
    if (!pill || !label) return;

    pill.classList.remove("scirc-config-pill--unsaved", "scirc-config-pill--saved");
    if (anyDirty) {
      pill.hidden = false;
      pill.classList.add("scirc-config-pill--unsaved");
      label.textContent = "Unsaved changes";
    } else if (this.#saved) {
      pill.hidden = false;
      pill.classList.add("scirc-config-pill--saved");
      label.textContent = "Saved";
    } else {
      pill.hidden = true;
      label.textContent = "";
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  #isGM() {
    return game?.user?.isGM === true;
  }

  static #actionState(actionId) {
    if (actionId !== SETTINGS_ACTIONS.SYNC_TIDY) return {};

    if (TidyRaritySync.isTidyActive()) {
      return { status: "Tidy 5e active", statusTone: "success" };
    }
    return {
      disabled: true,
      status: TidyRaritySync.isTidyInstalled() ? "Tidy 5e inactive" : "Tidy 5e not installed",
      statusTone: "muted",
    };
  }

  static #readSetting(key) {
    try {
      if (!game?.settings?.settings?.has?.(`${MODULE_ID}.${key}`)) return undefined;
      return game.settings.get(MODULE_ID, key);
    } catch {
      return undefined;
    }
  }
}
