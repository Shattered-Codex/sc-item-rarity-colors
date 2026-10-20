import { MODULE_ID as DEFAULT_MODULE_ID } from "../core/constants.js";
import {
  buildConfigEnvelope,
  downloadConfigEnvelope,
  promptForConfigEnvelope,
} from "../core/configPortability.js";
import { getRarityFieldDefinitions } from "../core/rarityFieldSchema.js";
import { runSettingsTransaction } from "../core/settingsTransaction.js";
import {
  buildSpellProfileKey,
  ensureSpellProfileInSetting,
  getDefaultSpellStyleFieldValues,
  getSpellLevelEntries,
  getSpellSchoolEntries,
  getSpellSchoolStylesSetting,
  normalizeSpellStyleFieldValues,
  normalizeSpellSchoolStylesSetting,
  normalizeSpellLevel,
  normalizeSpellSchoolKey,
  SPELL_SCHOOL_STYLES_SETTING_KEY,
} from "../core/spellSchoolConfig.js";
import {
  applySpellThemePresetToDraft,
  CUSTOM_SPELL_THEME_ID,
  detectSpellThemePresetId,
  getSpellThemePreset,
  getSpellThemePresetOptions,
} from "../core/spellThemePresets.js";
import { StyleEditorApp } from "./StyleEditorApp.js";
import { getSpellPreviewSample } from "../core/spellPreviewSamples.js";

const SPELL_SCHOOL_CONFIG_KIND = "spell-school-settings";

/**
 * Spell school color editor. The rail lists schools; with level variants on,
 * each school also has one profile per spell level, picked in the header.
 */
export class SpellSchoolSettingsApp extends StyleEditorApp {
  constructor(context = "general", options = {}, moduleId) {
    super(options);
    this.moduleId = moduleId || SpellSchoolSettingsApp.MODULE_ID;
    this.selectedSchool = null;
    this.selectedLevel = 0;
    this.selectedThemeId = CUSTOM_SPELL_THEME_ID;
    this.useLevelVariants = false;
    this._schools = [];
    this._levels = getSpellLevelEntries();
    this._draftProfiles = null;
    this._savedSetting = null;
  }

  static CONFIG_LABEL = "spell school settings";

  static PREVIEW_PARTIALS = Object.freeze({ dnd5e: "spell-template", tidy5e: "tidy-spell-template" });

  static PREVIEW_IS_SPELL = true;

  static SECTION_TITLES = Object.freeze({
    ...StyleEditorApp.SECTION_TITLES,
    "item-sheet": "Spell sheet",
  });

