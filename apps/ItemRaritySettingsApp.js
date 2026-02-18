import { updateColorPickerVisibility } from "../ui/visibilityManager.js";
import { updateMiniSheetPreview } from "../ui/previewUpdater.js";
import { DEFAULT_COLORS, MODULE_ID as DEFAULT_MODULE_ID, RARITY_TIERS } from "../core/constants.js";
import { normalizeHexColor } from "../core/colorUtils.js";
import { getRarityFieldDefinitions } from "../core/rarityFieldSchema.js";
import { RARITY_CONFIG } from "../core/rarityConfig.js";
import { getMergedRarityEntries, humanizeRarityLabel, normalizeRarityKey } from "../core/rarityListConfig.js";
import { createAnimationFrameScheduler, scheduleOnNextAnimationFrame } from "../core/refreshScheduler.js";
import { getRaritySetting } from "../core/settingsManager.js";
import { runSettingsTransaction } from "../core/settingsTransaction.js";
import { ensureRaritySettingsRegistered } from "../settings/settingsRegistration.js";

/**
 * ItemRaritySettingsApp
 * A configurable UI application for managing item rarity color settings.
 * Dynamically updates the mini item preview as user changes form inputs.
 * Uses ApplicationV2 API with HandlebarsApplicationMixin.
 */
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
export class ItemRaritySettingsApp extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor(context = "general", options = {}, moduleId) {
    super(options);
    this.moduleId = moduleId || ItemRaritySettingsApp.MODULE_ID;
    this.selectedRarity = this._resolveInitialRarity(context);
    this._draftSettings = null;
  }

  /** Default app configuration */
  static DEFAULT_OPTIONS = {
    id: "sc-item-rarity-colors",
    classes: ["sc-item-rarity-colors"],
    form: {
      handler: ItemRaritySettingsApp.onSubmit,
      closeOnSubmit: true,
      submitOnChange: false,
      submitOnClose: false,
    },
    position: {
      width: 1080,
      height: 860,
    },
    tag: "form",
    window: {
      contentClasses: ["sc-item-rarity-colors"],
      title: "Item Tier Rarity Settings",
      resizable: true,
    },
  };

  /** Template parts definition */
  static PARTS = {
    form: {
      template: "modules/sc-item-rarity-colors/templates/item-tier-rarity.html",
    },
    footer: {
      template: "modules/sc-item-rarity-colors/templates/form-footer.html",
    },
  };

  _resolveInitialRarity(context) {
    const rarityOptions = this._getRarityOptions();
    if (!rarityOptions.length) return null;
    const rarityKeys = rarityOptions.map((option) => option.key);
    return rarityKeys.includes(context) ? context : rarityKeys[0];
  }

  _getEffectiveModuleId() {
    return this.moduleId || ItemRaritySettingsApp.MODULE_ID || DEFAULT_MODULE_ID;
  }

  _normalizeRarityKey(rawKey) {
    return normalizeRarityKey(rawKey);
  }

  _isCoreRarityKey(key) {
    const normalized = this._normalizeRarityKey(key);
    return Object.values(RARITY_TIERS).includes(normalized);
  }

  _formatRarityLabelForDisplay(key, label) {
    const fallback = humanizeRarityLabel(key);
    const rawLabel = String(label || "").trim();
    if (!rawLabel) return fallback;

    if (!this._isCoreRarityKey(key)) return rawLabel;

    const compactLabel = rawLabel.toLowerCase().replace(/[\s_-]+/g, "");
    const compactKey = String(key || "").trim().toLowerCase().replace(/[\s_-]+/g, "");
    const isLowercaseRawKeyLabel = rawLabel === rawLabel.toLowerCase() && compactLabel === compactKey;

    return isLowercaseRawKeyLabel ? fallback : rawLabel;
  }

  _getRarityOptions() {
    const moduleId = this._getEffectiveModuleId();
    const entries = getMergedRarityEntries(moduleId, { includeHidden: false });
    if (entries.length) {
      return entries.map((entry) => ({
        key: entry.key,
        label: this._formatRarityLabelForDisplay(entry.key, entry.label),
      }));
    }

    return [
      { key: RARITY_TIERS.COMMON, label: "Common" },
      { key: RARITY_TIERS.UNCOMMON, label: "Uncommon" },
      { key: RARITY_TIERS.RARE, label: "Rare" },
      { key: RARITY_TIERS.VERY_RARE, label: "Very Rare" },
      { key: RARITY_TIERS.LEGENDARY, label: "Legendary" },
      { key: RARITY_TIERS.ARTIFACT, label: "Artifact" },
    ];
  }

  _getFieldDefinitionsForRarity(rarity) {
    return getRarityFieldDefinitions(rarity);
  }

  _normalizeFieldValue(field, value) {
    if (field.type === "checkbox") {
      return value === true || value === "true" || value === "on" || value === 1 || value === "1";
    }

    if (field.type === "color") {
      return typeof value === "string" && value ? value : field.defaultValue;
    }

    return value;
  }

  _bindColorControlInputs(formElement, onValueChange) {
    const controls = formElement.querySelectorAll(".sc-item-rarity-colors__color-control");

    controls.forEach((control) => {
      const colorInput = control.querySelector('input[type="color"]');
      const hexInput = control.querySelector(".sc-item-rarity-colors__hex-input");
      if (!colorInput || !hexInput) return;

      const syncHexFromColor = () => {
        const normalized = normalizeHexColor(colorInput.value) || "#000000";
        hexInput.value = normalized;
        hexInput.classList.remove("is-invalid");
      };

      const applyHexToColor = ({ commit = false } = {}) => {
        const normalized = normalizeHexColor(hexInput.value, {
          allowShort: commit,
          expandShort: commit,
        });
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

      colorInput.addEventListener("input", () => {
        syncHexFromColor();
        onValueChange();
      });

      colorInput.addEventListener("change", () => {
        syncHexFromColor();
        onValueChange();
      });

      colorInput.addEventListener("mouseup", () => {
        scheduleOnNextAnimationFrame(() => {
          syncHexFromColor();
          onValueChange();
        });
      });

      hexInput.addEventListener("input", () => {
        if (applyHexToColor()) onValueChange();
      });

      const commitHexInput = () => {
        applyHexToColor({ commit: true });
        onValueChange();
      };

      hexInput.addEventListener("change", commitHexInput);
      hexInput.addEventListener("blur", commitHexInput);
    });
  }

  _ensureDraftSettings() {
    if (this._draftSettings) return;

    const moduleId = this._getEffectiveModuleId();
    this._draftSettings = {};
    const rarityOptions = this._getRarityOptions();

    for (const rarity of rarityOptions.map((option) => option.key)) {
      this._draftSettings[rarity] = {};
      for (const field of this._getFieldDefinitionsForRarity(rarity)) {
        const storedValue = getRaritySetting(moduleId, rarity, field.key, field.defaultValue);
        this._draftSettings[rarity][field.key] = this._normalizeFieldValue(field, storedValue);
      }
    }
  }

  _captureCurrentRarityDraft(formElement = this.form) {
    if (!formElement || !this.selectedRarity) return;
    if (!this._draftSettings?.[this.selectedRarity]) return;

    const rarityDraft = this._draftSettings[this.selectedRarity];
    for (const field of this._getFieldDefinitionsForRarity(this.selectedRarity)) {
      const input = formElement.querySelector(`[name="${this.selectedRarity}-${field.key}"]`);
      if (!input) continue;
      rarityDraft[field.key] = this._normalizeFieldValue(field, field.type === "checkbox" ? input.checked : input.value);
    }
  }

  /**
   * Prepare context data for the template.
   * Returns the settings fields and their current stored values.
   */
  _prepareContext() {
    const rarityOptions = this._getRarityOptions();
    if (!rarityOptions.length) {
      return { title: "No Rarities Found", fields: [] };
    }

    if (!this.selectedRarity || !rarityOptions.some((option) => option.key === this.selectedRarity)) {
      this.selectedRarity = rarityOptions[0].key;
    }

    this._ensureDraftSettings();

    const fieldDefinitions = this._getFieldDefinitionsForRarity(this.selectedRarity);
    const rarityDraft = this._draftSettings[this.selectedRarity] || {};
    const fields = fieldDefinitions.map((field) => ({
      name: `${this.selectedRarity}-${field.key}`,
      key: field.key,
      label: field.label,
      type: field.type,
      value: this._normalizeFieldValue(field, rarityDraft[field.key]),
      isColor: field.type === "color",
      isCheckbox: field.type === "checkbox",
      group: field.group || "item-sheet",
    }));

    const groupedFields = {
      itemSheet: fields.filter((field) => field.group === "item-sheet"),
      actorSheet: fields.filter((field) => field.group === "actor-sheet"),
      foundryInterface: fields.filter((field) => field.group === "foundry-interface"),
    };

    const fieldsByKey = new Map(fields.map((field) => [field.key, field]));
    const backgroundColor = fieldsByKey.get("item-color")?.value || DEFAULT_COLORS.BACKGROUND_FALLBACK;
    const textColor = fieldsByKey.get("text-color")?.value || DEFAULT_COLORS.TEXT_DEFAULT;
    const secondaryColor = fieldsByKey.get("secondary-item-color")?.value || DEFAULT_COLORS.BACKGROUND_FALLBACK;
    const gradient = fieldsByKey.get("gradient-option")?.value || false;
    const glow = fieldsByKey.get("glow-option")?.value || false;
    const enableTitleColor = fieldsByKey.get("enable-inventory-title-color")?.value || false;
    const titleColor = fieldsByKey.get("inventory-title-color")?.value || DEFAULT_COLORS.TEXT_DEFAULT;
    const enableDetailsColor = fieldsByKey.get("enable-inventory-details-color")?.value || false;
    const detailsColor = fieldsByKey.get("inventory-details-color")?.value || DEFAULT_COLORS.TEXT_DEFAULT;
    const enableFoundryInterfaceGradientEffects = fieldsByKey.get("enable-foundry-interface-gradient-effects")?.value || false;
    const enableFoundryInterfaceTextColor = fieldsByKey.get("enable-foundry-interface-text-color")?.value || false;
    const foundryInterfaceTextColor = fieldsByKey.get("foundry-interface-text-color")?.value || DEFAULT_COLORS.TEXT_DEFAULT;
    const selectedRarityLabel =
      rarityOptions.find((option) => option.key === this.selectedRarity)?.label
      || RARITY_CONFIG[this.selectedRarity]?.label
      || humanizeRarityLabel(this.selectedRarity);

    return {
      title: `${selectedRarityLabel} Item Settings`,
      fields,
      groupedFields,
      rarityOptions: rarityOptions.map((option) => ({
        ...option,
        selected: option.key === this.selectedRarity,
      })),
      selectedRarity: this.selectedRarity,
      backgroundColor,
      textColor,
      secondaryColor,
      gradient,
      glow,
      enableTitleColor,
      titleColor,
      enableDetailsColor,
      detailsColor,
      gradientEnabled: gradient,
      gradientColor: secondaryColor,
      enableFoundryInterfaceGradientEffects,
      enableFoundryInterfaceTextColor,
      foundryInterfaceTextColor,
    };
  }

  /**
   * Called after the application is rendered.
   * Initializes listeners and updates live preview as inputs change.
   */
  async _onRender(context, options) {
    // Handle cancel button
    const cancelButton = this.element?.querySelector('[data-action="close"]');
    if (cancelButton) {
      cancelButton.addEventListener("click", () => this.close());
    }

    if (!this.form) return;

    const raritySelect = this.form.querySelector('select[name="selected-rarity"]');
    if (raritySelect) {
      raritySelect.addEventListener("change", async (event) => {
        this._captureCurrentRarityDraft(this.form);
        this.selectedRarity = event.currentTarget.value;
        await this.render(true);
      });
    }

    const miniSheet = $(this.form).find(".mini-item-sheet .application.sheet.item");
    const inventoryPreview = $(this.form).find(".inventory-preview-item");
    if (!miniSheet.length && !inventoryPreview.length) {
      return;
    }

    const refreshUi = () => {
      updateColorPickerVisibility(this.form);
      this._captureCurrentRarityDraft(this.form);
      updateMiniSheetPreview(this.form, this.selectedRarity);
    };
    const frameRefreshUi = createAnimationFrameScheduler(refreshUi);

    refreshUi();

    this._bindColorControlInputs(this.form, () => {
      frameRefreshUi.request();
    });

    const checkboxInputs = this.form.querySelectorAll('input[type="checkbox"]');
    checkboxInputs.forEach((input) => {
      input.addEventListener("input", refreshUi);
      input.addEventListener("change", refreshUi);
    });
  }

  /**
   * Handle form submission and persist all settings.
   * Static method used as form handler in DEFAULT_OPTIONS.
   * Note: ApplicationV2 binds 'this' to the application instance when calling this handler.
   */
  static async onSubmit(event, form, formData) {
    // 'this' is bound to the application instance by ApplicationV2
    const moduleId = this._getEffectiveModuleId();
    this.moduleId = moduleId;

    this._captureCurrentRarityDraft(form);

    const rarityOptions = this._getRarityOptions();
    const rarityLabelMap = new Map(rarityOptions.map((option) => [option.key, option.label]));
    const pendingUpdates = [];

    for (const [rarity, raritySettings] of Object.entries(this._draftSettings || {})) {
      ensureRaritySettingsRegistered(moduleId, rarity, rarityLabelMap.get(rarity));
      const fields = this._getFieldDefinitionsForRarity(rarity);

      for (const field of fields) {
        const settingName = `${rarity}-${field.key}`;
        const settingKey = `${moduleId}.${settingName}`;
        if (!game.settings.settings.has(settingKey)) continue;

        const rawValue = raritySettings[field.key];
        const settingValue = this._normalizeFieldValue(field, rawValue);
        const currentValue = game.settings.get(moduleId, settingName);
        if (currentValue === settingValue) continue;

        pendingUpdates.push({
          settingName,
          settingValue,
        });
      }
    }

    if (pendingUpdates.length > 0) {
      await runSettingsTransaction(moduleId, async () => {
        for (const update of pendingUpdates) {
          await game.settings.set(moduleId, update.settingName, update.settingValue);
        }
      }, {
        source: "item-rarity-settings-app",
        updateCount: pendingUpdates.length,
      });
    }

    ui.notifications.info(pendingUpdates.length > 0
      ? `Saved item rarity settings (${pendingUpdates.length} change(s)).`
      : "No item rarity setting changes to save.");
    await this.close();
  }

  async close(options = {}) {
    return super.close(options);
  }

  // Override render to ensure moduleId is set
  render(force = false, options = {}) {
    this.moduleId = this._getEffectiveModuleId();
    return super.render(force, options);
  }
}
