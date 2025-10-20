import { applyRarityStyles } from "../scripts/itemRarityHelper.js";

/**
 * DynamicApp
 * A generic configurable UI for managing rarity color settings.
 * Dynamically updates the mini item preview as user changes form inputs.
 */
export class DynamicApp extends FormApplication {
  constructor(context = "general", options = {}, moduleId) {
    super(options);
    this.context = context;
    this.moduleId = moduleId;
  }

  /** Default app configuration */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "sc-item-rarity-colors",
      title: "Item Tier Rarity Settings",
      template: `modules/sc-item-rarity-colors/templates/item-tier-rarity.html`,
      classes: ["sc-item-rarity-colors"],
    });
  }

  /**
   * Prepare form data based on selected context.
   * Returns the settings fields and their current stored values.
   */
  getData() {
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

    const config = SETTINGS_MAP[this.context];
    if (!config) return { title: "Item Tier Rarity Settings" };

    // Load stored values for each field
    config.fields = config.fields.map((f) => ({
      ...f,
      value: game.settings.get(this.moduleId, f.name),
    }));

    return config;
  }

  /**
   * Initialize listeners once the form is rendered.
   * Updates live preview as inputs change.
   */
  activateListeners(html) {
    super.activateListeners(html);

    html.find("form").on("submit", this._onSubmit.bind(this));

    const miniSheet = $(".mini-item-sheet .application.sheet.item");
    if (!miniSheet.length) {
      console.warn("Mini item sheet not found for preview.");
      return;
    }

    /** Update mini preview whenever form inputs change */
    const updateMiniSheet = () => {
      const primary = html.find('input[name$="-item-color"]:first').val() || "#ffffff";
      const secondary = html.find('input[name$="-secondary-item-color"]').val() || "#ffffff";
      const gradientEnabled = html.find('input[name$="-gradient-option"]').prop("checked");
      const glowEnabled = html.find('input[name$="-glow-option"]').prop("checked");

      const settings = { backgroundColor: primary, gradientColor: secondary, gradientEnabled, glowEnabled };
      applyRarityStyles(miniSheet, settings);

      // Toggle visibility of secondary color input based on gradient option
      html.find('input[name$="-secondary-item-color"]').closest(".form-group").toggle(gradientEnabled);
    };

    // Initial preview
    updateMiniSheet();

    // Bind reactive updates
    html.find('input[type="color"], input[type="checkbox"]').on("input change", updateMiniSheet);
  }

  /**
   * Handle form submission and persist all settings.
   */
  async _onSubmit(event) {
    event.preventDefault();
    const data = this._serializeForm(event.target);

    for (const [key, value] of Object.entries(data)) {
      await game.settings.set(this.moduleId, key, value);
    }

    ui.notifications.info(`Saved ${this.context} settings!`);
    this.close();
  }

  /**
   * Serialize all form input fields into a key/value object.
   */
  _serializeForm(form) {
    const data = {};
    $(form)
      .find("input, select")
      .each((_, el) => {
        const $el = $(el);
        const name = $el.attr("name");
        if (!name) return;
        data[name] = $el.attr("type") === "checkbox" ? $el.prop("checked") : $el.val();
      });
    return data;
  }
}
