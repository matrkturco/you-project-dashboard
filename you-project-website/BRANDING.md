# Branding the studio dashboard

Instructions for whoever applies the studio's brand (a person or Claude). Everything brand-related lives in the
files below; **don't change anything else** (the logic in `src/lib/`, `src/views/`, `netlify/`, `shared/` and the
other Apps Script files stays as it is).

Have ready: the studio's name, logo (SVG preferred), brand colours (hex), fonts (Google Fonts names) and the email
signature details (address, website, team names and titles).

## Website (the `website/` folder)

| File | What to change |
|---|---|
| `src/studio.js` | `name`, `wordmark` (two lines for the big Home banner, line 2 is outlined), `short`, `email` (the studio inbox), `signInHint`, `ringText` (the word circling the logo on Home), `projectExample`, `pathways` (Sell By Chat; keep "A – ", "B – ", "C – " at the start), `geronimoCycleStart` (only if on Geronimo's 6-week cycle). |
| `src/index.css` | The colour tokens. **Values are "R G B" with spaces, no commas, no #** (e.g. `#C8DEC4` → `200 222 196`). Two blocks: dark theme (`:root, :root[data-theme='dark']`) and light theme (`:root[data-theme='light']`). Brand colour = `--primary` (and `--mark`, the logo colour); `--onprimary` = text on a primary button; `--accent` = a second highlight; `--bg` / `--surface` / `--raised` = backgrounds, darkest to lightest in dark mode; `--ink` = text. The Home banner is always dark and has its own three: `--hero-bg`, `--hero-ink`, `--brand` (near the top). Keep text readable: at least 4.5:1 contrast for `--ink` and `--muted` on `--bg`. Leave `--red`, `--orange`, `--green`, `--gold`, `--lilac`, `--teal` as status colours unless the brand clashes. |
| `tailwind.config.js` | `fontFamily.display` (headings, wordmark) and `fontFamily.sans` (body). |
| `index.html` | The Google Fonts `<link>` (same families as tailwind.config.js), `<title>`, and `apple-mobile-web-app-title`. |
| `src/components/mark.js` | The logo as **one SVG path**: `MARK_VIEWBOX` (the SVG's viewBox) and `MARK_PATH` (its path data). It's drawn in the theme's `--mark` colour. For a logo with several paths, join their `d` strings with a space; drop fills, strokes and transforms (apply transforms to the coordinates first). A wordmark-only logo can stay as the placeholder ring, or use the brand symbol. |
| `public/favicon.svg` | Browser tab icon (any square SVG). |
| `public/icon-192.png`, `icon-512.png`, `icon-maskable-512.png` (logo inside the middle 60%), `apple-touch-icon.png` (180×180) | Phone home-screen icons. |
| `public/manifest.webmanifest` | `name`, `short_name`, `description`, `background_color`, `theme_color`. |
| `public/email-logo.png` (optional) | A logo for the bottom of emails, about 420×120 px. Then set `EMAIL_LOGO_URL` in Studio.gs to `https://<site>.netlify.app/email-logo.png`. |

Check it builds: `npm install` then `npx vite build` (must end with "built in …"). Then upload to GitHub as in SETUP.md.

## Apps Script (`Studio.gs` only)

| Setting | What it is |
|---|---|
| `STUDIO_TZ` | `Australia/Melbourne` for Victoria. |
| `STUDIO_NAME` | The studio's name (used in emails and the Sheet). |
| `STUDIO_EMAIL` | The inbox emails to members come from. Must match `email` in `src/studio.js`. |
| `DASHBOARD_URL` | The Netlify address. |
| `EMAIL_DARK`, `EMAIL_ACCENT` | Hex colours for email headers and buttons (dark background, light text). |
| `EMAIL_LOGO_URL` | Optional logo image address for the email footer (or leave '' for none). |
| `EMAIL_FOOTER` | The lines under every email signature: `[bold label, text, link]`, e.g. `['A', '12 Smith St, Fitzroy VIC 3065', '']`, `['W', 'www.studio.com.au', 'https://www.studio.com.au']`. |
| `TEAM_SIGNATURES` | One entry per person: `['sig-ange', 'Ange Surname', 'Founder | Coach']`. Added to the Templates tab by setupDashboard. |
| `SBC_PATHWAYS` | Must be the same list as `pathways` in `src/studio.js`. |

After editing Studio.gs: Save → **Deploy → Manage deployments → New version**. Run **setupDashboard** again if you added signatures.

Netlify: set the `STUDIO_NAME` environment variable to the studio's name.
