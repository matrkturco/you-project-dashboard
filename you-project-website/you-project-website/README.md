# Studio Dashboard (website)

The website half of the studio dashboard: React + Vite + Tailwind on Netlify, fed by the studio's Google Sheet and
Apps Script (which reads Hapana).

* **Setup:** ../SETUP.md
* **Branding** (name, colours, fonts, logo, icons, email signature): ../BRANDING.md
* Studio settings: `src/studio.js`; colours: `src/index.css`; logo: `src/components/mark.js`.
* Calculations: `src/lib/logic.js`; pages: `src/views/`; server functions: `netlify/functions/`.
* Local check: `npm install`, then `npx vite build`.
