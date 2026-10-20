/**
 * The spell shown in the spell school editor's preview: a real spell of the
 * selected school, from the 5e SRD, picked by spell level so the preview
 * reads like the spells the style will color. Icons come from Foundry's core
 * library, present in both v13 and v14.
 */

// Per school: a cantrip, then one spell each for levels 1-3, 4-6, and 7-9.
const SPELL_SAMPLES = Object.freeze({
  abj: [
    { name: "Resistance", level: 0, img: "icons/magic/defensive/shield-barrier-deflect-teal.webp", activation: "Action", range: "Touch", formula: "+1d4 save" },
    { name: "Shield", level: 1, img: "icons/magic/defensive/shield-barrier-blue.webp", activation: "Reaction", range: "Self", formula: "+5 AC" },
    { name: "Globe of Invulnerability", level: 6, img: "icons/magic/defensive/barrier-shield-dome-blue-purple.webp", activation: "Action", range: "Self (10 ft)", formula: "Ward" },
    { name: "Antimagic Field", level: 8, img: "icons/magic/symbols/runes-star-pentagon-blue.webp", activation: "Action", range: "Self (10 ft)", formula: "Suppress" },
  ],
  con: [
    { name: "Mage Hand", level: 0, img: "icons/magic/light/hand-sparks-smoke-teal.webp", activation: "Action", range: "30 ft", formula: "Utility" },
    { name: "Misty Step", level: 2, img: "icons/magic/air/fog-gas-smoke-blue-gray.webp", activation: "Bonus Action", range: "Self", formula: "Teleport 30 ft" },
    { name: "Conjure Elemental", level: 5, img: "icons/magic/earth/construct-stone.webp", activation: "1 Minute", range: "90 ft", formula: "Summon" },
    { name: "Gate", level: 9, img: "icons/magic/movement/portal-vortex-orange.webp", activation: "Action", range: "60 ft", formula: "Portal" },
  ],
  div: [
    { name: "True Strike", level: 0, img: "icons/magic/perception/eye-slit-orange.webp", activation: "Action", range: "Self", formula: "Weapon attack" },
    { name: "Detect Magic", level: 1, img: "icons/magic/perception/eye-ringed-green.webp", activation: "Action", range: "Self (30 ft)", formula: "Sense" },
    { name: "Scrying", level: 5, img: "icons/magic/perception/orb-crystal-ball-scrying-blue.webp", activation: "10 Minutes", range: "Self", formula: "Wis save" },
    { name: "Foresight", level: 9, img: "icons/magic/perception/eye-winged-pink.webp", activation: "1 Minute", range: "Touch", formula: "Advantage" },
  ],
  enc: [
    { name: "Vicious Mockery", level: 0, img: "icons/magic/control/fear-fright-mask-yellow.webp", activation: "Action", range: "60 ft", formula: "1d6 Psychic" },
    { name: "Hold Person", level: 2, img: "icons/magic/control/silhouette-hold-beam-blue.webp", activation: "Action", range: "60 ft", formula: "Paralyzed" },
    { name: "Dominate Person", level: 5, img: "icons/magic/control/hypnosis-mesmerism-swirl.webp", activation: "Action", range: "60 ft", formula: "Charmed" },
    { name: "Power Word Stun", level: 8, img: "icons/magic/control/hypnosis-mesmerism-eye.webp", activation: "Action", range: "60 ft", formula: "Stunned" },
  ],
  evo: [
    { name: "Fire Bolt", level: 0, img: "icons/magic/fire/projectile-bolt-zigzag-orange.webp", activation: "Action", range: "120 ft", formula: "1d10 Fire" },
    { name: "Fireball", level: 3, img: "icons/magic/fire/projectile-fireball-smoke-large-orange.webp", activation: "Action", range: "150 ft", formula: "8d6 Fire" },
    { name: "Cone of Cold", level: 5, img: "icons/magic/water/beam-ice-impact.webp", activation: "Action", range: "Self (60 ft)", formula: "8d8 Cold" },
    { name: "Meteor Swarm", level: 9, img: "icons/magic/earth/explosion-lava-stone-orange.webp", activation: "Action", range: "1 mile", formula: "40d6" },
  ],
  ill: [
    { name: "Minor Illusion", level: 0, img: "icons/magic/air/air-burst-spiral-large-pink.webp", activation: "Action", range: "30 ft", formula: "Illusion" },
    { name: "Invisibility", level: 2, img: "icons/magic/perception/silhouette-stealth-shadow.webp", activation: "Action", range: "Touch", formula: "Invisible" },
    { name: "Mislead", level: 5, img: "icons/magic/control/silhouette-hold-change-blue.webp", activation: "Action", range: "Self", formula: "Double" },
    { name: "Weird", level: 9, img: "icons/magic/control/fear-fright-shadow-monster-purple.webp", activation: "Action", range: "120 ft", formula: "10d10 Psychic" },
  ],
  nec: [
    { name: "Chill Touch", level: 0, img: "icons/magic/death/hand-withered-gray.webp", activation: "Action", range: "Touch", formula: "1d10 Necrotic" },
    { name: "Animate Dead", level: 3, img: "icons/magic/death/grave-tombstone-glow-teal.webp", activation: "1 Minute", range: "10 ft", formula: "Undead" },
    { name: "Circle of Death", level: 6, img: "icons/magic/unholy/beam-ringed-impact-purple.webp", activation: "Action", range: "150 ft", formula: "8d8 Necrotic" },
    { name: "Finger of Death", level: 7, img: "icons/magic/death/hand-undead-skeleton-fire-green.webp", activation: "Action", range: "60 ft", formula: "7d8+30 Necrotic" },
  ],
  trs: [
    { name: "Prestidigitation", level: 0, img: "icons/magic/light/hand-sparks-glow-yellow.webp", activation: "Action", range: "10 ft", formula: "Utility" },
    { name: "Haste", level: 3, img: "icons/magic/movement/trail-streak-zigzag-yellow.webp", activation: "Action", range: "30 ft", formula: "+2 AC" },
    { name: "Polymorph", level: 4, img: "icons/magic/control/silhouette-grow-shrink-tan.webp", activation: "Action", range: "60 ft", formula: "Wis save" },
    { name: "Time Stop", level: 9, img: "icons/magic/time/hourglass-tilted-glowing-gold.webp", activation: "Action", range: "Self", formula: "Extra turns" },
  ],
});

