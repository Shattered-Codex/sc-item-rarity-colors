import { BaseRuntimeStyleStrategy } from "./BaseRuntimeStyleStrategy.js";

/**
 * Runtime CSS strategy for item sheet visuals.
 */
export class ItemSheetRuntimeStyleStrategy extends BaseRuntimeStyleStrategy {
  buildRules(context) {
    const { rarityClass, settings, colors } = context;
    const rules = [];

    if (settings.enableItemColor) {
      rules.push(`
.scirc-item-sheet-bg-enabled.${rarityClass} {
  --scirc-item-sheet-bg-primary: ${colors.sheetPrimary};
}`);

      if (settings.gradientEnabled) {
        rules.push(`
.scirc-item-sheet-bg-enabled.scirc-item-sheet-bg-gradient-enabled.${rarityClass} {
  --scirc-item-sheet-bg-secondary: ${colors.sheetSecondary};
}`);
      }
    }

    if (settings.enableTextColor) {
      rules.push(`
.scirc-item-sheet-text-dnd5e.${rarityClass},
.scirc-item-sheet-text-tidy.${rarityClass} {
  --scirc-item-sheet-text-color: ${colors.sheetText};
}`);
    }

    if (settings.enableItemColor && settings.glowEnabled) {
      const glowSecondary = settings.gradientEnabled ? colors.sheetSecondary : "#000000";
      rules.push(`
.application.sheet.item.scirc-glow.${rarityClass} {
  --glow-primary: ${colors.sheetPrimary};
  --glow-secondary: ${glowSecondary};
}`);
    }

    return rules;
  }
}
