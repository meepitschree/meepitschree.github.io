import { createAsciiBloom } from "./asciiBloom.js";
import { createCursor } from "./cursor.js";
import { createTrailCanvas } from "./trailCanvas.js";
import { createMorphTypewriter } from "./morphTypewriter.js";
import { createThemeToggle } from "./theme.js";
import { createFlowers } from "./flowers.js";
import { createHillFlowers } from "./hillFlowers.js";

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
const hillFlowers = createHillFlowers({
  container,
  hillTopAt: (xPx) => bloom.hillTopPxAt(xPx),
  cursorState: cursor.state,
});

// ── Routing ──────────────────────────────────────────────────────
// Hash-based so it works on GitHub Pages without server config.
// "" → home, "about" → about (hill scene). Easy to extend later.
const pages = Array.from(document.querySelectorAll(".page"));
function currentRoute() {
  const h = window.location.hash;
  if (h.startsWith("#/")) return h.slice(2);
  return "";
}

function showPage(name) {
  const target = name || "home";
  for (const p of pages) {
    p.hidden = p.dataset.page !== target;
  }
}

function applyRoute() {
  const route = currentRoute();
  if (route === "about") {
    showPage("about");
    bloom.setScene("hill");
  } else {
    showPage("home");
    // Fade out hill flowers as the hill starts to retreat.
    hillFlowers.despawn();
    bloom.setScene("bloom");
  }
}

// Spawn hill flowers once the hill transition has settled.
bloom.onSettle((scene) => {
  if (scene === "hill") hillFlowers.spawn();
});

window.addEventListener("hashchange", applyRoute);

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
  hillFlowers.update();
  requestAnimationFrame(frame);
}

// ── Start ────────────────────────────────────────────────────────
typer.start();
applyRoute();
frame();
