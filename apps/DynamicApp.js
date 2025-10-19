export class DynamicApp extends FormApplication {
  constructor(context = "general", options = {}, moduleId) {
    super(options);
    this.context = context;
    this.moduleId = moduleId;
  }

  // Define default options for the application.
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "sc-item-rarity-colors",
      title: "Item Tier Rarity Settings",
      template: `modules/sc-item-rarity-colors/templates/item-tier-rarity.html`,
      width: 700,
      height: 700,
      classes: ["sc-item-rarity-colors"]
    });
  }

  // Prepare data for rendering the template.
  getData() {
    const SETTINGS_MAP = {
      common: {
        title: "Common Item Settings",
        fields: [{ name: "common-item-color", label: "Item Color", type: "color" }]
      },
      uncommon: {
        title: "Uncommon Item Settings",
        fields: [{ name: "uncommon-item-color", label: "Item Color", type: "color" }]
      },
      rare: {
        title: "Rare Item Settings",
        fields: [{ name: "rare-item-color", label: "Item Color", type: "color" }]
      },
      "very-rare": {
        title: "Very Rare Item Settings",
        fields: [
          { name: "very-rare-item-color", label: "Primary Color", type: "color" },
          { name: "very-rare-secondary-item-color", label: "Secondary Color", type: "color" },
          { name: "very-rare-gradient-option", label: "Enable Gradient", type: "checkbox" }
        ]
      },
      legendary: {
        title: "Legendary Item Settings",
        fields: [
          { name: "legendary-item-color", label: "Primary Color", type: "color" },
          { name: "legendary-secondary-item-color", label: "Secondary Color", type: "color" },
          { name: "legendary-gradient-option", label: "Enable Gradient", type: "checkbox" }
        ]
      },
      artifact: {
        title: "Artifact Item Settings",
        fields: [
          { name: "artifact-item-color", label: "Primary Color", type: "color" },
          { name: "artifact-secondary-item-color", label: "Secondary Color", type: "color" },
          { name: "artifact-gradient-option", label: "Enable Gradient", type: "checkbox" },
          { name: "artifact-glow-option", label: "Enable Glow Effect", type: "checkbox" }
        ]
      }
    };

    // Retrieve the configuration for the current context.
    const config = SETTINGS_MAP[this.context];
    if (!config) return { title: "Item Tier Rarity Settings" };

    // Add the current values.
    config.fields = config.fields.map(f => ({
      ...f,
      value: game.settings.get(this.moduleId, f.name)
    }));

    return config;
  }

  // Activate event listeners for the form.
  activateListeners(html) {
    super.activateListeners(html);
    html.find("form").on("submit", this._onSubmit.bind(this));

    const miniSheetItem = $(".mini-item-sheet > .application.sheet.dnd5e2.standard-form.item.tab-description.editable");

    // Function to update the mini sheet preview.
    const updateMiniSheet = () => {
      const primaryInput = html.find('input[name$="-item-color"]:first');
      const secondaryInput = html.find('input[name$="-secondary-item-color"]');
      const gradientInput = html.find('input[name$="-gradient-option"]');
      const glowInput = html.find('input[name$="-glow-option"]');

      const primaryColor = primaryInput.val() || "#ffffff";
      const secondaryColor = secondaryInput.val() || "#ffffff";

      this._applyBackground(miniSheetItem, primaryColor, secondaryColor, gradientInput.prop("checked"));
      this._applyGlow(miniSheetItem, primaryColor, secondaryColor, glowInput.prop("checked"), gradientInput.prop("checked"));

      // Show or hide secondary color field.
      secondaryInput.closest(".form-group").toggle(gradientInput.prop("checked"));
    };

    updateMiniSheet();

    html.find('input[type="color"]').on("input", updateMiniSheet);
    html.find('input[type="checkbox"]').on("change", updateMiniSheet);
  }

  // Apply background styles to the mini sheet preview.
  _applyBackground(miniSheet, primary, secondary, gradient) {
    if (gradient) {
      miniSheet.css("background-image", `linear-gradient(to right, ${primary}, ${secondary})`);
      miniSheet.css("background-color", "");
    } else {
      miniSheet.css("background-color", primary);
      miniSheet.css("background-image", "");
    }
  }

  // Apply glow effect to the mini sheet preview.
  _applyGlow(miniSheet, primary, secondary, glow, gradient) {
    if (glow) {
      miniSheet.addClass("glow");
      miniSheet.css("--glow-primary", primary);
      miniSheet.css("--glow-secondary", gradient ? secondary : "#000000");
    } else {
      miniSheet.removeClass("glow");
      miniSheet.css("border-image", "");
    }
  }

  // Handle form submission to save settings.
  async _onSubmit(event) {
    event.preventDefault();
    const data = this._serializeForm(event.target);

    for (const [key, value] of Object.entries(data)) {
      await game.settings.set(this.moduleId, key, value);
    }

    ui.notifications.info(`✅ Saved ${this.context} settings!`);
    this.close();
  }

  // Serialize form data for submission.
  _serializeForm(form) {
    const data = {};
    $(form).find('input, select').each((_, el) => {
      const $el = $(el);
      const name = $el.attr('name');
      data[name] = $el.attr('type') === 'checkbox' ? $el.prop('checked') : $el.val();
    });
    return data;
  }
}
