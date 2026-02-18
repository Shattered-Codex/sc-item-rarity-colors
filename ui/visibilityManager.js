import { getRarityFieldDefinitions, isRarityFieldVisible } from "../core/rarityFieldSchema.js";

const RARITY_PREFIX_DISCOVERY_SUFFIX = "-enable-item-color";

function setGroupVisibility($group, visible) {
  if (!$group?.length) return;
  $group.toggleClass("sc-item-rarity-colors__is-hidden", !visible);
}

function getFieldInput($form, rarityPrefix, field) {
  const selector = field?.type === "color"
    ? `input[type="color"][name="${rarityPrefix}-${field.key}"]`
    : `input[type="checkbox"][name="${rarityPrefix}-${field.key}"]`;
  return $form.find(selector);
}

function collectRarityPrefixes($form) {
  const prefixes = new Set();
  $form.find(`input[type="checkbox"][name$="${RARITY_PREFIX_DISCOVERY_SUFFIX}"]`).each((_, field) => {
    const name = $(field).attr("name");
    if (typeof name !== "string" || !name.endsWith(RARITY_PREFIX_DISCOVERY_SUFFIX)) return;
    prefixes.add(name.slice(0, -RARITY_PREFIX_DISCOVERY_SUFFIX.length));
  });
  return Array.from(prefixes);
}

function buildFieldState($form, rarityPrefix, fields) {
  const state = {};
  for (const field of fields) {
    if (field.type !== "checkbox") continue;
    state[field.key] = getFieldInput($form, rarityPrefix, field).is(":checked");
  }
  return state;
}

function applyVisibilityForRarity($form, rarityPrefix) {
  const fields = getRarityFieldDefinitions(rarityPrefix);
  const state = buildFieldState($form, rarityPrefix, fields);

  for (const field of fields) {
    const $input = getFieldInput($form, rarityPrefix, field);
    if (!$input.length) continue;
    setGroupVisibility($input.closest(".form-group"), isRarityFieldVisible(field, state));
  }
}

/**
 * Update field visibility based on declarative schema rules.
 * @param {HTMLElement} formElement
 */
export function updateColorPickerVisibility(formElement) {
  const $form = $(formElement);
  if (!$form.length) return;

  for (const rarityPrefix of collectRarityPrefixes($form)) {
    applyVisibilityForRarity($form, rarityPrefix);
  }
}
