import { createTabFilter } from "./tabFilter.js";

export function createArtPage({ pageEl }) {
  const lightbox  = document.getElementById("lightbox");
  const spread    = document.getElementById("lightbox-spread");
  const pageA     = document.getElementById("lightbox-page-a");
  const pageB     = document.getElementById("lightbox-page-b");
  const closeBtn  = document.getElementById("lightbox-close");
  const counter   = document.getElementById("lightbox-counter");
  const zonePrev  = document.getElementById("lz-prev");
  const zoneNext  = document.getElementById("lz-next");

  let spreads = [];
  let current = 0;

  function buildSpreads(pages) {
    if (!pages.length) return [];
    const result = [[pages[0]]];
    for (let i = 1; i < pages.length - 1; i += 2) {
      result.push([pages[i], pages[i + 1]]);
    }
    if (pages.length > 1) result.push([pages[pages.length - 1]]);
    return result;
  }

  function goTo(i) {
    current = i;
    const s = spreads[i];
    const solo = s.length === 1;

    pageA.src = s[0];
    if (solo) {
      pageB.hidden = true;
      spread.setAttribute("data-solo", "");
    } else {
      pageB.src = s[1];
      pageB.hidden = false;
      spread.removeAttribute("data-solo");
    }

    const isFirst = i === 0;
    const isLast  = i === spreads.length - 1;

    zonePrev.classList.toggle("is-disabled", isFirst);
    zoneNext.classList.toggle("is-disabled", false);

    const label = isFirst ? "cover" : isLast ? "back" : `${i * 2 - 1}–${i * 2}`;
    counter.textContent = isLast ? `${label}  ·  ← to go back` : `${label}`;
  }

  function open(pages) {
    spreads = buildSpreads(pages);
    goTo(0);
    lightbox.classList.add("is-open");
  }

  function close() {
    lightbox.classList.remove("is-open");
    pageA.src = "";
    pageB.src = "";
    spreads = [];
  }

  zonePrev.addEventListener("click", () => {
    if (current > 0) goTo(current - 1);
  });

  zoneNext.addEventListener("click", () => {
    if (current < spreads.length - 1) goTo(current + 1);
    else close();
  });

  closeBtn.addEventListener("click", close);

  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) close();
  });

  document.addEventListener("keydown", (e) => {
    if (!lightbox.classList.contains("is-open")) return;
    if (e.key === "Escape") close();
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      if (current < spreads.length - 1) goTo(current + 1);
      else close();
    }
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      if (current > 0) goTo(current - 1);
    }
  });

  pageEl.querySelectorAll(".art-item[data-pages]").forEach((item) => {
    item.addEventListener("click", () => open(JSON.parse(item.dataset.pages)));
  });

  return createTabFilter({ pageEl, tabSel: ".art-tab", itemSel: ".art-item" });
}
