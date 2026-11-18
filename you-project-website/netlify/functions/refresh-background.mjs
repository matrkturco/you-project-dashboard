// Pulls a fresh copy of everything from the Google Sheet (runs in the background, up to 15 minutes).
// ?manual=1 (the Refresh button) always gets a full copy; automatic refreshes only when something changed (credit saver).
import { currentUser } from '../lib/auth.mjs';
import { refreshSnapshot, writeRefreshResult } from '../lib/store.mjs';
import { cronKey } from '../lib/cron.mjs';

export default async (req) => {
  const params = new URL(req.url).searchParams;
  const daily = params.get('daily') === '1' && req.headers.get('x-studio-cron') === cronKey();   // the 7:30am daily run
  const user = daily ? null : await currentUser(req);
  if (!daily && !user) return;
  const manual = daily || params.get('manual') === '1';
  try {
    await refreshSnapshot({ force: manual });
    if (manual) await writeRefreshResult({ ok: true });
  } catch (e) {
    const msg = String(e.message || e);
    console.error('Refresh failed:', msg);
    if (manual) await writeRefreshResult({ ok: false, error: msg }).catch(() => {});
  }
};
export const config = { path: '/api/refresh', background: true };
