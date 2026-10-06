/**
 * The play page's computer: an ASCII CRT computer whose screen is a little
 * desktop. Each project is an icon (its real thumbnail + a filename);
 * clicking one opens a window with the details and a link.
 *
 * Like the art page's TV, the computer is drawn in ASCII and the desktop
 * is real HTML laid over its screen (see asciiScreen.js).
 */
import { fitInsideAsciiScreen, glyphY } from "./asciiScreen.js";

const COLS = 84; // screen size, in characters (wide, like a modern monitor)
const ROWS = 32;
const INNER = 2 + (COLS + 2) + 2; // between the outer | |
const FRAME_W = INNER + 2;
const FRAME_LINES = ROWS + 11;
const SCREEN_COL0 = 4; // "|  |" → the desktop starts at column 4
const SCREEN_ROW0 = 2;

const center = (s) => " ".repeat(Math.floor((FRAME_W - s.length) / 2)) + s;

// Monitor (screen, floppy slot, power light) on a stand.
function buildFrame() {
  const lines = [" " + "_".repeat(INNER) + " "];
  lines.push("|  " + " " + "_".repeat(COLS) + " " + "  |");
  for (let r = 0; r < ROWS; r++) lines.push("|  |" + " ".repeat(COLS) + "|  |");
  lines.push("|  |" + "_".repeat(COLS) + "|  |");
  lines.push("|" + " ".repeat(INNER) + "|");
  lines.push("|" + "   [__________]" + " ".repeat(INNER - 20) + "o    " + "|");
  lines.push("|" + "_".repeat(INNER) + "|");
  lines.push(center("|" + " ".repeat(20) + "|"));
  lines.push(center("|" + " ".repeat(20) + "|"));
  lines.push(center("_".repeat(9) + "|" + "_".repeat(20) + "|" + "_".repeat(9)));
  lines.push(center("/" + " ".repeat(40) + "\\"));
  lines.push(center("/" + "_".repeat(42) + "\\"));
  return lines.join("\n");
}

// ── Desk: a sprout in a pot (left of the computer) and coffee (right) ──
// The leaves are drawn separately so they can bounce on hover.
const LEAVES = [
  "  .--.    .--.  ",
  " (    \\  /    ) ",
  "  '.   \\/   .'  ",
  "    '-.||.-'    ",
].join("\n");

const POT = [
  "       ||       ", // the stem stops at the rim, so the pot's edge stays whole
  "  .----------.  ", // the pot's rim…
  "  |__________|  ",
  "   \\        /   ", // …tapering down
  "    \\      /    ",
  "     \\____/     ",
].join("\n");

const MUG = [
  " .--------.   ",
  " |        |   ",
  " |        |-. ", // a rounded, C-shaped handle
  " |        |  )",
  " |        |-' ",
  " |        |   ",
  " '--------'   ", // straight, like the rim (nudged onto the desk line in measure())
];

// Two steam frames, swapped back and forth so the wisps wiggle upward —
// centred, on average, over the cup's opening.
const STEAM = [
  ["    ( (       ", "     ) )      ", "    ( (       "],
  ["     ) )      ", "    ( (       ", "     ) )      "],
];
const STEAM_MS = 500;

const coffeeFrame = (i) => [...STEAM[i], ...MUG].join("\n");

const formatTime = () =>
  new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }).toLowerCase();

