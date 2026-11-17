// Saves a change (note, tags, contacted, cancelled, reward...) to the Google Sheet as the signed-in person,
// then updates the cached copy so everyone sees it straight away.
import { json, currentUser, sameOrigin } from '../lib/auth.mjs';
import { callSheet } from '../lib/gas.mjs';
import { readSnapshot, writeSnapshot } from '../lib/store.mjs';
import { applyChange } from '../../shared/patch.js';

const EDITOR_ONLY = ['mailingList', 'saveMemberNote', 'saveCancelled', 'saveNotCancelled', 'saveMemberTags', 'saveSuspensionEnd', 'saveIntroStart', 'sbcSave', 'saveTemplate', 'deleteTemplate', 'emailCheck', 'sendMemberEmail', 'classRoster', 'saveReward', 'appendMovements', 'saveSalesValue', 'saveSalesPrices'];
const ANYONE = ['saveSnapshot', 'saveTask', 'tickTask', 'deleteTask', 'takeTask', 'saveEvent', 'deleteEvent'];   // team to-dos: anyone who can sign in
const READ_ONLY = ['mailingList', 'emailCheck', 'sendMemberEmail', 'classRoster'];          // Editors only, and nothing in the cached copy changes

export default async (req, context) => {
  if (req.method !== 'POST' || !sameOrigin(req)) return json({ error: 'Not allowed.' }, 405);
  const user = await currentUser(req);
  if (!user) return json({ error: 'Your session has ended. Please sign in again.' }, 401);
  let body;
  try { body = await req.json(); } catch (e) { return json({ error: 'Bad request.' }, 400); }
  const { action } = body, args = Array.isArray(body.args) ? body.args : [];
  if (![...EDITOR_ONLY, ...ANYONE].includes(action)) return json({ error: 'Unknown action.' }, 400);
  if (EDITOR_ONLY.includes(action) && user.role !== 'Editor') return json({ error: 'Only admins can make this change.' }, 403);
  if (action === 'saveTask' && user.role !== 'Editor' && args[0] && args[0].adm) return json({ error: 'Only admins can make admins-only to-dos.' }, 403);
  try {
    const r = await callSheet(action, args, user.email);
    // A new Member Movement upload changes a lot (suspensions, cancellations, sign-ups): rebuild the cached copy in the background
    if (action === 'appendMovements' && r.result && r.result.added) context.waitUntil(fetch(new URL('/api/refresh', req.url), { method: 'POST', headers: { cookie: req.headers.get('cookie') || '' } }).catch(() => {}));
    if (READ_ONLY.includes(action)) return json({ result: r.result });
    context.waitUntil((async () => {
      const snap = await readSnapshot();
      if (!snap) return;
      applyChange(snap.data, action, args, r.result, user);
      await writeSnapshot(snap.data, snap.at);
    })().catch(e => console.error('Cache update failed:', e.message || e)));
    return json({ result: r.result });
  } catch (e) {
    return json({ error: String(e.message || e) }, 500);
  }
};
export const config = { path: '/api/save' };
