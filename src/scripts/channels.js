/**
 * Channels on the art page's TV, in order.
 *
 *   src   a video (or image). Use the small copies in src/assets/videos/tv/ —
 *         full-size exports in src/assets/videos/ are kept out of git.
 *   fit   "cover" fills the screen; "contain" shows the whole piece with
 *         black bars, like an old TV
 *   desc  shown in the channel guide while the channel is on
 *   link  optional { label, href }, shown as [label] under the description
 */
export const CHANNELS = [
  {
    title: "td_flowergrid", // placeholder: filename for now
    year: "",
    src: "./src/assets/videos/tv/td_flowergrid.mp4",
    fit: "contain", // widescreen: black bars top and bottom
    desc: "(description to come)",
  },
  {
    title: "td_mediapipe", // placeholder: filename for now
    year: "",
    src: "./src/assets/videos/tv/td_mediapipe.mp4",
    fit: "cover",
    desc: "(description to come)",
  },
  {
    title: "td_dance", // placeholder: filename for now
    year: "",
    src: "./src/assets/videos/tv/td_dance.mp4",
    fit: "contain", // vertical video: black bars on the sides
    desc: "(description to come)",
  },
  {
    title: "td_metropolis", // placeholder: filename for now
    year: "",
    src: "./src/assets/videos/tv/td_metropolis.mp4",
    fit: "contain", // widescreen: black bars top and bottom
    desc: "(description to come)",
  },
];
