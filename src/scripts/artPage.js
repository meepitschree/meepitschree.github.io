import { createArtTv } from "./artTv.js";
import { createZineBooklet } from "./zineBooklet.js";
import { CHANNELS } from "./channels.js";

const ZINE_TITLE = "XT's First Camera! (& Zine!)";
const ZINE_PAGES = Array.from(
  { length: 8 },
  (_, i) => `./src/assets/zine_camera/Camera_Zine_${i}.PNG`
);

/**
 * The art page: a TV of video pieces with a channel guide (artTv.js),
 * and the zine below it (zineBooklet.js). Channels live in channels.js.
 * The router calls show() / hide() as the page opens and closes.
 */
export function createArtPage({ pageEl }) {
  const tv = createArtTv({ rootEl: pageEl, channels: CHANNELS });
  const zine = createZineBooklet({ rootEl: pageEl, pages: ZINE_PAGES, title: ZINE_TITLE });

  return {
    show() {
      tv.show();
      zine.show();
    },
    hide() {
      tv.hide();
    },
  };
}
