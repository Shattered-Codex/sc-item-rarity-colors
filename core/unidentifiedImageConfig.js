/**
 * How unidentified items hide their image (the editor's Image tab, shown only
 * for the unidentified style): the image modes, the item kinds that can each
 * get their own stand-in image, and which kind an item belongs to.
 *
 * The real image is only covered on screen; the item document keeps it, so
 * this never writes to an Item.
 */

export const CONCEAL_IMAGE_MODES = Object.freeze({
  none: "Real image",
  shadow: "Shadowed",
  silhouette: "Silhouette",
  blur: "Blurred",
  type: "By item type",
});

export const DEFAULT_CONCEAL_IMAGE_MODE = "shadow";

export const CONCEAL_MARK_SIZES = Object.freeze({ small: "Small", medium: "Medium", large: "Large" });

/** Where the image is hidden: the editor sections the kind fields go in. */
export const CONCEAL_IMAGE_SECTIONS = Object.freeze([
  Object.freeze({ id: "images-weapons", title: "Weapons" }),
  Object.freeze({ id: "images-armor", title: "Armor" }),
  Object.freeze({ id: "images-gear", title: "Gear & wondrous items" }),
  Object.freeze({ id: "images-consumables", title: "Consumables" }),
  Object.freeze({ id: "images-other", title: "Other items" }),
]);

/**
 * Item kinds with their own stand-in image. Defaults come from Foundry's core
 * icon library, present in both v13 and v14.
 */
export const ITEM_IMAGE_KINDS = Object.freeze([
  { key: "sword", label: "Swords", section: "images-weapons", defaultImage: "icons/weapons/swords/sword-broad-worn.webp" },
  { key: "axe", label: "Axes", section: "images-weapons", defaultImage: "icons/weapons/axes/axe-battle-worn.webp" },
  { key: "bludgeon", label: "Hammers & maces", section: "images-weapons", defaultImage: "icons/weapons/maces/mace-round-steel.webp" },
  { key: "polearm", label: "Spears, polearms & staffs", section: "images-weapons", defaultImage: "icons/weapons/polearms/spear-flared-steel.webp" },
  { key: "dagger", label: "Daggers", section: "images-weapons", defaultImage: "icons/weapons/daggers/dagger-simple-black.webp" },
  { key: "bow", label: "Bows", section: "images-weapons", defaultImage: "icons/weapons/bows/shortbow-recurve.webp" },
  { key: "crossbow", label: "Crossbows", section: "images-weapons", defaultImage: "icons/weapons/crossbows/crossbow-simple-brown.webp" },
  { key: "weapon-melee", label: "Other melee weapons", section: "images-weapons", defaultImage: "icons/weapons/clubs/club-banded-steel.webp" },
  { key: "weapon-ranged", label: "Other ranged weapons", section: "images-weapons", defaultImage: "icons/weapons/slings/slingshot-wood.webp" },
  { key: "armor-light", label: "Light armor", section: "images-armor", defaultImage: "icons/equipment/chest/breastplate-layered-leather-brown.webp" },
  { key: "armor-medium", label: "Medium armor", section: "images-armor", defaultImage: "icons/equipment/chest/breastplate-scale-grey.webp" },
  { key: "armor-heavy", label: "Heavy armor", section: "images-armor", defaultImage: "icons/equipment/chest/breastplate-gorget-steel.webp" },
  { key: "shield", label: "Shields", section: "images-armor", defaultImage: "icons/equipment/shield/heater-steel-grey.webp" },
  { key: "ring", label: "Rings", section: "images-gear", defaultImage: "icons/equipment/finger/ring-band-engraved-silver.webp" },
  { key: "wand", label: "Wands", section: "images-gear", defaultImage: "icons/weapons/wands/wand-carved-stone-shard.webp" },
  { key: "rod", label: "Rods", section: "images-gear", defaultImage: "icons/commodities/treasure/sceptre-jeweled-gold.webp" },
  { key: "wondrous", label: "Wondrous items & trinkets", section: "images-gear", defaultImage: "icons/equipment/neck/amulet-carved-runed-othila-fehu-grey.webp" },
  { key: "clothing", label: "Clothing", section: "images-gear", defaultImage: "icons/equipment/back/cloak-brown.webp" },
  { key: "potion", label: "Potions & poisons", section: "images-consumables", defaultImage: "icons/consumables/potions/bottle-round-corked-red.webp" },
  { key: "scroll", label: "Scrolls", section: "images-consumables", defaultImage: "icons/sundries/scrolls/scroll-rolled-tan.webp" },
  { key: "ammunition", label: "Ammunition", section: "images-consumables", defaultImage: "icons/weapons/ammunition/arrow-simple.webp" },
  { key: "consumable", label: "Other consumables", section: "images-consumables", defaultImage: "icons/consumables/food/bread-toast-tan.webp" },
  { key: "tool", label: "Tools", section: "images-other", defaultImage: "icons/tools/hand/hammer-and-nail.webp" },
  { key: "gem", label: "Gems", section: "images-other", defaultImage: "icons/commodities/gems/gem-faceted-round-white.webp" },
  { key: "container", label: "Containers", section: "images-other", defaultImage: "icons/containers/bags/pack-leather-brown.webp" },
  { key: "loot", label: "Treasure & loot", section: "images-other", defaultImage: "icons/commodities/treasure/goblet-worn-gold.webp" },
  { key: "item", label: "Anything else", section: "images-other", defaultImage: "icons/svg/item-bag.svg" },
].map((kind) => Object.freeze(kind)));

