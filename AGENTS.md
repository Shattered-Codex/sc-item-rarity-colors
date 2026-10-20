# AGENTS.md

## Project Constitution

This document defines the immutable engineering principles for `SC - Item Rarity Colors`.
All contributors, agents, and automated tools must follow these rules unless an explicit architectural exception is documented.

This module colors D&D 5e items by rarity and spells by school (and optionally level): item sheets, actor inventory rows, and Items directory and compendium rows, with optional animated effects around item sheets and icons, a separate style for unidentified items, and Tidy 5e support.

---

## Module Scope

- Treat item data and module settings as the sources of truth for styling decisions.
- Keep runtime styling scoped, reversible, and owned by this module.
- Preserve rarity, custom rarity list, spell school, spell level variant, unidentified style, theme preset, animated effect, and Tidy 5e integration behavior.
- Do not write to Item or Actor documents for visual-only changes unless the behavior explicitly requires persisted data.
- The only document-adjacent write is the optional Tidy 5e rarity color sync, which runs on explicit user request.

---

## 1. Core Principles

### 1.1 Keep It Simple
Prefer the simplest solution that correctly solves the problem.

- Avoid unnecessary abstraction
- Avoid premature generalization
- Avoid clever code when clear code is enough
- Prefer explicit code over hidden behavior

### 1.2 SOLID by Default
All code should follow SOLID principles whenever applicable.

- **Single Responsibility Principle:** one unit should have one clear responsibility
- **Open/Closed Principle:** extend behavior without constantly rewriting stable code
- **Liskov Substitution Principle:** derived implementations must behave predictably
- **Interface Segregation Principle:** avoid forcing consumers to depend on what they do not use
- **Dependency Inversion Principle:** depend on abstractions or stable boundaries when useful

### 1.3 Readability Over Cleverness
Code must be easy to understand by a future maintainer.

- Prefer descriptive names
- Prefer predictable patterns
- Prefer small methods with clear intent
- Add comments only when intent is not obvious from the code itself

### 1.4 Efficiency Matters
Performance is a requirement, not a bonus.

- Avoid unnecessary re-renders
- Avoid unnecessary document updates
- Avoid repeated lookups when values can be cached safely
- Avoid wasteful hooks, listeners, and traversals
- Prefer solutions that scale well for worlds with many items, large inventories, open item sheets, directory entries, and compendium rows

---

## 2. File and Class Structure

### 2.1 One Class Per File
Each class must live in its own file.

Rules:
- File name should match the class name
- Do not group multiple unrelated classes in the same file
- Small helper functions may exist outside classes only when they are truly file-local and improve clarity

### 2.2 Clear Module Boundaries
Organize code by responsibility.

- `apps/` — Application V2 windows (module settings, style editors)
- `core/` — domain logic: field schema, settings reads, runtime CSS, effects, presets, rarity list
- `scripts/` — hook wiring and DOM application for sheets, inventories, and directories
- `sheets/strategies/` — per-sheet (D&D 5e, Tidy 5e) inventory styling strategies
- `settings/` — setting registration, menus, launchers, catalog, integrations
- `ui/` — editor preview updates
- `templates/` — Handlebars templates
- `styles/` — static CSS (`styles/strategies/` per surface)

A file should make its responsibility obvious from its location and name.

### 2.3 Avoid God Objects
Do not create classes that manage too many responsibilities.

If a class starts handling UI, rarity resolution, DOM styling, settings persistence, and integration behavior together, split it.

---

## 3. Foundry VTT Standards

### 3.1 Compatibility Is Mandatory
All shipped code must support **Foundry VTT v13 and v14** unless a documented exception is approved.

Rules:
- Do not adopt APIs that break one supported version without a compatibility layer
- Prefer stable, documented Foundry APIs
- Do not keep fallbacks for versions older than v13 (legacy `Application`, `Dialog`, `FormApplication`)
- Verify behavior in both versions when touching item sheets, actor inventories, the Items directory, compendium rendering, settings, Tidy 5e integration, or applications
- Any version-specific logic must be isolated and clearly named

