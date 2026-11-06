# LifeDash — Focus Dashboard

> CodingCamp Assignment · Batch November 26 · M. Aynur Rofiqi

A complete, responsive personal productivity dashboard built with pure HTML, CSS, and Vanilla JavaScript. No frameworks. No backend. All data lives in the browser.

---

## Live Demo

Deploy via GitHub Pages — see deployment instructions below.

---

## Features

### Core (MVP)
| Feature | Details |
|---|---|
| **Greeting** | Live clock, current date in header, time-based greeting (Morning / Afternoon / Evening / Night) |
| **Focus Timer** | SVG progress ring, Start / Pause / Reset, configurable duration, Web Audio ringtone on completion |
| **To-Do List** | Add, inline-edit, mark done, delete, filter (All / Active / Done), clear completed |
| **Quick Links** | Add labelled URL chips with auto-favicon, open in new tab, delete, persisted in localStorage |

### Challenges (3 implemented)
| # | Challenge | Implementation |
|---|---|---|
| 1 | **Custom Name in Greeting** | Name input in greeting section, saved to localStorage, shown in every greeting |
| 2 | **Prevent Duplicate Tasks** | Case-insensitive duplicate check on both add and edit |
| 3 | **Sort Tasks** | Dropdown: Order Added / A→Z / Z→A / Done Last |

### Bonus
- Light / Dark mode toggle (persisted in localStorage)
- Daily Progress circular ring (completed / total / left)
- Web Audio API ringtone — no external audio files needed
- Purple flash overlay effect when timer completes
- Responsive — desktop 2-column, tablet, mobile single-column

---

## Tech Stack

- **HTML5** — semantic markup, ARIA attributes
- **CSS3** — custom properties, glassmorphism, CSS Grid, animations
- **Vanilla JavaScript (ES6+)** — no frameworks
- **Web Storage API** — localStorage for all persistence
- **Web Audio API** — synthesised ringtone

---

## Folder Structure

```
CodingCamp--2November26-M.AynurRofiqi/
├── index.html          ← App entry point
├── css/
│   └── style.css       ← All styles (dark + light themes)
├── js/
│   └── script.js       ← All functionality
└── README.md
```

---

## Run Locally

1. Clone or download the repository.
2. Open `index.html` in any modern browser (Chrome, Firefox, Edge, Safari).
3. No build step, no server required.

---

## Deploy to GitHub Pages

1. Push the repository to GitHub.
2. Go to **Settings → Pages**.
3. Source: **Deploy from a branch** → `main` → `/ (root)`.
4. Click **Save**.
5. Your dashboard will be live at:
   `https://<username>.github.io/<repository-name>/`

---

## Local Storage Keys

| Key | Value |
|---|---|
| `tasks` | Array of task objects |
| `taskSort` | Active sort preference |
| `userName` | Custom greeting name |
| `quickLinks` | Array of link objects |
| `timerDuration` | Timer duration in minutes |
| `theme` | `"dark"` or `"light"` |

---

## Browser Compatibility

Chrome ✓ · Firefox ✓ · Edge ✓ · Safari ✓
