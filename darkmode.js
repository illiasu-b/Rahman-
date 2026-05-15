// darkmode.js
// - Injects the toggle button automatically
// - Remembers user's preference in localStorage
// - Works on every page that loads this script

(function () {
  const STORAGE_KEY = "rahma_dark_mode";

  // ── Create the toggle button ──────────────────────────────────────────
  const btn = document.createElement("button");
  btn.id = "darkModeToggle";
  btn.setAttribute("aria-label", "Toggle dark mode");
  btn.setAttribute("title", "Toggle dark mode");
  document.body.appendChild(btn);

  // ── Apply or remove dark mode ─────────────────────────────────────────
  function applyDarkMode(isDark) {
    if (isDark) {
      document.body.classList.add("dark-mode");
      btn.innerHTML = "☀️"; // show sun = "switch to light"
      btn.setAttribute("aria-label", "Switch to light mode");
    } else {
      document.body.classList.remove("dark-mode");
      btn.innerHTML = "🌙"; // show moon = "switch to dark"
      btn.setAttribute("aria-label", "Switch to dark mode");
    }
  }

  // ── Load saved preference ─────────────────────────────────────────────
  // Falls back to system preference if user hasn't chosen yet
  function getSavedPreference() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) return saved === "true";
    // Use OS/browser preference as default
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  }

  // ── Init ──────────────────────────────────────────────────────────────
  let isDark = getSavedPreference();
  applyDarkMode(isDark);

  // ── Toggle on click ───────────────────────────────────────────────────
  btn.addEventListener("click", () => {
    isDark = !isDark;
    applyDarkMode(isDark);
    localStorage.setItem(STORAGE_KEY, isDark);
  });

  // ── Sync across tabs ──────────────────────────────────────────────────
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY) {
      isDark = e.newValue === "true";
      applyDarkMode(isDark);
    }
  });
})();