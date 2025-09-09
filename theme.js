// theme.js — site-wide theme + accent manager (updated)
// - Persists theme in localStorage ("theme": "light" | "dark")
// - Uses system preference when unset; reacts to OS changes if no explicit choice
// - Supports URL override: ?theme=light|dark
// - Keeps multiple #themeToggle buttons in sync (aria/title)
// - Accent color switcher with contrast auto-adjust + cross-tab sync

(function () {
  const THEME_KEY   = "theme";
  const ACCENT_KEY  = "accent";
  const root        = document.documentElement;
  const media       = window.matchMedia("(prefers-color-scheme: dark)");

  /* =========================
     Theme helpers
     ========================= */
  function detectTheme() {
    const urlTheme = new URLSearchParams(location.search).get("theme");
    if (urlTheme === "light" || urlTheme === "dark") return urlTheme;
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === "light" || saved === "dark") return saved;
    } catch {}
    return media.matches ? "dark" : "light";
  }

  function applyTheme(next, persist = true) {
    const theme = next === "dark" ? "dark" : "light";
    root.setAttribute("data-theme", theme);
    // Hint to UA for form controls, scrollbars, etc.
    root.style.colorScheme = theme;
    if (persist) { try { localStorage.setItem(THEME_KEY, theme); } catch {} }
    syncThemeToggles(theme);
  }

  function syncThemeToggles(theme) {
    const isDark = theme === "dark";
    document.querySelectorAll("#themeToggle").forEach((btn) => {
      btn.setAttribute("aria-pressed", String(isDark));
      btn.setAttribute("aria-label", "Toggle color theme");
      btn.title = isDark ? "Switch to light mode" : "Switch to dark mode";
    });
  }

  function hasExplicitTheme() {
    try { const v = localStorage.getItem(THEME_KEY); return v === "light" || v === "dark"; }
    catch { return false; }
  }

  function toggleTheme() {
    const current = root.getAttribute("data-theme") || detectTheme();
    applyTheme(current === "dark" ? "light" : "dark", true);
  }

  /* =========================
     Accent helpers
     ========================= */
  function applyAccent(hex, persist = true) {
    if (!hex || !/^#([0-9a-f]{6}|[0-9a-f]{3})$/i.test(hex)) return;
    // Normalize 3-digit hex to 6-digit
    if (hex.length === 4) {
      hex = "#" + [...hex.slice(1)].map(ch => ch + ch).join("");
    }
    root.style.setProperty("--accent", hex);

    // Simple YIQ contrast heuristic (sets --accent-contrast to #000 or #fff)
    try {
      const c = hex.slice(1);
      const r = parseInt(c.slice(0,2),16), g = parseInt(c.slice(2,4),16), b = parseInt(c.slice(4,6),16);
      const yiq = (r*299 + g*587 + b*114) / 1000;
      root.style.setProperty("--accent-contrast", yiq >= 160 ? "#000" : "#fff");
    } catch {}

    if (persist) { try { localStorage.setItem(ACCENT_KEY, hex); } catch {} }
    syncAccentUI(hex);
  }

  function syncAccentUI(hex) {
    // Optional: highlight current swatch (if present)
    document.querySelectorAll(".accent-swatch").forEach(btn => {
      const v = btn.getAttribute("data-accent");
      if (!v) return;
      btn.style.outline = (v.toLowerCase() === hex.toLowerCase()) ? "2px solid var(--accent)" : "none";
      btn.style.outlineOffset = "2px";
    });
  }

  /* =========================
     Init
     ========================= */
  (function init() {
    // Theme from URL or stored/system
    const fromUrl = new URLSearchParams(location.search).get("theme");
    if (fromUrl === "light" || fromUrl === "dark") applyTheme(fromUrl, true);
    else applyTheme(detectTheme(), false);

    // Accent from storage
    try {
      const savedAccent = localStorage.getItem(ACCENT_KEY);
      if (savedAccent) applyAccent(savedAccent, false);
    } catch {}
  })();

  /* =========================
     Event wiring
     ========================= */
  // Reflect OS changes only if user hasn't explicitly chosen
  media.addEventListener?.("change", (e) => {
    if (!hasExplicitTheme()) applyTheme(e.matches ? "dark" : "light", false);
  });

  // Delegate clicks for any #themeToggle button
  window.addEventListener("click", (e) => {
    const btn = e.target.closest?.("#themeToggle");
    if (btn) toggleTheme();

    // Accent picker UI
    const picker = document.getElementById("accentPicker");
    const toggle = e.target.closest?.("#accentToggle");
    const swatch = e.target.closest?.(".accent-swatch");
    if (toggle && picker) {
      const ex = picker.getAttribute("aria-expanded") === "true";
      picker.setAttribute("aria-expanded", String(!ex));
    } else if (swatch) {
      applyAccent(swatch.getAttribute("data-accent"));
      const p = swatch.closest(".accent-picker");
      p?.setAttribute("aria-expanded","false");
    } else {
      // click-away to close
      const m = document.getElementById("accentMenu");
      if (picker && m && !picker.contains(e.target)) picker.setAttribute("aria-expanded","false");
    }
  });

  // Cross-tab sync for both theme and accent
  window.addEventListener("storage", (e) => {
    if (e.key === THEME_KEY && (e.newValue === "light" || e.newValue === "dark")) {
      applyTheme(e.newValue, false);
    }
    if (e.key === ACCENT_KEY && e.newValue) {
      applyAccent(e.newValue, false);
    }
  });

  /* =========================
     Public API
     ========================= */
  window.Theme = {
    // Theme
    get: () => root.getAttribute("data-theme"),
    set: (t) => applyTheme(t, true),
    toggle: toggleTheme,
    clearPreference: () => { try { localStorage.removeItem(THEME_KEY); } catch {} ; applyTheme(detectTheme(), false); },

    // Accent
    getAccent: () => getComputedStyle(root).getPropertyValue("--accent").trim(),
    setAccent: (hex) => applyAccent(hex, true),
    clearAccent: () => { try { localStorage.removeItem(ACCENT_KEY); } catch {} ; applyAccent("#4b72ff", false); }
  };
})();
