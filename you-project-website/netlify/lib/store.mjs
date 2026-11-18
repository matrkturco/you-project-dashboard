// Cached dashboard data, kept in Netlify Blobs so the page opens instantly.
import { getStore } from '@netlify/blobs';
import { gzipSync, gunzipSync } from 'node:zlib';
import { callSheet } from './gas.mjs';

const store = () => getStore({ name: 'studio-dashboard', consistency: 'strong' });
const SNAP = 'snapshot.json.gz', ACCESS = 'access.json', LAST = 'refresh-result.json';

/** What happened on the last refresh (so the Refresh button can stop and say so instead of spinning). */
export const writeRefreshResult = r => store().setJSON(LAST, Object.assign({ at: Date.now() }, r));
export const readRefreshResult = () => store().get(LAST, { type: 'json' }).catch(() => null);

/** Pulls everything fresh from the Google Sheet and saves it. Takes a few seconds. */
export async function refreshSnapshot({ force = false } = {}) {
  const body = await callSheet('data', [], '', { withAccess: true, force });
  const at = Date.now();
  await writeSnapshot(body.result, at);
  await store().setJSON(ACCESS, { at, list: body.access || [] });
  return at;
}

export async function writeSnapshot(data, at) {
  const gz = gzipSync(Buffer.from(JSON.stringify(data)));
  await store().set(SNAP, gz.buffer.slice(gz.byteOffset, gz.byteOffset + gz.byteLength), { metadata: { at: at || Date.now() } });
}

/** The compressed snapshot exactly as stored, plus when it was made. Null if there isn't one yet. */
export async function readSnapshotRaw() {
  const r = await store().getWithMetadata(SNAP, { type: 'arrayBuffer' });
  if (!r || !r.data) return null;
  return { gz: new Uint8Array(r.data), at: Number(r.metadata && r.metadata.at) || 0 };
}

export async function snapshotAge() {
  const m = await store().getMetadata(SNAP);
  return m ? Number(m.metadata && m.metadata.at) || 0 : 0;
}

export async function readSnapshot() {
  const raw = await readSnapshotRaw();
  if (!raw) return null;
  return { data: JSON.parse(gunzipSync(Buffer.from(raw.gz)).toString('utf8')), at: raw.at };
}

/** The Access tab (who is an Editor, Viewer or Blocked). Fetched from the Sheet if not cached yet. */
export async function readAccess() {
  const cached = await store().get(ACCESS, { type: 'json' });
  if (cached && cached.list && Date.now() - cached.at < 6 * 3600e3) return cached.list;
  try {
    const body = await callSheet('access');
    await store().setJSON(ACCESS, { at: Date.now(), list: body.result || [] });
    return body.result || [];
  } catch (e) {
    if (cached && cached.list) return cached.list;
    throw e;
  }
}
