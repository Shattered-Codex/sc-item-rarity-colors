// Run: node --experimental-vm-modules --test tests/itemFluidAura.test.mjs
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import { normalizeSelectFieldValue, RARITY_FIELD_DEFINITIONS, isRarityFieldVisible, isRarityFieldWarningShown } from "../core/rarityFieldSchema.js";

const managerSource = await readFile(new URL("../scripts/itemFluidAura.js", import.meta.url), "utf8");
const auraSource = await readFile(new URL("../scripts/FluidAura.js", import.meta.url), "utf8");

const FLUID = { aura: "fluid", intensity: "normal", speed: "normal", placement: "sheet", color: "#a77bff", wavesDistance: "normal" };

function element(extra = {}) {
  const classes = new Set();
  return {
    isConnected: true, offsetWidth: 400, offsetHeight: 300, style: {},
    classList: { contains: (name) => classes.has(name), add: (name) => classes.add(name), remove: (name) => classes.delete(name) },
    closest: () => null, contains: () => false,
    ...extra,
  };
}

async function loadModule(source, context, dependencies) {
  const module = new vm.SourceTextModule(source, { context });
  await module.link((name) => {
    const values = dependencies[name];
    return new vm.SyntheticModule(Object.keys(values), function () {
      for (const [key, value] of Object.entries(values)) this.setExport(key, value);
    }, { context });
  });
  await module.evaluate();
  return module.namespace;
}

async function setup() {
  const hooks = new Map();
  const callbacks = new Map();
  const events = new Map();
  const settings = { itemAuraQuality: "low", disableAnimatedEffects: false };
  const motion = { matches: false, addEventListener: (name, fn) => events.set(`motion:${name}`, fn) };
  const document = { body: {}, hidden: false, addEventListener: (name, fn) => events.set(name, fn) };
  let nextFrame = 0;
  const renderers = [];
  const auras = [];
  let webglAvailable = true;
  let readyState = true;
  let renderError = null;

  class FakeRenderer {
    static create() {
      if (!webglAvailable) return null;
      const renderer = new FakeRenderer();
      renderers.push(renderer);
      return renderer;
    }
    lost = false;
    destroyed = false;
    get ready() {
      if (readyState === "throw") throw new Error("shader failed");
      return readyState;
    }
    destroy() { this.destroyed = true; }
  }
  class FakeAura {
    static QUALITY = { low: {}, medium: {}, high: {} };
    constructor(renderer, options) {
      Object.assign(this, { renderer, options: { ...options }, renders: [], moves: 0, detached: false });
      auras.push(this);
    }
    moveTo(host, layer) { this.host = host; this.layer = layer; this.moves++; }
    setOptions(options) { Object.assign(this.options, options); }
    isDue(now, fps) { return this.due?.(now, fps) ?? true; }
    measure() { this.measures = (this.measures ?? 0) + 1; }
    render(now, fps) {
      if (renderError) throw renderError;
      this.renders.push(fps);
    }
    detach() { this.detached = true; }
  }

  const context = vm.createContext({
    document, console: { warn() {} }, ui: { activeWindow: null },
    game: { settings: { get: (_module, key) => settings[key] } },
    Hooks: { on: (name, fn) => hooks.set(name, fn) },
    matchMedia: () => motion,
    requestAnimationFrame: (fn) => { callbacks.set(++nextFrame, fn); return nextFrame; },
    cancelAnimationFrame: (id) => callbacks.delete(id),
  });
  const manager = await loadModule(managerSource, context, {
    "../core/constants.js": { MODULE_ID: "sc-item-rarity-colors", DISABLE_EFFECTS_SETTING_KEY: "disableAnimatedEffects" },
    "./FluidAura.js": { FluidAura: FakeAura },
    "./FluidRenderer.js": { FluidRenderer: FakeRenderer },
  });
  manager.registerItemFluidAura();

  const sheet = () => ({ element: element({ ownerDocument: document }) });
  const apply = (app, overrides = {}, options = {}) => manager.syncItemFluidAura(app.element, { ...FLUID, ...overrides }, options);
  const tick = (now = 0) => {
    const pending = [...callbacks.values()];
    callbacks.clear();
    pending.forEach((fn) => fn(now));
  };
  const live = () => auras.filter((aura) => !aura.detached);
  const liveRenderers = () => renderers.filter((renderer) => !renderer.destroyed);
  return { context, hooks, callbacks, events, settings, motion, document, renderers, auras, sheet, apply, tick, live, liveRenderers,
    refresh: manager.refreshItemAuraPreferences, disableWebgl: () => { webglAvailable = false; },
    setReady: (state) => { readyState = state; },
    failRender: (error) => { renderError = error; } };
}

