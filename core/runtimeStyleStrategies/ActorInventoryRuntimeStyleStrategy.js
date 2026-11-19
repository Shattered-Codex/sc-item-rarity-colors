import { BaseRuntimeStyleStrategy } from "./BaseRuntimeStyleStrategy.js";
import { DEFAULT_GLOW_INTENSITY } from "../constants.js";
import { gradientStopDeclarations } from "../gradientCoverage.js";

/**
 * Runtime CSS strategy for actor inventory visuals.
 */
export class ActorInventoryRuntimeStyleStrategy extends BaseRuntimeStyleStrategy {
  buildRules(context) {
    const { rarityClass, settings, colors } = context;
    const rules = [];

    if (settings.enableInventoryGradientEffects && settings.enableItemColor) {
      const invSecondary = settings.gradientEnabled ? colors.inventorySecondary : "#252830";
      rules.push(`
.scirc-inv-gradient-enabled.${rarityClass} {
  --scirc-inv-bg-primary: ${colors.inventoryPrimary};
  --scirc-inv-bg-secondary: ${invSecondary};
  --scirc-inv-bg-fallback: #252830;${gradientStopDeclarations("inventory", settings.inventoryGradientCoverage)}
}`);
    }

    if (settings.enableInventoryBorders) {
      let borderPrimary = null;
      let borderSecondary = null;

      if (settings.enableItemColor) {
        borderPrimary = colors.inventoryPrimary;
        borderSecondary = settings.gradientEnabled ? colors.inventorySecondary : colors.inventoryPrimary;
      } else if (settings.enableInventoryBorderColor && settings.inventoryBorderColor) {
        borderPrimary = colors.inventoryBorderPrimary;
        borderSecondary = colors.inventoryBorderSecondary;
      }

      if (borderPrimary) {
        // Only a changed glow size is written; the CSS falls back to the original.
        const glowSize = settings.inventoryBorderGlowSize;
        const glowSizeDeclaration = glowSize && glowSize !== DEFAULT_GLOW_INTENSITY
          ? `\n  --scirc-inv-border-glow-intensity: ${glowSize}px;`
          : "";
        rules.push(`
.scirc-inv-border-managed.${rarityClass},
.scirc-inv-border-solid.${rarityClass},
.scirc-inv-border-gradient.${rarityClass},
.scirc-inv-border-glow.${rarityClass} {
  --scirc-inv-border-primary: ${borderPrimary};
  --scirc-inv-border-secondary: ${borderSecondary};${glowSizeDeclaration}
}`);
      }
    }

    if (settings.enableInventoryTitleColor) {
      rules.push(`
.scirc-managed-item-row.${rarityClass}.scirc-inv-title-color-enabled {
  --scirc-inv-title-color: ${colors.inventoryTitle};
}`);
    }

    if (settings.enableInventoryDetailsColor) {
      rules.push(`
.scirc-managed-item-row.${rarityClass}.scirc-inv-details-color-enabled {
  --scirc-inv-details-color: ${colors.inventoryDetails};
}`);
    }

    return rules;
  }
}
