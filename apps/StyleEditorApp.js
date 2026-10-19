import { MODULE_ID } from "../core/constants.js";
import { normalizeHexColor } from "../core/colorUtils.js";
import { normalizeSelectFieldValue } from "../core/rarityFieldSchema.js";
import { createAnimationFrameScheduler } from "../core/refreshScheduler.js";
import { updateMiniSheetPreview } from "../ui/previewUpdater.js";
import { updateColorPickerVisibility } from "../ui/visibilityManager.js";

const { ApplicationV2, HandlebarsApplicationMixin, DialogV2 } = foundry.applications.api;

const SECTION_ORDER = Object.freeze(["item-sheet", "actor-sheet", "foundry-interface"]);
const TIDY_MODULE_ID = "tidy5e-sheet";
const PREVIEW_VARIANTS = Object.freeze(["dnd5e", "tidy5e"]);
const PREVIEW_VARIANT_STORAGE_KEY = `${MODULE_ID}.previewVariant`;
// The preview is laid out at this width and zoomed to fit its column; below
// the minimum zoom it scrolls instead of becoming unreadable.
const PREVIEW_NATURAL_WIDTH = 660;
const PREVIEW_MIN_ZOOM = 0.55;
// Room kept around the window when it opens on a small screen.
const VIEWPORT_MARGIN = 48;

/**
 * Shared shell for the item rarity and spell school color editors: a rail of
 * entries (rarities or schools) on the left, a live preview, and a compact
 * form where each color sits on the same row as the checkbox that enables it.
 *
 * Saving keeps the window open so a GM can move on to the next entry; closing
 * with unsaved edits asks first.
 *
 * Subclasses own the drafts and implement the `_` hooks below.
 */
export class StyleEditorApp extends HandlebarsApplicationMixin(ApplicationV2) {
  #saved = false;
  #railScrollTop = 0;
  #previewVariant = null;
  #previewObserver = null;

  /** Section headings, keyed by field group. */
  static SECTION_TITLES = Object.freeze({
    "item-sheet": "Item sheet",
    "actor-sheet": "Inventory",
    "foundry-interface": "Sidebar",
  });

  /** Used in error messages, e.g. "item rarity settings". */
  static CONFIG_LABEL = "settings";

  /** Preview partials per sheet; the Tidy one is only offered while Tidy is active. */
  static PREVIEW_PARTIALS = Object.freeze({ dnd5e: "item-template", tidy5e: "tidy-item-template" });

  /** Spell profiles are not rarities, so the preview skips rarity capability checks. */
  static PREVIEW_IS_SPELL = false;

  static DEFAULT_OPTIONS = {
    classes: ["sc-item-rarity-colors", "scirc-config-theme", "scirc-style-editor-window"],
    tag: "form",
    form: {
      handler: StyleEditorApp.#onSubmit,
      closeOnSubmit: false,
      submitOnChange: false,
      submitOnClose: false,
    },
    position: {
      width: 1180,
      height: 800,
    },
    window: {
      contentClasses: ["scirc-config-theme"],
      resizable: true,
    },
    actions: {
      selectEntry: StyleEditorApp.#onSelectEntry,
      exportConfig: StyleEditorApp.#onExportConfig,
      importConfig: StyleEditorApp.#onImportConfig,
      closeEditor: StyleEditorApp.#onCloseEditor,
      setPreviewVariant: StyleEditorApp.#onSetPreviewVariant,
    },
  };

  static PARTS = {
    body: {
      template: `modules/${MODULE_ID}/templates/style-editor.html`,
    },
  };

  // ---------------------------------------------------------------------------
  // Subclass hooks
  // ---------------------------------------------------------------------------

  /** @returns {{key: string, label: string}[]} rail entries, in display order */
  _getEntries() { return []; }

  _getSelectedEntryKey() { return null; }

  _setSelectedEntryKey(_key) {}

  /**
   * @returns {object} entryTitle, entryHint, railTitle, themeOptions,
   *   themeTooltip, sections, and optionally levelControls
   */
  _prepareEditorContext() { return {}; }