const FALLBACK_KIND = "item";

export function buildImageKindFieldKey(kind) {
  return `conceal-image-${kind}`;
}

// D&D 5e base weapons (CONFIG.DND5E.weaponIds) by family. Weapons without a
// base item fall back to "other melee" or "other ranged" by weapon type.
const WEAPON_FAMILIES = Object.freeze({
  shortsword: "sword",
  longsword: "sword",
  greatsword: "sword",
  scimitar: "sword",
  rapier: "sword",
  handaxe: "axe",
  battleaxe: "axe",
  greataxe: "axe",
  club: "bludgeon",
  greatclub: "bludgeon",
  lighthammer: "bludgeon",
  mace: "bludgeon",
  warhammer: "bludgeon",
  maul: "bludgeon",
  morningstar: "bludgeon",
  flail: "bludgeon",
  warpick: "bludgeon",
  spear: "polearm",
  javelin: "polearm",
  glaive: "polearm",
  halberd: "polearm",
  pike: "polearm",
  lance: "polearm",
  trident: "polearm",
  quarterstaff: "polearm",
  dagger: "dagger",
  sickle: "dagger",
  shortbow: "bow",
  longbow: "bow",
  handcrossbow: "crossbow",
  lightcrossbow: "crossbow",
  heavycrossbow: "crossbow",
  whip: "weapon-melee",
  dart: "weapon-ranged",
  sling: "weapon-ranged",
  blowgun: "weapon-ranged",
  musket: "weapon-ranged",
  pistol: "weapon-ranged",
});

const EQUIPMENT_KINDS = Object.freeze({
  light: "armor-light",
  natural: "armor-light",
  medium: "armor-medium",
  heavy: "armor-heavy",
  shield: "shield",
  ring: "ring",
  wand: "wand",
  rod: "rod",
  wondrous: "wondrous",
  trinket: "wondrous",
  clothing: "clothing",
});

const CONSUMABLE_KINDS = Object.freeze({
  potion: "potion",
  poison: "potion",
  scroll: "scroll",
  ammo: "ammunition",
  wand: "wand",
  rod: "rod",
  trinket: "wondrous",
  wondrous: "wondrous",
});

function resolveWeaponKind(subtype, baseItem) {
  if (WEAPON_FAMILIES[baseItem]) return WEAPON_FAMILIES[baseItem];
  return String(subtype ?? "").endsWith("R") ? "weapon-ranged" : "weapon-melee";
}

/**
 * The kind of stand-in image an item gets, from its D&D 5e type, subtype
 * (`system.type.value`), and base item (`system.type.baseItem`).
 * @param {object} item - Item document or a compendium index entry
 * @returns {string} one of ITEM_IMAGE_KINDS' keys
 */
export function resolveItemImageKind(item) {
  const subtype = item?.system?.type?.value ?? null;
  switch (item?.type) {
    case "weapon":
      return resolveWeaponKind(subtype, item?.system?.type?.baseItem);
    case "equipment":
      return EQUIPMENT_KINDS[subtype] ?? FALLBACK_KIND;
    case "consumable":
      return CONSUMABLE_KINDS[subtype] ?? "consumable";
    case "tool":
      return "tool";
    case "container":
      return "container";
    case "loot":
      return subtype === "gem" ? "gem" : "loot";
    default:
      return FALLBACK_KIND;
  }
}

/**
 * The Image tab settings as the conceal code reads them.
 * @param {(fieldKey: string, defaultValue: *) => *} read - stored value of one field
 */
export function readConcealSettings(read) {
  const images = {};
  for (const kind of ITEM_IMAGE_KINDS) {
    const stored = read(buildImageKindFieldKey(kind.key), kind.defaultImage);
    images[kind.key] = typeof stored === "string" && stored.trim() ? stored.trim() : kind.defaultImage;
  }

  const mode = read("conceal-image-mode", DEFAULT_CONCEAL_IMAGE_MODE);
  const markSize = read("conceal-mark-size", "medium");
  return {
    mode: Object.hasOwn(CONCEAL_IMAGE_MODES, mode) ? mode : DEFAULT_CONCEAL_IMAGE_MODE,
    mark: read("conceal-mark-option", true) === true,
    markColor: read("conceal-mark-color", "#f4efff"),
    markSize: Object.hasOwn(CONCEAL_MARK_SIZES, markSize) ? markSize : "medium",
    surfaces: {
      sheet: read("conceal-on-sheet", true) === true,
      inventory: read("conceal-in-inventory", true) === true,
      sidebar: read("conceal-in-sidebar", true) === true,
    },
    images,
  };
}
