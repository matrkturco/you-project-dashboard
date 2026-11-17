// ============================================================================================
//  STUDIO SETTINGS: the one place to put the studio's name, wording and contact details.
//  Colours live in src/index.css (the :root tokens), the logo in src/components/mark.js,
//  the browser-tab name and icons in index.html and public/. See BRANDING.md.
// ============================================================================================
export const STUDIO = {
  name: 'The You Project',             // full name
  wordmark: ['THE YOU', 'PROJECT'],          // the two lines of the big wordmark on Home (line 2 is outlined)
  short: 'The You Project',            // used in short labels, e.g. "With The You Project since…"
  email: 'info@youprojectco.com.au',     // from the website    // the studio inbox members' emails come from (must match Templates.gs EMAIL_FROM)
  signInHint: 'Sign in with your You Project Google account.',
  ringText: 'THE YOU PROJECT',                  // the word that circles the logo on the Home banner
  projectExample: 'e.g. Summer reformer challenge',  // placeholder text for a Team project
  // Geronimo Results page (only shows when the Metrics sheet is connected): the first report date of a 6-week
  // sales cycle, 'yyyy-mm-dd'. Leave '' if the studio isn't on Geronimo's 6-week cycle.
  geronimoCycleStart: '',
  // Sell By Chat pathways: what can happen after someone replies. Keep the letter + " – " at the start:
  // A = content only, B = becomes a warm lead (asks for phone/email), C = sent somewhere else.
  pathways: ['A – Content', 'B – The You Project (warm lead)', 'C – Other service', 'Not sure yet']
};
