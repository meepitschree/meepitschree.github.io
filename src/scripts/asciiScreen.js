/**
 * Shared by the ASCII TV (art page) and the ASCII computer (play page):
 * fitting real HTML content — a video, a desktop — inside a screen that's
 * drawn with text characters in a <pre>.
 *
 * The screen is a box of "|" sides with rows of "_" for its top and
 * bottom edges, as built by the TV and computer frame drawings.
 */

// How far down its line a character is drawn (the middle of its ink),
// measured from the font. E.g. "_" sits near the bottom of its line and
// "-" near the middle — not where the line's box is.
export function glyphY(pre, char, lh) {
  const style = getComputedStyle(pre);
  const ctx = document.createElement("canvas").getContext("2d");
  ctx.font = `${style.fontSize} ${style.fontFamily}`;
  const m = ctx.measureText(char);
  if (m.fontBoundingBoxAscent === undefined) return null; // older browsers
  // line-height is 1, so the font's ascent + descent is centred in the line.
  const baseline = (lh - (m.fontBoundingBoxAscent + m.fontBoundingBoxDescent)) / 2 + m.fontBoundingBoxAscent;
  return baseline + (m.actualBoundingBoxDescent - m.actualBoundingBoxAscent) / 2;
}

/**
 * Position `overlay` inside the ASCII screen with an even half-character
 * gap all round.
 *
 *   frameCols / frameLines  the whole drawing's size, in characters
 *   col0 / row0             where the screen's inside starts
 *   cols / rows             the screen's inside size
 *
 * Does nothing while the <pre> is hidden (it has no size yet).
 */
export function fitInsideAsciiScreen({ pre, overlay, frameCols, frameLines, col0, row0, cols, rows }) {
  const rect = pre.getBoundingClientRect();
  if (!rect.width) return;
  const cw = rect.width / frameCols;
  const lh = rect.height / frameLines;
  // The screen's top and bottom edges are rows of "_".
  const lineY = glyphY(pre, "_", lh) ?? lh * 0.9;

  // The screen's edges: the middle of each "|", and each row of "_".
  const left = (col0 - 0.5) * cw;
  const right = (col0 + cols + 0.5) * cw;
  const top = (row0 - 1) * lh + lineY;
  const bottom = (row0 + rows) * lh + lineY;
  const gap = cw / 2;

  Object.assign(overlay.style, {
    left: `${left + gap}px`,
    top: `${top + gap}px`,
    width: `${right - left - 2 * gap}px`,
    height: `${bottom - top - 2 * gap}px`,
  });
}
