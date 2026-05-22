/**
 * Spawns and despawns DOM flowers scattered across the hill scene.
 * Atmospheric only — not interactive in the click sense, but they bend
 * away from the cursor like grass under a finger. Each flower's Y is
 * sampled from the hill's local ridge contour (via `hillTopAt`) and then
 * nudged down by a random embed depth so the meadow reads as on/in the
 * hill rather than floating above it.
 */

const FLOWER_GLYPHS = ["✿︎", "❀︎", "❁︎", "✾︎"];
const COUNT = 11; // how many flowers populate the hill
const SIZE_MIN_PX = 14;
const SIZE_MAX_PX = 40;
// Vertical placement relative to the local hill top (in pixels). Positive
// = below the ridge (embedded). A small negative range lets a few flowers
// sit just above the surface so the meadow doesn't feel like a buried row.
const EMBED_MIN_PX = -8;
const EMBED_MAX_PX = 70;

// Cursor-bend parameters.
const BEND_RADIUS_PX = 130; // beyond this, no influence
const BEND_MAX_PX = 24; // max translational lean toward/away cursor
const BEND_MAX_DEG = 14; // max rotational tilt away from cursor
const BEND_LERP = 0.18; // smoothing toward target lean each frame

export function createHillFlowers({ container, hillTopAt, cursorState }) {
  let active = []; // array of { el, x, y, leanX, leanY, tilt }

  function spawn() {
    if (active.length > 0) return; // already planted
    const w = container.offsetWidth;

    for (let i = 0; i < COUNT; i++) {
      // Spread across the width, jittered for an organic feel.
      const xFrac = (i + 0.5) / COUNT + (Math.random() - 0.5) * (0.7 / COUNT);
      const xPx = w * xFrac;
      const localTopPx = hillTopAt(xPx);

      // Bias slightly toward shallow embeds so most flowers cluster near
      // the surface, with a few that look deeper into the slope.
      const u = Math.pow(Math.random(), 1.3);
      const embedPx = EMBED_MIN_PX + u * (EMBED_MAX_PX - EMBED_MIN_PX);
      const yPx = localTopPx + embedPx;

      const size = SIZE_MIN_PX + Math.random() * (SIZE_MAX_PX - SIZE_MIN_PX);

      const el = document.createElement("span");
      el.className = "hill-flower";
      el.style.left = xPx + "px";
      el.style.top = yPx + "px";
      el.style.fontSize = size + "px";
      el.style.animationDelay = i * 80 + "ms";

      // Inner glyph holds the sway animation so the outer can still own
      // the grow-in transform without animation conflicts.
      const glyph = document.createElement("span");
      glyph.className = "hill-flower-glyph";
      glyph.textContent =
        FLOWER_GLYPHS[Math.floor(Math.random() * FLOWER_GLYPHS.length)];
      glyph.style.animationDelay = -(Math.random() * 4) + "s";
      el.appendChild(glyph);

      const item = { el, x: xPx, y: yPx, leanX: 0, leanY: 0, tilt: 0 };

      // After the grow animation lands, mark the flower as grown and
      // freeze its visual state in inline styles. From that point on,
      // update() drives the transform each frame for cursor lean.
      el.addEventListener(
        "animationend",
        (e) => {
          if (e.animationName === "hill-flower-grow") {
            el.style.opacity = "0.95";
            el.style.transform = "translate(-50%, -50%)";
            el.classList.add("is-grown");
          }
        },
        { once: true }
      );

      container.appendChild(el);
      active.push(item);
    }
  }

  function despawn() {
    if (active.length === 0) return;
    const items = active;
    active = [];
    for (const item of items) {
      const { el } = item;
      // Clear inline animation/transform so the .fading rule's animation
      // takes over cleanly from the current visual state.
      el.style.animation = "";
      el.classList.add("fading");
      el.addEventListener("animationend", () => el.remove(), { once: true });
    }
  }

  // Called once per frame. Eases each grown flower toward a lean that
  // points away from the cursor, falling off with distance.
  function update() {
    if (active.length === 0 || !cursorState) return;
    const cx = cursorState.x;
    const cy = cursorState.y;

    for (const item of active) {
      const { el } = item;
      if (!el.classList.contains("is-grown")) continue;
      if (el.classList.contains("fading")) continue;

      // Vector from cursor to flower; lean direction is along this vector.
      const dx = item.x - cx;
      const dy = item.y - cy;
      const d = Math.sqrt(dx * dx + dy * dy);

      let targetLX = 0;
      let targetLY = 0;
      let targetTilt = 0;
      if (d < BEND_RADIUS_PX && d > 0.001) {
        // Quadratic falloff for a soft "bow wave" feel.
        const k = (1 - d / BEND_RADIUS_PX) ** 2;
        const ux = dx / d;
        const uy = dy / d;
        targetLX = ux * k * BEND_MAX_PX;
        targetLY = uy * k * BEND_MAX_PX;
        // Tilt: top of flower bends away horizontally from cursor.
        // ux > 0 (flower right of cursor) → rotate clockwise (positive).
        targetTilt = ux * k * BEND_MAX_DEG;
      }

      item.leanX += (targetLX - item.leanX) * BEND_LERP;
      item.leanY += (targetLY - item.leanY) * BEND_LERP;
      item.tilt += (targetTilt - item.tilt) * BEND_LERP;

      // Skip DOM writes if effectively at rest (avoids needless layout work).
      const settled =
        Math.abs(item.leanX) < 0.05 &&
        Math.abs(item.leanY) < 0.05 &&
        Math.abs(item.tilt) < 0.05 &&
        Math.abs(targetLX) < 0.05 &&
        Math.abs(targetLY) < 0.05;
      if (settled) {
        item.leanX = 0;
        item.leanY = 0;
        item.tilt = 0;
        el.style.transform = "translate(-50%, -50%)";
        continue;
      }

      el.style.transform =
        `translate(calc(-50% + ${item.leanX.toFixed(2)}px),` +
        ` calc(-50% + ${item.leanY.toFixed(2)}px))` +
        ` rotate(${item.tilt.toFixed(2)}deg)`;
    }
  }

  return { spawn, despawn, update };
}
