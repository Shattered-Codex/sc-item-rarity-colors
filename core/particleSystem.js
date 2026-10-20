/**
 * Particle generation for the Effects tab: what particles look like (type)
 * and how they move (motion), around the whole sheet or the item image.
 *
 * Every particle gets its own randomized path, size, rotation, timing, and
 * phase, written once as CSS variables; item-effects.css animates them with
 * transforms only. Paths have three points (start, middle, end), except
 * swirls and orbits around the image, which turn about its centre.
 *
 * Units: around the sheet, coordinates are pixels from the particle's point
 * on the window outline; around the image, % of the effect layer's shorter
 * side (cqmin) from the image centre, where the image edge is ~29.
 */

export const PARTICLE_MOTIONS = Object.freeze(["auto", "burst", "rise", "fall", "swirl", "orbit", "twinkle", "wander"]);

/**
 * Looks: shape mix, the motion "Auto" picks, and how far the end scale
 * shrinks (petals and bubbles keep their size longer).
 */
const PARTICLE_TYPES = Object.freeze({
  arcane: { shapes: [["dot", 55], ["spark", 25], ["diamond", 20]], motion: "burst" },
  embers: { shapes: [["dot", 70], ["spark", 30]], motion: "rise" },
  stardust: { shapes: [["dot", 50], ["star", 50]], motion: "twinkle" },
  frost: { shapes: [["flake", 55], ["diamond", 25], ["dot", 20]], motion: "fall" },
  shadow: { shapes: [["blob", 100]], motion: "rise" },
  fireflies: { shapes: [["glow", 100]], motion: "wander" },
  petals: { shapes: [["petal", 100]], motion: "fall", endScale: 0.75 },
  bubbles: { shapes: [["bubble", 100]], motion: "rise", endScale: 0.9 },
  glyphs: { shapes: [["glyph", 100]], motion: "orbit", endScale: 0.6 },
  sparks: { shapes: [["spark", 80], ["dot", 20]], motion: "burst" },
});

export const PARTICLE_TYPE_KEYS = Object.freeze(Object.keys(PARTICLE_TYPES));

// Shapes that turn as they travel, and shapes that point where they go.
const SPINNING = new Set(["petal", "glyph", "flake", "star", "diamond"]);
const ORIENTED = new Set(["spark"]);
const GLYPH_COUNT = 15;

// Lifetime range per motion, in seconds (scaled by the Speed setting in CSS).
const DURATIONS = Object.freeze({
  burst: [1.8, 4],
  rise: [3, 6],
  fall: [3.5, 6.5],
  swirl: [3, 5.5],
  orbit: [4.5, 7.5],
  twinkle: [1.2, 2.8],
  wander: [4.5, 8],
});

const SIZES = Object.freeze({
  dot: [2, 4.8],
  spark: [1.4, 2.1],
  diamond: [4, 6.5],
  star: [6, 10],
  flake: [6, 10],
  blob: [10, 18],
  glow: [4, 7],
  petal: [6, 10],
  bubble: [5, 10],
  glyph: [9, 13],
});

const random = (min, max) => min + Math.random() * (max - min);
const pickWeighted = (entries) => {
  let roll = Math.random() * entries.reduce((sum, [, weight]) => sum + weight, 0);
  for (const [value, weight] of entries) {
    if (roll < weight) return value;
    roll -= weight;
  }
  return entries[entries.length - 1][0];
};
const dir = (degrees) => {
  const radians = (degrees * Math.PI) / 180;
  return [Math.cos(radians), Math.sin(radians)];
};
const angleOf = (from, to) => (Math.atan2(to[1] - from[1], to[0] - from[0]) * 180) / Math.PI;
const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k];

export function resolveParticleMotion(type, motion) {
  if (motion && motion !== "auto" && PARTICLE_MOTIONS.includes(motion)) return motion;
  return PARTICLE_TYPES[type]?.motion ?? "burst";
}

// --- Around the sheet ----------------------------------------------------------

// Which window edges a motion leaves from: rising particles from the top and
// sides (not from under the sheet), falling ones from the bottom and sides.
const MOTION_EDGES = Object.freeze({
  rise: ["top", "left", "right"],
  fall: ["bottom", "left", "right"],
});

