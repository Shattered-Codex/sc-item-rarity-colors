import { BaseRuntimeStyleStrategy } from "./BaseRuntimeStyleStrategy.js";

/**
 * Runtime CSS strategy for actor inventory visuals.
 */
export class ActorInventoryRuntimeStyleStrategy extends BaseRuntimeStyleStrategy {
  buildRules(context) {
    const { rarityClass, settings, colors } = context;
    const rules = [];

    if (settings.enableInventoryGradientEffects && settings.enableItemColor) {
      const invSecondary = settings.gradientEnabled ? colors.sheetSecondary : "#252830";
      rules.push(`
.scirc-inv-gradient-enabled.${rarityClass} {
  --scirc-inv-bg-primary: ${colors.sheetPrimary};
  --scirc-inv-bg-secondary: ${invSecondary};
  --scirc-inv-bg-fallback: #252830;
}`);
    }

    if (settings.enableInventoryBorders) {
      let borderPrimary = null;
      let borderSecondary = null;

      if (settings.enableItemColor) {
        borderPrimary = colors.sheetPrimary;
        borderSecondary = settings.gradientEnabled ? colors.sheetSecondary : colors.sheetPrimary;
      } else if (settings.enableInventoryBorderColor && settings.inventoryBorderColor) {
        borderPrimary = colors.inventoryBorderPrimary;
        borderSecondary = colors.inventoryBorderSecondary;
      }

      if (borderPrimary) {
        rules.push(`
.scirc-inv-border-managed.${rarityClass},
.scirc-inv-border-solid.${rarityClass},
.scirc-inv-border-gradient.${rarityClass},
.scirc-inv-border-glow.${rarityClass} {
  --scirc-inv-border-primary: ${borderPrimary};
  --scirc-inv-border-secondary: ${borderSecondary};
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
