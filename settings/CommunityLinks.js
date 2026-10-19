import { DISCORD_URL, DOCS_URL, MODULE_ID, PATREON_URL } from "../core/constants.js";

/**
 * The outbound links the module offers: wiki, Patreon, and Discord.
 *
 * Registered settings menus would render a full label + hint + button row each
 * for what are really just links, so they are injected as one compact strip at
 * the end of the module's settings section instead.
 */
const LINKS = Object.freeze([
  Object.freeze({
    id: "wiki",
    url: DOCS_URL,
    icon: "fas fa-hat-wizard",
    label: "Open wiki",
    tooltip: "Open the SC - Item Rarity Colors documentation wiki.",
  }),
  Object.freeze({
    id: "patreon",
    url: PATREON_URL,
    icon: "fas fa-heart",
    label: "Patreon support",
    tooltip: "Support Shattered Codex development on Patreon.",
  }),
  Object.freeze({
    id: "discord",
    url: DISCORD_URL,
    icon: "fab fa-discord",
    label: "Discord",
    tooltip: "Join the Shattered Codex Discord server.",
  }),
]);

export class CommunityLinks {
  static links() {
    return LINKS;
  }

  static open(id) {
    const link = LINKS.find((entry) => entry.id === id);
    if (!link) return null;
    window?.open?.(link.url, "_blank", "noopener");
    return link.url;
  }

  /**
   * Appends the strip to the module's own settings section. Foundry renders one
   * `section[data-category="<module id>"]` per package, so the strip can be
   * anchored directly instead of walking up from a button.
   */
  static inject(html) {
    const section = CommunityLinks.#moduleSection(html);
    if (!section || section.querySelector(".scirc-community-links")) return null;

    const strip = document.createElement("div");
    strip.className = "scirc-community-links";
    strip.setAttribute("aria-label", "Community links");

    for (const link of LINKS) {
      strip.append(CommunityLinks.#button(link));
    }

    section.append(strip);
    return strip;
  }

  static #button(link) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `scirc-community-link scirc-community-link--${link.id}`;
    button.dataset.scircLink = link.id;
    button.setAttribute("data-tooltip", link.tooltip);
    button.setAttribute("aria-label", link.tooltip);

    const icon = document.createElement("i");
    icon.className = link.icon;
    icon.setAttribute("inert", "");

    const label = document.createElement("span");
    label.textContent = link.label;

    button.append(icon, label);
    button.addEventListener("click", (event) => {
      event.preventDefault();
      // The settings form owns the surrounding submit handler; a stray bubble
      // here would save the whole settings sheet just for opening a link.
      event.stopPropagation();
      CommunityLinks.open(link.id);
    });

    return button;
  }

  static #moduleSection(html) {
    const root = CommunityLinks.#resolveRoot(html);
    if (!root) return null;
    if (root.matches?.(`[data-category="${MODULE_ID}"]`)) return root;
    return root.querySelector?.(`[data-category="${MODULE_ID}"]`)
      ?? root.querySelector?.(`[data-tab="${MODULE_ID}"]`)
      ?? null;
  }

  static #resolveRoot(html) {
    if (!html) return null;
    if (html.jquery || typeof html.get === "function") {
      return html[0] ?? html.get(0) ?? null;
    }
    if (typeof html.querySelector === "function") return html;
    return null;
  }
}