/**
 * A point on the window outline as fractions of the window (x, y), with the
 * outward direction there. Edges are picked by length so particles spread
 * evenly around wide and tall sheets alike.
 */
export function randomOutlinePoint(width, height, edges = ["top", "right", "bottom", "left"]) {
  const lengths = edges.map((edge) => (edge === "top" || edge === "bottom" ? width : height));
  let roll = Math.random() * lengths.reduce((sum, length) => sum + length, 0);
  let edge = edges[edges.length - 1];
  for (let index = 0; index < edges.length; index += 1) {
    if (roll < lengths[index]) {
      edge = edges[index];
      break;
    }
    roll -= lengths[index];
  }
  const along = Math.random();
  switch (edge) {
    case "top": return { x: along, y: 0, normal: 270, edge };
    case "bottom": return { x: along, y: 1, normal: 90, edge };
    case "left": return { x: 0, y: along, normal: 180, edge };
    default: return { x: 1, y: along, normal: 0, edge };
  }
}

function framePath(motion, point, travel) {
  const n = dir(point.normal);
  const side = Math.random() < 0.5 ? -1 : 1;
  const t = dir(point.normal + 90 * side);
  const d = random(travel[0], travel[1]);

  switch (motion) {
    case "rise":
    case "fall": {
      const up = motion === "rise" ? -1 : 1;
      const sway = random(-20, 20);
      const p0 = add([0, 0], n, -6);
      return [p0, [n[0] * d * 0.3 + sway, up * d * 0.55], [n[0] * d * 0.45 - sway * 0.6, up * d * 1.1]];
    }
    case "swirl":
      // Out and sideways, then curling back: a hook-shaped arc.
      return [add([0, 0], n, -8), add(add([0, 0], n, d * 0.45), t, d * 0.55), add(add([0, 0], n, d * 0.95), t, d * 0.1)];
    case "orbit": {
      // Along the edge, just outside the frame.
      const run = d * 1.6;
      return [add([0, 0], n, 6), add(add([0, 0], n, 14), t, run * 0.5), add(add([0, 0], n, 6), t, run)];
    }
    case "twinkle": {
      const p0 = add(add([0, 0], n, random(6, Math.max(10, d))), t, random(-24, 24));
      return [p0, add(p0, [random(-4, 4), random(-4, 4)]), add(p0, [random(-6, 6), random(-6, 6)])];
    }
    case "wander": {
      const p0 = add([0, 0], n, random(4, 14));
      const p1 = add(add(p0, [random(-28, 28), random(-28, 28)]), n, random(6, 18));
      return [p0, p1, add(add(p1, [random(-28, 28), random(-28, 28)]), n, 8)];
    }
    default: {
      // burst
      const out = dir(point.normal + random(-38, 38));
      return [add([0, 0], n, -10), add([0, 0], out, d * 0.5), add([0, 0], out, d)];
    }
  }
}

// --- Around the image ----------------------------------------------------------

function imagePath(motion, travel) {
  const a = random(0, 360);
  const r0 = random(20, 30);
  const d = random(travel[0], travel[1]);
  const from = add([0, 0], dir(a), r0);

  switch (motion) {
    case "rise":
    case "fall": {
      const up = motion === "rise" ? -1 : 1;
      const sway = random(-8, 8);
      return { points: [from, add(from, [sway, up * d * 0.6]), add(from, [-sway * 0.5, up * d * 1.2])] };
    }
    case "swirl":
      return { spiral: { a, arc: (Math.random() < 0.5 ? -1 : 1) * random(90, 170), ra: r0, rb: r0 + d } };
    case "orbit": {
      const ra = random(30, 40);
      return { spiral: { a, arc: (Math.random() < 0.5 ? -1 : 1) * random(140, 240), ra, rb: ra + random(2, 6) } };
    }
    case "twinkle": {
      const p0 = add([0, 0], dir(a), random(26, 46));
      return { points: [p0, add(p0, [random(-2, 2), random(-2, 2)]), add(p0, [random(-3, 3), random(-3, 3)])] };
    }
    case "wander": {
      const p0 = add([0, 0], dir(a), random(28, 36));
      const p1 = add(p0, [random(-10, 10), random(-10, 10)]);
      return { points: [p0, p1, add(p1, [random(-10, 10), random(-10, 10)])] };
    }
    default:
      return { points: [from, add([0, 0], dir(a), r0 + d * 0.5), add([0, 0], dir(a), r0 + d)] };
  }
}

