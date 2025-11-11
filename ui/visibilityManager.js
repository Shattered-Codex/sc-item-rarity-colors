/**
 * Visibility Manager
 * Handles conditional visibility of UI elements based on checkbox states
 */

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

    if (isChecked) {
      $colorPickerGroup.show();
    } else {
      $colorPickerGroup.hide();
    }

    const $gradientCheckbox = $form.find(`input[type="checkbox"][name="${rarityPrefix}-gradient-option"]`);
    const $gradientGroup = $gradientCheckbox.closest(".form-group");
    const $glowCheckbox = $form.find(`input[type="checkbox"][name="${rarityPrefix}-glow-option"]`);
    const $glowGroup = $glowCheckbox.closest(".form-group");

    if (isChecked) {
      $gradientGroup.show();
      $glowGroup.show();
      
      const $enableBorderColorCheckbox = $form.find(`input[type="checkbox"][name="${rarityPrefix}-enable-inventory-border-color"]`);
      if ($enableBorderColorCheckbox.length) {
        const $borderGroup = $enableBorderColorCheckbox.closest(".form-group");
        $borderGroup.hide();
        $enableBorderColorCheckbox.prop("checked", false);
        
        const $borderColorPicker = $form.find(`input[type="color"][name="${rarityPrefix}-inventory-border-color"]`);
        const $borderColorGroup = $borderColorPicker.closest(".form-group");
        $borderColorGroup.hide();
        
        const $borderSecondaryColorPicker = $form.find(`input[type="color"][name="${rarityPrefix}-inventory-border-secondary-color"]`);
        const $borderSecondaryColorGroup = $borderSecondaryColorPicker.closest(".form-group");
        $borderSecondaryColorGroup.hide();
        
        const $borderGlowCheckbox = $form.find(`input[type="checkbox"][name="${rarityPrefix}-enable-inventory-border-glow"]`);
        const $borderGlowGroup = $borderGlowCheckbox.closest(".form-group");
        $borderGlowGroup.hide();
        $borderGlowCheckbox.prop("checked", false);
      }
    } else {
      $gradientGroup.hide();
      $gradientCheckbox.prop("checked", false);
      $glowGroup.hide();
      $glowCheckbox.prop("checked", false);
      
      const $secondaryColorPicker = $form.find(`input[type="color"][name="${rarityPrefix}-secondary-item-color"]`);
      const $secondaryColorGroup = $secondaryColorPicker.closest(".form-group");
      $secondaryColorGroup.hide();
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
    
    if (isChecked) {
      $secondaryColorGroup.show();
    } else {
      $secondaryColorGroup.hide();
    }
  });

  const enableTextColorCheckboxes = $form.find('input[type="checkbox"][name$="-enable-text-color"]');
  enableTextColorCheckboxes.each((_, checkbox) => {
    const $checkbox = $(checkbox);
    const isChecked = $checkbox.is(":checked");
    const checkboxName = $checkbox.attr("name");
    const rarityPrefix = checkboxName.replace("-enable-text-color", "");

    const $colorPicker = $form.find(`input[type="color"][name="${rarityPrefix}-text-color"]`);
    const $colorPickerGroup = $colorPicker.closest(".form-group");

    if (isChecked) {
      $colorPickerGroup.show();
    } else {
      $colorPickerGroup.hide();
    }
  });

  const enableTitleColorCheckboxes = $form.find('input[type="checkbox"][name$="-enable-inventory-title-color"]');
  enableTitleColorCheckboxes.each((_, checkbox) => {
    const $checkbox = $(checkbox);
    const isChecked = $checkbox.is(":checked");
    const checkboxName = $checkbox.attr("name");
    const rarityPrefix = checkboxName.replace("-enable-inventory-title-color", "");

    const $colorPicker = $form.find(`input[type="color"][name="${rarityPrefix}-inventory-title-color"]`);
    const $colorPickerGroup = $colorPicker.closest(".form-group");

    if (isChecked) {
      $colorPickerGroup.show();
    } else {
      $colorPickerGroup.hide();
    }
  });

  const enableDetailsColorCheckboxes = $form.find('input[type="checkbox"][name$="-enable-inventory-details-color"]');
  enableDetailsColorCheckboxes.each((_, checkbox) => {
    const $checkbox = $(checkbox);
    const isChecked = $checkbox.is(":checked");
    const checkboxName = $checkbox.attr("name");
    const rarityPrefix = checkboxName.replace("-enable-inventory-details-color", "");

    const $colorPicker = $form.find(`input[type="color"][name="${rarityPrefix}-inventory-details-color"]`);
    const $colorPickerGroup = $colorPicker.closest(".form-group");

    if (isChecked) {
      $colorPickerGroup.show();
    } else {
      $colorPickerGroup.hide();
    }
  });

  const enableBorderColorCheckboxes = $form.find('input[type="checkbox"][name$="-enable-inventory-border-color"]');
  enableBorderColorCheckboxes.each((_, checkbox) => {
    const $checkbox = $(checkbox);
    const isChecked = $checkbox.is(":checked");
    const checkboxName = $checkbox.attr("name");
    const rarityPrefix = checkboxName.replace("-enable-inventory-border-color", "");
    const $enableItemColorCheckbox = $form.find(`input[type="checkbox"][name="${rarityPrefix}-enable-item-color"]`);
    const itemColorEnabled = $enableItemColorCheckbox.is(":checked");

    if (itemColorEnabled) {
      const $borderGroup = $checkbox.closest(".form-group");
      $borderGroup.hide();
      $checkbox.prop("checked", false);
    } else {
      const $checkboxGroup = $checkbox.closest(".form-group");
      $checkboxGroup.show();
      const $borderColorPicker = $form.find(`input[type="color"][name="${rarityPrefix}-inventory-border-color"]`);
      const $borderColorGroup = $borderColorPicker.closest(".form-group");
      const $borderSecondaryColorPicker = $form.find(`input[type="color"][name="${rarityPrefix}-inventory-border-secondary-color"]`);
      const $borderSecondaryColorGroup = $borderSecondaryColorPicker.closest(".form-group");
      const $borderGlowCheckbox = $form.find(`input[type="checkbox"][name="${rarityPrefix}-enable-inventory-border-glow"]`);
      const $borderGlowGroup = $borderGlowCheckbox.closest(".form-group");

      if (isChecked && !itemColorEnabled) {
        $borderColorGroup.show();
        if ($borderSecondaryColorGroup.length) {
          $borderSecondaryColorGroup.show();
        }
        if ($borderGlowGroup.length) {
          $borderGlowGroup.show();
        }
      } else {
        $borderColorGroup.hide();
        if ($borderSecondaryColorGroup.length) {
          $borderSecondaryColorGroup.hide();
        }
        if ($borderGlowGroup.length) {
          $borderGlowGroup.hide();
          $borderGlowCheckbox.prop("checked", false);
        }
      }
    }
  });
}

