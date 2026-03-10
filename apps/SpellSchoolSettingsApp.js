import { updateColorPickerVisibility } from "../ui/visibilityManager.js";
import { updateMiniSheetPreview } from "../ui/previewUpdater.js";
import { DEFAULT_COLORS, MODULE_ID as DEFAULT_MODULE_ID } from "../core/constants.js";
import { normalizeHexColor } from "../core/colorUtils.js";
import { getRarityFieldDefinitions } from "../core/rarityFieldSchema.js";
import { createAnimationFrameScheduler, scheduleOnNextAnimationFrame } from "../core/refreshScheduler.js";
import { runSettingsTransaction } from "../core/settingsTransaction.js";
import {
  buildSpellProfileKey,
  ensureSpellProfileInSetting,
  getDefaultSpellStyleFieldValues,
  getSpellLevelEntries,
  getSpellSchoolEntries,
  getSpellSchoolStylesSetting,
  normalizeSpellSchoolStylesSetting,
  normalizeSpellLevel,
  normalizeSpellSchoolKey,
  SPELL_SCHOOL_STYLES_SETTING_KEY,
} from "../core/spellSchoolConfig.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class SpellSchoolSettingsApp extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor(context = "general", options = {}, moduleId) {
    super(options);
    this.moduleId = moduleId || SpellSchoolSettingsApp.MODULE_ID;
    this.selectedSchool = null;
    this.selectedLevel = 0;
    this.useLevelVariants = false;
    this._schools = [];
    this._levels = getSpellLevelEntries();
    this._draftProfiles = null;
  }

  static DEFAULT_OPTIONS = {
    id: "sc-item-rarity-colors-spell-school-settings",
    classes: ["sc-item-rarity-colors", "sc-item-rarity-colors--spell-school-manager"],
    form: {
      handler: SpellSchoolSettingsApp.onSubmit,
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
      title: "Spell School Style Settings",
      resizable: true,
    },
  };

  static PARTS = {
    form: {
      template: "modules/sc-item-rarity-colors/templates/spell-school-settings.html",
    },
    footer: {
      template: "modules/sc-item-rarity-colors/templates/form-footer.html",
    },
  };

  _getEffectiveModuleId() {
    return this.moduleId || SpellSchoolSettingsApp.MODULE_ID || DEFAULT_MODULE_ID;
  }

  _getSchoolOptions() {
    return this._schools.length ? this._schools : getSpellSchoolEntries();
  }

  _getLevelOptions() {
    return this._levels;
  }

  _resolveInitialSchool() {
    const schools = this._getSchoolOptions();
    if (!schools.length) return null;

    const selected = normalizeSpellSchoolKey(this.selectedSchool);
    if (selected && schools.some((school) => school.key === selected)) {
      return selected;
    }

    return schools[0].key;
  }

  _resolveInitialLevel() {
    const normalized = normalizeSpellLevel(this.selectedLevel);
    return normalized === null ? 0 : normalized;
  }

  _getCurrentProfileKey({ school = this.selectedSchool, level = this.selectedLevel, useLevelVariants = this.useLevelVariants } = {}) {
    const normalizedSchool = normalizeSpellSchoolKey(school);
    if (!normalizedSchool) return null;

    return buildSpellProfileKey(normalizedSchool, level, useLevelVariants === true);
  }

  _getFieldDefinitions() {
    return getRarityFieldDefinitions("spell");
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
    if (this._draftProfiles) return;

    const moduleId = this._getEffectiveModuleId();
    const loaded = getSpellSchoolStylesSetting(moduleId);
    const normalized = normalizeSpellSchoolStylesSetting(loaded);

    this._schools = getSpellSchoolEntries();
    this.selectedSchool = this._resolveInitialSchool();
    this.selectedLevel = this._resolveInitialLevel();
    this.useLevelVariants = normalized.useLevelVariants === true;

    const seed = ensureSpellProfileInSetting(
      normalized,
      this.selectedSchool,
      this.selectedLevel,
      this.useLevelVariants
    );

    this._draftProfiles = { ...seed.profiles };
  }

  _ensureCurrentProfileDraft() {
    this._ensureDraftSettings();

    const profileKey = this._getCurrentProfileKey();
    if (!profileKey) return null;

    if (!this._draftProfiles[profileKey]) {
      const schoolProfileKey = this._getCurrentProfileKey({ useLevelVariants: false });
      const fallback = schoolProfileKey ? this._draftProfiles[schoolProfileKey] : null;
      const defaults = getDefaultSpellStyleFieldValues();
      this._draftProfiles[profileKey] = {
        ...defaults,
        ...(fallback || {}),
      };
    }

    return profileKey;
  }

  _captureCurrentProfileDraft(formElement = this.form) {
    if (!formElement) return;

    const profileKey = this._ensureCurrentProfileDraft();
    if (!profileKey) return;

    const profileDraft = this._draftProfiles[profileKey] || {};
    for (const field of this._getFieldDefinitions()) {
      const input = formElement.querySelector(`[name="${profileKey}-${field.key}"]`);
      if (!input) continue;
      profileDraft[field.key] = this._normalizeFieldValue(field, field.type === "checkbox" ? input.checked : input.value);
    }

    this._draftProfiles[profileKey] = profileDraft;
  }

  _prepareContext() {
    this._ensureDraftSettings();

    const schools = this._getSchoolOptions();
    if (!schools.length) return { title: "No Spell Schools Found", fields: [] };

    if (!this.selectedSchool || !schools.some((school) => school.key === this.selectedSchool)) {
      this.selectedSchool = schools[0].key;
    }

    const levels = this._getLevelOptions();
    if (!levels.some((level) => level.value === this.selectedLevel)) {
      this.selectedLevel = 0;
    }

    const profileKey = this._ensureCurrentProfileDraft();
    const profileDraft = profileKey ? (this._draftProfiles[profileKey] || {}) : {};

    const fieldDefinitions = this._getFieldDefinitions();
    const fields = fieldDefinitions.map((field) => ({
      name: `${profileKey}-${field.key}`,
      key: field.key,
      label: field.label,
      type: field.type,
      value: this._normalizeFieldValue(field, profileDraft[field.key]),
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

    const selectedSchoolLabel = schools.find((school) => school.key === this.selectedSchool)?.label || this.selectedSchool;
    const levelLabel = levels.find((level) => level.value === this.selectedLevel)?.label || `Level ${this.selectedLevel}`;
    const title = this.useLevelVariants
      ? `${selectedSchoolLabel} • ${levelLabel} Spell Settings`
      : `${selectedSchoolLabel} Spell Settings`;

    return {
      title,
      fields,
      groupedFields,
      selectedProfileKey: profileKey,
      schoolOptions: schools.map((school) => ({
        ...school,
        selected: school.key === this.selectedSchool,
      })),
      selectedSchool: this.selectedSchool,
      useLevelVariants: this.useLevelVariants,
      levelOptions: levels.map((level) => ({
        value: level.value,
        label: level.label,
        selected: level.value === this.selectedLevel,
      })),
      selectedLevel: this.selectedLevel,
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

  async _onRender(context, options) {
    const cancelButton = this.element?.querySelector('[data-action="close"]');
    if (cancelButton) {
      cancelButton.addEventListener("click", () => this.close());
    }

    if (!this.form) return;

    const schoolSelect = this.form.querySelector('select[name="selected-school"]');
    if (schoolSelect) {
      schoolSelect.addEventListener("change", async (event) => {
        this._captureCurrentProfileDraft(this.form);
        this.selectedSchool = normalizeSpellSchoolKey(event.currentTarget.value) || this.selectedSchool;
        await this.render(true);
      });
    }

    const levelVariantCheckbox = this.form.querySelector('input[name="use-level-variants"]');
    if (levelVariantCheckbox) {
      levelVariantCheckbox.addEventListener("change", async (event) => {
        this._captureCurrentProfileDraft(this.form);
        this.useLevelVariants = event.currentTarget.checked === true;
        await this.render(true);
      });
    }

    const levelSelect = this.form.querySelector('select[name="selected-level"]');
    if (levelSelect) {
      levelSelect.addEventListener("change", async (event) => {
        this._captureCurrentProfileDraft(this.form);
        const nextLevel = normalizeSpellLevel(event.currentTarget.value);
        this.selectedLevel = nextLevel === null ? 0 : nextLevel;
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
      this._captureCurrentProfileDraft(this.form);
      const activeProfileKey = this._getCurrentProfileKey();
      if (!activeProfileKey) return;
      updateMiniSheetPreview(this.form, activeProfileKey);
    };
    const frameRefreshUi = createAnimationFrameScheduler(refreshUi);

    refreshUi();

    this._bindColorControlInputs(this.form, () => {
      frameRefreshUi.request();
    });

    const checkboxInputs = this.form.querySelectorAll('.sc-item-rarity-colors__settings-grid input[type="checkbox"]');
    checkboxInputs.forEach((input) => {
      input.addEventListener("input", refreshUi);
      input.addEventListener("change", refreshUi);
    });
  }

  static async onSubmit(event, form, formData) {
    const moduleId = this._getEffectiveModuleId();
    this.moduleId = moduleId;

    this._captureCurrentProfileDraft(form);

    const nextSetting = normalizeSpellSchoolStylesSetting({
      useLevelVariants: this.useLevelVariants,
      profiles: this._draftProfiles || {},
    });

    const currentSetting = getSpellSchoolStylesSetting(moduleId);
    const deepEqual = foundry?.utils?.deepEqual
      ?? ((left, right) => JSON.stringify(left) === JSON.stringify(right));
    const hasChanges = !deepEqual(currentSetting, nextSetting);

    if (hasChanges) {
      await runSettingsTransaction(moduleId, async () => {
        await game.settings.set(moduleId, SPELL_SCHOOL_STYLES_SETTING_KEY, nextSetting);
      }, {
        source: "spell-school-settings-app",
      });
    }

    ui.notifications.info(hasChanges
      ? "Saved spell school style settings."
      : "No spell school style setting changes to save.");
    await this.close();
  }

  render(force = false, options = {}) {
    this.moduleId = this._getEffectiveModuleId();
    return super.render(force, options);
  }
}
