import { SUPPORT_CARD_HIDE_SETTING_KEY } from "../core/constants.js";
import { DEBUG_LOGS_SETTING_KEY } from "../core/debug.js";

export const SETTING_SCOPES = Object.freeze({
  WORLD: "world",
  CLIENT: "client",
});

export const SETTINGS_ACTIONS = Object.freeze({
  SYNC_TIDY: "syncTidy",
});

export const SECTION_KINDS = Object.freeze({
  FIELDS: "fields",
  RARITY_LIST: "rarityList",
});

/**
 * Every option the module shows in its own settings window, grouped the way
 * the window renders them.
 *
 * Sections hold two kinds of rows: `fields` are boolean settings the window
 * reads and saves, and `actions` are tools that run immediately when clicked
 * (they write elsewhere), so they never mark a tab as dirty. A section of kind
 * `rarityList` hosts the rarity list editor instead, which the window renders
 * and saves itself. Item and spell colors are not here: they have their own
 * buttons in Foundry's settings list.
 */
const SECTIONS = Object.freeze([
  Object.freeze({
    id: "rarities",
    kind: SECTION_KINDS.RARITY_LIST,
    scope: SETTING_SCOPES.WORLD,
    icon: "fas fa-list",
    title: "Rarity list",
    hint: "Add, rename, reorder, or hide rarities. Changes are synced with Custom DND5E when it is active.",
    fields: Object.freeze([]),
    actions: Object.freeze([]),
  }),
  Object.freeze({
    id: "integrations",
    scope: SETTING_SCOPES.WORLD,
    icon: "fas fa-plug",
    title: "Integrations",
    hint: "Share this module's colors with other modules in the world.",
    fields: Object.freeze([]),
    actions: Object.freeze([
      Object.freeze({
        id: SETTINGS_ACTIONS.SYNC_TIDY,
        icon: "fas fa-arrows-rotate",
        name: "Sync rarity colors to Tidy 5e",
        hint: "Copy each rarity's primary item sheet color into Tidy 5e's world theme rarity colors. You will be asked to confirm first.",
        label: "Sync colors",
      }),
    ]),
  }),
  Object.freeze({
    id: "interface",
    scope: SETTING_SCOPES.CLIENT,
    icon: "fas fa-comment-dots",
    title: "Chat messages",
    hint: "Applies to this browser only. Every user can change it, including players.",
    fields: Object.freeze([
      Object.freeze({
        key: SUPPORT_CARD_HIDE_SETTING_KEY,
        scope: SETTING_SCOPES.CLIENT,
        default: false,
        name: "Hide automatic support message until next update",
        hint: "After the support card appears once for the current version, this option is checked automatically. Uncheck it if you want the card to appear whenever the world loads.",
      }),
    ]),
    actions: Object.freeze([]),
  }),
  Object.freeze({
    id: "diagnostics",
    scope: SETTING_SCOPES.CLIENT,
    icon: "fas fa-bug",
    title: "Diagnostics",
    hint: "Applies to this browser only. Every user can change it, including players.",
    fields: Object.freeze([
      Object.freeze({
        key: DEBUG_LOGS_SETTING_KEY,
        scope: SETTING_SCOPES.CLIENT,
        default: false,
        name: "Enable debug logs",
        hint: "Log rarity color flow details in the browser console for troubleshooting.",
      }),
    ]),
    actions: Object.freeze([]),
  }),
]);

export class ModuleSettingsCatalog {
  static sections() {
    return SECTIONS;
  }

  static fields() {
    return SECTIONS.flatMap((section) => section.fields);
  }

  static kind(sectionId) {
    return SECTIONS.find((entry) => entry.id === sectionId)?.kind ?? SECTION_KINDS.FIELDS;
  }

  /**
   * World settings are GM-only, so a player opening the window sees just the
   * client sections rather than controls they cannot save.
   */
  static visibleSections(isGM) {
    return SECTIONS.filter((section) => isGM === true || section.scope === SETTING_SCOPES.CLIENT);
  }

  /** The Foundry registration for a field, minus the module id and key. */
  static registration(field) {
    return {
      name: field.name,
      hint: field.hint,
      scope: field.scope,
      // Every field lives in the module's own window instead of the flat
      // Foundry settings list.
      config: false,
      restricted: field.scope === SETTING_SCOPES.WORLD,
      type: Boolean,
      default: field.default,
    };
  }