  /** Copies the visible form values into the draft. */
  _captureDraft() {}

  _isEntryDirty(_key) { return false; }

  _hasUnsavedChanges() { return false; }

  /** Field values used to paint an entry's rail swatch. */
  _getEntryValues(_key) { return null; }

  /** The name prefix of the visible fields, which the preview reads. */
  _getPreviewKey() { return null; }

  _refreshSelectedThemeId() {}

  /** @returns {boolean} whether the preset changed the draft */
  _applyThemePreset(_themeId) { return false; }

  async _persist() {}

  async _exportConfig() {}

  async _importConfig() {}

  /** Change on a `[data-editor-control]` element (spell level controls). */
  async _onEditorControlChange(_target) {}

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  /** Opens no larger than the screen, so the footer and both columns show. */
  _initializeApplicationOptions(options) {
    const resolved = super._initializeApplicationOptions(options);
    const position = resolved.position ?? {};
    const viewportWidth = globalThis.innerWidth;
    const viewportHeight = globalThis.innerHeight;
    if (Number.isFinite(position.width) && viewportWidth) {
      position.width = Math.min(position.width, viewportWidth - VIEWPORT_MARGIN);
    }
    if (Number.isFinite(position.height) && viewportHeight) {
      position.height = Math.min(position.height, viewportHeight - VIEWPORT_MARGIN);
    }
    return resolved;
  }

  async _prepareContext() {
    const selected = this._getSelectedEntryKey();
    const entries = this._getEntries().map((entry) => ({
      key: entry.key,
      label: entry.label,
      active: entry.key === selected,
      dirty: this._isEntryDirty(entry.key),
      swatch: StyleEditorApp.swatchFor(this._getEntryValues(entry.key)),
    }));

    const partials = this.constructor.PREVIEW_PARTIALS;
    return {
      entries,
      ...this._prepareEditorContext(),
      previewPartial: partials.dnd5e,
      tidyPreviewPartial: StyleEditorApp.#isTidyActive() ? partials.tidy5e : null,
    };
  }

