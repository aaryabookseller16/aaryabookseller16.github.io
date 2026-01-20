# Aarya Bookseller — Personal Portfolio

A minimalist, zero-dependency personal portfolio built with vanilla JavaScript, HTML5, and CSS3. The site is fully responsive, accessible, and supports persistent theme preferences including dark/light modes and accent color customization.

---

## Key Features

- Responsive, mobile-first design  
- Dark and light theme toggling with persistence  
- Customizable accent colors  
- Accessibility-focused navigation and keyboard support  
- No external dependencies or build tools  

---

## Tech Stack

- HTML5  
- CSS3 (CSS variables)  
- JavaScript (ES6)  
- GitHub Pages for hosting  

---

## Project Structure

| File               | Description                                      |
|--------------------|------------------------------------------------|
| `index.html`       | Landing page with hero section and highlights  |
| `portfolio.html`   | Project grid with filtering                      |
| `genai.html`       | Interactive AI-generated demo                    |
| `service.html`     | Volunteering and community service               |
| `qualifications.html` | Skills, education, and experience              |
| `style.css`        | Core styles including light/dark themes          |
| `style-alt.css`    | Accent color palettes and experimental effects   |
| `script.js`        | Mobile navigation toggle, theme switcher, active link highlighting, dynamic year update |
| `theme.js`         | Advanced theme and accent persistence with cross-tab synchronization |

---

## Local Development

No build tools required. Open `index.html` directly in your browser:

```bash
open index.html        # macOS
xdg-open index.html    # Linux
start index.html       # Windows
```

---

## Customization

- **Profile Image:** Replace `assets/download.jpeg` or update the `<img>` source in `index.html`.  
- **Themes:** Modify color variables in `:root` and `html[data-theme="light"]` within `style.css`.  
- **Accent Colors:** Controlled via the CSS `--accent` variable and accent picker UI.  
- **Navigation:** Current page is auto-highlighted based on the URL path.  

---

## Design Principles

- Performance-first approach with no external frameworks or libraries  
- Accessibility prioritized through semantic HTML and keyboard navigation support  
- Maintainable and modular CSS and JavaScript  
- Responsive design ensuring usability across devices  

---

## Author

Aarya Bookseller  
[LinkedIn](https://www.linkedin.com/in/aarya-bookseller-b6a8531b7/) | [Email](mailto:aaryab.work@gmail.com)