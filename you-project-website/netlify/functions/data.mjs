// Sends the cached dashboard data (already compressed), so the page opens in about a second.
import { json, currentUser } from '../lib/auth.mjs';
import { readSnapshotRaw, snapshotAge, readRefreshResult } from '../lib/store.mjs';
import { coachGz } from '../lib/redact.mjs';

const STALE = 3 * 60 * 60 * 1000;   // opening the dashboard on a copy older than 3 hours pulls a fresh one in the background (picks up edits made straight in the Sheet)

export default async (req, context) => {
  const user = await currentUser(req);
  if (!user) return json({ error: 'Not signed in.' }, 401);
  const url = new URL(req.url);
  const kickRefresh = () => fetch(new URL('/api/refresh', url), { method: 'POST', headers: { cookie: req.headers.get('cookie') || '' } }).catch(() => {});

  if (url.searchParams.get('meta')) { const [at, last] = await Promise.all([snapshotAge(), readRefreshResult()]); return json({ at, last }); }

  const snap = await readSnapshotRaw();
  if (!snap) {
    context.waitUntil(kickRefresh());
    return json({ building: true }, 202);
  }
  if (Date.now() - snap.at > STALE) context.waitUntil(kickRefresh());
  const body = user.role === 'Editor' ? snap.gz : coachGz(snap);     // coaches get the coach copy (no Geronimo, finances, admins-only to-dos)
  return new Response(body, { status: 200, headers: {
    'Content-Type': 'application/json', 'Content-Encoding': 'gzip', 'Cache-Control': 'no-store',
    'Vary': 'Accept-Encoding', 'X-Snapshot-At': String(snap.at) } });
};
export const config = { path: '/api/data' };
