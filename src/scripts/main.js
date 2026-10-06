import { createAsciiBackground } from "./asciiBackground.js";
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
const heroTextEl = document.querySelector(".hero-text");

// ── Initialize ───────────────────────────────────────────────────
const cursor = createCursor({ container });
const background = createAsciiBackground({
  container,
  element: asciiEl,
  cursorState: cursor.state,
});
createFlowers({
  container,
  cursorState: cursor.state,
  // No flowers over the home page's text.
  isInBlockedArea: (x, y) => {
    const box = heroTextEl.getBoundingClientRect();
    const origin = container.getBoundingClientRect();
    const fx = x + origin.left;
    const fy = y + origin.top;
    return fx >= box.left && fx <= box.right && fy >= box.top && fy <= box.bottom;
  },
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
  hillTopAt: (xPx) => background.hillTopPxAt(xPx),
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
  if (route !== "art") artPage.hide(); // pauses the TV when you leave
  if (route !== "play") playPage.hide(); // stops the desktop clock
  if (route === "about") {
    showPage("about");
    background.setScene("hill");
  } else if (route === "art") {
    showPage("art");
    artPage.show();
    hillFlowers.despawn();
    background.setScene("plain");
  } else if (route === "play") {
    showPage("play");
    playPage.show();
    hillFlowers.despawn();
    background.setScene("plain");
  } else {
    showPage("home");
    hillFlowers.despawn();
    background.setScene("plain");
  }
}

// Spawn hill flowers once the hill transition has settled.
background.onSettle((scene) => {
  if (scene === "hill") hillFlowers.spawn();
});

window.addEventListener("hashchange", applyRoute);

// ── Resize handling ──────────────────────────────────────────────
function handleResize() {
  background.measure();
}
handleResize();

const resizeObserver = new ResizeObserver(handleResize);
resizeObserver.observe(container);

// ── Animation loop ───────────────────────────────────────────────
const FRAME_DT = 0.055; // ascii time step

function frame() {
  cursor.update();
  background.frame(FRAME_DT);
  hillFlowers.update();
  requestAnimationFrame(frame);
}

// ── Start ────────────────────────────────────────────────────────
typer.start();
applyRoute();
frame();