test("every shown Fluid sheet animates on one shared context; focus only sets the rate", async () => {
  const h = await setup();
  const a = h.sheet();
  const b = h.sheet();
  const plain = h.sheet();
  h.context.ui.activeWindow = a;
  h.apply(plain, { aura: "fire" });
  h.tick();
  assert.equal(h.callbacks.size, 0, "CSS styles start no loop");
  assert.equal(h.renderers.length, 0, "CSS styles create no context");

  h.apply(a);
  h.apply(b);
  h.tick();
  assert.equal(h.live().length, 2);
  assert.equal(h.renderers.length, 1);
  assert.ok(h.live().every((aura) => aura.renderer === h.renderers[0]));
  assert.equal(h.auras[0].options.quality, "low");
  assert.deepEqual([h.auras[0].renders.at(-1), h.auras[1].renders.at(-1)], [30, 15]);

  h.context.ui.activeWindow = b;
  h.tick();
  assert.deepEqual([h.auras[0].renders.at(-1), h.auras[1].renders.at(-1)], [15, 30]);
  h.apply(b);
  h.tick();
  assert.equal(h.auras.length, 2, "rerenders reuse the existing aura");
});

test("running auras are capped, focused first", async () => {
  const h = await setup();
  const apps = Array.from({ length: 8 }, () => h.sheet());
  h.context.ui.activeWindow = apps[7];
  apps.forEach((app) => h.apply(app));
  h.tick();
  assert.equal(h.live().length, 6);
  assert.ok(h.live().some((aura) => aura.host === apps[7].element), "the focused sheet always runs");
});

test("minimized, hidden, closed and disconnected sheets free their aura; the last one frees the context", async () => {
  const h = await setup();
  const a = h.sheet();
  const b = h.sheet();
  h.apply(a);
  h.apply(b);
  h.tick();
  a.element.classList.add("minimized");
  h.tick();
  assert.equal(h.live().length, 1);
  a.element.classList.remove("minimized");
  h.tick();
  assert.equal(h.live().length, 2);
  b.element.offsetWidth = 0;
  h.tick();
  assert.equal(h.live().length, 1, "hidden preview variants do not animate");
  b.element.isConnected = false;
  h.tick();
  h.hooks.get("closeApplicationV2")(a);
  assert.equal(h.live().length, 0);
  assert.equal(h.liveRenderers().length, 0);
  h.tick();
  assert.equal(h.callbacks.size, 0, "no loop without Fluid sheets");
});

test("switching a sheet away from Fluid frees its aura at once", async () => {
  const h = await setup();
  const a = h.sheet();
  h.apply(a);
  h.tick();
  h.apply(a, { aura: "pulse" });
  assert.equal(h.live().length, 0);
});

test("quality, reduced motion, disable effects and hidden tabs release GPU resources", async () => {
  const h = await setup();
  const app = h.sheet();
  h.apply(app);
  h.tick();
  for (const key of ["disableAnimatedEffects", "motion", "hidden", "quality"]) {
    const toggle = (off) => {
      if (key === "disableAnimatedEffects") h.settings.disableAnimatedEffects = off;
      if (key === "motion") h.motion.matches = off;
      if (key === "hidden") h.document.hidden = off;
      if (key === "quality") h.settings.itemAuraQuality = off ? "off" : "high";
      h.refresh();
      h.tick();
    };
    toggle(true);
    assert.equal(h.live().length, 0, key);
    assert.equal(h.liveRenderers().length, 0, key);
    assert.equal(h.callbacks.size, 0, key);
    toggle(false);
    assert.equal(h.live().length, 1, key);
  }
  assert.equal(h.live()[0].options.quality, "high");
});

