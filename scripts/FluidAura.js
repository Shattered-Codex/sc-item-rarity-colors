/**
 * One Fluid aura around a sheet or its image: a canvas placed behind the host
 * plus a simulation kept in the shared FluidRenderer.
 *
 * The canvas shows the dye at simulation resolution and CSS stretches it over
 * the host and its margin; the aura is soft, so nothing is lost and each
 * frame stays small.
 */

const OUTWARD_FORCE = 260;
const DYE_DISSIPATION = 0.84;
const CORNER_RADIUS_PX = 6;
// A resize reallocates the simulation (and restarts it) only past this change,
// so dragging a window edge does not reset the aura on every frame.
const RESIZE_TOLERANCE = 0.12;

// Fade only the space outside the host. Multiplying these two masks keeps the
// outer canvas boundary transparent without changing the simulation shaders.
function edgeFade(direction, start, end) {
  const stops = ["transparent 2px"];
  for (const [fraction, alpha] of [[0.25, 0.15625], [0.5, 0.5], [0.75, 0.84375], [1, 1]]) {
    stops.push(`rgba(0,0,0,${alpha}) ${start * fraction}px`);
  }
  for (const [fraction, alpha] of [[1, 1], [0.75, 0.84375], [0.5, 0.5], [0.25, 0.15625]]) {
    stops.push(`rgba(0,0,0,${alpha}) calc(100% - ${end * fraction}px)`);
  }
  stops.push("transparent calc(100% - 2px)");
  return `linear-gradient(to ${direction}, ${stops.join(", ")})`;
}

function parseTint(color) {
  let hex = /^#[\da-f]{3}([\da-f]{3})?$/i.test(color) ? color.slice(1) : "a77bff";
  if (hex.length === 3) hex = [...hex].map((digit) => digit + digit).join("");
  return [0, 2, 4].map((index) => Number.parseInt(hex.slice(index, index + 2), 16) / 255);
}

const differsBeyondTolerance = (current, next) => Math.abs(next / current - 1) > RESIZE_TOLERANCE;

export class FluidAura {
  static QUALITY = Object.freeze({
    low: Object.freeze({ sim: 48, dye: 192, iterations: 6 }),
    medium: Object.freeze({ sim: 72, dye: 288, iterations: 10 }),
    high: Object.freeze({ sim: 128, dye: 512, iterations: 20 }),
  });

  #renderer;
  #canvas;
  #context;
  #host = null;
  #layer = null;
  #options = {};
  #simulation = null;
  #cssSize = null;
  #layout = null;
  #transform = "";
  #zIndex = "";
  #frame = { time: 0 };
  #lastTime = 0;
  #lastStep = 0;