// Without level variants the school's style covers every level; a mid-level
// spell stands for it.
const SCHOOL_ONLY_TIER = 1;

function tierForLevel(level) {
  const numeric = Number(level);
  if (!Number.isFinite(numeric) || numeric <= 0) return 0;
  if (numeric <= 3) return 1;
  if (numeric <= 6) return 2;
  return 3;
}

// Tidy 5e's compact cast time column.
const SHORT_ACTIVATIONS = Object.freeze({
  "Action": "1A",
  "Bonus Action": "1BA",
  "Reaction": "1R",
  "1 Minute": "1m",
  "10 Minutes": "10m",
});

function ordinal(number) {
  const lastTwo = number % 100;
  if (lastTwo >= 11 && lastTwo <= 13) return `${number}th`;
  return `${number}${{ 1: "st", 2: "nd", 3: "rd" }[number % 10] ?? "th"}`;
}

/**
 * @param {string} schoolKey - normalized school key (abj, con, ...)
 * @param {number|null} level - the selected level, or null for the whole school
 * @param {string} schoolLabel - the school's display name
 * @returns {object} name, img, level, labels, and row details for the preview
 */
export function getSpellPreviewSample(schoolKey, level, schoolLabel) {
  const samples = SPELL_SAMPLES[schoolKey] ?? SPELL_SAMPLES.evo;
  const sample = samples[level === null || level === undefined ? SCHOOL_ONLY_TIER : tierForLevel(level)];
  const isCantrip = sample.level === 0;
  return {
    ...sample,
    schoolLabel: schoolLabel || "",
    schoolShort: (schoolLabel || schoolKey || "").slice(0, 3),
    activationShort: SHORT_ACTIVATIONS[sample.activation] ?? sample.activation,
    levelLabel: isCantrip ? "Cantrip" : `${ordinal(sample.level)}-level Spell`,
    levelShort: isCantrip ? "Cantrip" : `${ordinal(sample.level)} Level`,
    subtitle: isCantrip ? `${schoolLabel} Cantrip` : `${ordinal(sample.level)} Level ${schoolLabel}`,
  };
}
