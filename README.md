## Run locally

Any static server works. The simplest:

```bash
# Python 3
python3 -m http.server 8000

# Or with Node
npx serve .
```

Then visit `http://localhost:8000`.

Opening `index.html` directly with `file://` will *not* work because the
JS uses ES module imports — those need to be served over HTTP.

## Project structure

```
.
├── index.html
└── src/
    ├── styles/
    │   └── main.css
    └── scripts/
        ├── main.js              # wires everything together
        ├── asciiBloom.js        # the symmetrical ascii flower renderer
        ├── cursor.js            # cursor position, smoothing, trail history
        ├── trailCanvas.js       # soft blurred halo behind the cursor
        └── morphTypewriter.js   # cycling name with character scramble
```

## Customizing

### Your name(s)

Open `src/scripts/main.js` and edit `NAME_CYCLE`:

```js
const NAME_CYCLE = ["XT", "Christie", "cuboctave", "human", "designer", "a signal"];
```

### Copy

Edit `index.html` — the greeting, subtitle, and footer are all there as
plain text.

### Colors and typography

All design tokens live in `:root` at the top of `src/styles/main.css`:

```css
--bg: #f0ebe0;        /* parchment cream */
--ink: #1c1a14;       /* near-black */
--green: #2d5a27;     /* forest accent */
```

### Bloom tuning

In `src/scripts/asciiBloom.js`:

- `flowerColCenter` / `flowerRowCenter` — where on screen the bloom lives
- `petals = 6` — number of petals
- `halfR = 22` — bloom radius
- `RAMP` — the density ramp (` .:+*o@`); swap to `▒▓█` or any glyph set you like

### Motion sensitivity

In `src/scripts/cursor.js`:

- `TRAIL_LEN = 22` — how long the awakened trail is
- `state.speed * 0.7 + inst * 0.3` — speed smoothing factor

In `asciiBloom.js`:

- `reach` values — how far the cursor reaches into the ASCII field
- `isStill = cursor.speed < 2` — threshold for the still-shimmer to kick in

## Deploying

### GitHub Pages

```bash
git init
git add .
git commit -m "first bloom"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

Then in your repo settings → Pages → Source: `main` / `(root)`.

