// script.js
(function () {
  const html = document.documentElement;
  const btn = document.getElementById('theme-toggle');
  const KEY = 'theme'; // localStorage key: 'light' | 'dark' | 'system'

  // 1) Determine initial theme
  const saved = localStorage.getItem(KEY); // 'light'|'dark'|null
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const initial = saved || (prefersDark ? 'dark' : 'light');
  applyTheme(initial);

  // 2) Toggle on click
  if (btn) {
    btn.addEventListener('click', () => {
      const current = html.getAttribute('data-theme') || 'light';
      const next = current === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      localStorage.setItem(KEY, next);
    });
  }

  // 3) React to system changes ONLY if user never manually chose
  // (Comment out this block if you always want to lock user choice)
  const mql = window.matchMedia('(prefers-color-scheme: dark)');
  mql.addEventListener?.('change', (e) => {
    const hasManual = !!localStorage.getItem(KEY);
    if (!hasManual) {
      applyTheme(e.matches ? 'dark' : 'light');
    }
  });

  function applyTheme(mode) {
    html.setAttribute('data-theme', mode);
    // Update toggle icon + aria
    if (btn) {
      const isDark = mode === 'dark';
      btn.textContent = isDark ? '☀️' : '🌙';
      btn.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
      btn.setAttribute('aria-pressed', String(isDark));
    }
  }

  // Mobile nav toggle (optional; keeps your existing button working)
  const navToggle = document.querySelector('.nav-toggle');
  const siteNav = document.getElementById('site-nav');
  if (navToggle && siteNav) {
    navToggle.addEventListener('click', () => {
      const expanded = navToggle.getAttribute('aria-expanded') === 'true';
      navToggle.setAttribute('aria-expanded', String(!expanded));
      siteNav.classList.toggle('open', !expanded);
    });
  }
})();
