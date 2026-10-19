import { MODULE_ID as DEFAULT_MODULE_ID, RARITY_TIERS } from "../core/constants.js";
import {
  buildConfigEnvelope,
  downloadConfigEnvelope,
  promptForConfigEnvelope,
} from "../core/configPortability.js";
import { getRarityFieldDefinitions } from "../core/rarityFieldSchema.js";
import { RARITY_CONFIG } from "../core/rarityConfig.js";
import {
  applyItemRarityThemePresetToDraft,
  CUSTOM_ITEM_RARITY_THEME_ID,
  detectItemRarityThemePresetId,
  getItemRarityThemePreset,
  getItemRarityThemePresetOptions,
  ITEM_RARITY_THEME_RARITIES,
} from "../core/rarityThemePresets.js";
import { getMergedRarityEntries, humanizeRarityLabel, normalizeRarityKey } from "../core/rarityListConfig.js";
import { getRaritySetting } from "../core/settingsManager.js";
import { runSettingsTransaction } from "../core/settingsTransaction.js";
import { ensureRaritySettingsRegistered } from "../settings/settingsRegistration.js";
import { StyleEditorApp } from "./StyleEditorApp.js";

const ITEM_RARITY_CONFIG_KIND = "item-rarity-settings";

/**
 * Item rarity color editor. Every rarity is edited in one draft and saved
 * together; the rail switches which rarity the form shows.
 */
export class ItemRaritySettingsApp extends StyleEditorApp {
  constructor(context = "general", options = {}, moduleId) {
    super(options);
    this.moduleId = moduleId || ItemRaritySettingsApp.MODULE_ID;
    this.selectedRarity = this._resolveInitialRarity(context);
    this.selectedThemeId = CUSTOM_ITEM_RARITY_THEME_ID;
    this._draftSettings = null;
    this._savedSettings = null;
  }

  static CONFIG_LABEL = "item rarity settings";

  static DEFAULT_OPTIONS = {
    id: "sc-item-rarity-colors",
    classes: ["sc-item-rarity-colors--item-tier-manager"],
    window: {
      icon: "fas fa-palette",
      title: "Item Rarity Colors",
    },
  };

  _resolveInitialRarity(context) {
    const rarityOptions = this._getRarityOptions();
    if (!rarityOptions.length) return null;
    const rarityKeys = rarityOptions.map((option) => option.key);
    return rarityKeys.includes(context) ? context : rarityKeys[0];
  }

  _getEffectiveModuleId() {
    return this.moduleId || DEFAULT_MODULE_ID;
  }

  _normalizeRarityKey(rawKey) {
    return normalizeRarityKey(rawKey);
  }

  _isCoreRarityKey(key) {
    const normalized = this._normalizeRarityKey(key);
    return Object.values(RARITY_TIERS).includes(normalized);
  }

