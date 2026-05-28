import { createTabFilter } from "./tabFilter.js";

export function createPlayPage({ pageEl }) {
  return createTabFilter({ pageEl, tabSel: ".play-tab", itemSel: ".play-item" });
}
