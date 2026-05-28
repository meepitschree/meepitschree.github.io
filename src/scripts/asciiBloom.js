/**
 * Renders the symmetrical ASCII floral bloom and motion-reactive cursor
 * field into a <pre> element. Combines a slowly evolving radial flower
 * pattern with a per-cell noise field that wakes up around the cursor.
 */

// Measured from the live <pre> element at first measure() / on font load.
// Starting defaults are fallbacks until the real values are sampled.
let CHAR_WIDTH = 6.6;
let CHAR_HEIGHT = 11;
const RAMP = " .:+*o@";

// Static text-mask rectangle, expressed as fractions of the container.
// The mask is centered and stays put as the cycling word changes width.
const MASK_W_FRAC = 0.1;
const MASK_H_FRAC = 0.1;

// Scene transition timing (seconds).
const SCENE_TRANSITION = 1.5;

export function createAsciiBloom({ container, element, cursorState }) {
  let cols = 80;
  let rows = 60;
  let ambient = [];
  let masks = [];
  let t = 0;

  // Scene state. `scene` is the settled scene (or the one we came from
  // mid-transition); `targetScene` is where we're heading. While
  // `transitionProgress < 1`, both intensities are computed and crossfaded.
  let scene = "bloom"; // "bloom" | "hill"
  let targetScene = "bloom";
  let transitionProgress = 1;
  let transitionStart = 0;
  let onSettleCallback = null;

  function measureCharSize() {
    const style = getComputedStyle(element);
    const probe = document.createElement("span");
    probe.style.fontFamily = style.fontFamily;
    probe.style.fontSize = style.fontSize;
    probe.style.fontWeight = style.fontWeight;
    probe.style.letterSpacing = style.letterSpacing;
    probe.style.whiteSpace = "pre";
    probe.style.position = "absolute";
    probe.style.visibility = "hidden";
    const SAMPLES = 50;
    probe.textContent = "M".repeat(SAMPLES);
    document.body.appendChild(probe);
    const rect = probe.getBoundingClientRect();
    document.body.removeChild(probe);
    CHAR_WIDTH = rect.width / SAMPLES;
    CHAR_HEIGHT = parseFloat(style.lineHeight) || CHAR_HEIGHT;
  }

  function measure() {
    measureCharSize();
    cols = Math.floor(container.offsetWidth / CHAR_WIDTH);
    rows = Math.floor(container.offsetHeight / CHAR_HEIGHT);
    ambient = buildAmbient(rows, cols);

    // Linear ramp from MIN at ~410px wide to MAX at ~1440px wide,
    // clamped at both ends.
    const t = (container.offsetWidth - 410) / (1440 - 410);
    BLOOM_SCALE =
      BLOOM_SCALE_MIN +
      Math.max(0, Math.min(1, t)) * (BLOOM_SCALE_MAX - BLOOM_SCALE_MIN);

    // Fixed centered mask, recomputed only on resize.
    const halfW = (cols * MASK_W_FRAC) / 2;
    const halfH = (rows * MASK_H_FRAC) / 2;
    const cx = cols / 2;
    const cy = rows / 2;
    masks = [
      {
        left: cx - halfW,
        right: cx + halfW,
        top: cy - halfH,
        bottom: cy + halfH,
      },
    ];
  }

  function frame(dt) {
    t += dt;

    // Advance scene transition if active.
    if (transitionProgress < 1) {
      transitionProgress = Math.min(1, (t - transitionStart) / SCENE_TRANSITION);
      if (transitionProgress >= 1) {
        scene = targetScene;
        if (onSettleCallback) onSettleCallback(scene);
      }
    }

    element.textContent = renderFrame(
      t,
      cols,
      rows,
      ambient,
      cursorState,
      masks,
      scene,
      targetScene,
      transitionProgress
    );
  }

  // Trigger a crossfade to a new scene. No-op if already transitioning or
  // already at that scene.
  function setScene(name) {
    if (name === targetScene && transitionProgress >= 1) return;
    if (transitionProgress < 1) return; // ignore mid-transition for simplicity
    scene = targetScene;
    targetScene = name;
    transitionProgress = 0;
    transitionStart = t;
  }

  // Subscribe to "transition completed" — fires with the settled scene name.
  function onSettle(cb) {
    onSettleCallback = cb;
  }

  // Re-measure once the webfont has loaded; the fallback font may have
  // a different metric and the initial measure() runs before fonts arrive.
  if (document.fonts) {
    document.fonts.ready.then(measure);
  }

  // Returns true if (xPx, yPx) in container-relative pixels falls inside
  // any of the text masks (used to gate click-spawned flowers).
  function isInMask(xPx, yPx) {
    const cx = xPx / CHAR_WIDTH;
    const cy = yPx / CHAR_HEIGHT;
    for (const m of masks) {
      if (cx >= m.left && cx <= m.right && cy >= m.top && cy <= m.bottom) {
        return true;
      }
    }
    return false;
  }

  // Pixel-space hill top at a given x position. Uses the static base shape
  // (no wind, no cursor pull) so flowers stay pinned to a stable contour.
  function hillTopPxAt(xPx) {
    const col = xPx / CHAR_WIDTH;
    return staticHillTopRow(col, rows) * CHAR_HEIGHT;
  }

  return { measure, frame, isInMask, setScene, onSettle, hillTopPxAt };
}

