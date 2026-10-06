/**
 * The art page's TV: an ASCII television that plays the video channels,
 * with a channel guide beside it.
 *
 * The TV frame is ASCII; what plays on it is the real video, laid over the
 * screen. The one thing the screen draws in ASCII is static between channels.
 *
 * Nothing loads or runs until the page is shown: the first video downloads
 * on the first show(), and hide() stops the drawing and pauses the video.
 */

const COLS = 52; // screen size, in characters
const ROWS = 24;
const RAMP = " .:-=+*#%@"; // static, dark → bright
const FPS = 15; // a little choppy, like an old set
const STATIC_MS = 380; // static between channels
const OSD_MS = 1600; // how long "CH 03" stays on screen

// ── TV drawing ─────────────────────────────────────────────────────
const ANTENNA = [
  "\\         /",
  " \\       / ",
  "  \\     /  ",
  "   \\   /   ",
  "    \\ /    ",
];
const PANEL_W = 10;
const INNER = 2 + (COLS + 2) + 2 + PANEL_W + 2; // between the outer | |
const FRAME_W = INNER + 2;
const FRAME_LINES = ANTENNA.length + 1 + (ROWS + 2) + 1 + 1;
const SCREEN_COL0 = 4; // "|  |" → the picture starts at column 4
const SCREEN_ROW0 = ANTENNA.length + 2;
const KNOB = ["|", "/", "-", "\\"];
const BLANK_ROWS = Array(ROWS).fill(" ".repeat(COLS));

// The knobs are an even number of characters wide, so their centre falls
// between two columns. A character written after HALF is nudged half a
// column right to sit exactly in the middle (HALF itself never shows).
const HALF = "§";

const pad2 = (n) => String(n).padStart(2, "0");
const center = (s) => " ".repeat(Math.floor((FRAME_W - s.length) / 2)) + s;

// Channel display, two knobs, and a speaker grille, one string per row.
function panelRows(index) {
  const rows = [
    " ________ ",
    "|        |",
    `|   ${pad2(index + 1)}   |`,
    "|________|",
    "          ",
    "   .--.   ",
    `  ( ${HALF}${KNOB[index % KNOB.length]}  )  `,
    "   '--'   ",
    "    ch    ",
    "          ",
    "   .--.   ",
    `  ( ${HALF}-  )  `,
    "   '--'   ",
    `    ${HALF}♥︎     `, // ︎: a plain text heart, not an emoji
    "          ",
  ];
  while (rows.length < ROWS + 1) rows.push(" :::::::: ");
  rows.push("          ");
  return rows;
}

function buildFrame(screenRows, index) {
  const panel = panelRows(index);
  const lines = ANTENNA.map(center);
  lines.push(" " + "_".repeat(INNER) + " ");
  for (let r = 0; r < ROWS + 2; r++) {
    let screen;
    if (r === 0) screen = " " + "_".repeat(COLS) + " ";
    else if (r === ROWS + 1) screen = "|" + "_".repeat(COLS) + "|";
    else screen = "|" + screenRows[r - 1] + "|";
    lines.push("|  " + screen + "  " + panel[r] + "  |");
  }
  lines.push("|" + "_".repeat(INNER) + "|");
  lines.push(center("  /__\\" + " ".repeat(INNER - 12) + "/__\\  "));
  return lines.join("\n");
}

// The frame as HTML: plain text, except each HALF-marked character is
// wrapped so CSS (.tv-half) can nudge it.
const escapeHtml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const frameHtml = (screenRows, index) =>
  escapeHtml(buildFrame(screenRows, index)).replace(
    new RegExp(`${HALF}(.\\uFE0E?)`, "gu"),
    '<span class="tv-half">$1</span>'
  );

function staticRows() {
  const rows = [];
  for (let r = 0; r < ROWS; r++) {
    let line = "";
    for (let c = 0; c < COLS; c++) line += RAMP[Math.floor(Math.random() ** 1.6 * RAMP.length)];
    rows.push(line);
  }
  return rows;
}

