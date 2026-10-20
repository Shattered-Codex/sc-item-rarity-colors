/**
 * Preload and register one or more Handlebars partial templates for a module.
 *
 * Each partial is registered compiled, not rendered: it is evaluated with the
 * data of the template that includes it, so values such as the spell editor's
 * preview spell reach it on every render.
 *
 * @param {string} moduleId - The module's unique ID (folder name).
 * @param {string[]|string} templateNames - Template file names (without path).
 * Example: "item-template.html" or ["item-template.html", "actor-card.html"].
 */
export async function registerModulePartials(moduleId, templateNames) {
  // Normalize to array so we can handle both string and array inputs.
  const templates = Array.isArray(templateNames) ? templateNames : [templateNames];

  for (const name of templates) {
    const templatePath = `modules/${moduleId}/templates/${name}`;
    // The base name, without extension, is the partial name.
    const partialName = name.replace(/\.[^/.]+$/, "");
    // Compiles the template and registers it as the partial `partialName`.
    await foundry.applications.handlebars.getTemplate(templatePath, partialName);
  }
}
