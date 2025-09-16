// script.js — site-wide interactions
// Works with: style.css, theme-light.css (#lightCSS), theme-dark.css (#darkCSS)
//
// Features
// - Theme manager (light/dark/system) with safe persistence
// - Enables exactly one of: theme-light.css / theme-dark.css
// - Accent color persistence via [data-accent] swatches in #accentMenu
// - Mobile nav toggle (hamburger -> .site-nav.open)
// - Emits `themechange` CustomEvent on <html>

(function () {
  "use strict";

  /* ================================
     Small utilities
  ==================================*/
  const html = document.documentElement;

  const storage = {
    get(key) { try { return localStorage.getItem(key); } catch { return null; } },
    set(key, val) { try { localStorage.setItem(key, val); } catch {} },
    remove(key) { try { localStorage.removeItem(key); } catch {} }
  };

  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

  /* ================================
     THEME MANAGER
  ==================================*/
  const THEME_KEY  = 'theme';   // 'light' | 'dark' | 'system'
  const ACCENT_KEY = 'accent';

  const themeBtn = $('#themeToggle');
  const mqlDark  = window.matchMedia('(prefers-color-scheme: dark)');

  // Cache link nodes (must exist in <head> on each page)
  const lightLink = document.getElementById('lightCSS');
  const darkLink  = document.getElementById('darkCSS');

  function effectiveTheme(mode) {
    if (mode === 'system') return mqlDark.matches ? 'dark' : 'light';
    return (mode === 'dark' || mode === 'light') ? mode : (mqlDark.matches ? 'dark' : 'light');
  }

  function syncThemeLinks(effective) {
    // Only flip if both links exist (gracefully no-op otherwise)
    if (lightLink) lightLink.disabled = effective !== 'light';
    if (darkLink)  darkLink.disabled  = effective !== 'dark';
    // Hint UA for built-ins
    html.style.colorScheme = effective;
  }

  function applyTheme(mode, opts = { persist: false }) {
    const eff = effectiveTheme(mode);

    // Authoritative attributes on <html>
    html.setAttribute('data-theme', eff);
    html.setAttribute('data-theme-mode', mode);

    // Enable correct theme CSS file
    syncThemeLinks(eff);

    // Toggle button ARIA state (if present)
    if (themeBtn) {
      const isDark = eff === 'dark';
      themeBtn.setAttribute('aria-pressed', String(isDark));
      themeBtn.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
      themeBtn.setAttribute('data-theme-mode', mode);
      if (!themeBtn.querySelector('svg')) themeBtn.textContent = isDark ? '☀️' : '🌙';
    }

    if (opts.persist) storage.set(THEME_KEY, mode);

    // Broadcast for any listeners
    html.dispatchEvent(new CustomEvent('themechange', { detail: { mode, effective: eff } }));
  }

  // Init theme (respect prior choice; else follow OS)
  const savedMode = storage.get(THEME_KEY);
  const initMode =
    (savedMode === 'light' || savedMode === 'dark' || savedMode === 'system')
      ? savedMode
      : (mqlDark.matches ? 'dark' : 'light');

  applyTheme(initMode, { persist: !!savedMode });

  // Listen to OS changes only in 'system' mode
  mqlDark.addEventListener?.('change', () => {
    const current = storage.get(THEME_KEY) || 'system';
    if (current === 'system') applyTheme('system'); // recompute effective
  });

  // Button: click toggles light/dark; Alt+click (or long-press) → system
  if (themeBtn) {
    themeBtn.addEventListener('click', (e) => {
      const currentMode = storage.get(THEME_KEY) || initMode;
      if (e.altKey) { applyTheme('system', { persist: true }); return; }
      const currentEff = effectiveTheme(currentMode);
      applyTheme(currentEff === 'dark' ? 'light' : 'dark', { persist: true });
    });

    let pressTimer = null;
    themeBtn.addEventListener('touchstart', () => {
      pressTimer = window.setTimeout(() => applyTheme('system', { persist: true }), 600);
    }, { passive: true });
    themeBtn.addEventListener('touchend', () => {
      if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
    });
  }

  /* ================================
     ACCENT COLOR PERSISTENCE
  ==================================*/
  (function setupAccent() {
    const savedAccent = storage.get(ACCENT_KEY);
    if (savedAccent) html.style.setProperty('--accent', savedAccent);

    const menu = $('#accentMenu');
    if (!menu) return;

    menu.addEventListener('click', (e) => {
      const swatch = e.target.closest('[data-accent]');
      if (!swatch) return;
      const color = swatch.getAttribute('data-accent');
      if (!color) return;
      html.style.setProperty('--accent', color);
      storage.set(ACCENT_KEY, color);
      $$('.accent-swatch', menu).forEach(b => b.classList.remove('is-selected'));
      swatch.classList.add('is-selected');
    });
  })();

  /* ================================
     MOBILE NAV TOGGLE
  ==================================*/
  (function setupMobileNav() {
    const navToggle = $('.nav-toggle');
    const siteNav = $('#site-nav');
    if (!navToggle || !siteNav) return;

    navToggle.addEventListener('click', () => {
      const expanded = navToggle.getAttribute('aria-expanded') === 'true';
      navToggle.setAttribute('aria-expanded', String(!expanded));
      siteNav.classList.toggle('open', !expanded);
    });

    siteNav.addEventListener('click', (e) => {
      const a = e.target.closest('a');
      if (!a) return;
      navToggle.setAttribute('aria-expanded', 'false');
      siteNav.classList.remove('open');
    });
  })();

  /* ================================
     OPTIONAL: no-transition wrapper
  ==================================*/
  function withoutTransitions(fn) {
    if (prefersReducedMotion) { fn(); return; }
    html.classList.add('no-transitions');
    try { fn(); } finally {
      requestAnimationFrame(() => html.classList.remove('no-transitions'));
    }
  }
  // Example if you add CSS transitions for theme swap:
  // const _applyTheme = applyTheme;
  // applyTheme = (mode, opts) => withoutTransitions(() => _applyTheme(mode, opts));
})();