// ── Media ──────────────────────────────────────────────────────────
const isVideo = (src) => /\.(mp4|webm|mov|m4v)([?#]|$)/i.test(src);
const isReady = (el) =>
  el instanceof HTMLVideoElement ? el.readyState >= 2 : el.complete && el.naturalWidth > 0;

function createMedia(ch) {
  let node;
  if (isVideo(ch.src)) {
    node = document.createElement("video");
    // preload "none": nothing downloads until you tune in (play() starts
    // the download, and the static covers the wait).
    Object.assign(node, { muted: true, loop: true, playsInline: true, preload: "none" });
  } else {
    node = new Image();
    node.alt = ch.title;
  }
  node.src = ch.src;
  node.style.objectFit = ch.fit;
  return node;
}

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

// ── The TV ─────────────────────────────────────────────────────────
export function createArtTv({ rootEl, channels }) {
  const tv = rootEl.querySelector(".tv");
  const pre = rootEl.querySelector(".tv-pre");
  const screen = rootEl.querySelector(".tv-screen");
  const media = rootEl.querySelector(".tv-media");
  const osd = rootEl.querySelector(".tv-osd--channel");
  const pausedLabel = rootEl.querySelector(".tv-osd--paused");
  const caption = rootEl.querySelector(".tv-caption");
  const pauseButton = rootEl.querySelector(".tv-pause");
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const items = channels.map((ch) => ({ ...ch, el: createMedia(ch) }));
  let current = 0;
  let active = false;
  let started = false;
  let resumeOnShow = false;
  let staticUntil = 0;
  let osdUntil = 0;
  let lastDraw = 0;
  let rafId = 0;

  // Pause / play. Stills have nothing to pause.
  const currentVideo = () => {
    const node = items[current].el;
    return node instanceof HTMLVideoElement ? node : null;
  };

  function setPaused(value) {
    const video = currentVideo();
    if (video) {
      if (value) video.pause();
      else video.play().catch(() => {}); // if blocked, the "pause" event syncs the UI
    }
    syncPause();
  }

  // The button and "|| PAUSE" always follow the video's real state.
  function syncPause() {
    const video = currentVideo();
    const paused = video ? video.paused : false;
    pauseButton.textContent = paused ? "play" : "pause";
    pauseButton.disabled = !video;
    pausedLabel.hidden = !paused;
  }

  for (const item of items) {
    if (item.el instanceof HTMLVideoElement) {
      item.el.addEventListener("play", syncPause);
      item.el.addEventListener("pause", syncPause);
    }
  }

  // Channel guide: 01  title ········· year, with details for the one that's on.
  const guideItems = items.map((ch, i) => {
    const item = el("li", "channel");
    const button = el("button", "channel-tune");
    button.type = "button";
    button.append(
      el("span", "channel-no", pad2(i + 1)),
      el("span", "channel-title", ch.title),
      el("span", "channel-leader"),
      el("span", "channel-year", ch.year)
    );
    button.addEventListener("click", () => tune(i));

    const details = el("div", "channel-details");
    details.hidden = true;
    details.append(el("p", "channel-desc", ch.desc));
    if (ch.link) {
      const link = el("a", "channel-link", ch.link.label);
      link.href = ch.link.href;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      details.append(link);
    }

    item.append(button, details);
    return item;
  });
  rootEl.querySelector(".channel-list").append(...guideItems);

  function tune(index) {
    const previous = currentVideo();
    if (previous) previous.pause();

    current = (index + items.length) % items.length;
    const ch = items[current];
    const now = performance.now();
    staticUntil = now + (reduceMotion ? 0 : STATIC_MS);
    osdUntil = now + OSD_MS;
    media.replaceChildren(ch.el);
    osd.textContent = `CH ${pad2(current + 1)}`;
    setPaused(reduceMotion); // a new channel plays (unless reduced motion is on)
    caption.textContent = [`ch ${pad2(current + 1)}`, ch.title, ch.year].filter(Boolean).join(" · ");

    guideItems.forEach((item, i) => {
      const on = i === current;
      item.classList.toggle("is-current", on);
      item.querySelector(".channel-details").hidden = !on;
      item.querySelector(".channel-tune").setAttribute("aria-current", String(on));
    });
  }

  function draw(now) {
    rafId = requestAnimationFrame(draw);
    if (now - lastDraw < 1000 / FPS) return;
    lastDraw = now;

    const tuning = now < staticUntil || !isReady(items[current].el);
    pre.innerHTML = frameHtml(tuning ? staticRows() : BLANK_ROWS, current);
    screen.classList.toggle("is-on", !tuning);
    osd.hidden = now >= osdUntil;
  }

  // How far down its line a "_" is drawn, measured from the font. The
  // screen's top and bottom edges are rows of "_", which sit near the
  // bottom of their line — not where the line's box is.
  function underscoreY(lh) {
    const style = getComputedStyle(pre);
    const ctx = document.createElement("canvas").getContext("2d");
    ctx.font = `${style.fontSize} ${style.fontFamily}`;
    const m = ctx.measureText("_");
    if (m.fontBoundingBoxAscent === undefined) return lh * 0.9; // older browsers
    // line-height is 1, so the font's ascent + descent is centred in the line.
    const baseline = (lh - (m.fontBoundingBoxAscent + m.fontBoundingBoxDescent)) / 2 + m.fontBoundingBoxAscent;
    return baseline + (m.actualBoundingBoxDescent - m.actualBoundingBoxAscent) / 2;
  }

  // Fit the picture inside the ASCII screen with an even gap all round.
  function measure() {
    const rect = pre.getBoundingClientRect();
    if (!rect.width) return; // hidden
    const cw = rect.width / FRAME_W;
    const lh = rect.height / FRAME_LINES;
    const lineY = underscoreY(lh);

    // The screen's edges: the middle of each "|", and each row of "_".
    const left = (SCREEN_COL0 - 0.5) * cw;
    const right = (SCREEN_COL0 + COLS + 0.5) * cw;
    const top = (SCREEN_ROW0 - 1) * lh + lineY;
    const bottom = (SCREEN_ROW0 + ROWS) * lh + lineY;
    const gap = cw / 2;

    Object.assign(screen.style, {
      left: `${left + gap}px`,
      top: `${top + gap}px`,
      width: `${right - left - 2 * gap}px`,
      height: `${bottom - top - 2 * gap}px`,
    });
  }

  // ── Input ──
  tv.addEventListener("click", () => tune(current + 1));
  rootEl.querySelector(".tv-prev").addEventListener("click", () => tune(current - 1));
  rootEl.querySelector(".tv-next").addEventListener("click", () => tune(current + 1));
  pauseButton.addEventListener("click", () => setPaused(!currentVideo()?.paused));
  document.addEventListener("keydown", (e) => {
    if (!active) return;
    if (e.key === "ArrowRight") tune(current + 1);
    if (e.key === "ArrowLeft") tune(current - 1);
    // Space pauses — unless a button or link has focus (space presses those).
    if (e.key === " " && !(e.target instanceof Element && e.target.closest("button, a"))) {
      e.preventDefault();
      setPaused(!currentVideo()?.paused);
    }
  });

  pre.innerHTML = frameHtml(staticRows(), current);
  document.fonts.ready.then(measure);
  new ResizeObserver(measure).observe(pre);

  return {
    show() {
      if (active) return;
      active = true;
      if (!started) {
        started = true;
        tune(0);
      } else if (resumeOnShow) {
        setPaused(false);
      }
      measure();
      rafId = requestAnimationFrame(draw);
    },
    hide() {
      if (!active) return;
      active = false;
      cancelAnimationFrame(rafId);
      const video = currentVideo();
      resumeOnShow = Boolean(video && !video.paused);
      if (video) video.pause();
    },
  };
}
