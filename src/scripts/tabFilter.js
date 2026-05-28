/**
 * Generic tab filter. Wires up tab buttons to show/hide items by category.
 *
 * @param {object} opts
 * @param {Element} opts.pageEl   — the page section element
 * @param {string}  opts.tabSel   — selector for tab buttons (each needs data-filter)
 * @param {string}  opts.itemSel  — selector for filterable items (each needs data-category)
 */
export function createTabFilter({ pageEl, tabSel, itemSel }) {
  const tabs = pageEl.querySelectorAll(tabSel);
  const items = pageEl.querySelectorAll(itemSel);

  function filter(category) {
    tabs.forEach((t) =>
      t.classList.toggle("is-active", t.dataset.filter === category)
    );
    items.forEach((item) => {
      item.hidden = category !== "all" && item.dataset.category !== category;
    });
  }

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => filter(tab.dataset.filter));
  });

  return { filter };
}
