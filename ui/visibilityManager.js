/**
 * Visibility Manager
 * Handles conditional visibility of UI elements based on checkbox states
 */

function setGroupVisibility($group, visible) {
  if (!$group?.length) return;
  $group.toggleClass("sc-item-rarity-colors__is-hidden", !visible);
}

/**
 * Update color picker visibility based on checkbox states
 * @param {HTMLElement} formElement - The form element containing the checkboxes and color pickers
 */
export function updateColorPickerVisibility(formElement) {
  const $form = $(formElement);

  const enableItemColorCheckboxes = $form.find('input[type="checkbox"][name$="-enable-item-color"]');
  enableItemColorCheckboxes.each((_, checkbox) => {
    const $checkbox = $(checkbox);
    const isChecked = $checkbox.is(":checked");
    const checkboxName = $checkbox.attr("name");
    const rarityPrefix = checkboxName.replace("-enable-item-color", "");
    const $colorPicker = $form.find(`input[type="color"][name="${rarityPrefix}-item-color"]`);
    const $colorPickerGroup = $colorPicker.closest(".form-group");

    setGroupVisibility($colorPickerGroup, isChecked);

    const $gradientCheckbox = $form.find(`input[type="checkbox"][name="${rarityPrefix}-gradient-option"]`);
    const $gradientGroup = $gradientCheckbox.closest(".form-group");
    const $glowCheckbox = $form.find(`input[type="checkbox"][name="${rarityPrefix}-glow-option"]`);
    const $glowGroup = $glowCheckbox.closest(".form-group");
    const $inventoryGradientCheckbox = $form.find(`input[type="checkbox"][name="${rarityPrefix}-enable-inventory-gradient-effects"]`);
    const $inventoryGradientGroup = $inventoryGradientCheckbox.closest(".form-group");
    const $inventoryBordersCheckbox = $form.find(`input[type="checkbox"][name="${rarityPrefix}-enable-inventory-borders"]`);
    const $inventoryBordersGroup = $inventoryBordersCheckbox.closest(".form-group");
    const $foundryGradientCheckbox = $form.find(`input[type="checkbox"][name="${rarityPrefix}-enable-foundry-interface-gradient-effects"]`);
    const $foundryGradientGroup = $foundryGradientCheckbox.closest(".form-group");

    if (isChecked) {
      setGroupVisibility($gradientGroup, true);
      setGroupVisibility($glowGroup, true);
      setGroupVisibility($inventoryGradientGroup, true);
      setGroupVisibility($inventoryBordersGroup, true);
      setGroupVisibility($foundryGradientGroup, true);
      
      const $enableBorderColorCheckbox = $form.find(`input[type="checkbox"][name="${rarityPrefix}-enable-inventory-border-color"]`);
      if ($enableBorderColorCheckbox.length) {
        const $borderGroup = $enableBorderColorCheckbox.closest(".form-group");
        setGroupVisibility($borderGroup, false);
        $enableBorderColorCheckbox.prop("checked", false);
        
        const $borderColorPicker = $form.find(`input[type="color"][name="${rarityPrefix}-inventory-border-color"]`);
        const $borderColorGroup = $borderColorPicker.closest(".form-group");
        setGroupVisibility($borderColorGroup, false);
        
        const $borderSecondaryColorPicker = $form.find(`input[type="color"][name="${rarityPrefix}-inventory-border-secondary-color"]`);
        const $borderSecondaryColorGroup = $borderSecondaryColorPicker.closest(".form-group");
        setGroupVisibility($borderSecondaryColorGroup, false);
        
        const $borderGlowCheckbox = $form.find(`input[type="checkbox"][name="${rarityPrefix}-enable-inventory-border-glow"]`);
        const $borderGlowGroup = $borderGlowCheckbox.closest(".form-group");
        setGroupVisibility($borderGlowGroup, false);
        $borderGlowCheckbox.prop("checked", false);
      }
    } else {
      setGroupVisibility($gradientGroup, false);
      $gradientCheckbox.prop("checked", false);
      setGroupVisibility($glowGroup, false);
      $glowCheckbox.prop("checked", false);
      setGroupVisibility($inventoryGradientGroup, false);
      $inventoryGradientCheckbox.prop("checked", false);
      setGroupVisibility($inventoryBordersGroup, true);
      setGroupVisibility($foundryGradientGroup, false);
      $foundryGradientCheckbox.prop("checked", false);
      
      const $secondaryColorPicker = $form.find(`input[type="color"][name="${rarityPrefix}-secondary-item-color"]`);
      const $secondaryColorGroup = $secondaryColorPicker.closest(".form-group");
      setGroupVisibility($secondaryColorGroup, false);
    }
  });

  const gradientCheckboxes = $form.find('input[type="checkbox"][name$="-gradient-option"]');
  gradientCheckboxes.each((_, checkbox) => {
    const $checkbox = $(checkbox);
    const isChecked = $checkbox.is(":checked");
    const checkboxName = $checkbox.attr("name");
    const rarityPrefix = checkboxName.replace("-gradient-option", "");
    
    const $secondaryColorPicker = $form.find(`input[type="color"][name="${rarityPrefix}-secondary-item-color"]`);
    const $secondaryColorGroup = $secondaryColorPicker.closest(".form-group");
    
    setGroupVisibility($secondaryColorGroup, isChecked);
  });

  const enableTextColorCheckboxes = $form.find('input[type="checkbox"][name$="-enable-text-color"]');
  enableTextColorCheckboxes.each((_, checkbox) => {
    const $checkbox = $(checkbox);
    const isChecked = $checkbox.is(":checked");
    const checkboxName = $checkbox.attr("name");
    const rarityPrefix = checkboxName.replace("-enable-text-color", "");

    const $colorPicker = $form.find(`input[type="color"][name="${rarityPrefix}-text-color"]`);
    const $colorPickerGroup = $colorPicker.closest(".form-group");

    setGroupVisibility($colorPickerGroup, isChecked);
  });

  const enableTitleColorCheckboxes = $form.find('input[type="checkbox"][name$="-enable-inventory-title-color"]');
  enableTitleColorCheckboxes.each((_, checkbox) => {
    const $checkbox = $(checkbox);
    const isChecked = $checkbox.is(":checked");
    const checkboxName = $checkbox.attr("name");
    const rarityPrefix = checkboxName.replace("-enable-inventory-title-color", "");

    const $colorPicker = $form.find(`input[type="color"][name="${rarityPrefix}-inventory-title-color"]`);
    const $colorPickerGroup = $colorPicker.closest(".form-group");

    setGroupVisibility($colorPickerGroup, isChecked);
  });

  const enableDetailsColorCheckboxes = $form.find('input[type="checkbox"][name$="-enable-inventory-details-color"]');
  enableDetailsColorCheckboxes.each((_, checkbox) => {
    const $checkbox = $(checkbox);
    const isChecked = $checkbox.is(":checked");
    const checkboxName = $checkbox.attr("name");
    const rarityPrefix = checkboxName.replace("-enable-inventory-details-color", "");

    const $colorPicker = $form.find(`input[type="color"][name="${rarityPrefix}-inventory-details-color"]`);
    const $colorPickerGroup = $colorPicker.closest(".form-group");

    setGroupVisibility($colorPickerGroup, isChecked);
  });

  const enableFoundryTextColorCheckboxes = $form.find('input[type="checkbox"][name$="-enable-foundry-interface-text-color"]');
  enableFoundryTextColorCheckboxes.each((_, checkbox) => {
    const $checkbox = $(checkbox);
    const isChecked = $checkbox.is(":checked");
    const checkboxName = $checkbox.attr("name");
    const rarityPrefix = checkboxName.replace("-enable-foundry-interface-text-color", "");

    const $colorPicker = $form.find(`input[type="color"][name="${rarityPrefix}-foundry-interface-text-color"]`);
    const $colorPickerGroup = $colorPicker.closest(".form-group");

    setGroupVisibility($colorPickerGroup, isChecked);
  });

  const enableBorderColorCheckboxes = $form.find('input[type="checkbox"][name$="-enable-inventory-border-color"]');
  enableBorderColorCheckboxes.each((_, checkbox) => {
    const $checkbox = $(checkbox);
    const isChecked = $checkbox.is(":checked");
    const checkboxName = $checkbox.attr("name");
    const rarityPrefix = checkboxName.replace("-enable-inventory-border-color", "");
    const $enableBordersCheckbox = $form.find(`input[type="checkbox"][name="${rarityPrefix}-enable-inventory-borders"]`);
    const bordersEnabled = $enableBordersCheckbox.is(":checked");
    const $enableItemColorCheckbox = $form.find(`input[type="checkbox"][name="${rarityPrefix}-enable-item-color"]`);
    const itemColorEnabled = $enableItemColorCheckbox.is(":checked");

    if (!bordersEnabled || itemColorEnabled) {
      const $borderGroup = $checkbox.closest(".form-group");
      setGroupVisibility($borderGroup, false);
      $checkbox.prop("checked", false);

      const $borderColorPicker = $form.find(`input[type="color"][name="${rarityPrefix}-inventory-border-color"]`);
      const $borderColorGroup = $borderColorPicker.closest(".form-group");
      const $borderSecondaryColorPicker = $form.find(`input[type="color"][name="${rarityPrefix}-inventory-border-secondary-color"]`);
      const $borderSecondaryColorGroup = $borderSecondaryColorPicker.closest(".form-group");
      const $borderGlowCheckbox = $form.find(`input[type="checkbox"][name="${rarityPrefix}-enable-inventory-border-glow"]`);
      const $borderGlowGroup = $borderGlowCheckbox.closest(".form-group");

      setGroupVisibility($borderColorGroup, false);
      if ($borderSecondaryColorGroup.length) {
        setGroupVisibility($borderSecondaryColorGroup, false);
      }
      if ($borderGlowGroup.length) {
        setGroupVisibility($borderGlowGroup, false);
        $borderGlowCheckbox.prop("checked", false);
      }
    } else {
      const $checkboxGroup = $checkbox.closest(".form-group");
      setGroupVisibility($checkboxGroup, true);
      const $borderColorPicker = $form.find(`input[type="color"][name="${rarityPrefix}-inventory-border-color"]`);
      const $borderColorGroup = $borderColorPicker.closest(".form-group");
      const $borderSecondaryColorPicker = $form.find(`input[type="color"][name="${rarityPrefix}-inventory-border-secondary-color"]`);
      const $borderSecondaryColorGroup = $borderSecondaryColorPicker.closest(".form-group");
      const $borderGlowCheckbox = $form.find(`input[type="checkbox"][name="${rarityPrefix}-enable-inventory-border-glow"]`);
      const $borderGlowGroup = $borderGlowCheckbox.closest(".form-group");

      if (isChecked && !itemColorEnabled) {
        setGroupVisibility($borderColorGroup, true);
        if ($borderSecondaryColorGroup.length) {
          setGroupVisibility($borderSecondaryColorGroup, true);
        }
        if ($borderGlowGroup.length) {
          setGroupVisibility($borderGlowGroup, true);
        }
      } else {
        setGroupVisibility($borderColorGroup, false);
        if ($borderSecondaryColorGroup.length) {
          setGroupVisibility($borderSecondaryColorGroup, false);
        }
        if ($borderGlowGroup.length) {
          setGroupVisibility($borderGlowGroup, false);
          $borderGlowCheckbox.prop("checked", false);
        }
      }
    }
  });
}
