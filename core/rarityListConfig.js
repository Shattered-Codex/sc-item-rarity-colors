import { MODULE_ID, RARITY_TIERS } from "./constants.js";
import { RARITY_CONFIG } from "./rarityConfig.js";

export const RARITY_LIST_SETTING_KEY = "rarity-list-config";
export const RARITY_LIST_ENABLED_SETTING_KEY = "rarity-list-enabled";

const BUILTIN_RARITY_ALIASES = Object.freeze({
  common: RARITY_TIERS.COMMON,
  uncommon: RARITY_TIERS.UNCOMMON,
  rare: RARITY_TIERS.RARE,
  veryrare: RARITY_TIERS.VERY_RARE,
  legendary: RARITY_TIERS.LEGENDARY,
  artifact: RARITY_TIERS.ARTIFACT,
});

function toRarityLookupKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
}

function getKnownRarityKeys() {
  const keys = [];

  const systemRarity = CONFIG?.DND5E?.itemRarity ?? game?.dnd5e?.config?.itemRarity;
  if (systemRarity && typeof systemRarity === "object") {
    keys.push(...Object.keys(systemRarity));
  }

  const customModule = game?.modules?.get?.("custom-dnd5e");
  const hasCustomSetting = game?.settings?.settings?.has?.("custom-dnd5e.item-rarity");
  if (customModule?.active && hasCustomSetting) {
    const customSetting = game.settings.get("custom-dnd5e", "item-rarity");
    if (customSetting && typeof customSetting === "object") {
      for (const [rawKey, rawValue] of Object.entries(customSetting)) {
        keys.push(rawKey);
        if (rawValue && typeof rawValue === "object" && typeof rawValue.key === "string") {
          keys.push(rawValue.key);
        }
      }
    }
  }

  return keys;
}

export function normalizeRarityKey(rawKey) {
  if (rawKey === undefined || rawKey === null) return null;

  const trimmed = String(rawKey).trim();
  if (!trimmed) return null;

  const lookupKey = toRarityLookupKey(trimmed);
  if (!lookupKey) return null;

  const builtin = BUILTIN_RARITY_ALIASES[lookupKey];
  if (builtin) return builtin;

  const knownKeys = getKnownRarityKeys();
  for (const knownKey of knownKeys) {
    if (toRarityLookupKey(knownKey) === lookupKey) {
      return String(knownKey).trim();
    }
  }

  return trimmed;
}

export function humanizeRarityLabel(key) {
  const value = String(key || "").trim();
  if (!value) return "Unknown";

  const spaced = value
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();

  return spaced
    .split(" ")
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join(" ");
}

export function localizeMaybe(label) {
  if (typeof label !== "string" || !label.trim()) return "";
  if (game?.i18n?.has?.(label)) return game.i18n.localize(label);
  return label;
}

export function getFallbackRarityEntries() {
  const configuredEntries = Object.entries(RARITY_CONFIG || {})
    .map(([rawKey, config]) => ({
      key: normalizeRarityKey(rawKey),
      label: config.label || humanizeRarityLabel(rawKey),
      visible: true,
      system: true,
    }))
    .filter((entry) => entry.key);

  if (configuredEntries.length) return configuredEntries;

  return [
    { key: RARITY_TIERS.COMMON, label: "Common", visible: true, system: true },
    { key: RARITY_TIERS.UNCOMMON, label: "Uncommon", visible: true, system: true },
    { key: RARITY_TIERS.RARE, label: "Rare", visible: true, system: true },
    { key: RARITY_TIERS.VERY_RARE, label: "Very Rare", visible: true, system: true },
    { key: RARITY_TIERS.LEGENDARY, label: "Legendary", visible: true, system: true },
    { key: RARITY_TIERS.ARTIFACT, label: "Artifact", visible: true, system: true },
  ];
}

