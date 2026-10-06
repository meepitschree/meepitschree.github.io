/**
 * A zine as a little booklet: closed (tilted, page edges showing) until
 * clicked, then two-page spreads. Click the right page to turn forward,
 * the left page to go back; the back cover closes it.
 *
 * Pages load on the first show(), not with the rest of the site.
 */
export function createZineBooklet({ rootEl, pages, title }) {
  const book = rootEl.querySelector(".book");
  const spreadEl = rootEl.querySelector(".book-spread");
  const left = rootEl.querySelector(".book-left");
  const right = rootEl.querySelector(".book-right");
  const caption = rootEl.querySelector(".book-caption");

  // Cover alone, then pairs, then the back cover alone.
  const spreads = [[0]];
  for (let i = 1; i < pages.length - 1; i += 2) spreads.push([i, i + 1]);
  if (pages.length > 1) spreads.push([pages.length - 1]);

  let spread = 0;
  let loaded = false;

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
  }

  spreadEl.addEventListener("click", (e) => {
    if (spread === 0) return showSpread(1);
    const rect = spreadEl.getBoundingClientRect();
    const onLeft = e.clientX < rect.left + rect.width / 2;
    if (onLeft) showSpread(spread - 1);
    else showSpread(spread === spreads.length - 1 ? 0 : spread + 1);
  });

  return {
    show() {
      if (loaded) return;
      loaded = true;
      caption.textContent = title;
      showSpread(0);
      pages.forEach((src) => {
        new Image().src = src; // preload so page turns are instant
      });
    },
  };
}