  /**
   * @param {import("./FluidRenderer.js").FluidRenderer} renderer
   * @param {object} options - quality, color, distanceScale, margin,
   *   intensity, speed, zIndex (null: just under the host).
   */
  constructor(renderer, options) {
    this.#renderer = renderer;
    const canvas = this.#canvas = document.createElement("canvas");
    canvas.className = "scirc-fluid-aura";
    canvas.setAttribute("aria-hidden", "true");
    Object.assign(canvas.style, {
      pointerEvents: "none", left: "0", top: "0", display: "block", maxWidth: "none", maxHeight: "none",
      minWidth: "0", minHeight: "0", margin: "0", padding: "0", border: "0", boxSizing: "content-box",
      maskComposite: "intersect", maskRepeat: "no-repeat",
    });
    this.#context = canvas.getContext("bitmaprenderer");
    if (!this.#context) throw new Error("This browser cannot show ImageBitmap frames (bitmaprenderer).");
    this.setOptions(options);
  }

  /** Puts the canvas behind a new host; the simulation carries on. */
  moveTo(host, layer = document.body) {
    this.#host = host;
    this.#layer = layer;
    this.#canvas.style.position = layer === document.body ? "fixed" : "absolute";
    if (this.#canvas.parentNode !== layer) layer.appendChild(this.#canvas);
  }

  setOptions(options) {
    const previous = this.#options;
    this.#options = { ...previous, ...options };
    const { color, distanceScale = 1, margin, quality } = this.#options;
    this.#frame.tint = parseTint(color);
    this.#frame.outward = OUTWARD_FORCE * distanceScale;
    this.#frame.dissipation = Math.max(0.05, DYE_DISSIPATION / distanceScale);
    this.#frame.intensity = this.#options.intensity ?? 0.6;
    if (margin !== previous.margin) {
      this.#canvas.style.maskImage = `${edgeFade("right", margin.left, margin.right)},${edgeFade("bottom", margin.top, margin.bottom)}`;
    }
    if (quality !== previous.quality) this.#freeSimulation();
    else if (color !== previous.color) this.clear();
  }

  clear() {
    if (this.#simulation) this.#renderer.clearSimulation(this.#simulation);
  }

  /** Whether the simulation is due for a step at `fps`. */
  isDue(now, fps) {
    return now - this.#lastStep >= 1000 / fps - 2;
  }

  /**
   * Reads where the host is. Kept apart from render so a frame reads every
   * host before any aura writes a style, which would force a style pass per read.
   */
  measure() {
    this.#layout = this.#readLayout();
  }

  /**
   * Follows the host as last measured and steps the simulation at most
   * `fps` times a second.
   */
  render(now, fps) {
    if (!this.#layout) {
      this.#lastTime = now;
      return;
    }
    this.#applyLayout(this.#layout);
    if (!this.isDue(now, fps)) return;
    const elapsed = this.#lastTime ? (now - this.#lastTime) / 1000 : 0;
    const dt = Math.min(elapsed * (this.#options.speed ?? 1), 1.25 / fps);
    this.#lastTime = now;
    this.#lastStep = now;
    this.#frame.dt = dt;
    this.#frame.time += dt;
    this.#renderer.step(this.#simulation, this.#frame);
    this.#renderer.present(this.#simulation, this.#context);
  }

  detach() {
    this.#freeSimulation();
    this.#canvas.remove();
  }

  /** The canvas box over the host and its margin, in the layer's CSS pixels; null while the host has no size. */
  #readLayout() {
    const host = this.#host;
    const layer = this.#layer;
    const margin = this.#options.margin;
    const hostRect = host.getBoundingClientRect();
    if (hostRect.width < 2 || hostRect.height < 2) return null;

    const bodyLayer = layer === document.body;
    const layerRect = bodyLayer ? null : layer.getBoundingClientRect();
    // Local canvases inherit the editor/window scale. Convert viewport rectangles
    // back to local CSS pixels so the right and bottom edges stay aligned too.
    const scaleX = bodyLayer ? 1 : (layerRect.width / layer.offsetWidth || 1);
    const scaleY = bodyLayer ? 1 : (layerRect.height / layer.offsetHeight || 1);
    const hostWidth = hostRect.width / scaleX;
    const hostHeight = hostRect.height / scaleY;
    const width = Math.round(hostWidth + margin.left + margin.right);
    const height = Math.round(hostHeight + margin.top + margin.bottom);
    const x = bodyLayer ? hostRect.left - margin.left
      : (hostRect.left - layerRect.left) / scaleX + layer.scrollLeft - layer.clientLeft - margin.left;
    const y = bodyLayer ? hostRect.top - margin.top
      : (hostRect.top - layerRect.top) / scaleY + layer.scrollTop - layer.clientTop - margin.top;
    const zIndex = this.#options.zIndex
      ?? (Number.parseInt(host.style.zIndex || getComputedStyle(host).zIndex, 10) || 1) - 1;
    return { x, y, width, height, hostWidth, hostHeight, zIndex };
  }

  /** Writes only what changed: an idle window costs no style work. */
  #applyLayout({ x, y, width, height, hostWidth, hostHeight, zIndex }) {
    const margin = this.#options.margin;
    const style = this.#canvas.style;
    const transform = `translate(${x}px,${y}px)`;
    if (transform !== this.#transform) style.transform = this.#transform = transform;
    if (String(zIndex) !== this.#zIndex) style.zIndex = this.#zIndex = String(zIndex);
    if (this.#cssSize?.[0] !== width || this.#cssSize?.[1] !== height) {
      this.#cssSize = [width, height];
      style.width = `${width}px`;
      style.height = `${height}px`;
    }
    this.#ensureSimulation(width / height);

    this.#frame.aspect = width / height;
    this.#frame.center = [(margin.left + hostWidth / 2) / width, 1 - (margin.top + hostHeight / 2) / height];
    this.#frame.halfSize = [hostWidth / 2 / width, hostHeight / 2 / height];
    this.#frame.cornerRadius = CORNER_RADIUS_PX / height;
  }

  #ensureSimulation(aspect) {
    const quality = FluidAura.QUALITY[this.#options.quality] ?? FluidAura.QUALITY.low;
    const size = (base) => (aspect > 1 ? [Math.round(base * aspect), base] : [base, Math.round(base / aspect)]);
    const [dyeWidth, dyeHeight] = size(quality.dye);
    const current = this.#simulation?.dye.read;
    if (current && !differsBeyondTolerance(current.width, dyeWidth)
      && !differsBeyondTolerance(current.height, dyeHeight)) return;

    this.#freeSimulation();
    this.#simulation = this.#renderer.createSimulation(size(quality.sim), [dyeWidth, dyeHeight]);
    this.#frame.iterations = quality.iterations;
    // Matching the frames' size spares the browser a resample on every hand-off.
    this.#canvas.width = dyeWidth;
    this.#canvas.height = dyeHeight;
  }

  #freeSimulation() {
    this.#renderer.freeSimulation(this.#simulation);
    this.#simulation = null;
  }
}