// --- Elements ------------------------------------------------------------------

function particleElement(type, motion, path) {
  const config = PARTICLE_TYPES[type] ?? PARTICLE_TYPES.arcane;
  const shape = pickWeighted(config.shapes);
  const [minSize, maxSize] = SIZES[shape];
  const duration = random(...DURATIONS[motion]);

  const vars = {
    "--s": `${random(minSize, maxSize).toFixed(2)}px`,
    "--o": random(0.55, 1).toFixed(2),
    "--t": `${duration.toFixed(2)}s`,
    "--delay": `${(-random(0, duration)).toFixed(2)}s`,
    "--sc2": String(config.endScale ?? 0.35),
  };

  // Rotation: sparks point along their path; some shapes spin; others don't.
  let rotations = [0, 0, 0];
  if (SPINNING.has(shape)) {
    const start = random(0, 360);
    const spin = (Math.random() < 0.5 ? -1 : 1) * random(90, 320);
    rotations = [start, start + spin * 0.5, start + spin];
  } else if (ORIENTED.has(shape) && path.points) {
    const [p0, p1, p2] = path.points;
    rotations = [angleOf(p0, p1), angleOf(p0, p1), angleOf(p1, p2)];
  } else if (ORIENTED.has(shape) && path.spiral) {
    // Tangent to the spiral: 90° off the radius, in the turning direction.
    const turn = path.spiral.arc < 0 ? -90 : 90;
    rotations = [turn, turn, turn];
  }
  [vars["--r0"], vars["--r1"], vars["--r2"]] = rotations.map((value) => `${value.toFixed(1)}deg`);

  let motionClass = "path";
  if (path.spiral) {
    motionClass = "spiral";
    vars["--a"] = `${path.spiral.a.toFixed(1)}deg`;
    vars["--arc"] = `${path.spiral.arc.toFixed(1)}deg`;
    vars["--ra"] = path.spiral.ra.toFixed(2);
    vars["--rb"] = path.spiral.rb.toFixed(2);
  } else {
    if (motion === "twinkle") motionClass = "twinkle";
    path.points.forEach(([x, y], index) => {
      vars[`--p${index}x`] = x.toFixed(2);
      vars[`--p${index}y`] = y.toFixed(2);
    });
  }
  if (shape === "glyph") vars["--g"] = String(Math.floor(random(0, GLYPH_COUNT)));
  if (path.x !== undefined) {
    vars["--x"] = path.x.toFixed(4);
    vars["--y"] = path.y.toFixed(4);
  }

  const element = document.createElement("i");
  element.className = `scirc-fx-pt scirc-fx-pm--${motionClass} scirc-fx-ps--${shape}`;
  element.style.cssText = Object.entries(vars).map(([name, value]) => `${name}:${value}`).join(";");
  return element;
}

/**
 * Builds the particles of one emitter.
 * @param {object} options
 * @param {"sheet"|"image"} options.placement
 * @param {string} options.type - a key of PARTICLE_TYPES
 * @param {string} options.motion - resolved motion (see resolveParticleMotion)
 * @param {number} options.count
 * @param {[number, number]} options.travel - distance range (px or cqmin)
 * @param {number} [options.width] - window size, for sheet placement
 * @param {number} [options.height]
 * @returns {HTMLElement[]}
 */
export function buildParticles({ placement, type, motion, count, travel, width = 400, height = 400 }) {
  const particles = [];
  for (let index = 0; index < count; index += 1) {
    if (placement === "sheet") {
      const point = randomOutlinePoint(width, height, MOTION_EDGES[motion]);
      const points = framePath(motion, point, motion === "orbit" ? travel.map((value) => value * 1.4) : travel);
      particles.push(particleElement(type, motion, { points, x: point.x, y: point.y }));
    } else {
      particles.push(particleElement(type, motion, imagePath(motion, travel)));
    }
  }
  return particles;
}