function parseRarityEntries(rawData, { fallbackSystem = false } = {}) {
  if (!rawData || typeof rawData !== "object") return [];

  return Object.entries(rawData)
    .map(([rawKey, rawValue]) => {
      if (typeof rawValue === "string") {
        const key = normalizeRarityKey(rawKey);
        if (!key) return null;
        return {
          key,
          label: localizeMaybe(rawValue) || humanizeRarityLabel(rawKey),
          visible: true,
          system: fallbackSystem,
        };
      }

      if (!rawValue || typeof rawValue !== "object") return null;

      const keyCandidate = rawValue.key ?? rawKey;
      const key = normalizeRarityKey(keyCandidate);
      if (!key) return null;

      return {
        key,
        label: localizeMaybe(rawValue.label ?? keyCandidate) || humanizeRarityLabel(keyCandidate),
        visible: rawValue.visible !== false,
        system: rawValue.system === true || fallbackSystem,
      };
    })
    .filter(Boolean);
}

export function getSystemRarityEntries() {
  const source = CONFIG?.DND5E?.itemRarity ?? game?.dnd5e?.config?.itemRarity;
  const entries = parseRarityEntries(source, { fallbackSystem: true });
  return entries.length ? entries : getFallbackRarityEntries();
}

export function getCustomDnd5eRarityEntries() {
  const customModule = game.modules.get("custom-dnd5e");
  if (!customModule?.active) return [];
  if (!game.settings.settings.has("custom-dnd5e.item-rarity")) return [];

  const settingData = game.settings.get("custom-dnd5e", "item-rarity");
  return parseRarityEntries(settingData);
}

export function getModuleRarityEntries(moduleId = MODULE_ID) {
  const fullSettingKey = `${moduleId}.${RARITY_LIST_SETTING_KEY}`;
  if (!game.settings.settings.has(fullSettingKey)) return [];

  const settingData = game.settings.get(moduleId, RARITY_LIST_SETTING_KEY);
  return parseRarityEntries(settingData);
}

export function isModuleRarityListEnabled(moduleId = MODULE_ID) {
  const fullSettingKey = `${moduleId}.${RARITY_LIST_ENABLED_SETTING_KEY}`;
  if (!game.settings.settings.has(fullSettingKey)) return true;
  return game.settings.get(moduleId, RARITY_LIST_ENABLED_SETTING_KEY);
}

function mergeEntries(...entryLists) {
  const merged = new Map();

  for (const list of entryLists) {
    for (const item of list || []) {
      const key = normalizeRarityKey(item?.key);
      if (!key || merged.has(key)) continue;

      merged.set(key, {
        key,
        label: item.label || humanizeRarityLabel(key),
        visible: item.visible !== false,
        system: item.system === true,
      });
    }
  }

  return Array.from(merged.values());
}

export function getMergedRarityEntries(moduleId = MODULE_ID, { includeHidden = false } = {}) {
  const moduleEntries = isModuleRarityListEnabled(moduleId) ? getModuleRarityEntries(moduleId) : [];
  const customEntries = getCustomDnd5eRarityEntries();
  const systemEntries = getSystemRarityEntries();
  const fallbackEntries = getFallbackRarityEntries();

  const merged = mergeEntries(moduleEntries, customEntries, systemEntries, fallbackEntries);
  return includeHidden ? merged : merged.filter((entry) => entry.visible !== false);
}

export function buildRaritySettingObject(entries = []) {
  const settingData = {};
  for (const entry of entries) {
    const key = normalizeRarityKey(entry?.key);
    if (!key) continue;

    settingData[key] = {
      key,
      label: entry.label || humanizeRarityLabel(key),
      visible: entry.visible !== false,
      system: entry.system === true,
    };
  }

  return settingData;
}

export function buildDnd5eRarityConfig(entries = []) {
  const config = {};

  for (const entry of entries) {
    const key = normalizeRarityKey(entry?.key);
    if (!key) continue;
    if (entry?.visible === false) continue;

    config[key] = localizeMaybe(entry?.label || key) || humanizeRarityLabel(key);
  }

  return config;
}

