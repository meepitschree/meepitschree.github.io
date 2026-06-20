import { createAsciiBloom } from "./asciiBloom.js";
import { createCursor } from "./cursor.js";
import { createMorphTypewriter } from "./morphTypewriter.js";
import { createThemeToggle } from "./theme.js";
import { createFlowers } from "./flowers.js";
import { createHillFlowers } from "./hillFlowers.js";
import { createArtPage } from "./artPage.js";
import { createPlayPage } from "./playPage.js";

// ── Configuration ────────────────────────────────────────────────
const NAME_CYCLE = ["XT", "christie", "chree", "cuboctave", "human"]; // "晶晶"

// ── DOM ──────────────────────────────────────────────────────────
const container = document.getElementById("pf");
const asciiEl = document.getElementById("ascii-bg");
const cyclingNameEl = document.getElementById("cycling-name");
const themeToggleEl = document.getElementById("theme-toggle");

// ── Initialize ───────────────────────────────────────────────────
const cursor = createCursor({ container });
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
const artPage = createArtPage({
  pageEl: document.querySelector('[data-page="art"]'),
});
const playPage = createPlayPage({
  pageEl: document.querySelector('[data-page="play"]'),
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
  } else if (route === "art") {
    showPage("art");
    hillFlowers.despawn();
    bloom.setScene("art");
  } else if (route === "play") {
    showPage("play");
    hillFlowers.despawn();
    bloom.setScene("art"); // blank background — add a play scene later if wanted
  } else {
    showPage("home");
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
  bloom.measure();
}
handleResize();

const resizeObserver = new ResizeObserver(handleResize);
resizeObserver.observe(container);

// ── Animation loop ───────────────────────────────────────────────
const FRAME_DT = 0.055; // ascii time step

function frame() {
  cursor.update();
  bloom.frame(FRAME_DT);
  hillFlowers.update();
  requestAnimationFrame(frame);
}

// ── Start ────────────────────────────────────────────────────────
typer.start();
applyRoute();
frame();