function buildAmbient(rows, cols) {
  const grid = [];
  for (let r = 0; r < rows; r++) {
    const row = [];
    for (let c = 0; c < cols; c++) {
      const seed = Math.sin(r * 12.9898 + c * 78.233) * 43758.5453;
      row.push(seed - Math.floor(seed));
    }
    grid.push(row);
  }
  return grid;
}

// Each bloom radiates from a fractional (col, row) anchor. Tweak these to
// move/add/remove blooms. (0,0) is top-left, (1,1) is bottom-right.
const BLOOM_CENTERS = [
  // { fx: 1.0, fy: -0.1 }, // top-right
  { fx: 0.0, fy: 0.9 }, // bottom-left
  // { fx: 0.5, fy: 0.5 }, // center
];
// `BLOOM_SCALE` is updated in measure() to scale with the viewport so
// the corner blooms don't overwhelm small screens.
let BLOOM_SCALE = 3.5;
const BLOOM_SCALE_MIN = 1.8; // mobile floor
const BLOOM_SCALE_MAX = 3.5; // desktop ceiling
const BLOOM_PETALS = 3;

const MASK_SOFTNESS = 25; // cells over which the suppression fades back to full bloom

// Hill scene parameters.
const HILL_TOP_FRAC_SETTLED = 0.83; // top edge sits at 82% down the viewport
const HILL_TOP_FRAC_HIDDEN = 1.1; // pushed below the viewport when not active
const HILL_AMPLITUDE = 5; // primary sin-wave amplitude on the top edge (cells)
const HILL_FREQ = 0.04; // primary sin-wave frequency
const HILL_EDGE_SOFTNESS = 1.8; // smooth-step radius around the top edge (cells)
const HILL_CURSOR_INFLUENCE_R = 30; // cells of cursor influence on the hill ridge
const HILL_CURSOR_PULL = 0.35; // how strongly the ridge follows the cursor's row
const HILL_CURSOR_PULL_MAX = 6; // clamp on max ridge displacement (cells)

// Back-hill (parallax layer) — sits behind the front hill and pokes out as
// a "shading strip" where its ridge is higher than the front's. Stays still
// (no wind, no cursor pull) so the front clearly reads as the live layer.
const BACK_HILL_OFFSET = -6; // cells the back ridge sits above the front baseline
// Strip intensity → glyph via RAMP " .:+*o@":
//   0.28 → '.'   0.40 → ':'   0.50 → '+'   0.65 → '*'   0.78 → 'o'
// The smoothstep edge fades the top through lighter glyphs automatically.
const BACK_HILL_DENSITY = 0.2;

