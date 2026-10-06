import { createPlayDesktop } from "./playDesktop.js";
import { PROJECTS } from "./projects.js";

/**
 * The play page: an ASCII computer whose desktop shows the projects as
 * icons (playDesktop.js). Projects live in projects.js.
 * The router calls show() / hide() as the page opens and closes.
 */
export function createPlayPage({ pageEl }) {
  return createPlayDesktop({ rootEl: pageEl, projects: PROJECTS });
}