export function createPlayDesktop({ rootEl, projects }) {
  const pre = rootEl.querySelector(".pc-pre");
  const screen = rootEl.querySelector(".pc-screen");
  const iconList = rootEl.querySelector(".pc-icons");
  const win = rootEl.querySelector(".pc-window");
  const winFile = win.querySelector(".pc-window-file");
  const winClose = win.querySelector(".pc-window-close");
  const winThumb = win.querySelector(".pc-window-thumb");
  const winTitle = win.querySelector(".pc-window-title");
  const winMeta = win.querySelector(".pc-window-meta");
  const winDesc = win.querySelector(".pc-window-desc");
  const winLink = win.querySelector(".pc-window-link");
  const clock = rootEl.querySelector(".pc-clock");
  const leaves = rootEl.querySelector(".pc-plant-leaves");
  const pot = rootEl.querySelector(".pc-plant-pot");
  const coffee = rootEl.querySelector(".pc-coffee");
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  let active = false;
  let clockTimer = 0;
  let steamTimer = 0;
  let steamFrame = 0;
  let openIcon = null;

  leaves.textContent = LEAVES;
  pot.textContent = POT;
  coffee.textContent = coffeeFrame(0);

  // ── Icons ──
  const icons = projects.map((project, i) => {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "pc-icon";
    button.setAttribute("aria-label", `open ${project.title}`);

    const img = document.createElement("img");
    img.className = "pc-icon-img";
    img.src = project.thumb;
    img.alt = "";
    img.loading = "lazy"; // waits until the play page is opened

    const label = document.createElement("span");
    label.className = "pc-icon-label";
    label.textContent = project.file;

    button.append(img, label);
    button.addEventListener("click", () => open(i, button));
    item.append(button);
    return item;
  });
  iconList.append(...icons);

  // ── Window ──
  function open(index, icon) {
    const p = projects[index];
    winFile.textContent = p.file;
    winThumb.src = p.thumb;
    winTitle.textContent = p.title;
    winMeta.textContent = [p.year, p.tag].filter(Boolean).join(" · ");
    winDesc.textContent = p.desc;
    winLink.hidden = !p.link;
    if (p.link) {
      winLink.textContent = `${p.link.label} ↗`;
      winLink.href = p.link.href;
    }

    openIcon?.classList.remove("is-selected");
    openIcon = icon;
    icon.classList.add("is-selected");
    win.hidden = false;
    winClose.focus({ preventScroll: true });
  }

  function close() {
    if (win.hidden) return;
    win.hidden = true;
    openIcon?.classList.remove("is-selected");
    openIcon?.focus({ preventScroll: true });
    openIcon = null;
  }

  winClose.addEventListener("click", close);
  document.addEventListener("keydown", (e) => {
    if (active && e.key === "Escape") close();
  });

  // ── Screen ──
  pre.textContent = buildFrame();

  // The cup's bottom is dashes, which sit mid-line, while the pot and the
  // monitor's base end in "_", which sits near the bottom. Nudge the cup
  // down by that difference so all three rest on the same desk line.
  function settleCup() {
    const lh = coffee.getBoundingClientRect().height / coffee.textContent.split("\n").length;
    if (!lh) return; // hidden (e.g. narrow screens)
    const underscore = glyphY(coffee, "_", lh);
    const dash = glyphY(coffee, "-", lh);
    coffee.style.transform = underscore === null ? "" : `translateY(${underscore - dash}px)`;
  }

  const measure = () => {
    fitInsideAsciiScreen({
      pre,
      overlay: screen,
      frameCols: FRAME_W,
      frameLines: FRAME_LINES,
      col0: SCREEN_COL0,
      row0: SCREEN_ROW0,
      cols: COLS,
      rows: ROWS,
    });
    settleCup();
  };
  document.fonts.ready.then(measure);
  const resized = new ResizeObserver(measure);
  resized.observe(pre);
  resized.observe(coffee); // e.g. when the cup reappears after a narrow screen

  const tick = () => (clock.textContent = formatTime());
  const puff = () => {
    steamFrame = (steamFrame + 1) % STEAM.length;
    coffee.textContent = coffeeFrame(steamFrame);
  };

  return {
    show() {
      if (active) return;
      active = true;
      measure();
      tick();
      clockTimer = setInterval(tick, 10_000);
      if (!reduceMotion) steamTimer = setInterval(puff, STEAM_MS);
    },
    hide() {
      if (!active) return;
      active = false;
      clearInterval(clockTimer);
      clearInterval(steamTimer);
    },
  };
}
