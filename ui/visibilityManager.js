import { getRarityFieldDefinitions, isRarityFieldVisible } from "../core/rarityFieldSchema.js";

const RARITY_PREFIX_DISCOVERY_SUFFIX = "-enable-item-color";

function setGroupVisibility($group, visible) {
  if (!$group?.length) return;
  $group.toggleClass("sc-item-rarity-colors__is-hidden", !visible);
}

const FIELD_INPUT_SELECTORS = {
  color: 'input[type="color"]',
  select: "select",
  checkbox: 'input[type="checkbox"]',
  image: "input[data-image-path]",
};

function getFieldInput($form, rarityPrefix, field) {
  const control = FIELD_INPUT_SELECTORS[field?.type] ?? FIELD_INPUT_SELECTORS.checkbox;
  return $form.find(`${control}[name="${rarityPrefix}-${field.key}"]`);
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

// Checkboxes report whether they are on; selects their value (for `equals`).
function buildFieldState($form, rarityPrefix, fields) {
  const state = {};
  for (const field of fields) {
    if (field.type === "checkbox") state[field.key] = getFieldInput($form, rarityPrefix, field).is(":checked");
    else if (field.type === "select") state[field.key] = getFieldInput($form, rarityPrefix, field).val();
  }
  return state;
}

function applyVisibilityForRarity($form, rarityPrefix) {
  const fields = getRarityFieldDefinitions(rarityPrefix);
  const state = buildFieldState($form, rarityPrefix, fields);

  for (const field of fields) {
    const $input = getFieldInput($form, rarityPrefix, field);
    if (!$input.length) continue;
    // A row and the color nested inside it are separate groups, so an inline
    // color can hide on its own while its checkbox stays visible.
    setGroupVisibility($input.closest("[data-field-group]"), isRarityFieldVisible(field, state));
  }
}

// A section whose rows are all hidden hides its heading too.
function applySectionVisibility($form) {
  $form.find("[data-style-section]").each((_, section) => {
    const hasVisibleRow = $(section).find(".scirc-style-row").not(".sc-item-rarity-colors__is-hidden").length > 0;
    setGroupVisibility($(section), hasVisibleRow);
  });
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
  applySectionVisibility($form);
}
