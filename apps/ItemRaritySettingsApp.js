import { updateColorPickerVisibility } from "../ui/visibilityManager.js";
import { updateMiniSheetPreview } from "../ui/previewUpdater.js";

/**
 * ItemRaritySettingsApp
 * A configurable UI application for managing item rarity color settings.
 * Dynamically updates the mini item preview as user changes form inputs.
 * Uses ApplicationV2 API with HandlebarsApplicationMixin.
 */
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
export class ItemRaritySettingsApp extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor(context = "general", options = {}, moduleId) {
    super(options);
    this.context = context;
    this.moduleId = moduleId || ItemRaritySettingsApp.MODULE_ID;
  }

  /** Default app configuration */
  static DEFAULT_OPTIONS = {
    id: "sc-item-rarity-colors",
    classes: ["sc-item-rarity-colors"],
    form: {
      handler: ItemRaritySettingsApp.onSubmit,
      closeOnSubmit: true,
      submitOnChange: false,
      submitOnClose: false,
    },
    position: {
      width: 650,
      height: 700,
    },
    tag: "form",
    window: {
      contentClasses: ["sc-item-rarity-colors"],
      title: "Item Tier Rarity Settings",
      resizable: true,
    },
  };

  /** Template parts definition */
  static PARTS = {
    form: {
      template: `modules/sc-item-rarity-colors/templates/item-tier-rarity.html`,
    },
    footer: {
      template: `modules/sc-item-rarity-colors/templates/form-footer.html`,
    },
  };

  /**
   * Prepare context data for the template.
   * Returns the settings fields and their current stored values.
   */
  _prepareContext() {
    const moduleId = this.moduleId || ItemRaritySettingsApp.MODULE_ID;
    if (!moduleId) {
      return { title: "Error", fields: [] };
    }

    const SETTINGS_MAP = {
      common: {
        title: "Common Item Settings",
        fields: [
          { name: "common-enable-item-color", label: "Change Item Sheet Background Color", type: "checkbox", group: "item-sheet" },
          { name: "common-item-color", label: "Item Sheet Background Color", type: "color", group: "item-sheet" },
          { name: "common-secondary-item-color", label: "Secondary Color", type: "color", group: "item-sheet" },
          { name: "common-gradient-option", label: "Enable Gradient", type: "checkbox", group: "item-sheet" },
          { name: "common-glow-option", label: "Enable Glow Effect", type: "checkbox", group: "item-sheet" },
          { name: "common-enable-text-color", label: "Change Item Sheet Text Color", type: "checkbox", group: "item-sheet" },
          { name: "common-text-color", label: "Item Sheet Text Color", type: "color", group: "item-sheet" },
          { name: "common-enable-inventory-title-color", label: "Change Item Title/Subtitle Color in Inventory", type: "checkbox", group: "actor-sheet" },
          { name: "common-inventory-title-color", label: "Inventory Item Title/Subtitle Color", type: "color", group: "actor-sheet" },
          { name: "common-enable-inventory-details-color", label: "Change Item Details Text Color", type: "checkbox", group: "actor-sheet" },
          { name: "common-inventory-details-color", label: "Inventory Item Details Text Color", type: "color", group: "actor-sheet" },
          { name: "common-enable-inventory-border-color", label: "Change Item Border Color in Inventory", type: "checkbox", group: "actor-sheet" },
          { name: "common-inventory-border-color", label: "Inventory Item Border Color", type: "color", group: "actor-sheet" },
          { name: "common-inventory-border-secondary-color", label: "Inventory Item Border Secondary Color", type: "color", group: "actor-sheet" },
          { name: "common-enable-inventory-border-glow", label: "Enable Inventory Border Glow", type: "checkbox", group: "actor-sheet" },
        ],
      },
      uncommon: {
        title: "Uncommon Item Settings",
        fields: [
          { name: "uncommon-enable-item-color", label: "Change Item Sheet Background Color", type: "checkbox", group: "item-sheet" },
          { name: "uncommon-item-color", label: "Item Sheet Background Color", type: "color", group: "item-sheet" },
          { name: "uncommon-secondary-item-color", label: "Secondary Color", type: "color", group: "item-sheet" },
          { name: "uncommon-gradient-option", label: "Enable Gradient", type: "checkbox", group: "item-sheet" },
          { name: "uncommon-glow-option", label: "Enable Glow Effect", type: "checkbox", group: "item-sheet" },
          { name: "uncommon-enable-text-color", label: "Change Item Sheet Text Color", type: "checkbox", group: "item-sheet" },
          { name: "uncommon-text-color", label: "Item Sheet Text Color", type: "color", group: "item-sheet" },
          { name: "uncommon-enable-inventory-title-color", label: "Change Item Title/Subtitle Color in Inventory", type: "checkbox", group: "actor-sheet" },
          { name: "uncommon-inventory-title-color", label: "Inventory Item Title/Subtitle Color", type: "color", group: "actor-sheet" },
          { name: "uncommon-enable-inventory-details-color", label: "Change Item Details Text Color", type: "checkbox", group: "actor-sheet" },
          { name: "uncommon-inventory-details-color", label: "Inventory Item Details Text Color", type: "color", group: "actor-sheet" },
          { name: "uncommon-enable-inventory-border-color", label: "Change Item Border Color in Inventory", type: "checkbox", group: "actor-sheet" },
          { name: "uncommon-inventory-border-color", label: "Inventory Item Border Color", type: "color", group: "actor-sheet" },
          { name: "uncommon-inventory-border-secondary-color", label: "Inventory Item Border Secondary Color", type: "color", group: "actor-sheet" },
          { name: "uncommon-enable-inventory-border-glow", label: "Enable Inventory Border Glow", type: "checkbox", group: "actor-sheet" },
        ],
      },
      rare: {
        title: "Rare Item Settings",
        fields: [
          { name: "rare-enable-item-color", label: "Change Item Sheet Background Color", type: "checkbox", group: "item-sheet" },
          { name: "rare-item-color", label: "Item Sheet Background Color", type: "color", group: "item-sheet" },
          { name: "rare-secondary-item-color", label: "Secondary Color", type: "color", group: "item-sheet" },
          { name: "rare-gradient-option", label: "Enable Gradient", type: "checkbox", group: "item-sheet" },
          { name: "rare-glow-option", label: "Enable Glow Effect", type: "checkbox", group: "item-sheet" },
          { name: "rare-enable-text-color", label: "Change Item Sheet Text Color", type: "checkbox", group: "item-sheet" },
          { name: "rare-text-color", label: "Item Sheet Text Color", type: "color", group: "item-sheet" },
          { name: "rare-enable-inventory-title-color", label: "Change Item Title/Subtitle Color in Inventory", type: "checkbox", group: "actor-sheet" },
          { name: "rare-inventory-title-color", label: "Inventory Item Title/Subtitle Color", type: "color", group: "actor-sheet" },
          { name: "rare-enable-inventory-details-color", label: "Change Item Details Text Color", type: "checkbox", group: "actor-sheet" },
          { name: "rare-inventory-details-color", label: "Inventory Item Details Text Color", type: "color", group: "actor-sheet" },
          { name: "rare-enable-inventory-border-color", label: "Change Item Border Color in Inventory", type: "checkbox", group: "actor-sheet" },
          { name: "rare-inventory-border-color", label: "Inventory Item Border Color", type: "color", group: "actor-sheet" },
          { name: "rare-inventory-border-secondary-color", label: "Inventory Item Border Secondary Color", type: "color", group: "actor-sheet" },
          { name: "rare-enable-inventory-border-glow", label: "Enable Inventory Border Glow", type: "checkbox", group: "actor-sheet" },
        ],
      },
      veryrare: {
        title: "Very Rare Item Settings",
        fields: [
          { name: "veryrare-enable-item-color", label: "Change Item Sheet Background Color", type: "checkbox", group: "item-sheet" },
          { name: "veryrare-item-color", label: "Primary Color", type: "color", group: "item-sheet" },
          { name: "veryrare-enable-text-color", label: "Change Item Sheet Text Color", type: "checkbox", group: "item-sheet" },
          { name: "veryrare-text-color", label: "Item Sheet Text Color", type: "color", group: "item-sheet" },
          { name: "veryrare-secondary-item-color", label: "Secondary Color", type: "color", group: "item-sheet" },
          { name: "veryrare-gradient-option", label: "Enable Gradient", type: "checkbox", group: "item-sheet" },
          { name: "veryrare-glow-option", label: "Enable Glow Effect", type: "checkbox", group: "item-sheet" },
          { name: "veryrare-enable-inventory-title-color", label: "Change Item Title/Subtitle Color in Inventory", type: "checkbox", group: "actor-sheet" },
          { name: "veryrare-inventory-title-color", label: "Inventory Item Title/Subtitle Color", type: "color", group: "actor-sheet" },
          { name: "veryrare-enable-inventory-details-color", label: "Change Item Details Text Color", type: "checkbox", group: "actor-sheet" },
          { name: "veryrare-inventory-details-color", label: "Inventory Item Details Text Color", type: "color", group: "actor-sheet" },
          { name: "veryrare-enable-inventory-border-color", label: "Change Item Border Color in Inventory", type: "checkbox", group: "actor-sheet" },
          { name: "veryrare-inventory-border-color", label: "Inventory Item Border Color", type: "color", group: "actor-sheet" },
          { name: "veryrare-inventory-border-secondary-color", label: "Inventory Item Border Secondary Color", type: "color", group: "actor-sheet" },
          { name: "veryrare-enable-inventory-border-glow", label: "Enable Inventory Border Glow", type: "checkbox", group: "actor-sheet" },
        ],
      },
      legendary: {
        title: "Legendary Item Settings",
        fields: [
          { name: "legendary-enable-item-color", label: "Change Item Sheet Background Color", type: "checkbox", group: "item-sheet" },
          { name: "legendary-item-color", label: "Primary Color", type: "color", group: "item-sheet" },
          { name: "legendary-enable-text-color", label: "Change Item Sheet Text Color", type: "checkbox", group: "item-sheet" },
          { name: "legendary-text-color", label: "Item Sheet Text Color", type: "color", group: "item-sheet" },
          { name: "legendary-secondary-item-color", label: "Secondary Color", type: "color", group: "item-sheet" },
          { name: "legendary-gradient-option", label: "Enable Gradient", type: "checkbox", group: "item-sheet" },
          { name: "legendary-glow-option", label: "Enable Glow Effect", type: "checkbox", group: "item-sheet" },
          { name: "legendary-enable-inventory-title-color", label: "Change Item Title/Subtitle Color in Inventory", type: "checkbox", group: "actor-sheet" },
          { name: "legendary-inventory-title-color", label: "Inventory Item Title/Subtitle Color", type: "color", group: "actor-sheet" },
          { name: "legendary-enable-inventory-details-color", label: "Change Item Details Text Color", type: "checkbox", group: "actor-sheet" },
          { name: "legendary-inventory-details-color", label: "Inventory Item Details Color", type: "color", group: "actor-sheet" },
          { name: "legendary-enable-inventory-border-color", label: "Change Item Border Color in Inventory", type: "checkbox", group: "actor-sheet" },
          { name: "legendary-inventory-border-color", label: "Inventory Item Border Color", type: "color", group: "actor-sheet" },
          { name: "legendary-inventory-border-secondary-color", label: "Inventory Item Border Secondary Color", type: "color", group: "actor-sheet" },
          { name: "legendary-enable-inventory-border-glow", label: "Enable Inventory Border Glow", type: "checkbox", group: "actor-sheet" },
        ],
      },
      artifact: {
        title: "Artifact Item Settings",
        fields: [
          { name: "artifact-enable-item-color", label: "Change Item Sheet Background Color", type: "checkbox", group: "item-sheet" },
          { name: "artifact-item-color", label: "Primary Color", type: "color", group: "item-sheet" },
          { name: "artifact-enable-text-color", label: "Change Item Sheet Text Color", type: "checkbox", group: "item-sheet" },
          { name: "artifact-text-color", label: "Item Sheet Text Color", type: "color", group: "item-sheet" },
          { name: "artifact-secondary-item-color", label: "Secondary Color", type: "color", group: "item-sheet" },
          { name: "artifact-gradient-option", label: "Enable Gradient", type: "checkbox", group: "item-sheet" },
          { name: "artifact-glow-option", label: "Enable Glow Effect", type: "checkbox", group: "item-sheet" },
          { name: "artifact-enable-inventory-title-color", label: "Change Item Title/Subtitle Color in Inventory", type: "checkbox", group: "actor-sheet" },
          { name: "artifact-inventory-title-color", label: "Inventory Item Title/Subtitle Color", type: "color", group: "actor-sheet" },
          { name: "artifact-enable-inventory-details-color", label: "Change Item Details Text Color", type: "checkbox", group: "actor-sheet" },
          { name: "artifact-inventory-details-color", label: "Inventory Item Details Text Color", type: "color", group: "actor-sheet" },
          { name: "artifact-enable-inventory-border-color", label: "Change Item Border Color in Inventory", type: "checkbox", group: "actor-sheet" },
          { name: "artifact-inventory-border-color", label: "Inventory Item Border Color", type: "color", group: "actor-sheet" },
          { name: "artifact-inventory-border-secondary-color", label: "Inventory Item Border Secondary Color", type: "color", group: "actor-sheet" },
          { name: "artifact-enable-inventory-border-glow", label: "Enable Inventory Border Glow", type: "checkbox", group: "actor-sheet" },
        ],
      },
    };

    const config = SETTINGS_MAP[this.context] || { title: "Item Tier Rarity Settings", fields: [] };

    // Load stored values for each field
    const fields = config.fields.map((f) => {
      let value = game.settings.get(moduleId, f.name);
      // For boolean fields, ensure we have a boolean value (default to false if undefined)
      if (f.type === "checkbox") {
        // Handle undefined, null, false, or string values
        if (value === undefined || value === null) {
          value = false;
        } else {
          value = value === true || value === "true" || value === 1 || value === "1";
        }
      }
      // For color fields, ensure we have a string value
      if (f.type === "color" && (!value || typeof value !== "string")) {
        value = f.name.includes("inventory-title-color") ? "#000000" : 
                f.name.includes("inventory-details-color") ? "#000000" : 
                f.name.includes("text-color") ? "#000000" : 
                f.name.includes("secondary-item-color") || f.name.includes("border-secondary-color") ? "#ffffff" : "#000000";
      }
      return {
        name: f.name,
        label: f.label,
        type: f.type,
        value: value !== undefined && value !== null ? value : (f.type === "checkbox" ? false : (f.type === "color" ? "#000000" : "")),
        isColor: f.type === "color",
        isCheckbox: f.type === "checkbox",
        group: f.group || "item-sheet",
      };
    });

    // Get preview values for the item-template partial
    const primaryColorField = fields.find((f) => f.name.endsWith("-item-color") && !f.name.includes("secondary") && !f.name.includes("text") && !f.name.includes("inventory"));
    const textColorField = fields.find((f) => f.name.includes("-text-color") && !f.name.includes("inventory"));
    const secondaryColorField = fields.find((f) => f.name.includes("-secondary-item-color"));
    const gradientField = fields.find((f) => f.name.includes("-gradient-option"));
    const glowField = fields.find((f) => f.name.includes("-glow-option"));

    const backgroundColor = primaryColorField?.value || "#000000";
    const textColor = textColorField?.value || "#000000";
    const secondaryColor = secondaryColorField?.value || "#ffffff";
    const gradient = gradientField?.value || false;
    const glow = glowField?.value || false;

    // Get inventory preview values
    const enableTitleColorField = fields.find((f) => f.name.includes("-enable-inventory-title-color"));
    const titleColorField = fields.find((f) => f.name.includes("-inventory-title-color"));
    const enableDetailsColorField = fields.find((f) => f.name.includes("-enable-inventory-details-color"));
    const detailsColorField = fields.find((f) => f.name.includes("-inventory-details-color"));

    const enableTitleColor = enableTitleColorField?.value || false;
    const titleColor = titleColorField?.value || "#000000";
    const enableDetailsColor = enableDetailsColorField?.value || false;
    const detailsColor = detailsColorField?.value || "#000000";

    // Group fields by group
    const groupedFields = {
      itemSheet: fields.filter(f => f.group === "item-sheet"),
      actorSheet: fields.filter(f => f.group === "actor-sheet"),
    };

    const context = {
      title: config.title,
      fields,
      groupedFields,
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
    };

    return context;
  }

  /**
   * Called after the application is rendered.
   * Initializes listeners and updates live preview as inputs change.
   */
  async _onRender(context, options) {
    // Handle cancel button
    const cancelButton = this.element?.querySelector('[data-action="close"]');
    if (cancelButton) {
      cancelButton.addEventListener("click", () => this.close());
    }

    const miniSheet = $(".mini-item-sheet .application.sheet.item");
    const inventoryPreview = $(".inventory-preview-item");
    
    if (!miniSheet.length && !inventoryPreview.length) {
      return;
    }

    if (!this.form) return;

    // Ensure checkboxes are always visible
    const checkboxes = this.form.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach((cb) => {
      const group = cb.closest(".form-group");
      
      // Force visibility with inline styles - checkboxes ALWAYS visible
      cb.style.setProperty('display', 'block', 'important');
      cb.style.setProperty('visibility', 'visible', 'important');
      cb.style.setProperty('opacity', '1', 'important');
      cb.style.setProperty('width', '20px', 'important');
      cb.style.setProperty('height', '20px', 'important');
      cb.style.setProperty('min-width', '20px', 'important');
      cb.style.setProperty('min-height', '20px', 'important');
      cb.style.setProperty('flex-shrink', '0', 'important');
      
      // Ensure checkbox groups are always visible
      if (group) {
        group.style.setProperty('display', 'flex', 'important');
        group.style.setProperty('visibility', 'visible', 'important');
        group.style.setProperty('align-items', 'center', 'important');
        group.style.setProperty('opacity', '1', 'important');
      }
    });

    // Toggle visibility of color pickers based on checkboxes
    const updateColorPickerVisibilityLocal = () => {
      updateColorPickerVisibility(this.form);
    };

    // Initial visibility update
    updateColorPickerVisibilityLocal();

    /** Update mini preview and inventory preview whenever form inputs change */
    const updateMiniSheetLocal = () => {
      updateMiniSheetPreview(this.form, this.context);
    };
    
    // Initial preview
    updateMiniSheetLocal();

    // Listen for main menu checkbox changes and update preview
    const moduleId = this.moduleId || ItemRaritySettingsApp.MODULE_ID;
    const updateOnMainMenuChange = () => {
      updateMiniSheetLocal();
    };
    
    // Store handler reference for cleanup
    this._mainMenuChangeHandler = (module, key, value) => {
      if (module === moduleId && 
          (key === "enableActorInventoryGradientEffects" || key === "enableActorInventoryBorders")) {
        updateOnMainMenuChange();
      }
    };
    Hooks.on("setSetting", this._mainMenuChangeHandler);

    // Bind reactive updates
    const inputs = this.form.querySelectorAll('input[type="color"], input[type="checkbox"]');
    inputs.forEach((input) => {
      // Use input event for real-time updates (when dragging color picker)
      input.addEventListener("input", (e) => {
        // Force immediate update by reading value directly from the event target
        const target = e.target;
        if (target.type === "color") {
          // For color inputs, immediately update the preview
          requestAnimationFrame(() => {
            updateMiniSheetLocal();
            updateColorPickerVisibilityLocal();
          });
        } else {
          updateMiniSheetLocal();
          updateColorPickerVisibilityLocal();
        }
      });
      // Use change event as backup
      input.addEventListener("change", () => {
        updateMiniSheetLocal();
        updateColorPickerVisibilityLocal();
      });
      // Also listen for mouseup on color inputs to ensure final value is applied
      if (input.type === "color") {
        input.addEventListener("mouseup", () => {
          requestAnimationFrame(() => {
            updateMiniSheetLocal();
          });
        });
      }
    });
  }

  /**
   * Handle form submission and persist all settings.
   * Static method used as form handler in DEFAULT_OPTIONS.
   * Note: ApplicationV2 binds 'this' to the application instance when calling this handler.
   */
  static async onSubmit(event, form, formData) {
    // 'this' is bound to the application instance by ApplicationV2
    const moduleId = this.moduleId || ItemRaritySettingsApp.MODULE_ID;
    if (!moduleId) {
      return;
    }

    // formData.object already contains serialized form data
    const data = formData.object;

    // Get all checkbox fields from the form to ensure unchecked ones are saved as false
    const allCheckboxes = this.form.querySelectorAll('input[type="checkbox"]');
    const checkboxData = {};
    allCheckboxes.forEach(checkbox => {
      const name = checkbox.name;
      if (name && game.settings.settings.has(`${moduleId}.${name}`)) {
        checkboxData[name] = checkbox.checked;
      }
    });

    // Merge checkbox data with form data (checkboxData takes precedence for checkboxes)
    const mergedData = { ...data, ...checkboxData };

    // Only save settings that are registered for this module
    // Filter out fields from the preview minisheet (like "name", "system.quantity", etc.)
    for (const [key, value] of Object.entries(mergedData)) {
      // Check if this is a registered setting for this module
      const settingKey = `${moduleId}.${key}`;
      if (game.settings.settings.has(settingKey)) {
        // For checkboxes, ensure boolean value
        let settingValue = value;
        if (key.includes("-enable-") || key.includes("-option") || key.includes("-glow-")) {
          settingValue = value === "on" || value === true || value === "true";
        }
        await game.settings.set(moduleId, key, settingValue);
      }
    }

    ui.notifications.info(`Saved ${this.context} settings!`);
  }

  // Override render to ensure moduleId is set
  render(force = false, options = {}) {
    if (!this.moduleId && ItemRaritySettingsApp.MODULE_ID) {
      this.moduleId = ItemRaritySettingsApp.MODULE_ID;
    }
    return super.render(force, options);
  }
}

