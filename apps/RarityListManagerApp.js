import {
  RARITY_LIST_ENABLED_SETTING_KEY,
  getFallbackRarityEntries,
  getMergedRarityEntries,
  humanizeRarityLabel,
  normalizeRarityKey,
  saveModuleRarityEntries,
  syncEntriesToCustomDnd5e,
} from "../core/rarityListConfig.js";
import { ensureRaritySettingsRegistered } from "../settings/settingsRegistration.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class RarityListManagerApp extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor(options = {}, moduleId) {
    super(options);
    this.moduleId = moduleId || RarityListManagerApp.MODULE_ID;
    this._draftEntries = null;
    this._draftEnabled = true;
    this._dragSourceIndex = null;
  }

  static DEFAULT_OPTIONS = {
    id: "sc-item-rarity-colors-rarity-manager",
    classes: ["sc-item-rarity-colors", "sc-item-rarity-colors--rarity-manager"],
    form: {
      handler: RarityListManagerApp.onSubmit,
      closeOnSubmit: true,
      submitOnChange: false,
      submitOnClose: false,
    },
    position: {
      width: 760,
      height: 820,
    },
    tag: "form",
    window: {
      contentClasses: ["sc-item-rarity-colors"],
      title: "Rarity List Manager",
      resizable: true,
    },
  };

  static PARTS = {
    form: {
      template: "modules/sc-item-rarity-colors/templates/rarity-list-manager.html",
    },
  };

  _getEffectiveModuleId() {
    return this.moduleId || RarityListManagerApp.MODULE_ID;
  }

  _sanitizeEntries(entries = []) {
    const sanitized = [];
    const seen = new Set();

    for (const entry of entries) {
      const key = normalizeRarityKey(entry?.key);
      if (!key || seen.has(key)) continue;

      seen.add(key);
      sanitized.push({
        key,
        label: String(entry?.label || "").trim() || humanizeRarityLabel(key),
        visible: entry?.visible !== false,
        system: entry?.system === true,
      });
    }

    return sanitized;
  }

  _loadDraft() {
    if (this._draftEntries) return;

    const moduleId = this._getEffectiveModuleId();
    const enabledSettingKey = `${moduleId}.${RARITY_LIST_ENABLED_SETTING_KEY}`;

    this._draftEnabled = game.settings.settings.has(enabledSettingKey)
      ? game.settings.get(moduleId, RARITY_LIST_ENABLED_SETTING_KEY)
      : true;

    this._draftEntries = this._sanitizeEntries(getMergedRarityEntries(moduleId, { includeHidden: true }));
  }

  _captureDraftFromForm(formElement = this.form) {
    if (!formElement || !this._draftEntries) return;

    const enabledInput = formElement.querySelector('input[name="enabled"]');
    this._draftEnabled = enabledInput ? enabledInput.checked : this._draftEnabled;

    const nextEntries = [];
    for (let i = 0; i < this._draftEntries.length; i += 1) {
      const current = this._draftEntries[i];
      const keyInput = formElement.querySelector(`[name="items.${i}.key"]`);
      const labelInput = formElement.querySelector(`[name="items.${i}.label"]`);
      const visibleInput = formElement.querySelector(`[name="items.${i}.visible"]`);
      const systemInput = formElement.querySelector(`[name="items.${i}.system"]`);

      const key = normalizeRarityKey(keyInput ? keyInput.value : current.key);
      if (!key) continue;

      nextEntries.push({
        key,
        label: String(labelInput ? labelInput.value : current.label).trim() || humanizeRarityLabel(key),
        visible: visibleInput ? visibleInput.checked : current.visible !== false,
        system: systemInput ? (systemInput.value === "true") : current.system === true,
      });
    }

    this._draftEntries = this._sanitizeEntries(nextEntries);
  }

  _createDraftEntry() {
    const key = normalizeRarityKey(`rarity-${foundry.utils.randomID().slice(0, 6)}`);
    return {
      key,
      label: humanizeRarityLabel(key),
      visible: true,
      system: false,
    };
  }

  _moveDraftEntry(sourceIndex, targetIndex, placeAfter = false) {
    if (!Array.isArray(this._draftEntries)) return;
    if (!Number.isInteger(sourceIndex) || !Number.isInteger(targetIndex)) return;
    if (sourceIndex < 0 || targetIndex < 0) return;
    if (sourceIndex >= this._draftEntries.length || targetIndex >= this._draftEntries.length) return;
    if (sourceIndex === targetIndex && !placeAfter) return;

    const [moved] = this._draftEntries.splice(sourceIndex, 1);
    if (!moved) return;

    let insertIndex = targetIndex;
    if (placeAfter) {
      insertIndex = sourceIndex < targetIndex ? targetIndex : targetIndex + 1;
    } else if (sourceIndex < targetIndex) {
      insertIndex = targetIndex - 1;
    }

    insertIndex = Math.max(0, Math.min(insertIndex, this._draftEntries.length));
    this._draftEntries.splice(insertIndex, 0, moved);
  }

  _clearDropIndicators(formElement = this.form) {
    if (!formElement) return;
    formElement
      .querySelectorAll(".is-drop-before, .is-drop-after")
      .forEach((el) => el.classList.remove("is-drop-before", "is-drop-after"));
  }

  _clearDragState(formElement = this.form) {
    if (!formElement) return;
    formElement
      .querySelectorAll(".is-dragging")
      .forEach((el) => el.classList.remove("is-dragging"));
  }

  _bindReorderHandlers(formElement = this.form) {
    if (!formElement) return;

    const rows = formElement.querySelectorAll("[data-rarity-row]");
    rows.forEach((row) => {
      const grip = row.querySelector(".sc-item-rarity-colors__rarity-row-grip");
      if (grip) {
        grip.addEventListener("dragstart", (event) => {
          const sourceIndex = Number(row.dataset.index);
          if (Number.isNaN(sourceIndex)) return;

          this._dragSourceIndex = sourceIndex;
          this._clearDropIndicators(formElement);
          row.classList.add("is-dragging");
          if (event.dataTransfer) {
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData("text/plain", String(sourceIndex));
          }
        });

        grip.addEventListener("dragend", () => {
          this._dragSourceIndex = null;
          this._clearDropIndicators(formElement);
          this._clearDragState(formElement);
        });
      }

      row.addEventListener("dragover", (event) => {
        event.preventDefault();
        const sourceRaw = event.dataTransfer?.getData("text/plain");
        const parsedSource = Number(sourceRaw);
        const sourceIndex = Number.isInteger(parsedSource) ? parsedSource : this._dragSourceIndex;
        const targetIndex = Number(row.dataset.index);
        if (!Number.isInteger(sourceIndex) || !Number.isInteger(targetIndex) || sourceIndex === targetIndex) {
          return;
        }

        if (event.dataTransfer) {
          event.dataTransfer.dropEffect = "move";
        }

        const rect = row.getBoundingClientRect();
        const placeAfter = event.clientY > (rect.top + rect.height / 2);
        this._clearDropIndicators(formElement);
        row.classList.add(placeAfter ? "is-drop-after" : "is-drop-before");
      });

      row.addEventListener("dragleave", (event) => {
        const related = event.relatedTarget;
        if (related && row.contains(related)) return;
        row.classList.remove("is-drop-before", "is-drop-after");
      });

      row.addEventListener("drop", async (event) => {
        event.preventDefault();

        const sourceRaw = event.dataTransfer?.getData("text/plain");
        const parsedSource = Number(sourceRaw);
        const sourceIndex = Number.isInteger(parsedSource) ? parsedSource : this._dragSourceIndex;
        const targetIndex = Number(row.dataset.index);
        if (!Number.isInteger(sourceIndex) || !Number.isInteger(targetIndex) || sourceIndex === targetIndex) {
          this._clearDropIndicators(formElement);
          return;
        }

        this._captureDraftFromForm(formElement);
        const rect = row.getBoundingClientRect();
        const placeAfter = event.clientY > (rect.top + rect.height / 2);
        this._moveDraftEntry(sourceIndex, targetIndex, placeAfter);
        this._dragSourceIndex = null;
        this._clearDropIndicators(formElement);
        this._clearDragState(formElement);
        await this.render(true);
      });

      row.addEventListener("dragend", () => {
        this._dragSourceIndex = null;
        this._clearDropIndicators(formElement);
        this._clearDragState(formElement);
      });
    });
  }

  _prepareContext() {
    this._loadDraft();
    return {
      enabled: this._draftEnabled !== false,
      items: this._draftEntries.map((item) => ({ ...item })),
    };
  }

  async _onRender(context, options) {
    if (!this.form) return;

    const closeButton = this.form.querySelector('[data-action="close"]');
    if (closeButton) {
      closeButton.addEventListener("click", () => this.close());
    }

    const addButton = this.form.querySelector('[data-action="new"]');
    if (addButton) {
      addButton.addEventListener("click", async (event) => {
        event.preventDefault();
        this._captureDraftFromForm(this.form);
        this._draftEntries.push(this._createDraftEntry());
        await this.render(true);
      });
    }

    const resetButton = this.form.querySelector('[data-action="reset"]');
    if (resetButton) {
      resetButton.addEventListener("click", async (event) => {
        event.preventDefault();
        this._draftEnabled = true;
        this._draftEntries = this._sanitizeEntries(getFallbackRarityEntries());
        await this.render(true);
      });
    }

    const deleteButtons = this.form.querySelectorAll('[data-action="delete"]');
    deleteButtons.forEach((button) => {
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        this._captureDraftFromForm(this.form);

        const index = Number(button.dataset.index);
        if (Number.isNaN(index)) return;
        if (!this._draftEntries[index] || this._draftEntries[index].system) return;

        this._draftEntries.splice(index, 1);
        await this.render(true);
      });
    });

    this._bindReorderHandlers(this.form);
  }

  static async onSubmit(event, form, formData) {
    const moduleId = this._getEffectiveModuleId();
    this.moduleId = moduleId;

    this._captureDraftFromForm(form);

    const entries = this._sanitizeEntries(this._draftEntries || []);
    for (const entry of entries) {
      ensureRaritySettingsRegistered(moduleId, entry.key, entry.label);
    }

    await saveModuleRarityEntries(moduleId, entries, this._draftEnabled !== false);
    await syncEntriesToCustomDnd5e(entries);

    ui.notifications.info("Saved rarity list configuration.");
  }

  render(force = false, options = {}) {
    if (!this.moduleId && RarityListManagerApp.MODULE_ID) {
      this.moduleId = RarityListManagerApp.MODULE_ID;
    }
    return super.render(force, options);
  }
}
