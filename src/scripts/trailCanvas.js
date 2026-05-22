/**
 * Draws a soft blurred halo behind the cursor on a canvas overlay.
 */

export function createTrailCanvas({ canvas, cursorState }) {
  const ctx = canvas.getContext("2d");
  let accentRgb = readAccentRgb();

  window.addEventListener("themechange", () => {
    accentRgb = readAccentRgb();
  });

  function resize(w, h) {
    canvas.width = w;
    canvas.height = h;
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const trail = cursorState.trail;
    if (trail.length < 2) return;

    ctx.save();
    ctx.filter = "blur(4px)";
    for (let i = 0; i < trail.length; i++) {
      const p = trail[i];
      const age = i / trail.length;
      const radius = 4 + age * 6;
      const alpha = age * 0.1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${accentRgb}, ${alpha})`;
      ctx.fill();
    }
    ctx.restore();
  }

  return { resize, draw };
}

function readAccentRgb() {
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue("--accent-rgb")
    .trim();
  return v || "45, 90, 39";
}
