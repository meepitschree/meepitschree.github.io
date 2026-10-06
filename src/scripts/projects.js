/**
 * Projects on the play page's computer desktop, in icon order.
 *
 *   file   the icon's filename label (e.g. "game.exe", "site.html")
 *   thumb  the icon image — cut-out / transparent PNGs look best
 *   tag    shown next to the year in the window (e.g. "game", "interactive")
 *   link   { label, href }, shown as [label ↗] in the window
 */
export const PROJECTS = [
  {
    title: "memoriesOS",
    file: "memoriesOS.exe",
    year: 2025,
    tag: "game",
    thumb: "./src/assets/thumb_memoriesOS.PNG",
    desc: "a quickie for the Brackeys Game Jam! A point-and-click deduction game made in Godot, playable in browser. :)",
    link: { label: "play", href: "https://farmtotable.itch.io/memoriesos" },
  },
  {
    title: "floating",
    file: "floating.html",
    year: 2021,
    tag: "interactive",
    thumb: "./src/assets/thumb_floating.png",
    desc: "a lil floating island to admire. Assets 3D modeled and lightly animated in Blender. Did some stylized tree studies. Noodled with three.js.",
    link: { label: "visit", href: "https://xtxu.space/floating/" },
  },
  {
    title: "ShortStacked",
    file: "shortstacked.exe",
    year: 2020,
    tag: "game",
    thumb: "./src/assets/thumb_shortstacked.png",
    desc: "a couch co-op stealth game about 2 kids in a trenchcoat for USC AGP. Wobbly physics. Pitched, directed, did art, built levels, and tbh just had a lot of fun with everyone to wrap up final year. Unreal Engine 4.",
    link: { label: "visit", href: "https://project-trenchcoat.github.io/" },
  },
  {
    title: "Post Hello",
    file: "posthello.exe",
    year: 2019,
    tag: "game",
    thumb: "./src/assets/thumb_posthello.png",
    desc: "a short 3rd person narrative adventure from the eyes of a delivery man seeking fulfillment. It's feelsy. A small team project for USC Games.",
    link: { label: "play", href: "https://stevenharmongames.gamejolt.io/post_hello/" },
  },
];
