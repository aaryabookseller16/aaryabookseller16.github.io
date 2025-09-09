# Aarya Portfolio (HTML/CSS/JS)


Simple static site with a clean dark/light theme, responsive layout, and shared nav.


## Quick Start


Open `index.html` in your browser. No build step required.


## Files
- `index.html` – landing page (hero + highlights)
- `portfolio.html` – projects grid
- `genai.html` – GenAI capabilities
- `service.html` – services/offerings
- `qualifications.html` – skills, education, highlights
- `style.css` – main styles (dark/light via `data-theme`)
- `style-alt.css` – optional accent palette
- `script.js` – mobile nav, theme toggle, active-link, year


## Notes
- Put your image at `download.jpeg` or update the path in `index.html`.
- To change theme defaults, edit `:root` and `html[data-theme="light"]` in `style.css`.
- Active nav item auto‑highlights using the current path.