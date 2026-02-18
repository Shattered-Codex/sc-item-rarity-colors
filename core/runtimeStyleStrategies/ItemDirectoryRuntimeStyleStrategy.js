import { BaseRuntimeStyleStrategy } from "./BaseRuntimeStyleStrategy.js";

/**
 * Runtime CSS strategy for Foundry item directory visuals.
 */
export class ItemDirectoryRuntimeStyleStrategy extends BaseRuntimeStyleStrategy {
  buildRules(context) {
    const { rarityClass, settings, colors } = context;
    const rules = [];

    if (settings.enableFoundryInterfaceGradientEffects && settings.enableItemColor) {
      const dirSecondary = settings.gradientEnabled ? colors.sheetSecondary : "#252830";
      rules.push(`
.directory-item.item.${rarityClass}.scirc-dir-gradient-enabled,
.directory-item.document.item.${rarityClass}.scirc-dir-gradient-enabled,
.directory-item.entry.document.item.${rarityClass}.scirc-dir-gradient-enabled {
  --scirc-dir-bg-primary: ${colors.sheetPrimary};
  --scirc-dir-bg-secondary: ${dirSecondary};
  --scirc-dir-bg-fallback: #252830;
}`);
    }

    if (settings.enableFoundryInterfaceTextColor) {
      rules.push(`
.directory-item.item.${rarityClass}.scirc-dir-text-enabled,
.directory-item.document.item.${rarityClass}.scirc-dir-text-enabled,
.directory-item.entry.document.item.${rarityClass}.scirc-dir-text-enabled {
  --scirc-dir-text-color: ${colors.directoryText};
}`);
    }

    return rules;
  }
}
