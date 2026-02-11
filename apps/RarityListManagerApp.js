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
