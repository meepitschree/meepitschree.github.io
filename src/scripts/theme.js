/**
 * Light/dark theme toggle. Persists choice in localStorage and falls back
 * to the user's OS preference. Dispatches a `themechange` event on window
 * so canvas-based modules can re-sample CSS variables.
 */

const STORAGE_KEY = "theme";

export function createThemeToggle({ button }) {
  const root = document.documentElement;
  const stored = localStorage.getItem(STORAGE_KEY);
  const initial =
    stored ?? (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");

  apply(initial);

  button.addEventListener("click", () => {
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    apply(next);
    localStorage.setItem(STORAGE_KEY, next);
  });

  function apply(theme) {
    root.dataset.theme = theme;
    button.textContent = theme === "dark" ? "Light" : "Dark";
    window.dispatchEvent(new CustomEvent("themechange", { detail: { theme } }));
  }
}
