import { MODULE_ID } from "../core/constants.js";

const SUPPORT_CARD_HTML = `
  <div style="padding: 5px;">
    <div style="color: #e7e7e7; padding: 10px; background-color: #212121; border: 3px solid #18c26a; border-radius: 10px;">
      <h2 style="margin: 0 0 10px 0; text-align: center; color: #ffffff;">SC Item Rarity Colors</h2>
      <p style="text-align: center;">
        <a href="https://www.patreon.com/c/shatteredcodex" target="_blank" rel="noopener">
          <img src="modules/sc-item-rarity-colors/assets/imgs/shattered-codex.png" alt="Shattered Codex" style="display: block; margin: 0 auto;">
        </a>
      </p>
      <hr>
      <div>
        <p style="text-align: justify;">Support us on Patreon to help us keep creating.</p>
        <p style="text-align: justify;">There you can find exclusive modules and content from Shattered Codex.</p>
        <p style="text-align: center; line-height: 150%;">
          <a href="https://www.patreon.com/c/shatteredcodex" target="_blank" rel="noopener">Patreon</a>
        </p>
      </div>
      <hr>
      <div style="font-style: italic;">
        <p style="text-align: justify;">This chat card will only be shown once. Enable it again in the settings if needed.</p>
      </div>
    </div>
  </div>
`;

/**
 * Show the support card once for GMs.
 */
export async function maybeShowSupportCard() {
  if (!game.user?.isGM) return;
  if (!game.settings.settings.has(`${MODULE_ID}.supportCardDisabled`)) return;

  const isDisabled = game.settings.get(MODULE_ID, "supportCardDisabled");
  if (isDisabled) return;

  const userId = game.user?._id ?? game.user?.id ?? game.userId;

  await ChatMessage.create({
    user: userId,
    speaker: ChatMessage.getSpeaker(),
    content: SUPPORT_CARD_HTML,
  });

  await game.settings.set(MODULE_ID, "supportCardDisabled", true);
}
