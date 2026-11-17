// PREVIEW MODE (VITE_DEMO=1): answers the dashboard's /api calls inside the browser with made-up sample data,
// so the site can be clicked through before Hapana, the Google Sheet and Google sign-in are set up.
// Nothing is sent anywhere and nothing is saved: changes last until the page is reloaded.
import { sampleData } from './sampleData.js';

const DEMO_USER = { email: 'preview@example.com', name: 'Preview', role: 'Editor' };
const reply = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'X-Snapshot-At': String(Date.now()) } });

function fakeSave(action, args) {
  const base = { ok: true, by: DEMO_USER.name, at: Date.now(), on: new Date().toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit' }) };
  if (action === 'emailCheck') return { known: true, optIn: true, from: '', note: 'Preview mode: emails are switched off.' };
  if (action === 'sendMemberEmail') throw new Error('Preview mode: emails are switched off until the studio is connected.');
  if (action === 'sbcSave') {
    const f = args[0] || {};
    return Object.assign(base, { row: Object.assign({ row: Date.now(), dateOpened: new Date().toISOString().slice(0, 10), stage: f.stage || 'Opened', pathway: '', dateReplied: '', detailsDate: '',
      hasPhone: !!f.phone, hasEmail: !!f.email, updated: Date.now(), inWarmLeads: false, notes: '' }, f) });
  }
  return base;
}

export function installDemo() {
  const realFetch = window.fetch.bind(window);
  window.fetch = async (input, opts = {}) => {
    const url = new URL(typeof input === 'string' ? input : input.url, location.href);
    if (url.origin !== location.origin || !url.pathname.startsWith('/api/')) return realFetch(input, opts);
    const path = url.pathname.replace(/^\/api\//, '');
    if (path === 'session' || path === 'login') return reply({ user: DEMO_USER });
    if (path === 'config') return reply({ clientId: '', studio: 'Preview' });
    if (path === 'logout') return reply({ ok: true });
    if (path === 'refresh') return reply({ ok: true }, 202);
    if (path === 'data') return url.searchParams.get('meta') ? reply({ at: Date.now(), last: { ok: true, at: Date.now() } }) : reply(sampleData());
    if (path === 'save') {
      const { action, args } = JSON.parse(opts.body || '{}');
      try { return reply({ result: fakeSave(action, args || []) }); } catch (e) { return reply({ error: e.message }, 400); }
    }
    return reply({ error: 'Not available in preview mode.' }, 404);
  };
}
