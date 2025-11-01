/**
 * Rarity Configuration
 * Centralized configuration for rarity tiers and their available options
 */

import { RARITY_TIERS } from "./constants.js";

/**
 * Rarity configuration defining what options are available for each tier
 */
export const RARITY_CONFIG = {
  [RARITY_TIERS.COMMON]: {
    label: "Common",
    supportsGradient: true,
    supportsGlow: true,
    supportsBorderGradient: true,
    supportsBorderGlow: true,
  },
  [RARITY_TIERS.UNCOMMON]: {
    label: "Uncommon",
    supportsGradient: true,
    supportsGlow: true,
    supportsBorderGradient: true,
    supportsBorderGlow: true,
  },
  [RARITY_TIERS.RARE]: {
    label: "Rare",
    supportsGradient: true,
    supportsGlow: true,
    supportsBorderGradient: true,
    supportsBorderGlow: true,
  },
  [RARITY_TIERS.VERY_RARE]: {
    label: "Very Rare",
    supportsGradient: true,
    supportsGlow: true,
    supportsBorderGradient: true,
    supportsBorderGlow: true,
  },
  [RARITY_TIERS.LEGENDARY]: {
    label: "Legendary",
    supportsGradient: true,
    supportsGlow: true,
    supportsBorderGradient: true,
    supportsBorderGlow: true,
  },
  [RARITY_TIERS.ARTIFACT]: {
    label: "Artifact",
    supportsGradient: true,
    supportsGlow: true,
    supportsBorderGradient: true,
    supportsBorderGlow: true,
  },
};

/**
 * Check if a rarity supports gradient options
 * @param {string} rarity - Normalized rarity value
 * @returns {boolean}
 */
export function raritySupportsGradient(rarity) {
  return RARITY_CONFIG[rarity]?.supportsGradient || false;
}

/**
 * Check if a rarity supports glow options
 * @param {string} rarity - Normalized rarity value
 * @returns {boolean}
 */
export function raritySupportsGlow(rarity) {
  return RARITY_CONFIG[rarity]?.supportsGlow || false;
}

/**
 * Check if a rarity supports border gradient (secondary color for border)
 * @param {string} rarity - Normalized rarity value
 * @returns {boolean}
 */
export function raritySupportsBorderGradient(rarity) {
  return RARITY_CONFIG[rarity]?.supportsBorderGradient || false;
}

/**
 * Check if a rarity supports border glow
 * @param {string} rarity - Normalized rarity value
 * @returns {boolean}
 */
export function raritySupportsBorderGlow(rarity) {
  return RARITY_CONFIG[rarity]?.supportsBorderGlow || false;
}
