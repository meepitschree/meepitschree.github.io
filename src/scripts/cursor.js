/**
 * Tracks the cursor position, smooths it, measures speed, and keeps
 * a recent history (trail) for the ascii bloom to follow.
 */

const RIPPLE_DURATION = 1.0; // seconds — how long each click ripple lives

export function createCursor({ container }) {
  const state = {
    x: container.offsetWidth * 0.7,
    y: container.offsetHeight * 0.4,
    trail: [],
    ripples: [],
    speed: 0,
  };

  let mx = state.x;
  let my = state.y;
  let lastMoveTime = 0;
  const TRAIL_LEN = 20;
  const ripples = []; // {x, y, t0}

  container.addEventListener("mousemove", (e) => {
    const rect = container.getBoundingClientRect();
    const nx = e.clientX - rect.left;
    const ny = e.clientY - rect.top;
    const dx = nx - mx;
    const dy = ny - my;
    const inst = Math.sqrt(dx * dx + dy * dy);
    state.speed = state.speed * 0.7 + inst * 0.3;
    mx = nx;
    my = ny;
    lastMoveTime = performance.now();
  });

  container.addEventListener("click", () => {
    ripples.push({
      x: state.x,
      y: state.y,
      t0: performance.now() / 1000,
    });
  });

  function update() {
    state.x += (mx - state.x) * 0.16;
    state.y += (my - state.y) * 0.16;

    state.speed *= 0.92;
    if (performance.now() - lastMoveTime > 100) {
      state.speed = Math.max(state.speed - 0.5, 0);
    }

    state.trail.push({ x: mx, y: my });
    while (state.trail.length > TRAIL_LEN) state.trail.shift();

    const now = performance.now() / 1000;
    for (let i = ripples.length - 1; i >= 0; i--) {
      if (now - ripples[i].t0 > RIPPLE_DURATION) ripples.splice(i, 1);
    }
    state.ripples = ripples.map((r) => ({
      x: r.x,
      y: r.y,
      age: (now - r.t0) / RIPPLE_DURATION, // 0 .. 1
    }));
  }

  return { state, update };
}