export function applyMergedRarityConfigToDnd5e(moduleId = MODULE_ID) {
  if (!CONFIG?.DND5E) return {};

  const mergedEntries = getMergedRarityEntries(moduleId, { includeHidden: false });
  const nextConfig = buildDnd5eRarityConfig(mergedEntries);

  if (Object.keys(nextConfig).length) {
    CONFIG.DND5E.itemRarity = nextConfig;
  }

  return nextConfig;
}

export async function saveModuleRarityEntries(moduleId = MODULE_ID, entries = [], enabled = true) {
  const deepEqual = foundry?.utils?.deepEqual
    ?? ((left, right) => JSON.stringify(left) === JSON.stringify(right));

  if (game.settings.settings.has(`${moduleId}.${RARITY_LIST_ENABLED_SETTING_KEY}`)) {
    const nextEnabled = Boolean(enabled);
    const currentEnabled = game.settings.get(moduleId, RARITY_LIST_ENABLED_SETTING_KEY);
    if (currentEnabled !== nextEnabled) {
      await game.settings.set(moduleId, RARITY_LIST_ENABLED_SETTING_KEY, nextEnabled);
    }
  }

  if (game.settings.settings.has(`${moduleId}.${RARITY_LIST_SETTING_KEY}`)) {
    const nextEntries = buildRaritySettingObject(entries);
    const currentEntries = game.settings.get(moduleId, RARITY_LIST_SETTING_KEY);
    if (!deepEqual(currentEntries, nextEntries)) {
      await game.settings.set(moduleId, RARITY_LIST_SETTING_KEY, nextEntries);
    }
  }
}

function buildCustomRaritySetting(entries = [], existing = {}) {
  const existingObject = (existing && typeof existing === "object") ? existing : {};
  const output = {};

  for (const entry of entries) {
    const key = normalizeRarityKey(entry?.key);
    if (!key) continue;

    const current = existingObject[key];
    output[key] = {
      ...(current && typeof current === "object" ? current : {}),
      key,
      label: entry.label || humanizeRarityLabel(key),
      visible: entry.visible !== false,
      system: entry.system === true,
    };
  }

  return output;
}

function buildCustomConfigFromSetting(settingData = {}) {
  return Object.fromEntries(
    Object.entries(settingData)
      .filter(([, value]) => value?.visible !== false)
      .map(([key, value]) => [key, localizeMaybe(value?.label || key) || humanizeRarityLabel(key)])
  );
}

export async function syncEntriesToCustomDnd5e(entries = []) {
  const customModule = game.modules.get("custom-dnd5e");
  if (!customModule?.active) return;
  if (!game.settings.settings.has("custom-dnd5e.item-rarity")) return;

  const deepEqual = foundry?.utils?.deepEqual
    ?? ((left, right) => JSON.stringify(left) === JSON.stringify(right));

  const currentSetting = game.settings.get("custom-dnd5e", "item-rarity");
  const nextSetting = buildCustomRaritySetting(entries, currentSetting);
  const didSettingChange = !deepEqual(currentSetting, nextSetting);
  if (didSettingChange) {
    await game.settings.set("custom-dnd5e", "item-rarity", nextSetting);
  }

  const enabled = game.settings.settings.has("custom-dnd5e.enable-item-rarity")
    ? game.settings.get("custom-dnd5e", "enable-item-rarity")
    : true;

  if (!enabled) return;

  const nextConfig = buildCustomConfigFromSetting(nextSetting);
  if (!didSettingChange) return;

  Hooks.callAll("customDnd5e.setItemRarityConfig", nextConfig);
  if (nextConfig && Object.keys(nextConfig).length) {
    CONFIG.DND5E.itemRarity = nextConfig;
  }
}