### 3.2 Use Application V2
All new application-style UI work must use **Application V2**.

Rules:
- Do not create new legacy Application-based UIs
- Use `DialogV2` for confirmations and prompts
- When replacing old UI, move toward Application V2 patterns
- New windows, dialogs, sheets, or custom interfaces should follow the V2 lifecycle and conventions

### 3.3 Respect Foundry Data Flow
Work with Foundry, not against it.

- Prefer item data and module settings over DOM scraping
- Resolve the item behind a row by its id or UUID, not by reading its displayed text
- Prefer proper document updates when persisted data changes are intentional
- Avoid bypassing system behavior unless strictly necessary
- Keep hooks, flags, and settings updates predictable
- Minimize side effects in hook callbacks

### 3.4 API Safety
Public module APIs must be stable and intentional.

- The module exposes no public API today; adding one is a deliberate, documented decision
- Keep internal utilities internal
- Document public API entry points
- Avoid leaking implementation details

---

## 4. Code Quality Rules

### 4.1 Small, Focused Methods
Methods should do one thing well.

- Split large methods into smaller private helpers
- Keep branching shallow when possible
- Prefer early returns over deeply nested conditionals

### 4.2 Avoid Duplication
If logic is repeated, extract it.

But:
- do not abstract too early
- wait until duplication is real and meaningful
- abstraction must reduce complexity, not increase it

### 4.3 Prefer Composition Over Inheritance
Inheritance is allowed, but composition is preferred unless inheritance is clearly the better fit.

### 4.4 Defensive but Not Noisy
Validate inputs and fail clearly.

- Guard against missing modules, invalid documents, and unavailable APIs
- Throw or log meaningful errors
- Do not litter code with unnecessary defensive checks that hide real issues

---

## 5. Performance Rules

### 5.1 Avoid Expensive Repetition
Do not recalculate or re-query the same data multiple times in the same execution path.

### 5.2 Minimize Hook Cost
Hooks must be lightweight.

- Exit early when the current context is irrelevant
- Do not register broad listeners without a real need
- Avoid heavy work in frequently triggered hooks
- Coalesce refreshes (setting changes, settings transactions) instead of restyling on every event

### 5.3 Batch When Reasonable
Prefer grouped updates when safe and readable instead of many small update calls.

### 5.4 DOM Work Must Be Minimal
UI code should avoid unnecessary DOM manipulation and repeated rendering.

For styling item sheets, inventory rows, directory entries, or compendium rows, resolve the style settings once per item/context when possible, then apply the smallest DOM update needed. Per-rarity colors belong in the generated runtime CSS (keyed by rarity class), not in inline styles on every row; inline values are for the editor preview.

---

## 6. Module-Specific Rules

### 6.1 Settings Come From the Field Schema
- `core/rarityFieldSchema.js` is the single definition of every per-rarity and per-school field (key, type, default, choices, editor placement).
- Add a field there first; registration, the editors, import/export, and themes follow from it.
- Effects tab fields reach the effect code through `core/effectSettingFields.js`; add new effect options to that map instead of to each reader.
- `select` fields store plain strings and must be normalized against their `choices` when read.

### 6.2 Animated Effects
- Animate `transform` and `opacity` only; avoid animating layout or paint-heavy properties, and avoid `filter` on elements repeated per row.
  - Known exceptions: the organic wave shape animates `border-radius` (a few elements per open sheet, never per row), and the older border glow animations (`scircGlowAnimation`, `scircInventoryBorderGlowAnimation`) animate `box-shadow`/`border-color`. Do not add new ones; move the glows to opacity-only layers when they are next reworked.
- Build effect layers once and update them by signature; never rebuild on every render.
- Every effect must stop under the per-user "disable animated effects" setting and under `prefers-reduced-motion`.
- Effects around the whole sheet live in the frame overlay (`core/frameOverlay.js`), which must follow the window (move, resize, minimize, close) and clean itself up.