// Per-column static shape of the hill ridge (no wind, no cursor, no presence).
// Used both for rendering and for flower placement so they share one source.
function hillBaseShape(col) {
  return (
    Math.sin(col * HILL_FREQ) * HILL_AMPLITUDE +
    Math.sin(col * HILL_FREQ * 0.5 + 1.3) * (HILL_AMPLITUDE * 0.5)
  );
}

// Back-hill ridge shape. Slightly different frequencies + phase so its peaks
// land between the front hill's peaks for a parallax silhouette.
function hillBackShape(col) {
  return (
    Math.sin(col * HILL_FREQ * 0.85 + 1.9) * (HILL_AMPLITUDE * 0.9) +
    Math.sin(col * HILL_FREQ * 0.45 + 2.6) * (HILL_AMPLITUDE * 0.45)
  );
}

function staticHillTopRow(col, rows) {
  return rows * HILL_TOP_FRAC_SETTLED + hillBaseShape(col);
}

function smoothstep(t) {
  return t * t * (3 - 2 * t);
}

function renderFrame(
  t,
  cols,
  rows,
  ambient,
  cursor,
  masks,
  scene,
  targetScene,
  transitionProgress
) {
  const centers = BLOOM_CENTERS.map((b) => ({
    col: cols * b.fx,
    row: rows * b.fy,
  }));

  const mxCol = cursor.x / CHAR_WIDTH;
  const myRow = cursor.y / CHAR_HEIGHT;
  const trail = cursor.trail;
  const trailFade = Math.min(1, cursor.speed / 15);

  // Scene blending. Both intensities are computed per cell when in transition;
  // otherwise only the settled scene contributes.
  const inTransition = transitionProgress < 1;
  const eased = smoothstep(transitionProgress);

  // Per-scene "presence" (0..1). General crossfade: the outgoing scene
  // fades from 1→0, the incoming from 0→1. Works for any pair of scenes.
  const bloomPresence =
    (scene === "bloom" ? 1 - eased : 0) + (targetScene === "bloom" ? eased : 0);
  const hillPresence =
    (scene === "hill" ? 1 - eased : 0) + (targetScene === "hill" ? eased : 0);
  const artPresence =
    (scene === "art" ? 1 - eased : 0) + (targetScene === "art" ? eased : 0);

  // Top edge of hill in cell-rows. Slides up from below the viewport as
  // hillPresence climbs from 0 to 1.
  const hillTopBaseRow =
    rows *
    (HILL_TOP_FRAC_HIDDEN +
      (HILL_TOP_FRAC_SETTLED - HILL_TOP_FRAC_HIDDEN) * hillPresence);

  let out = "";
  for (let r = 0; r < rows; r++) {
    let line = "";
    for (let c = 0; c < cols; c++) {
      // Bloom intensity (existing math). Skip the loop entirely when the
      // bloom is fully retreated to save the trig in the hill scene.
      let bloomIntensity = 0;
      if (bloomPresence > 0.001) {
        for (const ctr of centers) {
          const v = bloomAt(c, r, ctr.col, ctr.row, t, mxCol, myRow);
          if (v > bloomIntensity) bloomIntensity = v;
        }
        if (masks.length > 0) {
          let maskFactor = 1;
          for (let m = 0; m < masks.length; m++) {
            const f = rectMask(c, r, masks[m]);
            if (f < maskFactor) maskFactor = f;
          }
          bloomIntensity *= maskFactor;
        }
        bloomIntensity *= bloomPresence;
      }

      // Hill intensity. Static base shape (no traveling wave). Gentle
      // per-column wind keeps edge chars rustling. Cursor gently pulls
      // the local ridge toward its row — same interactivity flavor as
      // the bloom's displacement on the home page.
      let hillIntensity = 0;
      if (hillPresence > 0.001) {
        const baseShape = hillBaseShape(c);
        const cellPhase = (ambient[0] ? ambient[0][c] : 0.5) * Math.PI * 2;
        const wind =
          Math.sin(t * 0.7 + cellPhase) * 0.25 +
          Math.sin(t * 1.3 + c * 0.5) * 0.15;

        // Cursor pull on the local ridge — radial influence around the
        // cursor (in column-equivalent units). The y-distance is scaled
        // by 1.7 to compensate for taller-than-wide character cells, so
        // the influence zone looks circular on screen.
        const restingTop = hillTopBaseRow + baseShape;
        const cdxCol = c - mxCol;
        const cdyRow = (myRow - restingTop) * 1.7;
        const cDist = Math.sqrt(cdxCol * cdxCol + cdyRow * cdyRow);
        const influence =
          cDist < HILL_CURSOR_INFLUENCE_R
            ? (1 - cDist / HILL_CURSOR_INFLUENCE_R) * hillPresence
            : 0;
        const rawPull = (myRow - restingTop) * influence * HILL_CURSOR_PULL;
        const cursorPull = Math.max(
          -HILL_CURSOR_PULL_MAX,
          Math.min(HILL_CURSOR_PULL_MAX, rawPull)
        );

        const frontTopRow = hillTopBaseRow + baseShape + wind + cursorPull;
        const belowFront = r - frontTopRow;

        if (belowFront > -HILL_EDGE_SOFTNESS) {
          // Inside the front hill — solid, uniform interior with a smooth
          // edge at the top. No noise / no banding by design: the shading
          // strip below is what gives the scene depth.
          let edge;
          if (belowFront >= HILL_EDGE_SOFTNESS) {
            edge = 1;
          } else {
            const u =
              (belowFront + HILL_EDGE_SOFTNESS) / (2 * HILL_EDGE_SOFTNESS);
            edge = u * u * (3 - 2 * u);
          }
          hillIntensity = edge * hillPresence;
        } else {
          // Above the front ridge — render the back-hill strip wherever it
          // pokes higher than the front. Static (no wind/cursor) so the
          // band reads like a distant horizon rather than a second wave.
          const backShape = hillBackShape(c);
          const backTopRow = hillTopBaseRow + backShape + BACK_HILL_OFFSET;
          const belowBack = r - backTopRow;
          if (belowBack > -HILL_EDGE_SOFTNESS) {
            let edge;
            if (belowBack >= HILL_EDGE_SOFTNESS) {
              edge = 1;
            } else {
              const u =
                (belowBack + HILL_EDGE_SOFTNESS) / (2 * HILL_EDGE_SOFTNESS);
              edge = u * u * (3 - 2 * u);
            }
            hillIntensity = edge * BACK_HILL_DENSITY * hillPresence;
          }
        }
      }

      // Art scene: intentionally blank for now — add a background here later.
      // artPresence is still computed above so the bloom fades out cleanly
      // on transition and the scene machinery is ready when you want it.

      // The bg is the max of all scenes — wherever any scene reaches, we
      // render the brighter glyph.
      const bgIntensity = Math.max(bloomIntensity, hillIntensity);

      let cursorBloom = 0;

      // Motion: trail of awakened cells
      for (let i = 0; i < trail.length; i++) {
        const tp = trail[i];
        const age = (i + 1) / trail.length;
        const tcCol = tp.x / CHAR_WIDTH;
        const tcRow = tp.y / CHAR_HEIGHT;
        const dcm = c - tcCol;
        const drm = (r - tcRow) * 1.7;
        const dCursor = Math.sqrt(dcm * dcm + drm * drm);
        const reach = i === trail.length ? 3 : 2;
        if (dCursor < reach) {
          const noise = ambient[r] ? ambient[r][c] : 0.5;
          if (noise > 0.35) {
            const ageW = age * trailFade;
            const strength = (1 - dCursor / reach) * 0.5 * ageW;
            if (strength > cursorBloom) cursorBloom = strength;
          }
        }
      }

      // Click ripples: expanding ring per active click, fading as it grows.
      for (let i = 0; i < cursor.ripples.length; i++) {
        const rp = cursor.ripples[i];
        const rdx = c + 0.5 - rp.x / CHAR_WIDTH;
        const rdy = (r + 0.5 - rp.y / CHAR_HEIGHT) * 1.7;
        const rDist = Math.sqrt(rdx * rdx + rdy * rdy);
        const radius = rp.age * 30; // max reach in cells
        const width = 2.5;
        const ring = Math.exp(-((rDist - radius) ** 2) / (2 * width * width));
        const ringI = ring * (1 - rp.age) * 0.8;
        if (ringI > cursorBloom) cursorBloom = ringI;
      }

      const intensity = Math.max(bgIntensity, cursorBloom);
      line += charForIntensity(intensity);
    }
    out += line + "\n";
  }
  return out;
}

