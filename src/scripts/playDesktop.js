/**
 * The play page's computer: an ASCII CRT computer whose screen is a little
 * desktop. Each project is an icon (its real thumbnail + a filename);
 * clicking one opens a window with the details and a link. On phones it's
 * a handheld game console instead, whose d-pad and A/B buttons work.
 *
 * Like the art page's TV, the computer is drawn in ASCII and the desktop
 * is real HTML laid over its screen (see asciiScreen.js).
 */
import { coverAsciiCells, fitInsideAsciiScreen, glyphY } from "./asciiScreen.js";

// ── Devices ──
// Each draws a body around a screen `cols` × `rows` characters big, and
// says where the screen's inside starts (col0, row0). The screen's edges
// are "|" sides with rows of "_" above and below (see asciiScreen.js).

// Monitor (screen, floppy slot, power light) on a stand.
function monitor(cols, rows) {
  const inner = 2 + (cols + 2) + 2; // between the outer | |
  const center = (s) => " ".repeat(Math.floor((inner + 2 - s.length) / 2)) + s;
  const lines = [" " + "_".repeat(inner) + " "];
  lines.push("|  " + " " + "_".repeat(cols) + " " + "  |");
  for (let r = 0; r < rows; r++) lines.push("|  |" + " ".repeat(cols) + "|  |");
  lines.push("|  |" + "_".repeat(cols) + "|  |");
  lines.push("|" + " ".repeat(inner) + "|");
  lines.push("|" + "   [__________]" + " ".repeat(inner - 20) + "o    " + "|");
  lines.push("|" + "_".repeat(inner) + "|");
  lines.push(center("|" + " ".repeat(20) + "|"));
  lines.push(center("|" + " ".repeat(20) + "|"));
  lines.push(center("_".repeat(9) + "|" + "_".repeat(20) + "|" + "_".repeat(9)));
  lines.push(center("/" + " ".repeat(40) + "\\"));
  lines.push(center("/" + "_".repeat(42) + "\\"));
  return { lines, col0: 4, row0: 2 };
}

// A handheld game console: screen up top; d-pad, A and B below, with
// select, start and a speaker. Its buttons work: `pads` says where each
// one is drawn, as [col, row, cols, rows] — fractions, since the outlines
// run through the middles of "|" and along the bottoms of "_".
function handheld(cols, rows) {
  const w = cols + 10;
  const row = (s) => "|" + s.padEnd(w - 2) + "|";
  const lines = [" " + "_".repeat(w - 2) + " "];
  lines.push("| " + " " + "_".repeat(cols + 4) + " " + " |");
  lines.push("| |" + " ".repeat(cols + 4) + "| |");
  lines.push("| | " + " " + "_".repeat(cols) + " " + " | |");
  for (let r = 0; r < rows; r++) lines.push("| | |" + " ".repeat(cols) + "| | |");
  lines.push("| | |" + "_".repeat(cols) + "| | |");
  lines.push("| |  o" + " ".repeat(cols + 1) + "| |"); // power light
  lines.push("| |" + "_".repeat(cols + 4) + "| |");
  lines.push(row(""));

  const dpad = [
    "    ___    ",
    "   |   |   ",
    " __|   |__ ",
    "|         |",
    "|__     __|",
    "   |   |   ",
    "   |___|   ",
  ];
  const ab = [
    "",
    "",
    "          .---. ",
    "  .---.  (  A  )",
    " (  B  )  '---' ",
    "  '---'         ",
    "",
  ];
  const c0 = lines.length; // the controls' first line
  const dx = 4; // the d-pad's first column
  const bx = w - 4 - 16; // the A/B block's first column
  dpad.forEach((d, i) => lines.push(row("   " + d.padEnd(bx - dx) + ab[i])));

  lines.push(row(""));
  lines.push(row(" ".repeat(Math.floor((w - 12) / 2)) + "/__/  /__/")); // select, start
  lines.push(row(" ".repeat(w - 14) + "/ / / /")); // speaker
  lines.push("|" + " ".repeat(w - 15) + "/ / / /" + "      /"); // …and a rounded corner
  lines.push("|" + "_".repeat(w - 5) + ".-'");

  const pads = {
    up: [dx + 3.5, c0 + 0.9, 4, 2],
    down: [dx + 3.5, c0 + 4.9, 4, 2],
    left: [dx + 0.5, c0 + 2.9, 3, 2],
    right: [dx + 7.5, c0 + 2.9, 3, 2],
    a: [bx + 9.5, c0 + 2.55, 6, 1.95],
    b: [bx + 1.5, c0 + 3.55, 6, 1.95],
  };
  return { lines, col0: 5, row0: 4, pads };
}

