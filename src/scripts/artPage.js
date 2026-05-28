import { createTabFilter } from "./tabFilter.js";

export function createArtPage({ pageEl }) {
  return createTabFilter({ pageEl, tabSel: ".art-tab", itemSel: ".art-item" });
}
