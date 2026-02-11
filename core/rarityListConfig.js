import { MODULE_ID, RARITY_TIERS } from "./constants.js";
import { RARITY_CONFIG } from "./rarityConfig.js";

export const RARITY_LIST_SETTING_KEY = "rarity-list-config";
export const RARITY_LIST_ENABLED_SETTING_KEY = "rarity-list-enabled";

export function normalizeRarityKey(rawKey) {
  if (rawKey === undefined || rawKey === null) return null;
  const normalized = String(rawKey).trim().toLowerCase();
  return normalized || null;
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

export async function saveModuleRarityEntries(moduleId = MODULE_ID, entries = [], enabled = true) {
  if (game.settings.settings.has(`${moduleId}.${RARITY_LIST_ENABLED_SETTING_KEY}`)) {
    await game.settings.set(moduleId, RARITY_LIST_ENABLED_SETTING_KEY, Boolean(enabled));
  }
  if (game.settings.settings.has(`${moduleId}.${RARITY_LIST_SETTING_KEY}`)) {
    await game.settings.set(moduleId, RARITY_LIST_SETTING_KEY, buildRaritySettingObject(entries));
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

  const currentSetting = game.settings.get("custom-dnd5e", "item-rarity");
  const nextSetting = buildCustomRaritySetting(entries, currentSetting);
  await game.settings.set("custom-dnd5e", "item-rarity", nextSetting);

  const enabled = game.settings.settings.has("custom-dnd5e.enable-item-rarity")
    ? game.settings.get("custom-dnd5e", "enable-item-rarity")
    : true;

  if (!enabled) return;

  const nextConfig = buildCustomConfigFromSetting(nextSetting);
  Hooks.callAll("customDnd5e.setItemRarityConfig", nextConfig);
  if (nextConfig && Object.keys(nextConfig).length) {
    CONFIG.DND5E.itemRarity = nextConfig;
  }
}
