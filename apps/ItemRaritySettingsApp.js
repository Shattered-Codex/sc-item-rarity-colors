import { updateColorPickerVisibility } from "../ui/visibilityManager.js";
import { updateMiniSheetPreview } from "../ui/previewUpdater.js";
import { DEFAULT_COLORS, MODULE_ID as DEFAULT_MODULE_ID, RARITY_TIERS } from "../core/constants.js";
import { RARITY_CONFIG } from "../core/rarityConfig.js";
import { getMergedRarityEntries } from "../core/rarityListConfig.js";
import { ensureRaritySettingsRegistered } from "../settings/settingsRegistration.js";

const FIELD_DEFINITIONS = [
  { key: "enable-item-color", label: "Change Item Sheet Background Color", type: "checkbox", group: "item-sheet", defaultValue: false },
  { key: "item-color", label: "Item Sheet Background Color", type: "color", group: "item-sheet", defaultValue: "#000000" },
  { key: "secondary-item-color", label: "Secondary Color", type: "color", group: "item-sheet", defaultValue: "#ffffff", requiredFlag: "supportsGradient" },
  { key: "gradient-option", label: "Enable Gradient", type: "checkbox", group: "item-sheet", defaultValue: false, requiredFlag: "supportsGradient" },
  { key: "glow-option", label: "Enable Glow Effect", type: "checkbox", group: "item-sheet", defaultValue: false, requiredFlag: "supportsGlow" },
  { key: "enable-text-color", label: "Change Item Sheet Text Color", type: "checkbox", group: "item-sheet", defaultValue: false },
  { key: "text-color", label: "Item Sheet Text Color", type: "color", group: "item-sheet", defaultValue: "#000000" },
  { key: "enable-inventory-title-color", label: "Change Item Title/Subtitle Color in Inventory", type: "checkbox", group: "actor-sheet", defaultValue: false },
  { key: "inventory-title-color", label: "Inventory Item Title/Subtitle Color", type: "color", group: "actor-sheet", defaultValue: "#000000" },
  { key: "enable-inventory-details-color", label: "Change Item Details Text Color", type: "checkbox", group: "actor-sheet", defaultValue: false },
  { key: "inventory-details-color", label: "Inventory Item Details Text Color", type: "color", group: "actor-sheet", defaultValue: "#000000" },
  { key: "enable-inventory-border-color", label: "Change Item Border Color in Inventory", type: "checkbox", group: "actor-sheet", defaultValue: false },
  { key: "inventory-border-color", label: "Inventory Item Border Color", type: "color", group: "actor-sheet", defaultValue: "#ffffff" },
  { key: "inventory-border-secondary-color", label: "Inventory Item Border Secondary Color", type: "color", group: "actor-sheet", defaultValue: "#ffffff", requiredFlag: "supportsBorderGradient" },
  { key: "enable-inventory-border-glow", label: "Enable Inventory Border Glow", type: "checkbox", group: "actor-sheet", defaultValue: false, requiredFlag: "supportsBorderGlow" },
];

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
    this._mainMenuChangeHandler = null;
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
      width: 760,
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
    if (rawKey === undefined || rawKey === null) return null;
    const normalized = String(rawKey).trim().toLowerCase();
    return normalized || null;
  }

  _humanizeRarityLabel(key) {
    const value = String(key || "").trim();
    if (!value) return "Unknown";

    const spaced = value
      .replace(/[_-]+/g, " ")
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/\s+/g, " ")
      .trim();

    return spaced
      .split(" ")
      .map((part) => part ? part[0].toUpperCase() + part.slice(1) : part)
      .join(" ");
  }

  _localizeMaybe(label) {
    if (typeof label !== "string" || !label.trim()) return "";
    if (game?.i18n?.has?.(label)) {
      return game.i18n.localize(label);
    }
    return label;
  }

  _getSystemRarityOptions() {
    const source = CONFIG?.DND5E?.itemRarity ?? game?.dnd5e?.config?.itemRarity;
    if (!source) return [];

    const entries = Array.isArray(source)
      ? source.map((key) => [key, key])
      : Object.entries(source);

    return entries
      .map(([rawKey, rawValue]) => {
        const key = this._normalizeRarityKey(rawKey);
        if (!key) return null;

        const labelValue = typeof rawValue === "string"
          ? rawValue
          : (rawValue?.label ?? rawKey);
        const label = this._localizeMaybe(labelValue) || this._humanizeRarityLabel(rawKey);
        return { key, label };
      })
      .filter(Boolean);
  }

  _getCustomDnd5eRarityOptions() {
    const customModule = game.modules.get("custom-dnd5e");
    if (!customModule?.active) return [];
    if (!game.settings.settings.has("custom-dnd5e.item-rarity")) return [];

    const isEnabled = game.settings.settings.has("custom-dnd5e.enable-item-rarity")
      ? game.settings.get("custom-dnd5e", "enable-item-rarity")
      : true;
    if (!isEnabled) return [];

    const settingData = game.settings.get("custom-dnd5e", "item-rarity");
    if (!settingData || typeof settingData !== "object") return [];

    return Object.entries(settingData)
      .map(([rawKey, rawValue]) => {
        const keyCandidate = (rawValue && typeof rawValue === "object" && rawValue.key) ? rawValue.key : rawKey;
        const key = this._normalizeRarityKey(keyCandidate);
        if (!key) return null;

        if (rawValue && typeof rawValue === "object" && rawValue.visible === false) return null;

        const labelValue = (rawValue && typeof rawValue === "object")
          ? (rawValue.label ?? keyCandidate)
          : rawValue;
        const label = this._localizeMaybe(labelValue) || this._humanizeRarityLabel(keyCandidate);
        return { key, label };
      })
      .filter(Boolean);
  }

  _getRarityOptions() {
    const moduleId = this._getEffectiveModuleId();
    const entries = getMergedRarityEntries(moduleId, { includeHidden: false });
    if (entries.length) {
      return entries.map((entry) => ({
        key: entry.key,
        label: entry.label || this._humanizeRarityLabel(entry.key),
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
    const rarityConfig = RARITY_CONFIG[rarity] || {};
    if (!Object.keys(rarityConfig).length) {
      return FIELD_DEFINITIONS;
    }
    return FIELD_DEFINITIONS.filter((field) => {
      if (!field.requiredFlag) return true;
      return Boolean(rarityConfig[field.requiredFlag]);
    });
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

  _ensureDraftSettings() {
    if (this._draftSettings) return;

    const moduleId = this._getEffectiveModuleId();
    this._draftSettings = {};
    const rarityOptions = this._getRarityOptions();

    for (const rarity of rarityOptions.map((option) => option.key)) {
      this._draftSettings[rarity] = {};
      for (const field of this._getFieldDefinitionsForRarity(rarity)) {
        const settingName = `${rarity}-${field.key}`;
        const settingKey = `${moduleId}.${settingName}`;
        const storedValue = game.settings.settings.has(settingKey)
          ? game.settings.get(moduleId, settingName)
          : field.defaultValue;

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
    const moduleId = this._getEffectiveModuleId();

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
    const selectedRarityLabel =
      rarityOptions.find((option) => option.key === this.selectedRarity)?.label
      || RARITY_CONFIG[this.selectedRarity]?.label
      || this._humanizeRarityLabel(this.selectedRarity);

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

    // Ensure checkboxes are always visible
    const checkboxes = this.form.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach((checkbox) => {
      const group = checkbox.closest(".form-group");

      checkbox.style.setProperty("display", "block", "important");
      checkbox.style.setProperty("visibility", "visible", "important");
      checkbox.style.setProperty("opacity", "1", "important");
      checkbox.style.setProperty("width", "20px", "important");
      checkbox.style.setProperty("height", "20px", "important");
      checkbox.style.setProperty("min-width", "20px", "important");
      checkbox.style.setProperty("min-height", "20px", "important");
      checkbox.style.setProperty("flex-shrink", "0", "important");

      if (group) {
        group.style.setProperty("display", "flex", "important");
        group.style.setProperty("visibility", "visible", "important");
        group.style.setProperty("align-items", "center", "important");
        group.style.setProperty("opacity", "1", "important");
      }
    });

    const updateColorPickerVisibilityLocal = () => {
      updateColorPickerVisibility(this.form);
    };

    const updateMiniSheetLocal = () => {
      updateMiniSheetPreview(this.form, this.selectedRarity);
    };

    updateColorPickerVisibilityLocal();
    this._captureCurrentRarityDraft(this.form);
    updateMiniSheetLocal();

    if (this._mainMenuChangeHandler) {
      Hooks.off("setSetting", this._mainMenuChangeHandler);
    }

    const moduleId = this.moduleId || ItemRaritySettingsApp.MODULE_ID;
    this.moduleId = moduleId || DEFAULT_MODULE_ID;
    this._mainMenuChangeHandler = (module, key) => {
      if (module === this.moduleId &&
          (key === "enableActorInventoryGradientEffects" || key === "enableActorInventoryBorders")) {
        updateMiniSheetLocal();
      }
    };
    Hooks.on("setSetting", this._mainMenuChangeHandler);

    const inputs = this.form.querySelectorAll('input[type="color"], input[type="checkbox"]');
    inputs.forEach((input) => {
      input.addEventListener("input", (event) => {
        const target = event.target;

        if (target.type === "color") {
          requestAnimationFrame(() => {
            updateMiniSheetLocal();
            updateColorPickerVisibilityLocal();
            this._captureCurrentRarityDraft(this.form);
          });
          return;
        }

        updateMiniSheetLocal();
        updateColorPickerVisibilityLocal();
        this._captureCurrentRarityDraft(this.form);
      });

      input.addEventListener("change", () => {
        updateMiniSheetLocal();
        updateColorPickerVisibilityLocal();
        this._captureCurrentRarityDraft(this.form);
      });

      if (input.type === "color") {
        input.addEventListener("mouseup", () => {
          requestAnimationFrame(() => {
            updateMiniSheetLocal();
            this._captureCurrentRarityDraft(this.form);
          });
        });
      }
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

    for (const [rarity, raritySettings] of Object.entries(this._draftSettings || {})) {
      ensureRaritySettingsRegistered(moduleId, rarity, rarityLabelMap.get(rarity));
      const fields = this._getFieldDefinitionsForRarity(rarity);

      for (const field of fields) {
        const settingName = `${rarity}-${field.key}`;
        const settingKey = `${moduleId}.${settingName}`;
        if (!game.settings.settings.has(settingKey)) continue;

        const rawValue = raritySettings[field.key];
        const settingValue = this._normalizeFieldValue(field, rawValue);
        await game.settings.set(moduleId, settingName, settingValue);
      }
    }

    ui.notifications.info("Saved item rarity settings.");
  }

  async close(options = {}) {
    if (this._mainMenuChangeHandler) {
      Hooks.off("setSetting", this._mainMenuChangeHandler);
      this._mainMenuChangeHandler = null;
    }
    return super.close(options);
  }

  // Override render to ensure moduleId is set
  render(force = false, options = {}) {
    this.moduleId = this._getEffectiveModuleId();
    return super.render(force, options);
  }
}
