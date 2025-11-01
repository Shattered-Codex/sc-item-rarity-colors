import { 
  applyRarityStyles, 
} from "../scripts/itemRarityHelper.js";

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
    this.moduleId = moduleId;
  }

  /** Default app configuration */
  static DEFAULT_OPTIONS = {
    id: "sc-item-rarity-colors",
    classes: ["sc-item-rarity-colors"],
    form: {
      handler: ItemRaritySettingsApp.#onSubmit,
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
    const SETTINGS_MAP = {
      common: {
        title: "Common Item Settings",
        fields: [{ name: "common-item-color", label: "Item Color", type: "color" }],
      },
      uncommon: {
        title: "Uncommon Item Settings",
        fields: [{ name: "uncommon-item-color", label: "Item Color", type: "color" }],
      },
      rare: {
        title: "Rare Item Settings",
        fields: [{ name: "rare-item-color", label: "Item Color", type: "color" }],
      },
      veryrare: {
        title: "Very Rare Item Settings",
        fields: [
          { name: "veryrare-item-color", label: "Primary Color", type: "color" },
          { name: "veryrare-secondary-item-color", label: "Secondary Color", type: "color" },
          { name: "veryrare-gradient-option", label: "Enable Gradient", type: "checkbox" },
        ],
      },
      legendary: {
        title: "Legendary Item Settings",
        fields: [
          { name: "legendary-item-color", label: "Primary Color", type: "color" },
          { name: "legendary-secondary-item-color", label: "Secondary Color", type: "color" },
          { name: "legendary-gradient-option", label: "Enable Gradient", type: "checkbox" },
        ],
      },
      artifact: {
        title: "Artifact Item Settings",
        fields: [
          { name: "artifact-item-color", label: "Primary Color", type: "color" },
          { name: "artifact-secondary-item-color", label: "Secondary Color", type: "color" },
          { name: "artifact-gradient-option", label: "Enable Gradient", type: "checkbox" },
          { name: "artifact-glow-option", label: "Enable Glow Effect", type: "checkbox" },
        ],
      },
    };

    const config = SETTINGS_MAP[this.context] || { title: "Item Tier Rarity Settings", fields: [] };

    // Load stored values for each field
    const fields = config.fields.map((f) => ({
      ...f,
      value: game.settings.get(this.moduleId, f.name),
    }));

    // Get preview values for the item-template partial
    const primaryColorField = fields.find((f) => f.name.endsWith("-item-color") && !f.name.includes("secondary"));
    const secondaryColorField = fields.find((f) => f.name.includes("-secondary-item-color"));
    const gradientField = fields.find((f) => f.name.includes("-gradient-option"));
    const glowField = fields.find((f) => f.name.includes("-glow-option"));

    const backgroundColor = primaryColorField?.value || "#ffffff";
    const secondaryColor = secondaryColorField?.value || "#ffffff";
    const gradient = gradientField?.value || false;
    const glow = glowField?.value || false;

    return {
      title: config.title,
      fields,
      backgroundColor,
      secondaryColor,
      gradient,
      glow,
    };
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
    if (!miniSheet.length) {
      return;
    }

    if (!this.form) return;

    /** Update mini preview whenever form inputs change */
    const updateMiniSheet = () => {
      const primaryInput = this.form.querySelector('input[name$="-item-color"]');
      const secondaryInput = this.form.querySelector('input[name$="-secondary-item-color"]');
      const gradientCheckbox = this.form.querySelector('input[name$="-gradient-option"]');
      const glowCheckbox = this.form.querySelector('input[name$="-glow-option"]');

      const primary = primaryInput?.value || "#ffffff";
      const secondary = secondaryInput?.value || "#ffffff";
      const gradientEnabled = gradientCheckbox?.checked || false;
      const glowEnabled = glowCheckbox?.checked || false;

      const settings = { backgroundColor: primary, gradientColor: secondary, gradientEnabled, glowEnabled };
      applyRarityStyles(miniSheet, settings);

      // Toggle visibility of secondary color input based on gradient option
      const secondaryGroup = secondaryInput?.closest(".form-group");
      if (secondaryGroup) {
        secondaryGroup.style.display = gradientEnabled ? "" : "none";
      }
    };

    // Initial preview
    updateMiniSheet();

    // Bind reactive updates
    const inputs = this.form.querySelectorAll('input[type="color"], input[type="checkbox"]');
    inputs.forEach((input) => {
      input.addEventListener("input", updateMiniSheet);
      input.addEventListener("change", updateMiniSheet);
    });
  }

  /**
   * Handle form submission and persist all settings.
   * Static method used as form handler in DEFAULT_OPTIONS.
   * Note: ApplicationV2 binds 'this' to the application instance when calling this handler.
   */
  static async #onSubmit(event, form, formData) {
    // 'this' is bound to the application instance by ApplicationV2
    if (!this.moduleId) {
      console.error("ItemRaritySettingsApp instance missing moduleId");
      return;
    }

    // formData.object already contains serialized form data
    const data = formData.object;

    // Only save settings that are registered for this module
    // Filter out fields from the preview minisheet (like "name", "system.quantity", etc.)
    for (const [key, value] of Object.entries(data)) {
      // Check if this is a registered setting for this module
      const settingKey = `${this.moduleId}.${key}`;
      if (game.settings.settings.has(settingKey)) {
        await game.settings.set(this.moduleId, key, value);
      }
    }

    ui.notifications.info(`Saved ${this.context} settings!`);
  }

}

