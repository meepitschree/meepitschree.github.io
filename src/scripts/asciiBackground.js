/**
 * Renders the ASCII background into a <pre> element: the about page's
 * hill, plus a per-cell noise field that wakes up along the cursor's
 * trail and rings out from clicks. The other pages are plain.
 */

// Measured from the live <pre> element at first measure() / on font load.
// Starting defaults are fallbacks until the real values are sampled.
let CHAR_WIDTH = 6.6;
let CHAR_HEIGHT = 11;
const RAMP = " .:+*o@";

// Scene transition timing (seconds).
const SCENE_TRANSITION = 1.5;

export function createAsciiBackground({ container, element, cursorState }) {
  let cols = 80;
  let rows = 60;
  let ambient = [];
  let t = 0;
  let cleared = false; // the <pre> is empty and nothing needs drawing

  // Scene state. `scene` is the settled scene (or the one we came from
  // mid-transition); `targetScene` is where we're heading. While
  // `transitionProgress < 1`, both intensities are computed and crossfaded.
  let scene = "plain"; // "plain" | "hill"
  let targetScene = "plain";
  let transitionProgress = 1;
  let transitionStart = 0;
  let pendingScene = null; // a scene requested mid-fade (see setScene)
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
    cleared = false;
  }

  function frame(dt) {
    t += dt;

    // Advance scene transition if active.
    if (transitionProgress < 1) {
      transitionProgress = Math.min(1, (t - transitionStart) / SCENE_TRANSITION);
      if (transitionProgress >= 1) {
        scene = targetScene;
        if (pendingScene) {
          // You navigated again mid-fade: fade on to where you are now
          // (and skip "settled" for the scene you've already left).
          const next = pendingScene;
          pendingScene = null;
          setScene(next);
        } else if (onSettleCallback) {
          onSettleCallback(scene);
        }
      }
    }

    // On a plain page with the cursor at rest there's nothing to draw:
    // empty the <pre> once and skip the per-cell work until something moves.
    const idle =
      transitionProgress >= 1 &&
      scene === "plain" &&
      cursorState.ripples.length === 0 &&
      trailStrength(cursorState.speed) < RAMP_THRESHOLDS[0];
    if (idle) {
      if (!cleared) element.textContent = "";
      cleared = true;
      return;
    }
    cleared = false;

    element.textContent = renderFrame(
      t,
      cols,
      rows,
      ambient,
      cursorState,
      scene,
      targetScene,
      transitionProgress
    );
  }

  // Trigger a crossfade to a new scene. Mid-fade, the request waits and
  // runs as soon as the current fade finishes (the latest request wins).
  function setScene(name) {
    if (transitionProgress < 1) {
      pendingScene = name;
      return;
    }
    if (name === targetScene) return;
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

  // Pixel-space hill top at a given x position. Uses the static base shape
  // (no wind, no cursor pull) so flowers stay pinned to a stable contour.
  function hillTopPxAt(xPx) {
    const col = xPx / CHAR_WIDTH;
    return staticHillTopRow(col, rows) * CHAR_HEIGHT;
  }

  return { measure, frame, setScene, onSettle, hillTopPxAt };
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
  scene,
  targetScene,
  transitionProgress
) {
  const mxCol = cursor.x / CHAR_WIDTH;
  const myRow = cursor.y / CHAR_HEIGHT;
  const trail = cursor.trail;
  const trailMax = trailStrength(cursor.speed);

  // Scene blending: the hill's "presence" (0..1) fades in as you arrive on
  // the about page and out as you leave it. The plain scene adds nothing.
  const eased = smoothstep(transitionProgress);
  const hillPresence =
    (scene === "hill" ? 1 - eased : 0) + (targetScene === "hill" ? eased : 0);

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
      // Hill intensity. Static base shape (no traveling wave). Gentle
      // per-column wind keeps edge chars rustling. Cursor gently pulls
      // the local ridge toward its row.
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

      let cursorGlow = 0;

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
            const strength = (1 - dCursor / reach) * age * trailMax;
            if (strength > cursorGlow) cursorGlow = strength;
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
        if (ringI > cursorGlow) cursorGlow = ringI;
      }

      const intensity = Math.max(hillIntensity, cursorGlow);
      line += charForIntensity(intensity);
    }
    out += line + "\n";
  }
  return out;
}

// The brightest the cursor's trail can be at a given cursor speed — it
// fades out as the cursor slows to a stop.
function trailStrength(speed) {
  return 0.5 * Math.min(1, speed / 15);
}

// Intensity at which each RAMP glyph after " " starts.
const RAMP_THRESHOLDS = [0.18, 0.3, 0.42, 0.55, 0.68, 0.82];

function charForIntensity(v) {
  if (v < RAMP_THRESHOLDS[0]) return RAMP[0];
  if (v < RAMP_THRESHOLDS[1]) return RAMP[1];
  if (v < RAMP_THRESHOLDS[2]) return RAMP[2];
  if (v < RAMP_THRESHOLDS[3]) return RAMP[3];
  if (v < RAMP_THRESHOLDS[4]) return RAMP[4];
  if (v < RAMP_THRESHOLDS[5]) return RAMP[5];
  return RAMP[6];
}
