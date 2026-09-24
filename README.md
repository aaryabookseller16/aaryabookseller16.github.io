# Aarya Bookseller — Personal Website

A private, handcrafted portfolio site built with vanilla HTML, CSS, and JavaScript. This repository is the source for a personal website and is not intended for distribution or reuse.

---

## Overview

- Static, zero-build setup (open in a browser)
- Responsive layout with accessible navigation
- Light/dark theme support with persistent preferences
- Accent color picker with saved state

---

## Pages

| File | Purpose |
| --- | --- |
| `index.html` | Landing page and overview |
| `portfolio.html` | Project showcase |
| `blog.html` | Blog index (posts from Medium) |
| `service.html` | Volunteering and service |
| `qualifications.html` | Skills, education, and experience |

---

## Key Assets & Styles

| File/Folder | Description |
| --- | --- |
| `css/style.css` | Core site styles |
| `css/theme-light.css` | Light theme tokens |
| `css/theme-dark.css` | Dark theme tokens |
| `js/script.js` | Navigation, tabs, and UI utilities |
| `js/theme.js` | Theme + accent persistence |
| `assets/` | Images, icons, and media |
| `data/posts.json` | Blog posts, the store of record for the blog |
| `scripts/sync_medium.py` | Pulls new Medium posts into `posts.json` and renders them into `blog.html` and the homepage |

---

## Local Preview

No build tools required. Open any page directly in your browser:

```bash
open index.html        # macOS
xdg-open index.html    # Linux
start index.html       # Windows
```

---

## Blog

Posts are written on [Medium](https://medium.com/@aaryacodes). After publishing one:

```bash
python3 scripts/sync_medium.py   # --dry-run to preview, --offline to re-render only
```

It merges new posts into `data/posts.json` (hand edits there are kept) and regenerates the
post list in `blog.html` and the latest three in the homepage "Recent writing" section.
Don't edit the HTML between the `<!-- posts:*:start/end -->` markers by hand.

---

## Customization Notes

- **Content:** Edit the HTML files directly (sections are clearly labeled).
- **Theme colors:** Adjust CSS variables in `css/theme-light.css` and `css/theme-dark.css`.
- **Accent:** Controlled by the `--accent` CSS variable and the picker UI.
- **Media:** Replace files in `assets/` and update the corresponding `<img>` sources.

---

## Status & Usage

This repository is **private and not for distribution**. Please do not copy, reuse, or redistribute the content or assets without permission.

---

## Contact

- LinkedIn: [Aarya Bookseller](https://www.linkedin.com/in/aarya-bookseller-b6a8531b7/)
- Google Scholar: [Profile](https://scholar.google.com/citations?hl=en&user=TGcPvxcAAAAJ&view_op=list_works&sortby=title)
- Email: [aaryab.work@gmail.com](mailto:aaryab.work@gmail.com)