// Layered petals + tendrils + ripple radiating from (centerCol, centerRow).
// `BLOOM_SCALE` extends the falloff radius; radial wavelengths stay fixed,
// so a larger bloom shows more petals/rings.
//
// `mxCol, myRow` is the cursor position in cell units. Within `DISTURB_R`
// the sampled point is pushed outward from the cursor, so the bloom bends
// around the cursor like a fingertip pressed into still water.
const DISTURB_R = 30;
const DISTURB_STRENGTH = 10;
function bloomAt(c, r, centerCol, centerRow, t, mxCol, myRow) {
  const cdx = c + 0.5 - mxCol;
  const cdy = (r + 0.5 - myRow) * 1.7;
  const cDist = Math.sqrt(cdx * cdx + cdy * cdy);
  let ox = 0;
  let oy = 0;
  if (cDist < DISTURB_R && cDist > 0.001) {
    const push = 1 - cDist / DISTURB_R;
    const k = (DISTURB_STRENGTH * push * push) / cDist;
    ox = cdx * k;
    oy = cdy * k;
  }

  const dx = c - centerCol + ox;
  const dy = (r - centerRow) * 1.7 + oy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const symAng = Math.atan2(dy, Math.abs(dx));

  const flower =
    Math.cos(symAng * BLOOM_PETALS + t * 0.4) * 0.55 +
    Math.sin(dist * 0.32 - t * 0.6) * 0.5;
  const tendrils = Math.cos(symAng * 3 - t * 0.25 + dist * 0.18) * 0.35;
  const ripple = Math.sin(dist * 0.6 - t * 0.8) * 0.25;
  const halfR = 22 * BLOOM_SCALE;
  const fall = Math.max(0, 1 - dist / (halfR * 1.6));
  return (flower + tendrils + ripple + 1.2) * 0.5 * fall;
}

// Distance-to-rectangle smoothstep mask. Returns 0 for cells inside the
// rect (full suppression), 1 once the cell is `MASK_SOFTNESS` cells past
// any edge, with a sigmoid transition between.
function rectMask(c, r, rect) {
  const cx = c + 0.5;
  const cy = r + 0.5;
  const dx = Math.max(rect.left - cx, cx - rect.right, 0);
  const dy = Math.max(rect.top - cy, cy - rect.bottom, 0);
  const d = Math.sqrt(dx * dx + dy * dy);
  if (d >= MASK_SOFTNESS) return 1;
  const u = d / MASK_SOFTNESS;
  return u * u * (3 - 2 * u);
}

function charForIntensity(v) {
  if (v < 0.18) return RAMP[0];
  if (v < 0.3) return RAMP[1];
  if (v < 0.42) return RAMP[2];
  if (v < 0.55) return RAMP[3];
  if (v < 0.68) return RAMP[4];
  if (v < 0.82) return RAMP[5];
  return RAMP[6];
}
