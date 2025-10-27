/**
 * Normalize a rarity string to match module settings.
 *
 * @param {string} rawRarity - The original rarity string.
 * @returns {string|null} - Normalized rarity or null if invalid.
 */
export function normalizeRarity(rawRarity) {
  if (!rawRarity) return null;
  return rawRarity.trim().toLowerCase();
}

/**
 * Get color, gradient, and glow settings for a given rarity.
 *
 * @param {string} rarity - The rarity key (e.g., "common", "rare").
 * @param {string} moduleId - The module's unique identifier.
 * @returns {object} - Settings for background, gradient, and glow.
 */
export function getItemRaritySettings(rarity, moduleId) {
  const settingExists = (key) => game.settings.settings.has(`${moduleId}.${key}`);

  return {
    backgroundColor: settingExists(`${rarity}-item-color`)
      ? game.settings.get(moduleId, `${rarity}-item-color`)
      : "",

    gradientEnabled: settingExists(`${rarity}-gradient-option`)
      ? game.settings.get(moduleId, `${rarity}-gradient-option`)
      : false,

    glowEnabled: settingExists(`${rarity}-glow-option`)
      ? game.settings.get(moduleId, `${rarity}-glow-option`)
      : false,

    gradientColor: settingExists(`${rarity}-secondary-item-color`)
      ? game.settings.get(moduleId, `${rarity}-secondary-item-color`)
      : "#ffffff",
  };
}

/**
 * Apply rarity styles (background, gradient, and glow) to an HTML element.
 *
 * @param {HTMLElement|JQuery} element - Target element or jQuery wrapper.
 * @param {object} settings - Rarity visual configuration.
 */
export function applyRarityStyles(element, settings) {
  if (!element) return;

  const $element = element instanceof jQuery ? element : $(element);

  // ---- Background & Gradient ----
  if (settings.gradientEnabled) {
    $element.css({
      "background-image": `linear-gradient(to right, ${settings.backgroundColor}, ${settings.gradientColor})`,
      "background-color": "",
    });
  } else {
    $element.css({
      "background-image": "",
      "background-color": settings.backgroundColor,
    });
  }

  // ---- Glow ----
  if (settings.glowEnabled) {
    $element.addClass("glow");
    $element.css("--glow-primary", settings.backgroundColor);
    $element.css("--glow-secondary", settings.gradientEnabled ? settings.gradientColor : "#000000");
  } else {
    $element.removeClass("glow");
  }
}

/**
 * Apply rarity gradient styles for actor inventory items.
 * Creates a smooth 3-stop gradient background without glow.
 *
 * @param {HTMLElement|JQuery} element - Target element or jQuery wrapper.
 * @param {object} settings - Rarity visual configuration.
 */
export function applyActorSheetItemRarityGradient(element, settings) {
  if (!element) return;

  const $element = element instanceof jQuery ? element : $(element);

  const primaryColor = settings.backgroundColor || "#ffffff";
  const secondaryColor =
    settings.gradientEnabled &&
    settings.gradientColor &&
    settings.gradientColor !== "#ffffff"
      ? settings.gradientColor
      : "#252830";
  const fallbackColor = "#252830";

  // Apply a smooth 3-stop diagonal gradient.
  $element.css({
    "background": `linear-gradient(-135deg, ${primaryColor} 10%, ${secondaryColor} 30%, ${fallbackColor} 50%)`,
    "box-shadow": "none",
    "color": "#fff",
  });

  // Remove any glow class for inventory context.
  $element.removeClass("glow");
}

/**
 * Apply a border and optional glow animation based on rarity settings.
 *
 * @param {HTMLElement|JQuery} element - Target item container.
 * @param {object} settings - Must include backgroundColor, gradientColor, etc.
 * @param {number} intensity - Glow intensity (default: 6px).
 */
export function applyActorSheetItemBorder(element, settings, intensity = 6) {
  if (!element) return;

  const $element = element instanceof jQuery ? element : $(element);

  const primaryColor = settings.backgroundColor || "#ffffff";
  const secondaryColor =
    settings.gradientEnabled &&
    settings.gradientColor &&
    settings.gradientColor !== "#ffffff"
      ? settings.gradientColor
      : "#000000";

  // ---- Base Border ----
  $element.css({
    "border": `2px solid transparent`,
    "border-image": `linear-gradient(135deg, ${primaryColor} 50%, ${
      secondaryColor === "#000000" ? primaryColor : secondaryColor
    } 50%) 1`,
  });

  // ---- Remove previous glow animations ----
  $element.removeClass((_, className) => {
    return (className.match(/(^|\s)glow-fade-border-\S+/g) || []).join(" ");
  });
  $element.css("box-shadow", "");

  // ---- Apply glow animation if enabled ----
  if (settings.glowEnabled) {
    $element.css("border", "none");

    const animationName = `glow-fade-border-${primaryColor.replace("#", "")}-${secondaryColor.replace("#", "")}`;

    // Inject keyframes once per unique color combo.
    if (!document.getElementById(animationName)) {
      const styleTag = document.createElement("style");
      styleTag.id = animationName;
      styleTag.innerHTML = `
        @keyframes ${animationName} {
          0% {
            border-color: ${primaryColor};
            box-shadow: 0 0 ${intensity}px ${secondaryColor}, 0 0 ${intensity * 1.5}px ${secondaryColor};
          }
          50% {
            border-color: ${secondaryColor};
            box-shadow: 0 0 ${intensity}px ${primaryColor}, 0 0 ${intensity * 1.5}px ${primaryColor};
          }
          100% {
            border-color: ${primaryColor};
            box-shadow: 0 0 ${intensity}px ${secondaryColor}, 0 0 ${intensity * 1.5}px ${secondaryColor};
          }
        }
        .${animationName} {
          animation: ${animationName} 6s infinite ease-in-out;
        }
      `;
      document.head.appendChild(styleTag);
    }

    $element.addClass(animationName);
  }
}

/**
 * Remove any gradient applied to an inventory item
 * and restores inline styles to their defaults.
 *
 * @param {HTMLElement|JQuery} element - Target element or jQuery wrapper.
 */
export function clearActorSheetItemRarityGradient(element) {
  const $element = element instanceof jQuery ? element : $(element);

  $element.css({
    "background": "",
    "background-image": "",
    "box-shadow": "",
    "color": ""
  }).removeClass("glow");
}

/**
 * Remove any previously applied glow/border from one or more elements.
 *
 * @param {HTMLElement|JQuery} element - Target element(s) or jQuery wrapper.
 */
export function clearActorSheetItemBorder(element) {
  const $targets = element instanceof jQuery ? element : $(element);

  $targets.each((_, icon) => {
    $(icon).css({
      border: "",
      "border-image": "",
      "box-shadow": ""
    });
    // Remove glow animation classes
    $(icon).removeClass((_, c) => (c.match(/(^|\s)glow-fade-border-\S+/g) || []).join(" "));
  });
}