test("edits, re-rendered image hosts, and previews update the running aura in place", async () => {
  const h = await setup();
  const app = h.sheet();
  h.apply(app);
  h.tick();
  const [aura] = h.auras;
  for (const color of ["#ff0000", "#00ff00"]) {
    h.apply(app, { color });
    h.tick();
    assert.equal(aura.options.color, color);
  }
  const margins = [];
  for (const wavesDistance of ["short", "normal", "far"]) {
    h.apply(app, { wavesDistance });
    h.tick();
    margins.push(aura.options.margin.left);
  }
  assert.ok(margins[0] < margins[1] && margins[1] < margins[2]);

  const imageHost = element();
  h.apply(app, { placement: "image" }, { host: imageHost, layer: imageHost });
  h.tick();
  assert.equal(aura.host, imageHost);
  assert.equal(aura.options.zIndex, -1);
  const rerendered = element();
  h.apply(app, { placement: "image" }, { host: rerendered, layer: rerendered });
  h.tick();
  assert.equal(aura.host, rerendered, "a re-rendered image moves the canvas");
  h.apply(app);
  h.tick();
  assert.equal(aura.options.zIndex, null, "back on the sheet, the local stacking is dropped");
  assert.equal(h.auras.length, 1);
});

test("Fluid (wide) runs the same simulation reaching twice as far", async () => {
  const h = await setup();
  const app = h.sheet();
  h.apply(app);
  h.tick();
  const [aura] = h.auras;
  const normal = { ...aura.options };
  h.apply(app, { aura: "fluid-wide" });
  h.tick();
  assert.equal(h.auras.length, 1, "switching between Fluid styles keeps the aura");
  assert.equal(aura.options.margin.left, normal.margin.left * 2);
  assert.equal(aura.options.distanceScale, normal.distanceScale * 2);
});

test("only the focused sheet is measured every frame; the others when their step is due", async () => {
  const h = await setup();
  const a = h.sheet();
  const b = h.sheet();
  h.context.ui.activeWindow = a;
  h.apply(a);
  h.apply(b);
  h.tick(0);
  const [focused, background] = h.auras;
  focused.due = () => false;
  background.due = () => false;
  h.tick(16);
  assert.equal(focused.measures, 2);
  assert.equal(background.measures, 1);
});

test("auras wait for the shaders without blocking, and a failed build stops retrying", async () => {
  const h = await setup();
  const app = h.sheet();
  h.setReady(false);
  h.apply(app);
  h.tick();
  h.tick();
  assert.equal(h.renderers.length, 1, "one build, polled across frames");
  assert.equal(h.auras.length, 0);
  assert.equal(h.callbacks.size, 1, "keeps waiting for the build");
  h.setReady(true);
  h.tick();
  assert.equal(h.live().length, 1);

  const broken = await setup();
  broken.setReady("throw");
  broken.apply(broken.sheet());
  broken.tick();
  assert.equal(broken.liveRenderers().length, 0);
  assert.equal(broken.callbacks.size, 0, "the loop stops after the failure");
  broken.apply(broken.sheet());
  assert.equal(broken.callbacks.size, 0);
  assert.equal(broken.renderers.length, 1, "no rebuild until preferences change");
});

test("the last sheet leaving the page without a close hook frees the context", async () => {
  const h = await setup();
  const app = h.sheet();
  h.apply(app);
  h.tick();
  assert.equal(h.liveRenderers().length, 1);
  app.element.isConnected = false;
  h.tick();
  assert.equal(h.live().length, 0);
  assert.equal(h.liveRenderers().length, 0, "no aura is left, so neither is the context");
  assert.equal(h.callbacks.size, 0);
});

test("a drawing error frees every aura and the context, then stops retrying", async () => {
  const h = await setup();
  const a = h.sheet();
  const b = h.sheet();
  h.apply(a);
  h.apply(b);
  h.tick();
  assert.equal(h.live().length, 2);
  h.failRender(new Error("present failed"));
  assert.doesNotThrow(() => h.tick());
  assert.equal(h.live().length, 0);
  assert.equal(h.liveRenderers().length, 0);
  assert.equal(h.callbacks.size, 0);
  h.apply(a, { color: "#ff0000" });
  assert.equal(h.callbacks.size, 0, "no retry until preferences change");
  h.failRender(null);
  h.refresh();
  h.tick();
  assert.equal(h.live().length, 2, "a preference change tries again");
});