  async _onFirstRender(context, options) {
    await super._onFirstRender?.(context, options);

    // The form element survives re-renders, so delegated listeners are bound
    // once here; the color inputs are replaced on every render instead.
    this.element.addEventListener("change", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      if (target.matches('select[name="selected-theme"]')) {
        void this.#onThemeChange(target.value);
      } else if (target.matches("[data-editor-control]")) {
        this._captureDraft();
        this.#rememberRailScroll();
        void this._onEditorControlChange(target);
      } else if (target.matches('[data-field-group] :is(input[type="checkbox"], select)')) {
        this.#refresh();
      }
    });
  }

  async _onRender(context, options) {
    await super._onRender(context, options);

    const scheduler = createAnimationFrameScheduler(() => this.#refresh());
    this._bindColorControlInputs(this.element, () => scheduler.request());

    const rail = this.element.querySelector("[data-style-rail]");
    if (rail) rail.scrollTop = this.#railScrollTop;

    this.#prepareTidyPreview(context);
    this.#applyPreviewVariant();
    this.#refresh();
    this.#observePreview();
  }

  _onClose(options) {
    this.#previewObserver?.disconnect();
    this.#previewObserver = null;
    super._onClose?.(options);
  }

  async close(options = {}) {
    if (this.rendered && !options.discardChanges) {
      this._captureDraft();
      if (this._hasUnsavedChanges()) {
        const confirmed = await DialogV2.confirm({
          window: { title: "Discard unsaved changes?" },
          content: "<p>You have unsaved changes. Close without saving them?</p>",
          modal: true,
          rejectClose: false,
        });
        if (!confirmed) return this;
      }
    }
    return super.close(options);
  }

  /**
   * Builds the form rows: one row per checkbox, with the color it enables
   * placed inline, grouped into the sections the template renders.
   */
  _buildFieldSections(allFieldDefinitions, values, namePrefix) {
    // Fields tied to a module (the Tidy 5e area) only show while it is active;
    // their stored values are left untouched either way.
    const fieldDefinitions = allFieldDefinitions.filter((field) =>
      !field.requiresModule || game?.modules?.get?.(field.requiresModule)?.active === true
    );
    const keys = new Set(fieldDefinitions.map((field) => field.key));
    const inlineByHost = new Map();
    for (const field of fieldDefinitions) {
      if (field.inlineWith && keys.has(field.inlineWith)) inlineByHost.set(field.inlineWith, field);
    }

    const toContext = (field) => {
      const value = this._normalizeFieldValue(field, values?.[field.key]);
      return {
        name: `${namePrefix}-${field.key}`,
        label: field.uiLabel || field.label,
        type: field.type,
        isCheckbox: field.type === "checkbox",
        isSelect: field.type === "select",
        value,
        options: field.type === "select"
          ? Object.entries(field.choices ?? {}).map(([choice, label]) => ({ value: choice, label, selected: choice === value }))
          : null,
      };
    };

    const titles = this.constructor.SECTION_TITLES;
    return SECTION_ORDER.map((group) => ({
      id: group,
      title: titles[group] ?? group,
      rows: fieldDefinitions
        .filter((field) => (field.group || "item-sheet") === group)
        .filter((field) => !(field.inlineWith && keys.has(field.inlineWith)))
        .map((field) => ({
          nested: field.nested === true,
          hint: field.uiHint ?? "",
          field: toContext(field),
          inline: inlineByHost.has(field.key) ? toContext(inlineByHost.get(field.key)) : null,
        })),
    })).filter((section) => section.rows.length > 0);
  }

  _normalizeFieldValue(field, value) {
    if (field.type === "checkbox") {
      return value === true || value === "true" || value === "on" || value === 1 || value === "1";
    }
    if (field.type === "color") {
      return typeof value === "string" && value ? value : field.defaultValue;
    }
    if (field.type === "select") {
      return normalizeSelectFieldValue(field, value);
    }
    return value;
  }

  /** CSS background for a rail swatch, or null when no sheet color is set. */
  static swatchFor(values) {
    if (!values?.["enable-item-color"]) return null;
    const primary = values["item-color"];
    if (!primary) return null;
    const secondary = values["secondary-item-color"];
    return values["gradient-option"] && secondary
      ? `linear-gradient(135deg, ${primary}, ${secondary})`
      : primary;
  }

  _bindColorControlInputs(root, onValueChange) {
    for (const control of root.querySelectorAll(".sc-item-rarity-colors__color-control")) {
      const colorInput = control.querySelector('input[type="color"]');
      const hexInput = control.querySelector(".sc-item-rarity-colors__hex-input");
      if (!colorInput || !hexInput) continue;

      const syncHexFromColor = () => {
        hexInput.value = normalizeHexColor(colorInput.value) || "#000000";
        hexInput.classList.remove("is-invalid");
      };

      const applyHexToColor = ({ commit = false } = {}) => {
        const normalized = normalizeHexColor(hexInput.value, { allowShort: commit, expandShort: commit });
        if (!normalized) {
          if (commit) {
            syncHexFromColor();
            return false;
          }
          hexInput.classList.add("is-invalid");
          return false;
        }

        hexInput.classList.remove("is-invalid");
        hexInput.value = normalized;
        colorInput.value = normalized.toLowerCase();
        return true;
      };

      syncHexFromColor();

      for (const type of ["input", "change"]) {
        colorInput.addEventListener(type, () => {
          syncHexFromColor();
          onValueChange();
        });
      }

      hexInput.addEventListener("input", () => {
        if (applyHexToColor()) onValueChange();
      });

      const commitHexInput = () => {
        applyHexToColor({ commit: true });
        onValueChange();
      };
      hexInput.addEventListener("change", commitHexInput);
      hexInput.addEventListener("blur", commitHexInput);
    }
  }

  // ---------------------------------------------------------------------------
  // Live state
  // ---------------------------------------------------------------------------

  #refresh() {
    const root = this.element;
    if (!root) return;

    updateColorPickerVisibility(root);
    this._captureDraft();
    this._refreshSelectedThemeId();

    const themeSelect = root.querySelector('select[name="selected-theme"]');
    if (themeSelect && this.selectedThemeId && themeSelect.value !== this.selectedThemeId) {
      themeSelect.value = this.selectedThemeId;
    }

    const previewKey = this._getPreviewKey();
    if (previewKey) updateMiniSheetPreview(root, previewKey, { isSpell: this.constructor.PREVIEW_IS_SPELL });

    this.#syncIndicators();
  }

  #syncIndicators() {
    const root = this.element;
    if (!root) return;

    for (const item of root.querySelectorAll("[data-entry-key]")) {
      const key = item.dataset.entryKey;
      const dot = item.querySelector("[data-entry-dot]");
      if (dot) dot.hidden = !this._isEntryDirty(key);

      const swatch = item.querySelector("[data-entry-swatch]");
      if (swatch) {
        const background = StyleEditorApp.swatchFor(this._getEntryValues(key));
        swatch.style.background = background ?? "";
        swatch.classList.toggle("is-empty", !background);
      }
    }

    const dirty = this._hasUnsavedChanges();
    if (dirty) this.#saved = false;
    root.querySelector("[data-save-button]")?.classList.toggle("is-dirty", dirty);

    const pill = root.querySelector("[data-status-pill]");
    const label = root.querySelector("[data-status-pill-label]");
    if (!pill || !label) return;

    pill.classList.remove("scirc-config-pill--unsaved", "scirc-config-pill--saved");
    if (dirty) {
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
  // Preview variants (D&D 5e / Tidy 5e)
  // ---------------------------------------------------------------------------

  static #isTidyActive() {
    return game?.modules?.get?.(TIDY_MODULE_ID)?.active === true;
  }

  /** The variant last picked on this browser, falling back to D&D 5e. */
  static #storedPreviewVariant() {
    try {
      const stored = globalThis.localStorage?.getItem(PREVIEW_VARIANT_STORAGE_KEY);
      if (PREVIEW_VARIANTS.includes(stored)) return stored;
    } catch {
      // Storage can be unavailable (private windows, blocked site data).
    }
    return "dnd5e";
  }

  #currentPreviewVariant() {
    if (!StyleEditorApp.#isTidyActive()) return "dnd5e";
    this.#previewVariant ??= StyleEditorApp.#storedPreviewVariant();
    return this.#previewVariant;
  }

  #applyPreviewVariant() {
    const root = this.element;
    if (!root) return;

    const variant = this.#currentPreviewVariant();
    for (const block of root.querySelectorAll("[data-preview-variant]")) {
      block.hidden = block.dataset.previewVariant !== variant;
    }
    for (const button of root.querySelectorAll('[data-action="setPreviewVariant"]')) {
      const active = button.dataset.variant === variant;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-selected", active ? "true" : "false");
    }
  }

  /**
   * The Tidy mock follows the Foundry application theme, as real Tidy sheets
   * do, and shows the selected entry's name where Tidy prints the rarity.
   */
  #prepareTidyPreview(context) {
    const root = this.element;
    if (!root) return;

    const theme = StyleEditorApp.#applicationTheme();
    for (const sheet of root.querySelectorAll("[data-scirc-tidy-root]")) {
      sheet.classList.remove("theme-dark", "theme-light");
      sheet.classList.add(`theme-${theme}`);
    }

    const label = context?.entries?.find((entry) => entry.active)?.label;
    for (const element of root.querySelectorAll("[data-scirc-entry-label]")) {
      if (label) element.textContent = label;
    }
  }

  static #applicationTheme() {
    try {
      const scheme = game.settings.get("core", "uiConfig")?.colorScheme?.applications;
      if (scheme === "dark" || scheme === "light") return scheme;
    } catch {
      // Older cores store the theme elsewhere; fall through to the browser.
    }
    return globalThis.matchMedia?.("(prefers-color-scheme: dark)")?.matches ? "dark" : "light";
  }

  // ---------------------------------------------------------------------------
  // Preview fit
  // ---------------------------------------------------------------------------

  /** Refits whenever the preview column changes size (window resize). */
  #observePreview() {
    this.#previewObserver?.disconnect();
    const body = this.element?.querySelector("[data-preview-body]");
    if (!body) return;

    if (typeof ResizeObserver === "function") {
      this.#previewObserver = new ResizeObserver(() => this.#fitPreview());
      this.#previewObserver.observe(body);
    }
    // Images change the preview height once they load.
    body.addEventListener("load", () => this.#fitPreview(), { capture: true });
    this.#fitPreview();
  }

  /**
   * Zooms the preview so all of it fits the column without scrolling. CSS
   * zoom (unlike a transform) also shrinks the space the preview takes, so
   * the column never gets a scrollbar for the unscaled size.
   */
  #fitPreview() {
    const body = this.element?.querySelector("[data-preview-body]");
    const content = body?.querySelector("[data-preview-content]");
    if (!body || !content) return;

    content.style.zoom = "1";
    const naturalHeight = content.offsetHeight;
    const availableWidth = body.clientWidth;
    const availableHeight = body.clientHeight;
    if (!naturalHeight || !availableWidth || !availableHeight) return;

    const zoom = Math.min(1, availableWidth / PREVIEW_NATURAL_WIDTH, availableHeight / naturalHeight);
    content.style.zoom = String(Math.max(PREVIEW_MIN_ZOOM, Math.floor(zoom * 100) / 100));
  }

  #rememberRailScroll() {
    this.#railScrollTop = this.element?.querySelector("[data-style-rail]")?.scrollTop ?? 0;
  }

  async #onThemeChange(themeId) {
    this._captureDraft();
    if (this._applyThemePreset(themeId)) {
      this.#rememberRailScroll();
      await this.render();
      return;
    }
    this.#refresh();
  }

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  static async #onSelectEntry(_event, target) {
    const key = target?.dataset?.entryKey;
    if (!key || key === this._getSelectedEntryKey()) return;
    this._captureDraft();
    this.#rememberRailScroll();
    this._setSelectedEntryKey(key);
    await this.render();
  }

  static async #onSubmit() {
    this._captureDraft();
    try {
      await this._persist();
    } catch (error) {
      console.error(`${MODULE_ID} | Failed to save ${this.constructor.CONFIG_LABEL}.`, error);
      ui.notifications.error(`Could not save ${this.constructor.CONFIG_LABEL}: ${error?.message ?? error}`);
      return;
    }
    this.#saved = true;
    this.#syncIndicators();
  }

  static async #onExportConfig() {
    try {
      await this._exportConfig();
    } catch (error) {
      if (error?.message === "No file selected.") return;
      console.error(`${MODULE_ID} | Failed to export ${this.constructor.CONFIG_LABEL}.`, error);
      ui.notifications.error(error?.message || `Failed to export ${this.constructor.CONFIG_LABEL}.`);
    }
  }

  static async #onImportConfig() {
    try {
      this.#rememberRailScroll();
      await this._importConfig();
    } catch (error) {
      if (error?.message === "No file selected.") return;
      console.error(`${MODULE_ID} | Failed to import ${this.constructor.CONFIG_LABEL}.`, error);
      ui.notifications.error(error?.message || `Failed to import ${this.constructor.CONFIG_LABEL}.`);
    }
  }

  static #onCloseEditor() {
    void this.close();
  }

  static #onSetPreviewVariant(_event, target) {
    const variant = target?.dataset?.variant;
    if (!PREVIEW_VARIANTS.includes(variant)) return;
    this.#previewVariant = variant;
    try {
      globalThis.localStorage?.setItem(PREVIEW_VARIANT_STORAGE_KEY, variant);
    } catch {
      // Without storage the choice still applies to this window.
    }
    this.#applyPreviewVariant();
    this.#fitPreview();
  }
}
