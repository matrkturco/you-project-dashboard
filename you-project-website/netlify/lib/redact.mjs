// The Coach view: what coaches' browsers receive. Anything private (Geronimo numbers, finances, sales, studio
// performance, admins-only to-dos) is removed here on the server, so it never reaches a coach's device at all.
import { gzipSync, gunzipSync } from 'node:zlib';

export function redactForCoach(d) {
  const out = Object.assign({}, d);
  // Geronimo / performance / money
  out.scoreboard = null; out.metrics = null; out.sellByChat = null; out.templates = []; out.emailLogo = null;   // Sell By Chat leads are admins only
  out.salesLog = []; out.salesPrices = null; out.snapshots = []; out.uploads = null;
  // payment issues and prices on people
  out.clients = (d.clients || []).map(c => { if (c.pay == null) return c; const x = Object.assign({}, c); delete x.pay; return x; });
  const noAmt = x => { if (!x || x.amt === undefined) return x; const y = Object.assign({}, x); delete y.amt; return y; };
  out.movers = (d.movers || []).map(noAmt);
  if (d.changes) { out.changes = {}; Object.keys(d.changes).forEach(k => { out.changes[k] = (d.changes[k] || []).map(noAmt); }); }
  out.renewals = (d.renewals || []).map(noAmt);
  // admins-only to-dos
  out.tasks = (d.tasks || []).filter(t => !t.adm);
  out.coachView = true;
  return out;
}

let cache = { at: -1, gz: null };
/** The compressed coach copy of a snapshot (cached until the snapshot changes). */
export function coachGz(raw) {
  if (cache.at === raw.at && cache.gz) return cache.gz;
  const data = JSON.parse(gunzipSync(Buffer.from(raw.gz)).toString('utf8'));
  const gz = new Uint8Array(gzipSync(Buffer.from(JSON.stringify(redactForCoach(data)))));
  cache = { at: raw.at, gz };
  return gz;
}
