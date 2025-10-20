/**
 * Preload and register one or more Handlebars partial templates for a module.
 *
 * @param {string} moduleId - The module's unique ID (folder name).
 * @param {string[]|string} templateNames - Template file names (without path).
 * Example: "item-template.html" or ["item-template.html", "actor-card.html"].
 */
export async function registerModulePartials(moduleId, templateNames) {
  // Normalize to array so we can handle both string and array inputs.
  const templates = Array.isArray(templateNames) ? templateNames : [templateNames];

  // Iterate through each template and register it.
  for (const name of templates) {
    const templatePath = `modules/${moduleId}/templates/${name}`;
    const templateHtml = await foundry.applications.handlebars.renderTemplate(templatePath);

    // Remove extension and use the base name as partial name.
    const partialName = name.replace(/\.[^/.]+$/, "");
    Handlebars.registerPartial(partialName, templateHtml);
  }
}
