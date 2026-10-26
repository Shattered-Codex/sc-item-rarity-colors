import { MODULE_ID } from "../core/constants.js";
import { normalizeHexColor } from "../core/colorUtils.js";
import { normalizeSelectFieldValue } from "../core/rarityFieldSchema.js";
import { CONCEAL_IMAGE_SECTIONS } from "../core/unidentifiedImageConfig.js";
import { createAnimationFrameScheduler } from "../core/refreshScheduler.js";
import { updateMiniSheetPreview } from "../ui/previewUpdater.js";
import { updateColorPickerVisibility } from "../ui/visibilityManager.js";

const { ApplicationV2, HandlebarsApplicationMixin, DialogV2 } = foundry.applications.api;

const SECTION_ORDER = Object.freeze(["item-sheet", "actor-sheet", "foundry-interface"]);
// The Effects tab groups rows by what they do rather than where they show; a
// field opts in with `section` (see rarityFieldSchema.js).
const EFFECT_SECTIONS = Object.freeze([
  Object.freeze({ id: "general", title: "Effects", hint: "Color, placement, intensity, and speed for every effect below." }),
  Object.freeze({ id: "aura", title: "Light & aura", hint: "" }),
  Object.freeze({ id: "particles", title: "Particles", hint: "" }),
  Object.freeze({ id: "icons", title: "Inventory & sidebar icons", hint: "" }),
]);
// The unidentified style's Image tab: how the image is hidden, where, and the
// stand-in image of each kind of item.
const UNIDENTIFIED_SECTIONS = Object.freeze([
  Object.freeze({ id: "conceal-image", title: "Unidentified image", hint: "What players see instead of the item's image. The image itself is untouched; it is only covered on screen." }),
  Object.freeze({ id: "conceal-where", title: "Where", hint: "" }),
  ...CONCEAL_IMAGE_SECTIONS.map((section) => Object.freeze({ ...section, hint: "" })),
]);
// The form column is split into tabs; a row's `panel` comes from its schema.
// A tab with no rows for the selected entry is not shown.
const FIELD_PANELS = Object.freeze([
  Object.freeze({ id: "colors", label: "Colors", icon: "fas fa-palette", hint: "" }),
  Object.freeze({
    id: "effects",
    label: "Effects",
    icon: "fas fa-wand-sparkles",
    hint: "Animated effects. Each user can turn them off in Module Settings → Animations, and they stop when the system asks to reduce motion.",
    sections: EFFECT_SECTIONS,
  }),
  Object.freeze({
    id: "unidentified",
    label: "Image",
    icon: "fas fa-question",
    hint: "",
    sections: UNIDENTIFIED_SECTIONS,
  }),
]);
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
  #fieldPanel = "colors";
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
      setFieldPanel: StyleEditorApp.#onSetFieldPanel,
      pickImage: StyleEditorApp.#onPickImage,
      resetImage: StyleEditorApp.#onResetImage,
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

  /**
   * @returns {{key: string, label: string, dividerBefore?: boolean}[]} rail
   *   entries, in display order; `dividerBefore` draws a separator above one
   */
  _getEntries() { return []; }

  _getSelectedEntryKey() { return null; }

  _setSelectedEntryKey(_key) {}

  /**
   * @returns {object} entryTitle, entryHint, railTitle, themeOptions,
   *   themeTooltip, panels (from _buildFieldPanels), and optionally
   *   levelControls
   */
  _prepareEditorContext() { return {}; }

  /** Copies the visible form values into the draft. */
  _captureDraft() {}

  _isEntryDirty(_key) { return false; }

  /**
   * @param {Map<string, boolean>} [knownEntryDirty] per-entry results already
   *   computed by the caller, so a refresh does not compare each entry twice.
   */
  _hasUnsavedChanges(_knownEntryDirty) { return false; }

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
      dividerBefore: entry.dividerBefore === true,
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
   * Builds the form: one panel per field tab (Colors, Effects, and Image on
   * the unidentified style), each split into sections, with each color or
   * style placed inline on the row of the checkbox that enables it.
   */
  _buildFieldPanels(allFieldDefinitions, values, namePrefix) {
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
        isImage: field.type === "image",
        defaultValue: field.defaultValue,
        value,
        options: field.type === "select"
          ? Object.entries(field.choices ?? {}).map(([choice, label]) => ({ value: choice, label, selected: choice === value }))
          : null,
      };
    };

    const titles = this.constructor.SECTION_TITLES;
    const rowFields = fieldDefinitions.filter((field) => !(field.inlineWith && keys.has(field.inlineWith)));

    const toRow = (field) => {
      const inline = inlineByHost.get(field.key);
      // A row carries the warning of its own field or of the one inline with
      // it; the visibility pass shows it for the values that need it.
      const warned = [field, inline].find((candidate) => candidate?.uiWarning);
      return {
        nested: field.nested === true,
        hint: field.uiHint ?? "",
        warning: warned?.uiWarning.text ?? "",
        warningFor: warned ? `${namePrefix}-${warned.key}` : "",
        field: toContext(field),
        inline: inline ? toContext(inline) : null,
      };
    };
    // A tab lists its own sections, matched by the field's `section`; the
    // Colors tab groups by where a field shows (item sheet / inventory / sidebar).
    const sectionsFor = (panel, panelFields) => {
      const bySection = panel.sections
        ? panel.sections.map((section) => ({
          ...section,
          rows: panelFields.filter((field) => field.section === section.id).map(toRow),
        }))
        : SECTION_ORDER.map((group) => ({
          id: group,
          title: titles[group] ?? group,
          hint: "",
          rows: panelFields.filter((field) => (field.group || "item-sheet") === group).map(toRow),
        }));
      return bySection.filter((section) => section.rows.length > 0);
    };

    const panels = FIELD_PANELS
      .map((panel) => ({
        id: panel.id,
        label: panel.label,
        icon: panel.icon,
        hint: panel.hint,
        sections: sectionsFor(panel, rowFields.filter((field) => (field.panel ?? "colors") === panel.id)),
      }))
      .filter((panel) => panel.sections.length > 0);
    // The Image tab exists only on the unidentified style: moving to another
    // entry falls back to the first tab.
    if (!panels.some((panel) => panel.id === this.#fieldPanel)) this.#fieldPanel = panels[0]?.id ?? "colors";
    return panels.map((panel) => ({ ...panel, active: panel.id === this.#fieldPanel }));
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
    if (field.type === "image") {
      return typeof value === "string" && value.trim() ? value.trim() : field.defaultValue;
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

    const entryDirty = new Map();
    for (const item of root.querySelectorAll("[data-entry-key]")) {
      const key = item.dataset.entryKey;
      entryDirty.set(key, this._isEntryDirty(key));
      const dot = item.querySelector("[data-entry-dot]");
      if (dot) dot.hidden = !entryDirty.get(key);

      const swatch = item.querySelector("[data-entry-swatch]");
      if (swatch) {
        const background = StyleEditorApp.swatchFor(this._getEntryValues(key));
        swatch.style.background = background ?? "";
        swatch.classList.toggle("is-empty", !background);
      }
    }

    const dirty = this._hasUnsavedChanges(entryDirty);
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

  /** Switches the form tab in place; a re-render would lose the scroll. */
  static #onSetFieldPanel(_event, target) {
    const panel = target?.dataset?.panel;
    if (!FIELD_PANELS.some((entry) => entry.id === panel)) return;
    this.#fieldPanel = panel;
    const root = this.element;
    for (const element of root?.querySelectorAll?.("[data-field-panel]") ?? []) {
      element.hidden = element.dataset.fieldPanel !== panel;
    }
    for (const button of root?.querySelectorAll?.('[data-action="setFieldPanel"]') ?? []) {
      const active = button.dataset.panel === panel;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-selected", active ? "true" : "false");
    }
    root?.querySelector?.(".scirc-style-editor__fields")?.scrollTo?.({ top: 0 });
  }

  /** Stores a picked image path and shows it on the thumbnail button. */
  #setImagePath(name, path) {
    const input = this.element?.querySelector(`[data-image-path][name="${name}"]`);
    if (!input) return;
    input.value = path;
    const button = input.closest("[data-image-control]")?.querySelector('[data-action="pickImage"]');
    // Plain text: a path is never rendered as HTML.
    button?.setAttribute("data-tooltip-text", path);
    const thumb = button?.querySelector("[data-image-thumb]");
    if (thumb) thumb.src = path;
    this.#refresh();
  }

  static async #onPickImage(_event, target) {
    const name = target?.dataset?.target;
    const input = name ? this.element?.querySelector(`[data-image-path][name="${name}"]`) : null;
    if (!input) return;
    const FilePicker = foundry.applications.apps.FilePicker.implementation;
    const picker = new FilePicker({
      type: "image",
      current: input.value,
      callback: (path) => this.#setImagePath(name, path),
    });
    await picker.render({ force: true });
  }

  static #onResetImage(_event, target) {
    const name = target?.dataset?.target;
    const input = name ? this.element?.querySelector(`[data-image-path][name="${name}"]`) : null;
    if (input) this.#setImagePath(name, input.dataset.defaultValue ?? "");
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
    // The sheet just shown was hidden, so anything sized to its images (the
    // unidentified image cover) is measured again.
    this.#refresh();
    this.#fitPreview();
  }
}
