// Run: node --test tests/colorIntensity.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { softenColor, withColorIntensity } from "../core/colorIntensity.js";
import { normalizeRangeFieldValue, RARITY_FIELD_DEFINITIONS } from "../core/rarityFieldSchema.js";
import { APPEARANCE_SETTING_FIELDS, readAppearanceSettings } from "../core/appearanceSettingFields.js";
import { readEffectSettings } from "../core/effectSettingFields.js";
import { gradientStopDeclarations, gradientStopVariables } from "../core/gradientCoverage.js";

globalThis.foundry ??= { utils: { deepClone: (value) => structuredClone(value) } };
const spellPresets = await import("../core/spellThemePresets.js");
const rarityPresets = await import("../core/rarityThemePresets.js");

const fieldByKey = (key) => RARITY_FIELD_DEFINITIONS.find((field) => field.key === key);
const SLIDER_KEYS = [...Object.values(APPEARANCE_SETTING_FIELDS), "inventory-border-glow-size"];

function luminance(hex) {
  const [r, g, b] = [1, 3, 5]
    .map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255)
    .map((channel) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(colorA, colorB) {
  const [light, dark] = [luminance(colorA), luminance(colorB)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

test("full intensity returns the very same settings, so themed worlds are unchanged", () => {
  const settings = { sheetColorIntensity: 100, inventoryColorIntensity: 100, sidebarColorIntensity: 100, backgroundColor: "#ff0000" };
  for (const surface of ["sheet", "inventory", "sidebar"]) assert.equal(withColorIntensity(settings, surface), settings);
  assert.equal(withColorIntensity({ backgroundColor: "#ff0000" }, "sheet").backgroundColor, "#ff0000");
  assert.equal(softenColor("#FF8800", 100), "#FF8800");
});

test("each surface uses its own intensity", () => {
  const settings = { sheetColorIntensity: 100, inventoryColorIntensity: 40, sidebarColorIntensity: 70, backgroundColor: "#ff0000" };
  assert.equal(withColorIntensity(settings, "sheet").backgroundColor, "#ff0000");
  assert.equal(withColorIntensity(settings, "inventory").backgroundColor, softenColor("#ff0000", 40));
  assert.equal(withColorIntensity(settings, "sidebar").backgroundColor, softenColor("#ff0000", 70));
});

test("softening keeps the contrast with the text color", () => {
  const pairs = [
    ["#2f3440", "#e8eaf0"], // Unidentified style default
    ["#ff0000", "#ffffff"],
    ["#0000ff", "#ffffff"],
    ["#00ff00", "#000000"],
    ["#a335ee", "#ffffff"],
    ["#ff8000", "#000000"],
  ];
  for (const [background, text] of pairs) {
    const original = contrast(background, text);
    for (const intensity of [70, 40, 10]) {
      const softened = softenColor(background, intensity);
      assert.notEqual(softened, background);
      assert.ok(
        Math.abs(contrast(softened, text) - original) < 0.1,
        `${background} at ${intensity}% on ${text}: ${contrast(softened, text).toFixed(2)} vs ${original.toFixed(2)}`
      );
    }
  }
});

test("grays, invalid values, and alpha are handled", () => {
  assert.equal(softenColor("#FFFFFF", 30), "#FFFFFF");
  assert.equal(softenColor("#808080", 30), "#808080");
  assert.equal(softenColor("not a color", 30), "not a color");
  assert.equal(softenColor("#ff000080", 50).slice(-2), "80");
});

test("only surface and border colors soften; text and effects keep their color", () => {
  const shown = withColorIntensity({
    inventoryColorIntensity: 40,
    backgroundColor: "#ff0000",
    gradientEnabled: true,
    gradientColor: "#0000ff",
    inventoryBorderColor: "#00ff00",
    itemSheetTextColor: "#ffd700",
    enableEffectColor: false,
  }, "inventory");
  assert.notEqual(shown.backgroundColor, "#ff0000");
  assert.notEqual(shown.gradientColor, "#0000ff");
  assert.notEqual(shown.inventoryBorderColor, "#00ff00");
  assert.equal(shown.itemSheetTextColor, "#ffd700");
  // The effect color follows the stored gradient color, as at 100%.
  assert.equal(shown.enableEffectColor, true);
  assert.equal(shown.effectColor, "#0000ff");
});

test("the sliders are non-themeable and default to the original look", () => {
  const defaults = {
    "sheet-color-intensity": 100,
    "inventory-color-intensity": 100,
    "sidebar-color-intensity": 100,
    "inventory-gradient-coverage": 100,
    "sidebar-gradient-coverage": 100,
    "inventory-border-glow-size": 8,
  };
  for (const [key, defaultValue] of Object.entries(defaults)) {
    const field = fieldByKey(key);
    assert.equal(field?.type, "range", key);
    assert.equal(field.defaultValue, defaultValue, key);
    assert.equal(field.themeable, false, key);
  }
  const intensity = fieldByKey("inventory-color-intensity");
  assert.equal(normalizeRangeFieldValue(intensity, "73"), 75);
  assert.equal(normalizeRangeFieldValue(intensity, 0), 10);
  assert.equal(normalizeRangeFieldValue(intensity, 250), 100);
  for (const unreadable of [undefined, null, "", "abc"]) {
    assert.equal(normalizeRangeFieldValue(intensity, unreadable), 100);
  }
});

test("settings that were never saved read as the defaults", () => {
  const appearance = readAppearanceSettings(() => undefined);
  assert.deepEqual(appearance, {
    sheetColorIntensity: 100,
    inventoryColorIntensity: 100,
    sidebarColorIntensity: 100,
    inventoryGradientCoverage: 100,
    sidebarGradientCoverage: 100,
  });
  assert.equal(readEffectSettings(() => undefined).inventoryBorderGlowSize, 8);
  // The editor form hands sliders over as strings.
  assert.equal(readEffectSettings((key) => (key === "inventory-border-glow-size" ? "12" : undefined)).inventoryBorderGlowSize, 12);
});

test("gradient coverage keeps the original stops at 100% and moves them otherwise", () => {
  for (const surface of ["inventory", "sidebar"]) {
    assert.deepEqual(gradientStopVariables(surface, 100), {});
    assert.deepEqual(gradientStopVariables(surface, undefined), {});
    assert.equal(gradientStopDeclarations(surface, 100), "");
  }
  assert.deepEqual(gradientStopVariables("inventory", 200), {
    "--scirc-inv-bg-primary-stop": "20%",
    "--scirc-inv-bg-secondary-stop": "60%",
    "--scirc-inv-bg-fallback-stop": "100%",
  });
  assert.deepEqual(gradientStopVariables("sidebar", 50), {
    "--scirc-dir-bg-fallback-stop": "73%",
    "--scirc-dir-bg-primary-stop": "86%",
  });
  // The colored band grows toward the left edge, never past it.
  assert.equal(gradientStopVariables("sidebar", 180)["--scirc-dir-bg-fallback-stop"], "2.8%");
});

test("theme presets neither set nor compare the sliders", () => {
  const options = { schools: [{ key: "evo", label: "Evocation" }], levels: [1] };
  const spellPresetId = spellPresets.getSpellThemePresetOptions()[0].id;
  const custom = Object.fromEntries(SLIDER_KEYS.map((key) => [key, fieldByKey(key).range.min]));
  const spellDraft = { school_evo: { ...custom } };
  spellPresets.applySpellThemePresetToDraft(spellDraft, spellPresetId, options);
  for (const key of SLIDER_KEYS) assert.equal(spellDraft.school_evo[key], custom[key], key);
  assert.equal(spellPresets.doesDraftMatchSpellThemePreset(spellDraft, spellPresetId, options), true);

  const rarityPresetId = rarityPresets.getItemRarityThemePresetOptions()[1].id;
  const rarityDraft = { rare: { ...custom } };
  rarityPresets.applyItemRarityThemePresetToDraft(rarityDraft, rarityPresetId);
  for (const key of SLIDER_KEYS) assert.equal(rarityDraft.rare[key], custom[key], key);
  assert.equal(rarityPresets.detectItemRarityThemePresetId(rarityDraft), rarityPresetId);
});