  static DEFAULT_OPTIONS = {
    id: "sc-item-rarity-colors-spell-school-settings",
    classes: ["sc-item-rarity-colors--spell-school-manager"],
    window: {
      icon: "fas fa-book-sparkles",
      title: "Spell School Colors",
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
    this._savedSetting = normalized;
    this._refreshSelectedThemeId();
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

  _buildDraftSetting() {
    return normalizeSpellSchoolStylesSetting({
      useLevelVariants: this.useLevelVariants,
      profiles: this._draftProfiles || {},
    });
  }

  _refreshSelectedThemeId() {
    this.selectedThemeId = detectSpellThemePresetId(this._draftProfiles, {
      schools: this._getSchoolOptions(),
      levels: this._getLevelOptions().map((level) => level.value),
    });
    return this.selectedThemeId;
  }

  _applySelectedThemePreset() {
    if (this.selectedThemeId === CUSTOM_SPELL_THEME_ID) return false;

    const applied = applySpellThemePresetToDraft(this._draftProfiles, this.selectedThemeId, {
      schools: this._getSchoolOptions(),
      levels: this._getLevelOptions().map((level) => level.value),
    });

    if (applied) {
      this._refreshSelectedThemeId();
    }

    return applied;
  }

  _getSupportedProfileKeys() {
    const keys = new Set();
    const schools = this._getSchoolOptions();
    const levels = this._getLevelOptions().map((level) => level.value);

    for (const school of schools) {
      const baseKey = buildSpellProfileKey(school.key, null, false);
      if (baseKey) keys.add(baseKey);

      for (const level of levels) {
        const profileKey = buildSpellProfileKey(school.key, level, true);
        if (profileKey) keys.add(profileKey);
      }
    }

    return keys;
  }

  _buildExportData() {
    this._ensureDraftSettings();
    this._captureCurrentProfileDraft(this.form);

    return {
      selectedSchool: this.selectedSchool,
      selectedLevel: this.selectedLevel,
      setting: this._buildDraftSetting(),
    };
  }

  _applyImportedConfigData(data) {
    if (!data || typeof data !== "object") {
      throw new Error("Imported config data is invalid.");
    }

    this._ensureDraftSettings();

    const rawSetting = data.setting && typeof data.setting === "object" ? data.setting : data;
    const importedProfiles = rawSetting?.profiles;
    if (!importedProfiles || typeof importedProfiles !== "object") {
      throw new Error("Imported file does not contain spell school profiles.");
    }

    if ("useLevelVariants" in rawSetting) {
      this.useLevelVariants = rawSetting.useLevelVariants === true
        || rawSetting.useLevelVariants === "true"
        || rawSetting.useLevelVariants === "on"
        || rawSetting.useLevelVariants === 1
        || rawSetting.useLevelVariants === "1";
    }

    const supportedProfileKeys = this._getSupportedProfileKeys();
    const nextDraftProfiles = {
      ...(this._draftProfiles || {}),
    };

    let importedCount = 0;
    let ignoredCount = 0;
    let appliedFieldCount = 0;

    for (const [profileKey, rawFields] of Object.entries(importedProfiles)) {
      if (!supportedProfileKeys.has(profileKey) || !rawFields || typeof rawFields !== "object") {
        ignoredCount += 1;
        continue;
      }

      const existingFields = nextDraftProfiles[profileKey] || getDefaultSpellStyleFieldValues();
      const normalizedFields = normalizeSpellStyleFieldValues(rawFields, existingFields);
      let profileAppliedFields = 0;

      for (const field of this._getFieldDefinitions()) {
        if (!(field.key in rawFields)) continue;
        profileAppliedFields += 1;
      }

      if (profileAppliedFields === 0) {
        ignoredCount += 1;
        continue;
      }

      nextDraftProfiles[profileKey] = normalizedFields;
      importedCount += 1;
      appliedFieldCount += profileAppliedFields;
    }

    this._draftProfiles = nextDraftProfiles;

    const importedSchool = normalizeSpellSchoolKey(data.selectedSchool);
    if (importedSchool) {
      this.selectedSchool = importedSchool;
    }

    const importedLevel = normalizeSpellLevel(data.selectedLevel);
    if (importedLevel !== null) {
      this.selectedLevel = importedLevel;
    }

    this._ensureCurrentProfileDraft();
    this._refreshSelectedThemeId();

    return {
      importedCount,
      ignoredCount,
      appliedFieldCount,
    };
  }

  async _exportConfig() {
    const moduleId = this._getEffectiveModuleId();
    const envelope = buildConfigEnvelope(
      SPELL_SCHOOL_CONFIG_KIND,
      this._buildExportData(),
      { moduleId }
    );

    const result = await downloadConfigEnvelope(envelope, "scirc-spell-school-settings");
    ui.notifications.info(`Exported spell school settings to ${result.fileName}.`);
  }

  async _importConfig() {
    const { fileName, envelope } = await promptForConfigEnvelope(SPELL_SCHOOL_CONFIG_KIND);
    const result = this._applyImportedConfigData(envelope.data);
    await this.render(true);

    ui.notifications.info(
      `Imported spell school settings from ${fileName}: ${result.importedCount} profile(s), ${result.appliedFieldCount} field(s) applied${result.ignoredCount > 0 ? `, ${result.ignoredCount} entr${result.ignoredCount === 1 ? "y was" : "ies were"} ignored` : ""}.`
    );
  }

  // ---------------------------------------------------------------------------
  // StyleEditorApp hooks
  // ---------------------------------------------------------------------------

  async _prepareContext(options) {
    this._ensureDraftSettings();

    const schools = this._getSchoolOptions();
    if (!this.selectedSchool || !schools.some((school) => school.key === this.selectedSchool)) {
      this.selectedSchool = schools[0]?.key ?? null;
    }
    if (!this._getLevelOptions().some((level) => level.value === this.selectedLevel)) {
      this.selectedLevel = 0;
    }

    this._ensureCurrentProfileDraft();
    return super._prepareContext(options);
  }

  _getEntries() {
    return this._getSchoolOptions().map((school) => ({ key: school.key, label: school.label }));
  }

  _getSelectedEntryKey() {
    return this.selectedSchool;
  }

  _setSelectedEntryKey(key) {
    this.selectedSchool = normalizeSpellSchoolKey(key) || this.selectedSchool;
  }

  _prepareEditorContext() {
    const schoolLabel = this._getSchoolOptions().find((school) => school.key === this.selectedSchool)?.label
      || this.selectedSchool;
    const levels = this._getLevelOptions();
    const levelLabel = levels.find((level) => level.value === this.selectedLevel)?.label || `Level ${this.selectedLevel}`;
    const profileKey = this._getCurrentProfileKey();

    const selectedThemePreset = getSpellThemePreset(this.selectedThemeId);
    const themeTooltip = selectedThemePreset
      ? `Choose a preset to apply school and level spell visuals. You can still adjust colors manually. Current preset: ${selectedThemePreset.label}. ${selectedThemePreset.description}`
      : "Choose a preset to apply school and level spell visuals. You can still adjust colors manually.";

    return {
      // The preview shows a real spell of this school (and level, with level
      // variants), so the style reads as it will on the spells it colors.
      previewSpell: getSpellPreviewSample(this.selectedSchool, this.useLevelVariants ? this.selectedLevel : null, schoolLabel),
      railTitle: "Schools",
      entryTitle: this.useLevelVariants ? `${schoolLabel} · ${levelLabel}` : schoolLabel,
      entryHint: this.useLevelVariants
        ? "Colors for spells of this school at the selected level. The preview updates as you edit."
        : "Colors for every spell of this school. The preview updates as you edit.",
      themeTooltip,
      themeOptions: [
        ...getSpellThemePresetOptions().map((option) => ({
          ...option,
          selected: option.id === this.selectedThemeId,
        })),
        {
          id: CUSTOM_SPELL_THEME_ID,
          label: "Custom",
          selected: this.selectedThemeId === CUSTOM_SPELL_THEME_ID,
          disabled: true,
        },
      ],
      levelControls: {
        enabled: this.useLevelVariants,
        options: levels.map((level) => ({
          value: level.value,
          label: level.label,
          selected: level.value === this.selectedLevel,
        })),
      },
      panels: profileKey
        ? this._buildFieldPanels(this._getFieldDefinitions(), this._draftProfiles?.[profileKey] ?? {}, profileKey)
        : [],
    };
  }

  _captureDraft() {
    this._captureCurrentProfileDraft(this.element);
  }

  /**
   * A school is dirty when any of its profiles (the school itself or one of
   * its levels) differs from what is stored. A level profile that was never
   * saved is compared with what it would inherit from the stored school.
   */
  _isEntryDirty(school) {
    const baseKey = buildSpellProfileKey(school, null, false);
    if (!baseKey || !this._draftProfiles || !this._savedSetting) return false;

    const savedProfiles = this._savedSetting.profiles ?? {};
    for (const [profileKey, values] of Object.entries(this._draftProfiles)) {
      if (profileKey !== baseKey && !profileKey.startsWith(`${baseKey}_lvl_`)) continue;

      const reference = savedProfiles[profileKey]
        ?? normalizeSpellStyleFieldValues({}, savedProfiles[baseKey] ?? getDefaultSpellStyleFieldValues());
      if (JSON.stringify(normalizeSpellStyleFieldValues(values)) !== JSON.stringify(reference)) return true;
    }
    return false;
  }

  _hasUnsavedChanges(knownEntryDirty) {
    if (!this._draftProfiles || !this._savedSetting) return false;
    if (this.useLevelVariants !== (this._savedSetting.useLevelVariants === true)) return true;
    return this._getSchoolOptions().some((school) =>
      knownEntryDirty?.get(school.key) ?? this._isEntryDirty(school.key)
    );
  }

  _getEntryValues(school) {
    const levelKey = this._getCurrentProfileKey({ school });
    const baseKey = this._getCurrentProfileKey({ school, useLevelVariants: false });
    return this._draftProfiles?.[levelKey] ?? this._draftProfiles?.[baseKey] ?? null;
  }

  _getPreviewKey() {
    return this._getCurrentProfileKey();
  }

  _applyThemePreset(themeId) {
    if (!themeId || themeId === CUSTOM_SPELL_THEME_ID) {
      this._refreshSelectedThemeId();
      return false;
    }
    this.selectedThemeId = themeId;
    return this._applySelectedThemePreset();
  }

  async _onEditorControlChange(target) {
    if (target.dataset.editorControl === "level-variants") {
      this.useLevelVariants = target.checked === true;
    } else if (target.dataset.editorControl === "level") {
      const nextLevel = normalizeSpellLevel(target.value);
      this.selectedLevel = nextLevel === null ? 0 : nextLevel;
    } else {
      return;
    }
    await this.render();
  }

  async _persist() {
    const moduleId = this._getEffectiveModuleId();
    this.moduleId = moduleId;

    const nextSetting = this._buildDraftSetting();
    const deepEqual = foundry?.utils?.deepEqual
      ?? ((left, right) => JSON.stringify(left) === JSON.stringify(right));

    if (!deepEqual(getSpellSchoolStylesSetting(moduleId), nextSetting)) {
      await runSettingsTransaction(moduleId, async () => {
        await game.settings.set(moduleId, SPELL_SCHOOL_STYLES_SETTING_KEY, nextSetting);
      }, {
        source: "spell-school-settings-app",
      });
    }

    this._savedSetting = normalizeSpellSchoolStylesSetting(nextSetting);
  }

  render(force = false, options = {}) {
    this.moduleId = this._getEffectiveModuleId();
    return super.render(force, options);
  }
}
