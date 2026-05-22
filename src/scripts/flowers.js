/**
 * Spawns absolutely-positioned flower glyphs on click. Each flower is a
 * DOM <span> with a CSS fade animation; it self-removes when the
 * animation ends. Decoupled from the ASCII bloom so the glyph can use
 * any font size or family.
 */

// Text-style variation selector (U+FE0E) keeps glyphs monochrome instead
// of rendering as color emoji on some platforms.
const FLOWER_GLYPHS = ["✿︎", "❀︎", "❁︎", "✾︎"];
const SIZE_MIN_PX = 15;
const SIZE_MAX_PX = 40;

export function createFlowers({
  container,
  cursorState,
  isInBlockedArea = () => false,
}) {
  container.addEventListener("click", (e) => {
    // Skip flowers when clicking interactive elements (links, buttons) so
    // the glyph doesn't obscure the text the user is trying to act on.
    if (e.target.closest("a, button")) return;

    const x = cursorState.x;
    const y = cursorState.y;
    if (isInBlockedArea(x, y)) return;

    const flower = document.createElement("span");
    flower.className = "flower";
    flower.textContent =
      FLOWER_GLYPHS[Math.floor(Math.random() * FLOWER_GLYPHS.length)];
    flower.style.left = x + "px";
    flower.style.top = y + "px";
    flower.style.fontSize =
      SIZE_MIN_PX + Math.random() * (SIZE_MAX_PX - SIZE_MIN_PX) + "px";
    container.appendChild(flower);

    flower.addEventListener("animationend", () => flower.remove(), {
      once: true,
    });
  });
}
