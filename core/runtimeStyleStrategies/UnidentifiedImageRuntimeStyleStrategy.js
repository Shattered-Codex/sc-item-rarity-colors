import { BaseRuntimeStyleStrategy } from "./BaseRuntimeStyleStrategy.js";
import { IMAGE_COVER_CLASS } from "../constants.js";
import { normalizeColorWithFallback } from "../colorUtils.js";
import { toCssUrl } from "../unidentifiedImageConceal.js";
import { UNIDENTIFIED_STYLE_KEY } from "../unidentifiedStyle.js";

/**
 * Runtime CSS for hidden unidentified images: the question mark and outline
 * colors, and the stand-in image of each item kind. There is one unidentified
 * style, so its values are global rather than keyed by rarity class.
 */
export class UnidentifiedImageRuntimeStyleStrategy extends BaseRuntimeStyleStrategy {
  buildRules(context) {
    const { rarity, settings, colors } = context;
    const conceal = settings.conceal;
    if (rarity !== UNIDENTIFIED_STYLE_KEY || !conceal) return [];

    const rules = [`
:root {
  --scirc-conceal-mark: ${normalizeColorWithFallback(conceal.markColor, "#f4efff")};
  --scirc-conceal-glow: ${colors.effect};
}`];

    if (conceal.mode === "type") {
      for (const [kind, path] of Object.entries(conceal.images)) {
        rules.push(`.${IMAGE_COVER_CLASS}[data-scirc-image-kind="${kind}"] { --scirc-conceal-image: ${toCssUrl(path)}; }`);
      }
    }

    return rules;
  }
}