  static tabIds(isGM) {
    return ModuleSettingsCatalog.visibleSections(isGM).map((section) => section.id);
  }

  /**
   * Falls back to the first tab the user can open, so a remembered tab that is
   * no longer visible cannot render an empty window.
   */
  static resolveTab(requestedTab, isGM) {
    const ids = ModuleSettingsCatalog.tabIds(isGM);
    return ids.includes(requestedTab) ? requestedTab : (ids[0] ?? null);
  }

  /**
   * @param {object} options
   * @param {(key: string) => unknown} options.readSetting
   * @param {(actionId: string) => {disabled?: boolean, status?: string, statusTone?: string}} options.actionState
   *   Live state for an action row (e.g. whether Tidy 5e is active), supplied
   *   by the window so the catalog stays free of game lookups.
   */
  static buildContext({
    isGM = false,
    readSetting = () => undefined,
    actionState = () => ({}),
    activeTab = null,
    formId = "scirc-settings",
  } = {}) {
    const currentTab = ModuleSettingsCatalog.resolveTab(activeTab, isGM);

    const sections = ModuleSettingsCatalog.visibleSections(isGM).map((section) => ({
      id: section.id,
      icon: section.icon,
      title: section.title,
      hint: section.hint,
      active: section.id === currentTab,
      isRarityList: section.kind === SECTION_KINDS.RARITY_LIST,
      fields: section.fields.map((field) => {
        const checked = ModuleSettingsCatalog.normalize(field, readSetting(field.key));
        return {
          key: field.key,
          name: field.name,
          hint: field.hint,
          checked,
          // Mirrored onto the control so "Reset defaults" can restore it
          // without a re-render, keeping the reset cancellable.
          defaultChecked: field.default === true ? "true" : "false",
        };
      }),
      actions: section.actions.map((action) => {
        const state = actionState(action.id) ?? {};
        return {
          id: action.id,
          icon: action.icon,
          name: action.name,
          hint: action.hint,
          label: action.label,
          disabled: state.disabled === true,
          status: state.status ?? "",
          statusTone: state.statusTone ?? "neutral",
        };
      }),
    }));

    return {
      isGM,
      formId,
      activeTab: currentTab,
      sections,
      tabs: sections.map((section) => ({
        id: section.id,
        icon: section.icon,
        label: section.title,
        active: section.active,
      })),
      playerNotice: isGM ? "" : "World options are managed by the GM. Only the options below apply to you.",
    };
  }

  /** Whether "Reset defaults" has anything to restore on this tab. */
  static isResettable(sectionId) {
    const section = SECTIONS.find((entry) => entry.id === sectionId);
    if (!section) return false;
    return section.kind === SECTION_KINDS.RARITY_LIST || section.fields.length > 0;
  }

  /**
   * A stable string for one tab's values, used to tell a dirty tab from a
   * clean one. Only the tab's own fields are included, so editing one tab
   * never marks another as dirty. The rarity list is not a static field set,
   * so the window snapshots it and passes it in.
   */
  static snapshot(sectionId, values = {}, { rarityListSnapshot = "" } = {}) {
    const section = SECTIONS.find((entry) => entry.id === sectionId);
    if (!section) return "";
    if (section.kind === SECTION_KINDS.RARITY_LIST) return rarityListSnapshot;
    return JSON.stringify(section.fields.map((field) => ModuleSettingsCatalog.normalize(field, values[field.key])));
  }

  static normalize(field, raw) {
    if (!field) return undefined;
    if (typeof raw === "string") return raw === "true" || raw === "on";
    return raw === undefined || raw === null ? field.default : Boolean(raw);
  }

  /**
   * The normalized writes for a submitted form. World fields are dropped for a
   * player: Foundry would reject the write anyway.
   */
  static collectWrites(values = {}, { isGM = false } = {}) {
    const writes = [];
    for (const section of ModuleSettingsCatalog.visibleSections(isGM)) {
      for (const field of section.fields) {
        if (!Object.hasOwn(values, field.key)) continue;
        writes.push({ key: field.key, value: ModuleSettingsCatalog.normalize(field, values[field.key]) });
      }
    }
    return writes;
  }
}
