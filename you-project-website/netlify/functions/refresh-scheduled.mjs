// Keeps the cached copy fresh once a day, after Hapana's 6am run in Apps Script.
// 21:00 UTC = 8:00am in Melbourne during daylight saving, 7:00am the rest of the year (after Hapana's 6am run).
// Scheduled functions only get 30 seconds, and building the full copy can take longer, so this just hands the job to the
// background refresh (up to 15 minutes), with a key only the server knows. It always asks for a full copy.
import { cronKey } from '../lib/cron.mjs';


export default async () => {
  const base = process.env.URL || process.env.DEPLOY_PRIME_URL;
  const r = await fetch(base + '/api/refresh?daily=1', { method: 'POST', headers: { 'x-studio-cron': cronKey() } }).catch(e => ({ ok: false, status: String(e) }));
  if (!r.ok) console.error('Could not start the daily refresh:', r.status);
};
export const config = { schedule: '0 21 * * *' };