  _formatRarityLabelForDisplay(key, label) {
    const rawLabel = String(label || "").trim();
    const fallback = humanizeRarityLabel(key);
    if (!rawLabel || !this._isCoreRarityKey(key)) return rawLabel || fallback;

    const compact = (s) => s.toLowerCase().replace(/[\s_-]+/g, "");
    const isKeyAsLabel = rawLabel === rawLabel.toLowerCase() && compact(rawLabel) === compact(key);
    return isKeyAsLabel ? fallback : rawLabel;
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

  _getManagedThemeRarities() {
    return ITEM_RARITY_THEME_RARITIES;
  }

  _ensureDraftSettings() {
    if (this._draftSettings) return;

    const moduleId = this._getEffectiveModuleId();
    this._draftSettings = {};
    this._savedSettings = {};
    const rarityOptions = this._getRarityOptions();
    const managedRarities = new Set([
      ...rarityOptions.map((option) => option.key),
      ...this._getManagedThemeRarities(),
    ]);

    for (const rarity of managedRarities) {
      this._draftSettings[rarity] = {};
      this._savedSettings[rarity] = {};
      for (const field of this._getFieldDefinitionsForRarity(rarity)) {
        const storedValue = getRaritySetting(moduleId, rarity, field.key, field.defaultValue);
        const normalized = this._normalizeFieldValue(field, storedValue);
        this._draftSettings[rarity][field.key] = normalized;
        this._savedSettings[rarity][field.key] = normalized;
      }
    }

    this._refreshSelectedThemeId();
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

  _refreshSelectedThemeId() {
    this.selectedThemeId = detectItemRarityThemePresetId(
      this._draftSettings,
      this._getManagedThemeRarities()
    );
    return this.selectedThemeId;
  }

  _hasUnsavedChanges() {
    return Object.keys(this._draftSettings ?? {}).some((rarity) => this._isEntryDirty(rarity));
  }

  _applySelectedThemePreset() {
    if (this.selectedThemeId === CUSTOM_ITEM_RARITY_THEME_ID) return false;

    const applied = applyItemRarityThemePresetToDraft(
      this._draftSettings,
      this.selectedThemeId,
      this._getManagedThemeRarities()
    );

    if (applied) {
      this._refreshSelectedThemeId();
    }

    return applied;
  }

  _buildExportData() {
    this._ensureDraftSettings();
    this._captureCurrentRarityDraft(this.form);

    return {
      selectedRarity: this.selectedRarity,
      rarities: this._draftSettings || {},
    };
  }

  _applyImportedConfigData(data) {
    if (!data || typeof data !== "object") {
      throw new Error("Imported config data is invalid.");
    }

    this._ensureDraftSettings();

    const importedRarities = data.rarities;
    if (!importedRarities || typeof importedRarities !== "object") {
      throw new Error("Imported file does not contain item rarity settings.");
    }

    let importedCount = 0;
    let ignoredCount = 0;
    let appliedFieldCount = 0;

    for (const [rawRarityKey, rawFields] of Object.entries(importedRarities)) {
      const rarityKey = this._normalizeRarityKey(rawRarityKey) || String(rawRarityKey || "").trim();
      if (!rarityKey || !rawFields || typeof rawFields !== "object") {
        ignoredCount += 1;
        continue;
      }

      const fieldDefinitions = this._getFieldDefinitionsForRarity(rarityKey);
      if (!fieldDefinitions.length) {
        ignoredCount += 1;
        continue;
      }

      const nextDraft = {
        ...(this._draftSettings[rarityKey] || {}),
      };

      let rarityAppliedFields = 0;
      for (const field of fieldDefinitions) {
        if (!(field.key in rawFields)) continue;
        nextDraft[field.key] = this._normalizeFieldValue(field, rawFields[field.key]);
        rarityAppliedFields += 1;
      }

      if (rarityAppliedFields === 0) {
        ignoredCount += 1;
        continue;
      }

      this._draftSettings[rarityKey] = nextDraft;
      importedCount += 1;
      appliedFieldCount += rarityAppliedFields;
    }

    const importedSelectedRarity = this._normalizeRarityKey(data.selectedRarity);
    if (importedSelectedRarity && this._draftSettings[importedSelectedRarity]) {
      this.selectedRarity = importedSelectedRarity;
    }

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
      ITEM_RARITY_CONFIG_KIND,
      this._buildExportData(),
      { moduleId }
    );

    const result = await downloadConfigEnvelope(envelope, "scirc-item-rarity-settings");
    ui.notifications.info(`Exported item rarity settings to ${result.fileName}.`);
  }

  async _importConfig() {
    const { fileName, envelope } = await promptForConfigEnvelope(ITEM_RARITY_CONFIG_KIND);
    const result = this._applyImportedConfigData(envelope.data);
    await this.render(true);

    ui.notifications.info(
      `Imported item rarity settings from ${fileName}: ${result.importedCount} rarit${result.importedCount === 1 ? "y" : "ies"}, ${result.appliedFieldCount} field(s) applied${result.ignoredCount > 0 ? `, ${result.ignoredCount} entr${result.ignoredCount === 1 ? "y was" : "ies were"} ignored` : ""}.`
    );
  }

  // ---------------------------------------------------------------------------
  // StyleEditorApp hooks
  // ---------------------------------------------------------------------------

  async _prepareContext(options) {
    const rarityOptions = this._getRarityOptions();
    if (!this.selectedRarity || !rarityOptions.some((option) => option.key === this.selectedRarity)) {
      this.selectedRarity = rarityOptions[0]?.key ?? null;
    }

    this._ensureDraftSettings();
    this._refreshSelectedThemeId();
    return super._prepareContext(options);
  }

  _getEntries() {
    return this._getRarityOptions();
  }

  _getSelectedEntryKey() {
    return this.selectedRarity;
  }

  _setSelectedEntryKey(key) {
    this.selectedRarity = key;
  }

  _prepareEditorContext() {
    const selectedRarityLabel =
      this._getRarityOptions().find((option) => option.key === this.selectedRarity)?.label
      || RARITY_CONFIG[this.selectedRarity]?.label
      || humanizeRarityLabel(this.selectedRarity);

    const selectedThemePreset = getItemRarityThemePreset(this.selectedThemeId);
    const themeTooltip = selectedThemePreset
      ? `Choose a preset to apply a visual base to built-in rarities. You can still adjust colors manually. Current preset: ${selectedThemePreset.label}. ${selectedThemePreset.description}`
      : "Choose a preset to apply a visual base to built-in rarities. You can still adjust colors manually.";

    return {
      railTitle: "Rarities",
      entryTitle: selectedRarityLabel,
      entryHint: "Colors for item sheets, inventory rows, and the sidebar. The preview updates as you edit.",
      themeTooltip,
      themeOptions: [
        ...getItemRarityThemePresetOptions().map((option) => ({
          ...option,
          selected: option.id === this.selectedThemeId,
        })),
        {
          id: CUSTOM_ITEM_RARITY_THEME_ID,
          label: "Custom",
          selected: this.selectedThemeId === CUSTOM_ITEM_RARITY_THEME_ID,
          disabled: true,
        },
      ],
      sections: this._buildFieldSections(
        this._getFieldDefinitionsForRarity(this.selectedRarity),
        this._draftSettings?.[this.selectedRarity] ?? {},
        this.selectedRarity
      ),
    };
  }

  _captureDraft() {
    this._captureCurrentRarityDraft(this.element);
  }

  _isEntryDirty(rarity) {
    const draft = this._draftSettings?.[rarity];
    const saved = this._savedSettings?.[rarity];
    if (!draft) return false;
    if (!saved) return true;
    // Color inputs report lowercase hex while stored values may not be.
    const same = (left, right) => String(left).toLowerCase() === String(right).toLowerCase();
    return Object.entries(draft).some(([fieldKey, value]) => !same(value, saved[fieldKey]));
  }

  _getEntryValues(rarity) {
    return this._draftSettings?.[rarity] ?? null;
  }

  _getPreviewKey() {
    return this.selectedRarity;
  }

  _applyThemePreset(themeId) {
    if (!themeId || themeId === CUSTOM_ITEM_RARITY_THEME_ID) {
      this._refreshSelectedThemeId();
      return false;
    }
    this.selectedThemeId = themeId;
    return this._applySelectedThemePreset();
  }

  async _persist() {
    const moduleId = this._getEffectiveModuleId();
    this.moduleId = moduleId;

    const rarityLabelMap = new Map(this._getRarityOptions().map((option) => [option.key, option.label]));
    for (const rarity of Object.keys(this._draftSettings || {})) {
      ensureRaritySettingsRegistered(moduleId, rarity, rarityLabelMap.get(rarity));
    }

    const pendingUpdates = [];
    for (const [rarity, raritySettings] of Object.entries(this._draftSettings || {})) {
      for (const field of this._getFieldDefinitionsForRarity(rarity)) {
        const settingName = `${rarity}-${field.key}`;
        if (!game.settings.settings.has(`${moduleId}.${settingName}`)) continue;

        const settingValue = this._normalizeFieldValue(field, raritySettings[field.key]);
        if (game.settings.get(moduleId, settingName) === settingValue) continue;
        pendingUpdates.push({ settingName, settingValue });
      }
    }

    if (pendingUpdates.length > 0) {
      await runSettingsTransaction(moduleId, async () => {
        await Promise.all(
          pendingUpdates.map(({ settingName, settingValue }) =>
            game.settings.set(moduleId, settingName, settingValue)
          )
        );
      }, {
        source: "item-rarity-settings-app",
        updateCount: pendingUpdates.length,
      });
    }

    this._savedSettings = foundry.utils.deepClone(this._draftSettings);
  }

  render(force = false, options = {}) {
    this.moduleId = this._getEffectiveModuleId();
    return super.render(force, options);
  }
}
