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

export function createAsciiBloom({ container, element, cursorState }) {
  let cols = 80;
  let rows = 60;
  let ambient = [];
  let masks = [];
  let t = 0;

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
    element.textContent = renderFrame(t, cols, rows, ambient, cursorState, masks);
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

  return { measure, frame, isInMask };
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

function renderFrame(t, cols, rows, ambient, cursor, masks) {
  const centers = BLOOM_CENTERS.map((b) => ({
    col: cols * b.fx,
    row: rows * b.fy,
  }));

  const mxCol = cursor.x / CHAR_WIDTH;
  const myRow = cursor.y / CHAR_HEIGHT;
  const trail = cursor.trail;
  const trailFade = Math.min(1, cursor.speed / 15);

  let out = "";
  for (let r = 0; r < rows; r++) {
    let line = "";
    for (let c = 0; c < cols; c++) {
      let bloomIntensity = 0;
      for (const ctr of centers) {
        const v = bloomAt(c, r, ctr.col, ctr.row, t, mxCol, myRow);
        if (v > bloomIntensity) bloomIntensity = v;
      }

      // Text masks: bloom flows around hero text instead of through it.
      // Take the strongest suppression across all masked elements.
      if (masks.length > 0) {
        let maskFactor = 1;
        for (let m = 0; m < masks.length; m++) {
          const f = rectMask(c, r, masks[m]);
          if (f < maskFactor) maskFactor = f;
        }
        bloomIntensity *= maskFactor;
      }

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

      const intensity = Math.max(bloomIntensity, cursorBloom);
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