test("unsupported WebGL does not retry creating a context every frame", async () => {
  const h = await setup();
  h.disableWebgl();
  const app = h.sheet();
  h.apply(app);
  for (let i = 0; i < 10; i++) {
    h.tick();
    h.apply(app);
  }
  assert.equal(h.auras.length, 0);
  assert.equal(h.callbacks.size, 0, "the loop stops after the failure");
});

test("an aura feeds the renderer its color, distance, and the host's shape", async () => {
  const frames = [];
  const renderer = {
    createSimulation: (sim, dye) => ({ sim, dye: { read: { width: dye[0], height: dye[1] } } }),
    freeSimulation() {}, clearSimulation() {}, present() {},
    step: (_simulation, frame) => frames.push(structuredClone(frame)),
  };
  const canvas = () => ({ style: {}, setAttribute() {}, getContext: () => ({}), remove() {} });
  const body = { appendChild() {} };
  const context = vm.createContext({ document: { body, createElement: canvas }, getComputedStyle: () => ({ zIndex: "auto" }) });
  const { FluidAura } = await loadModule(auraSource, context, {});
  const margin = { top: 56, right: 56, bottom: 56, left: 56 };
  const aura = new FluidAura(renderer, { quality: "low", color: "#00ff00", distanceScale: 1, margin, intensity: 0.6, speed: 1, zIndex: null });
  aura.moveTo({ style: { zIndex: "100" }, getBoundingClientRect: () => ({ left: 100, top: 100, width: 288, height: 388 }) }, body);
  aura.measure();
  aura.render(1000, 30);
  aura.setOptions({ color: "#123456", distanceScale: 1.6 });
  aura.measure();
  aura.render(1100, 30);
  const [first, second] = frames;
  assert.deepEqual(first.tint, [0, 1, 0]);
  assert.deepEqual(second.tint, [0x12 / 255, 0x34 / 255, 0x56 / 255]);
  assert.ok(second.outward > first.outward);
  assert.ok(second.dissipation < first.dissipation);
  assert.equal(first.aspect, 400 / 500);
  assert.deepEqual(first.center, [0.5, 0.5]);
  assert.ok(second.dt <= 1.25 / 30);
});

test("schema offers Fluid and Fluid (wide), sharing the existing Distance setting", () => {
  const style = RARITY_FIELD_DEFINITIONS.find(f => f.key === "aura-style");
  assert.deepEqual(Object.keys(style.choices).filter(key => key.startsWith("fluid")), ["fluid", "fluid-wide"]);
  assert.equal(normalizeSelectFieldValue(style, "fluid-wide"), "fluid-wide");
  for (const old of ["fluid-fire", "fluid-arcane", "fluid-fel", "fluid-radiant"]) {
    assert.equal(normalizeSelectFieldValue(style, old), "fluid");
  }
  const distance = RARITY_FIELD_DEFINITIONS.find(f => f.key === "waves-distance");
  assert.equal(isRarityFieldVisible(distance, { "aura-option": true }), true);
  assert.equal(isRarityFieldVisible(distance, { "waves-option": true }), true);
  assert.equal(isRarityFieldVisible(distance, {}), false);
});

test("the aura style warns about performance only for Fluid styles", () => {
  const style = RARITY_FIELD_DEFINITIONS.find(f => f.key === "aura-style");
  assert.ok(style.uiWarning.text.length > 0);
  assert.equal(isRarityFieldWarningShown(style, "fluid"), true);
  assert.equal(isRarityFieldWarningShown(style, "fluid-wide"), true);
  for (const css of ["energy", "fire", "pulse", undefined]) assert.equal(isRarityFieldWarningShown(style, css), false);
  const distance = RARITY_FIELD_DEFINITIONS.find(f => f.key === "waves-distance");
  assert.equal(isRarityFieldWarningShown(distance, "far"), false, "fields without a warning never show one");
});
