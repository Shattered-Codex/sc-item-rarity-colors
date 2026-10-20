import { BaseRuntimeStyleStrategy } from "./BaseRuntimeStyleStrategy.js";
import { settingsUseEffectColor } from "../itemEffects.js";

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

    // Glow is independent of the background: without one it pulses in the
    // effect color.
    if (settings.glowEnabled) {
      const glowPrimary = settings.enableItemColor ? colors.sheetPrimary : colors.effect;
      const glowSecondary = settings.gradientEnabled ? colors.sheetSecondary : "#000000";
      rules.push(`
.application.sheet.item.scirc-glow.${rarityClass} {
  --glow-primary: ${glowPrimary};
  --glow-secondary: ${glowSecondary};
}`);
    }

    if (settingsUseEffectColor(settings)) {
      rules.push(`
:is(.scirc-fx-enabled, .scirc-inv-icon-pulse).${rarityClass} {
  --scirc-fx-color: ${colors.effect};${colors.particle ? `
  --scirc-fx-pcolor: ${colors.particle};` : ""}
}`);
    }

    return rules;
  }
}
