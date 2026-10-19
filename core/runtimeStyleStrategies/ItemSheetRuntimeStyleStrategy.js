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
:is(.scirc-item-sheet-bg-enabled, .scirc-tidy-sidebar-bg).${rarityClass} {
  --scirc-item-sheet-bg-primary: ${colors.sheetPrimary};
}`);

      if (settings.gradientEnabled) {
        rules.push(`
:is(.scirc-item-sheet-bg-enabled, .scirc-tidy-sidebar-bg).scirc-item-sheet-bg-gradient-enabled.${rarityClass} {
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

    if (settings.enableGoldAccentColor && settings.goldAccentColor) {
      rules.push(`
.scirc-item-sheet-gold-enabled.${rarityClass} {
  --scirc-item-sheet-gold: ${colors.sheetGold};
}`);
    }

    if (settings.enableTableHeaderColor && settings.tableHeaderColor) {
      rules.push(`
.scirc-item-sheet-table-header-enabled.${rarityClass} {
  --scirc-item-sheet-table-header: ${colors.sheetTableHeader};
}`);
    }

    if (settings.enableTableHeaderTextColor && settings.tableHeaderTextColor) {
      rules.push(`
.scirc-item-sheet-table-header-text-enabled.${rarityClass} {
  --scirc-item-sheet-table-header-text: ${colors.sheetTableHeaderText};
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
