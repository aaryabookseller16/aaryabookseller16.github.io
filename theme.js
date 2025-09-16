/**
 * theme.js — site-wide theme + accent manager (dual CSS themes)
 *
 * Expects (after style.css):
 *   <link id="lightCSS" rel="stylesheet" href="theme-light.css">
 *   <link id="darkCSS"  rel="stylesheet" href="theme-dark.css" disabled>
 *
 * Features
 *  - Persists theme ("theme": "light" | "dark")
 *  - Falls back to OS when unset; reacts to OS only if no explicit choice
 *  - URL override: ?theme=light|dark (applies for current load and persists)
 *  - Syncs any #themeToggle buttons (ARIA/title only; your SVGs are CSS-driven)
 *  - Accent persistence via [data-accent] swatches; sets --accent & --accent-contrast
 *  - Cross-tab sync; emits `themechange` and `accentchange`
 */

(function () {
  "use strict";

  /* ---------- constants & handles ---------- */
  const THEME_KEY  = "theme";
  const ACCENT_KEY = "accent";
  const root  = document.documentElement;
  const media = window.matchMedia("(prefers-color-scheme: dark)");

  // Optional theme stylesheet links (OK if missing on some pages)
  const lightCSS = document.getElementById("lightCSS");
  const darkCSS  = document.getElementById("darkCSS");

  /* ---------- safe storage ---------- */
  const ls = {
    get(k){ try { return localStorage.getItem(k); } catch { return null; } },
    set(k,v){ try { localStorage.setItem(k,v); } catch {} },
    del(k){ try { localStorage.removeItem(k); } catch {} },
  };

  /* ---------- hex helpers (accent) ---------- */
  const HEX6 = /^#([0-9a-f]{6})$/i;
  const HEX3 = /^#([0-9a-f]{3})$/i;

  function normalizeHex(v){
    if (!v) return null;
    if (HEX6.test(v)) return v.toLowerCase();
    if (HEX3.test(v)) {
      const [, g] = v.match(HEX3);
      return ("#" + g.split("").map(ch => ch+ch).join("")).toLowerCase();
    }
    return null;
  }
  function yiqContrast(hex6){
    const c = hex6.slice(1);
    const r = parseInt(c.slice(0,2),16);
    const g = parseInt(c.slice(2,4),16);
    const b = parseInt(c.slice(4,6),16);
    // simple luminance heuristic
    return ((r*299 + g*587 + b*114) / 1000) >= 160 ? "#000" : "#fff";
  }

  /* ---------- theme detection & application ---------- */
  function urlTheme(){
    const t = new URLSearchParams(location.search).get("theme");
    return (t === "light" || t === "dark") ? t : null;
  }
  function storedTheme(){
    const t = ls.get(THEME_KEY);
    return (t === "light" || t === "dark") ? t : null;
  }
  function detectTheme(){
    return urlTheme() || storedTheme() || (media.matches ? "dark" : "light");
  }
  function hasExplicitTheme(){
    return !!storedTheme();
  }

  function enableThemeStyles(effective){
    // If the page includes the dual theme files, ensure exactly one is active.
    if (lightCSS) lightCSS.disabled = (effective !== "light");
    if (darkCSS)  darkCSS.disabled  = (effective !== "dark");
    // Hint UA for form controls/scrollbars
    root.style.colorScheme = effective;
  }

  function syncToggles(theme){
    const isDark = (theme === "dark");
    document.querySelectorAll("#themeToggle").forEach(btn => {
      btn.setAttribute("aria-pressed", String(isDark));
      btn.title = isDark ? "Switch to light mode" : "Switch to dark mode";
      // If a page uses text instead of SVG, provide a glyph fallback:
      if (!btn.querySelector("svg")) btn.textContent = isDark ? "☀️" : "🌙";
    });
  }

  function applyTheme(next, persist){
    const theme = (next === "dark") ? "dark" : "light";

    // 1) DOM state
    root.setAttribute("data-theme", theme);

    // 2) CSS files
    enableThemeStyles(theme);

    // 3) persist if asked
    if (persist) ls.set(THEME_KEY, theme);

    // 4) button/state sync
    syncToggles(theme);

    // 5) notify listeners
    try { window.dispatchEvent(new CustomEvent("themechange", { detail: { theme } })); } catch {}
  }

  function toggleTheme(){
    const cur = root.getAttribute("data-theme") || detectTheme();
    applyTheme(cur === "dark" ? "light" : "dark", true);
  }

  /* ---------- accent application ---------- */
  function syncAccentUI(currentHex){
    const target = (currentHex || "").toLowerCase();
    document.querySelectorAll(".accent-swatch").forEach(btn => {
      const val = normalizeHex(btn.getAttribute("data-accent") || "");
      btn.style.outline = (val && val.toLowerCase() === target) ? "2px solid var(--accent)" : "none";
      btn.style.outlineOffset = (val && val.toLowerCase() === target) ? "2px" : "";
    });
  }

  function applyAccent(hex, persist){
    const norm = normalizeHex(hex);
    if (!norm) return;
    root.style.setProperty("--accent", norm);
    root.style.setProperty("--accent-contrast", yiqContrast(norm));
    if (persist) ls.set(ACCENT_KEY, norm);
    syncAccentUI(norm);
    try { window.dispatchEvent(new CustomEvent("accentchange", { detail: { accent: norm } })); } catch {}
  }

  /* ---------- init ---------- */
  (function init(){
    const fromUrl = urlTheme();
    if (fromUrl) {
      applyTheme(fromUrl, true); // honor & persist URL override
    } else {
      applyTheme(detectTheme(), false); // follow stored/OS without overwriting
    }

    const savedAccent = ls.get(ACCENT_KEY);
    if (savedAccent) applyAccent(savedAccent, false);
  })();

  /* ---------- events ---------- */
  // OS theme changes: only reflect if user didn't explicitly choose
  media.addEventListener?.("change", e => {
    if (!hasExplicitTheme()) applyTheme(e.matches ? "dark" : "light", false);
  });

  // Click delegation: theme toggle + accent UI
  window.addEventListener("click", (e) => {
    const themeBtn = e.target.closest?.("#themeToggle");
    if (themeBtn) { toggleTheme(); return; }

    const picker = document.getElementById("accentPicker");
    if (!picker) return;

    const toggle = e.target.closest?.("#accentToggle");
    const swatch = e.target.closest?.(".accent-swatch");

    if (toggle) {
      const open = picker.getAttribute("aria-expanded") === "true";
      picker.setAttribute("aria-expanded", String(!open));
      return;
    }
    if (swatch) {
      const hex = swatch.getAttribute("data-accent");
      if (hex) applyAccent(hex, true);
      picker.setAttribute("aria-expanded", "false");
      return;
    }

    // click-away close
    const menu = document.getElementById("accentMenu");
    if (menu && !picker.contains(e.target)) picker.setAttribute("aria-expanded", "false");
  }, { passive: true });

  // Cross-tab sync
  window.addEventListener("storage", (e) => {
    if (e.key === THEME_KEY && (e.newValue === "light" || e.newValue === "dark")) {
      applyTheme(e.newValue, false);
    }
    if (e.key === ACCENT_KEY && e.newValue) {
      applyAccent(e.newValue, false);
    }
  });

  /* ---------- public API ---------- */
  window.Theme = {
    get: () => root.getAttribute("data-theme"),
    set: (t) => applyTheme(t === "dark" ? "dark" : "light", true),
    toggle: toggleTheme,
    clearPreference: () => { ls.del(THEME_KEY); applyTheme(media.matches ? "dark" : "light", false); },

    getAccent: () => getComputedStyle(root).getPropertyValue("--accent").trim(),
    setAccent: (hex) => applyAccent(hex, true),
    clearAccent: () => { ls.del(ACCENT_KEY); applyAccent("#4b72ff", false); }
  };
})();