import { createAsciiBloom } from "./asciiBloom.js";
import { createCursor } from "./cursor.js";
import { createTrailCanvas } from "./trailCanvas.js";
import { createMorphTypewriter } from "./morphTypewriter.js";
import { createThemeToggle } from "./theme.js";
import { createFlowers } from "./flowers.js";

// ── Configuration ────────────────────────────────────────────────
const NAME_CYCLE = ["XT", "christie", "cuboctave", "human"]; // "晶晶"

// ── DOM ──────────────────────────────────────────────────────────
const container = document.getElementById("pf");
const asciiEl = document.getElementById("ascii-bg");
const cursorEl = document.getElementById("cursor");
const trailCanvas = document.getElementById("trail-canvas");
const cyclingNameEl = document.getElementById("cycling-name");
const themeToggleEl = document.getElementById("theme-toggle");

// ── Initialize ───────────────────────────────────────────────────
const cursor = createCursor({ container, element: cursorEl });
const trail = createTrailCanvas({ canvas: trailCanvas, cursorState: cursor.state });
const bloom = createAsciiBloom({
  container,
  element: asciiEl,
  cursorState: cursor.state,
});
createFlowers({
  container,
  cursorState: cursor.state,
  isInBlockedArea: (x, y) => bloom.isInMask(x, y),
});
const typer = createMorphTypewriter({
  element: cyclingNameEl,
  words: NAME_CYCLE,
});
createThemeToggle({ button: themeToggleEl });

// ── Resize handling ──────────────────────────────────────────────
function handleResize() {
  trail.resize(container.offsetWidth, container.offsetHeight);
  bloom.measure();
}
handleResize();

const resizeObserver = new ResizeObserver(handleResize);
resizeObserver.observe(container);

// ── Animation loop ───────────────────────────────────────────────
const FRAME_DT = 0.055; // ascii time step

function frame() {
  cursor.update();
  trail.draw();
  bloom.frame(FRAME_DT);
  requestAnimationFrame(frame);
}

// ── Start ────────────────────────────────────────────────────────
typer.start();
frame();
