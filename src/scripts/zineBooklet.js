/**
 * A zine as a little booklet: closed (tilted, page edges showing) until
 * clicked, then two-page spreads — or on phones, one page at a time.
 * Click the right half to turn forward, the left half to go back; the
 * back cover closes it.
 *
 * ⤢ under it expands it to fill the screen, where the arrow keys
 * turn pages too, and x or Esc shrinks it back.
 *
 * Pages load on the first show(), not with the rest of the site.
 */
export function createZineBooklet({ rootEl, pages, title }) {
  const book = rootEl.querySelector(".book");
  const spreadEl = rootEl.querySelector(".book-spread");
  const left = rootEl.querySelector(".book-left");
  const right = rootEl.querySelector(".book-right");
  const expandButton = rootEl.querySelector(".book-expand");

  const phone = matchMedia("(max-width: 760px)");

  // Cover alone, then pairs, then the back cover alone. (On phones, every
  // page alone: a spread would be too small to read.)
  function makeSpreads() {
    if (phone.matches) return pages.map((_, i) => [i]);
    const spreads = [[0]];
    for (let i = 1; i < pages.length - 1; i += 2) spreads.push([i, i + 1]);
    if (pages.length > 1) spreads.push([pages.length - 1]);
    return spreads;
  }

  let spreads = makeSpreads();
  let spread = 0;
  let loaded = false;
  let expanded = false;

  function showSpread(index) {
    spread = index;
    const [a, b] = spreads[index];
    left.src = pages[a];
    left.alt = `${title}, page ${a}`;
    right.hidden = b === undefined;
    if (b !== undefined) {
      right.src = pages[b];
      right.alt = `${title}, page ${b}`;
    }
    book.dataset.state = index === 0 ? "closed" : "open";
    // A page on its own inside the zine: which side of the spine it's on
    // (page 1 is a left-hand page), for its shadow.
    const inside = index > 0 && index < spreads.length - 1;
    if (b === undefined && inside) book.dataset.side = a % 2 ? "left" : "right";
    else delete book.dataset.side;
  }

  // Turning a phone sideways (or resizing): stay on the same page.
  phone.addEventListener("change", () => {
    const page = spreads[spread][0];
    spreads = makeSpreads();
    if (loaded) showSpread(spreads.findIndex((s) => s.includes(page)));
  });

  // Forward from the back cover closes the zine again.
  const forward = () => showSpread(spread === spreads.length - 1 ? 0 : spread + 1);
  const back = () => spread > 0 && showSpread(spread - 1);

  spreadEl.addEventListener("click", (e) => {
    if (spread === 0) return forward();
    const rect = spreadEl.getBoundingClientRect();
    if (e.clientX < rect.left + rect.width / 2) back();
    else forward();
  });

  function setExpanded(on) {
    expanded = on;
    book.classList.toggle("is-expanded", on);
    expandButton.textContent = on ? "x" : "⤢";
    expandButton.setAttribute("aria-label", on ? "shrink the zine" : "read the zine larger");
    expandButton.setAttribute("aria-expanded", on);
  }

  expandButton.addEventListener("click", () => setExpanded(!expanded));

  // While expanded, the keys belong to the zine (not the TV above it):
  // caught first, on the way down, so the TV never sees them.
  window.addEventListener(
    "keydown",
    (e) => {
      if (!expanded) return;
      if (e.key === "Escape") setExpanded(false);
      else if (e.key === "ArrowRight") forward();
      else if (e.key === "ArrowLeft") back();
      else if (e.key !== " ") return; // (space: just kept from pausing the TV)
      e.stopPropagation();
      if (e.key !== " ") e.preventDefault();
    },
    true
  );

  return {
    show() {
      if (loaded) return;
      loaded = true;
      showSpread(0);
      pages.forEach((src) => {
        new Image().src = src; // preload so page turns are instant
      });
    },
    hide() {
      setExpanded(false);
    },
  };
}