// Which device, and its screen size, in characters: the computer, wide like
// a modern monitor — or on phones, where that'd be too small to use, the
// handheld.
const LAYOUTS = {
  desktop: { device: monitor, cols: 84, rows: 32 },
  handheld: { device: handheld, cols: 38, rows: 26 },
};
const narrowScreen = matchMedia("(max-width: 760px)");

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

// Does the image fill its whole square (no transparent corners)? Those get
// drawn as a rounded, bevelled tile, like an app icon, so they sit well
// next to the cut-out ones.
function isOpaque(img) {
  const size = 16;
  const ctx = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  ctx.canvas.width = ctx.canvas.height = size;
  ctx.drawImage(img, 0, 0, size, size);
  const alphaAt = (x, y) => ctx.getImageData(x, y, 1, 1).data[3];
  return [alphaAt(0, 0), alphaAt(size - 1, 0), alphaAt(0, size - 1), alphaAt(size - 1, size - 1)].every((a) => a > 250);
}

const formatTime = () =>
  new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }).toLowerCase();

export function createPlayDesktop({ rootEl, projects }) {
  const scene = rootEl.querySelector(".pc-scene");
  const pc = rootEl.querySelector(".pc");
  const pre = rootEl.querySelector(".pc-pre");
  const screen = rootEl.querySelector(".pc-screen");
  const iconList = rootEl.querySelector(".pc-icons");
  const win = rootEl.querySelector(".pc-window");
  const winFile = win.querySelector(".pc-window-file");
  const winClose = win.querySelector(".pc-window-close");
  const winBody = win.querySelector(".pc-window-body");
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
  let selected = -1; // the highlighted icon: the open one, or the d-pad's pick
  let layout = null; // the device drawn now, and where its screen and buttons are

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

    const art = document.createElement("span");
    art.className = "pc-icon-art";
    const img = document.createElement("img");
    img.className = "pc-icon-img";
    img.alt = "";
    img.loading = "lazy"; // waits until the play page is opened
    img.addEventListener("load", () => art.classList.toggle("is-tile", isOpaque(img)), { once: true });
    img.src = project.thumb;
    art.append(img);

    const label = document.createElement("span");
    label.className = "pc-icon-label";
    label.textContent = project.file;

    button.append(art, label);
    button.addEventListener("click", () => open(i));
    item.append(button);
    iconList.append(item);
    return button;
  });

  function select(index) {
    icons.forEach((icon, i) => icon.classList.toggle("is-selected", i === index));
    selected = index;
  }

  // ── Window ──
  function open(index) {
    const p = projects[index];
    winFile.textContent = p.file;
    winThumb.src = p.thumb;
    winTitle.textContent = p.title;
    winMeta.textContent = [p.year, p.tag].filter(Boolean).join(" · ");
    winDesc.textContent = p.desc;
    winLink.hidden = !p.link;
    if (p.link) {
      winLink.textContent = `${p.link.label} ->`;
      winLink.href = p.link.href;
    }

    select(index);
    win.hidden = false;
    winBody.scrollTop = 0;
    winClose.focus({ preventScroll: true });
  }

  function close() {
    if (win.hidden) return;
    win.hidden = true;
    icons[selected]?.focus({ preventScroll: true });
    // On the computer the highlight goes with the window; on the handheld
    // it stays, so the d-pad carries on from there.
    if (!layout.pads) select(-1);
  }

  winClose.addEventListener("click", close);
  document.addEventListener("keydown", (e) => {
    if (active && e.key === "Escape") close();
  });

  // ── Handheld buttons ──
  // The d-pad moves between icons (or scrolls an open window), A opens the
  // icon (or, in a window, follows its link) and B closes the window.
  const PRESS = {
    up: () => move(0, -1),
    down: () => move(0, 1),
    left: () => move(-1, 0),
    right: () => move(1, 0),
    a: () => {
      if (win.hidden) open(selected);
      else if (!winLink.hidden) winLink.click();
    },
    b: close,
  };

  function move(dx, dy) {
    if (!win.hidden) {
      winBody.scrollBy({ top: dy * winBody.clientHeight * 0.6, behavior: reduceMotion ? "auto" : "smooth" });
      return;
    }
    const perRow = icons.filter((icon) => icon.offsetTop === icons[0].offsetTop).length;
    const next = selected + dx + dy * perRow;
    if (next < 0) return;
    select(Math.min(next, icons.length - 1)); // down from a full row to a shorter one: its last icon
    reveal(icons[selected]);
  }

  // Scroll the icon list just enough to show `icon`.
  function reveal(icon) {
    const list = iconList.getBoundingClientRect();
    const box = icon.getBoundingClientRect();
    const margin = parseFloat(getComputedStyle(iconList).paddingTop);
    if (box.top < list.top + margin) iconList.scrollTop -= list.top + margin - box.top;
    else if (box.bottom > list.bottom - margin) iconList.scrollTop += box.bottom - (list.bottom - margin);
  }

  // Invisible buttons laid over the drawn ones (see handheld()); the
  // drawing flashes inverted under your finger.
  const pads = Object.entries(PRESS).map(([name, press]) => {
    const pad = document.createElement("button");
    pad.type = "button";
    pad.className = `pc-pad pc-pad--${name}`;
    pad.tabIndex = -1; // a toy: the icons and window work without it
    pad.setAttribute("aria-hidden", "true");
    pad.addEventListener("click", press);
    pad.addEventListener("pointerdown", () => pad.classList.add("is-pressed"));
    for (const type of ["pointerup", "pointercancel", "pointerleave"]) {
      pad.addEventListener(type, () => setTimeout(() => pad.classList.remove("is-pressed"), 90));
    }
    pc.append(pad);
    return { name, pad };
  });

  // ── Device ──
  // The wide computer on big screens; on phones, the handheld.
  function draw() {
    const name = narrowScreen.matches ? "handheld" : "desktop";
    const { device, cols, rows } = LAYOUTS[name];
    const { lines, col0, row0, pads: padCells } = device(cols, rows);
    const frameCols = Math.max(...lines.map((line) => line.length));
    layout = { cols, rows, col0, row0, frameCols, frameLines: lines.length, pads: padCells };

    pre.textContent = lines.join("\n");
    scene.dataset.layout = name;
    // Fit the drawing to a phone's width (on big screens, the CSS default
    // fits the computer with its desk).
    if (narrowScreen.matches) scene.style.setProperty("--scene-chars", frameCols + 2);
    else scene.style.removeProperty("--scene-chars");
    for (const { pad } of pads) pad.hidden = !padCells;
    // The handheld always has an icon picked, for the d-pad to move from.
    if (padCells && selected < 0) select(0);
    if (!padCells && win.hidden) select(-1);
    measure();
  }

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
    fitInsideAsciiScreen({ pre, overlay: screen, ...layout });
    if (layout.pads) {
      for (const { name, pad } of pads) coverAsciiCells({ pre, el: pad, ...layout, cells: layout.pads[name] });
    }
    settleCup();
  };
  draw();
  narrowScreen.addEventListener("change", draw);
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