### 6.3 Reserved Keys and Classes
- The unidentified style is stored like a rarity under the namespaced key in `core/unidentifiedStyle.js`; never reuse a key a world's own rarity could have.
- All module classes, CSS variables, and data attributes use the `scirc-` prefix.

### 6.4 Tidy 5e
- Tidy 5e support is optional: every Tidy path must be guarded and the module must work fully without it.
- Tint Tidy surfaces without hiding Tidy's own textures and states.

---

## 7. Maintainability Rules

### 7.1 Backward-Safe Changes
When changing existing behavior:
- preserve public behavior when possible
- add migration or compatibility handling when needed
- do not break stored settings, theme presets, import/export payloads, or user workflows casually

### 7.2 Names Must Be Honest
Use names that describe what the code actually does.

- avoid vague names like `handleData`, `processStuff`, `miscUtils`
- prefer domain names that reflect Foundry concepts and module intent

### 7.3 Comments Must Add Value
Do not comment the obvious.
Comment:
- non-trivial reasoning
- version-specific workarounds
- important constraints
- behavior that could surprise future maintainers

---

## 8. Decision Rules

When multiple implementations are possible, choose in this order:

1. Compatibility with Foundry v13 and v14
2. Simplicity
3. Readability
4. Performance
5. Extensibility

A more flexible solution is not better if it becomes harder to maintain.

---

## 9. Pull Request / Change Checklist

Before finalizing any change, confirm:

- [ ] The code is compatible with Foundry v13 and v14
- [ ] New UI uses Application V2
- [ ] Each class is in its own file
- [ ] The solution follows KISS
- [ ] The design respects SOLID where applicable
- [ ] No unnecessary abstraction was introduced
- [ ] Repeated logic was reduced appropriately
- [ ] Hooks and updates are efficient
- [ ] Public APIs remain intentional and stable
- [ ] Item sheet, inventory, directory, and compendium styling remains scoped and reversible
- [ ] New fields are defined in the field schema; new effect options are in the effect settings map
- [ ] Animated effects use transform/opacity and respect the disable setting and reduced motion
- [ ] Stored settings, theme presets, and import/export data remain backward-safe
- [ ] Tidy 5e integration remains optional and guarded
- [ ] Naming is clear and maintainable

---

## 10. Non-Negotiable Rules

These rules are immutable unless this constitution is explicitly updated:

- **Use KISS**
- **Follow SOLID**
- **One class per file**
- **Support Foundry VTT v13 and v14**
- **Use Application V2 for new UI**
- **Prioritize efficiency**
- **Prefer readable, maintainable code over clever code**
- **Do not introduce unnecessary abstraction**
- **Do not break stored color settings, theme presets, or import/export compatibility casually**
- **Do not use fragile DOM scraping when item data or settings are available**

---

## 11. Final Directive

When in doubt, choose the solution that is:

- simpler
- clearer
- compatible
- efficient
- easier to maintain in the long term

This project values durability over novelty.

---

## 12. Specialized Agents

Shared specialist prompts live at the root of `modules` in `.agents/shared/`.

Use them when a task benefits from explicit role separation during research,
implementation, review, Foundry compatibility validation, QA, or UI refinement.

Relevant shared agents for this module include:

- `.agents/shared/software-architect.md`
- `.agents/shared/software-engineer.md`
- `.agents/shared/foundry-vtt-specialist.md`
- `.agents/shared/foundry-qa-specialist.md`
- `.agents/shared/shattered-codex-specialist.md`
- `.agents/shared/code-reviewer.md`
- `.agents/shared/researcher.md`
- `.agents/shared/ux-ui-specialist.md`
- `.agents/shared/public-api-contract-specialist.md` when exposing or changing public APIs

Do not use `.agents/shared/dnd5e-activity-specialist.md` unless this module
starts touching `dnd5e` activity types, activity sheets, or
`CONFIG.DND5E.activityTypes`.

Module-local agents should exist only when they encode behavior that is specific
to `SC - Item Rarity Colors` and should not be reused across neighboring
Shattered Codex projects.
