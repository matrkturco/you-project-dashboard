// All the dashboard calculations, ported from the Apps Script version (Index.html) so the numbers match exactly.
import { TZ, DAY, H, boundsNow, ymd, midnight, fromYmd, dayStart, addDays as shiftDays } from '../../shared/time.js';
export { shiftDays };

export { DAY, H, fromYmd };
export let D = null;
export let byClient = [];
let caches = {};

// ---------- loading ----------
export function setData(d) {
  D = d;
  prep();
  caches = {};
}
/** Call after changing D in place (saves), so cached lists are rebuilt. */
export function invalidate() { caches = {}; }
export function refreshBounds() { if (D) { D.bounds = boundsNow(); caches = {}; } }

function prep() {
  const short = v => String(v || '').replace(/\s*\(\$[^)]*\)\s*$/, '').replace(/\s+/g, ' ').trim();
  D.bounds = boundsNow();
  // Hapana sends Australian numbers as 61XXXXXXXXX: show them the usual way (0421 695 375)
  const ph = v => { const d = String(v || '').replace(/\D/g, ''); return /^61[2-478]\d{8}$/.test(d) ? ('0' + d.slice(2)).replace(/^(04\d{2})(\d{3})(\d{3})$/, '$1 $2 $3').replace(/^(0[2378])(\d{4})(\d{4})$/, '$1 $2 $3') : v; };
  [D.clients, D.movers || [], D.intros || [], D.suspended || []].forEach(arr => arr.forEach(x => { if (x.ph) x.ph = ph(x.ph); }));
  D.members.forEach(m => m.plan = short(m.plan));
  (D.cxMembers || []).forEach(m => m.plan = short(m.plan));
  D.suspScheduled = D.suspScheduled || [];
  D.suspended.concat(D.suspScheduled, ...Object.values(D.changes), D.renewals || [], D.movers || []).forEach(m => m.plan = short(m.plan));
  D.firstClass = D.classes.reduce((a, c) => Math.min(a, c.t), Infinity);
  byClient = D.clients.map(() => []);
  D.classes.sort((a, b) => b.t - a.t).forEach((c, i) => c.p.forEach(ci => byClient[ci] && byClient[ci].push(i)));
  D.notes = D.notes || {};
  D.rewards = D.rewards || [];
  D.snapshots = D.snapshots || [];
}

// ---------- helpers ----------
export const SKIP = ['Excluded', 'Cancelling', 'Check Plan', 'Not Tracked (Comp)', 'New This Week', 'Back From Suspension', 'Duplicate'];
export const fmt = (ms, o) => ms ? new Intl.DateTimeFormat('en-AU', Object.assign({ timeZone: TZ }, o)).format(new Date(ms)) : '';
export const dDate = ms => fmt(ms, { weekday: 'short', day: 'numeric', month: 'short' });
export const dTime = ms => fmt(ms, { hour: 'numeric', minute: '2-digit' });
export const dKey = ms => fmt(ms, { year: 'numeric', month: '2-digit', day: '2-digit' });
export const toInput = ms => ms ? dKey(ms).split('/').reverse().join('-') : '';
export const lc = s => String(s || '').trim().toLowerCase();
const IRR = { class: 'classes', person: 'people' };
export const plural = (n, w) => n + ' ' + (n === 1 ? w : (IRR[w] || w + 's'));
export const shortPlan = p => String(p || '').replace(/\s*\(\$[^)]*\)\s*$/, '').replace(/\s*\(Limited Spots!?\)/i, '');

export const B = () => D.bounds;
export function classesIn(a, b) { return D.classes.filter(c => c.t >= a && c.t < b); }
export function countFor(ci, a, b) { if (ci < 0 || !byClient[ci]) return 0; return byClient[ci].filter(i => D.classes[i].t >= a && D.classes[i].t < b).length; }
export function isSuspended(m) { return (D.suspended || []).some(x => (m.e && x.e === lc(m.e)) || lc(x.n) === lc(m.n)); }
export function tracked(m) { return SKIP.indexOf(m.status) === -1 && !isSuspended(m) && !recentlyBack(m); }
/** Grace period after a pause ends: not flagged as a risk while they settle back in. */
export const BACK_GRACE_DAYS = 21;
/** When someone came back from a pause/suspension: from the Member Movement export, or a date an Editor typed in. Null if unknown or still paused. */
export function returnOf(e, n) {
  if (!D || isSuspended({ e, n })) return null;
  const note = e ? (D.notes[lc(e)] || {}).suspensionEnds : null;
  const mv = (D.backFromBreak || []).find(x => same(x, e, n));
  const t = Math.max(note && note <= B().now ? note : 0, mv ? mv.d : 0);
  return t || null;
}
export function recentlyBack(m) { const t = returnOf(m.e, m.n); return !!t && B().now - t < BACK_GRACE_DAYS * DAY; }
/** A pause booked for later (still a member until then), or null. */
/** The current suspension record (start date, expected return), or null. */
export function suspensionOf(e, n) { return (D.suspended || []).find(x => same(x, e, n)) || null; }
export function pausingOf(e, n) { return (D.suspScheduled || []).find(x => same(x, e, n)) || null; }
export function memberOf(ci) { return D.members.find(m => m.ci === ci); }
export function noteFor(e) { return D.notes[lc(e)] || {}; }
export const same = (x, e, n) => (e && x.e && x.e === lc(e)) || lc(x.n) === lc(n);
export function findClient(e, n) { let i = e ? D.clients.findIndex(c => c.e === lc(e)) : -1; if (i < 0 && n) i = D.clients.findIndex(c => lc(c.n) === lc(n)); return i; }
export function ago(ms) { if (!ms) return 'No visits yet'; const d = Math.floor((B().today - ms) / DAY) + 1; return d <= 0 ? 'Today' : d === 1 ? 'Yesterday' : d < 14 ? d + ' days ago' : dDate(ms); }
export function daysSince(ms) { return ms ? Math.floor((B().today - ms) / DAY) : null; }
export const isEditor = () => D && D.user && D.user.role === 'Editor';
export const alertsOn = () => ['yes', 'on', 'true'].indexOf(lc(D.theme && (D.theme['Show milestone alerts'] || D.theme['Milestone alerts']))) > -1;
export function tenure(a, b) {
  if (!a || !b || b < a) return '';
  const mo = Math.floor((b - a) / (30.44 * DAY)), y = Math.floor(mo / 12), m = mo % 12;
  if (mo < 1) return Math.max(1, Math.round((b - a) / DAY)) + ' days';
  return [y ? plural(y, 'year') : '', m ? plural(m, 'month') : ''].filter(Boolean).join(' ');
}
const memo = (key, fn) => (caches[key] !== undefined ? caches[key] : (caches[key] = fn()));

// ---------- Red / Orange flags ----------
export function redList() {
  return memo('red', () => D.members.filter(tracked).map(m => {
    const att = countFor(m.ci, B().lastMonday, B().monday);
    return Object.assign({}, m, { att, level: att >= m.x ? null : (att === 0 ? 'missed' : 'under') });
  }).filter(m => m.level));
}
export function orangeList() {
  return memo('orange', () => D.members.filter(tracked).map(m => {
    const att = countFor(m.ci, B().monday, B().now), bk = countFor(m.ci, B().now, B().nextMonday);
    return Object.assign({}, m, { att, bk, level: att + bk >= m.x ? null : (att + bk === 0 ? 'nothing' : 'short') });
  }).filter(m => m.level));
}
export const RANGES = [['last7', 'Last 7 days'], ['week', 'Week to date'], ['lastweek', 'Last calendar week'], ['month', 'Month to date'], ['lastmonth', 'Last month']];
export function rangeBounds(r) {
  const b = B();
  return ({ last7: [b.last7, b.now, 'Last 7 days'], week: [b.monday, b.now, 'Week to date'], lastweek: [b.lastMonday, b.monday, 'Last calendar week'],
    month: [b.monthStart, b.now, 'Month to date'], lastmonth: [b.lastMonthStart, b.monthStart, 'Last month'] })[r] || [b.monday, b.now, 'Week to date'];
}
export function fringe(a, b) {
  const out = [];
  D.clients.forEach((c, ci) => { if (c.mem) return; const n = countFor(ci, a, b); if (n) out.push({ ci, c, n }); });
  return out.sort((x, y) => y.n - x.n);
}
export function followUpNow() {
  return memo('fu', () => {
    const ids = new Set(), out = [];
    orangeList().filter(m => m.level === 'nothing').concat(redList().filter(m => m.level === 'missed'))
      .forEach(m => { if (!ids.has(m.n)) { ids.add(m.n); out.push(m); } });
    return out;
  });
}
export function shortOfPlan() { const f = new Set(followUpNow().map(m => m.n)); return orangeList().filter(m => m.level === 'short' && !f.has(m.n)); }
export function statusOf(m) {
  if (isSuspended(m)) return ['lilac', 'Suspended'];
  if (recentlyBack(m)) return ['green', 'Back from a break'];
  if (!tracked(m)) return ['grey', m.status];
  const o = orangeList().find(x => x.n === m.n), r = redList().find(x => x.n === m.n);
  if ((o && o.level === 'nothing') || (r && r.level === 'missed')) return ['red', 'Follow up'];
  if (o && o.level === 'short') return ['orange', 'Short of plan'];
  return ['green', 'On track'];
}

// ---------- trend chart ----------
export const METRICS = [['visits', 'Visits'], ['people', 'People'], ['fill', 'Fill rate'], ['members', 'Active members'], ['risk', 'Follow up now']];
function dayMap() {
  return memo('days', () => { const m = {}; D.classes.forEach(c => { if (c.t >= B().now) return; const k = dKey(c.t); (m[k] = m[k] || []).push(c); }); return m; });
}
export function series(metric, days, offset) {
  const b = B(), dm = dayMap(), snap = {}; D.snapshots.forEach(s => snap[s.d] = s);
  const pts = [];
  for (let i = days - 1 + (offset || 0); i >= (offset || 0); i--) {
    const t = b.today - i * DAY + 12 * H, k = dKey(t), l = (dm[k] || []).slice().sort((x, y) => x.t - y.t); let v = null;
    const sk = k.split('/').reverse().join('-');
    const noData = t < D.firstClass - 12 * H;
    if (noData && metric !== 'members' && metric !== 'risk') v = null;
    else if (metric === 'visits') v = l.reduce((s, c) => s + c.b, 0);
    else if (metric === 'people') { const set = new Set(); l.forEach(c => c.p.forEach(ci => set.add(ci))); v = set.size; }
    else if (metric === 'fill') { const cap = l.reduce((s, c) => s + c.c, 0); v = cap ? Math.round(l.reduce((s, c) => s + c.b, 0) / cap * 100) : null; }
    else if (metric === 'members') v = snap[sk] ? snap[sk].active : null;
    else if (metric === 'risk') v = snap[sk] ? snap[sk].fu : null;
    pts.push({ t, k, v, l });
  }
  const smooth = metric === 'visits' || metric === 'people' || metric === 'fill';
  // Days with no classes at all (Sundays, public holidays) are days the studio is closed, so they're left off the chart
  const open = smooth ? pts.filter(p => p.l.length || p.t < D.firstClass - 12 * H) : pts;
  open.forEach(p => { const w = open.filter(x => x.t > p.t - 7 * DAY && x.t <= p.t).map(x => x.v).filter(v => v !== null);
    p.avg = smooth && w.length ? w.reduce((a, c) => a + c, 0) / w.length : null; });
  return open;
}
export function trendSummary(metric, days, pts) {
  const b = B(), prevOk = D.firstClass <= b.today - (2 * days - 1) * DAY;
  const pct = (a, c) => { if (!c) return ''; const d = Math.round((a - c) / c * 100); return d === 0 ? 'about the same as the previous ' + days + ' days' : (d > 0 ? 'up ' : 'down ') + Math.abs(d) + '% on the previous ' + days + ' days'; };
  if (metric === 'visits' || metric === 'people') {
    const sum = p => metric === 'visits' ? p.reduce((s, x) => s + (x.v || 0), 0) : (() => { const set = new Set(); p.forEach(x => x.l.forEach(c => c.p.forEach(ci => set.add(ci)))); return set.size; })();
    const now = sum(pts), prev = prevOk ? sum(series(metric, days, days)) : null;
    return `${now} ${metric === 'visits' ? 'visits' : 'different people'} in the last ${days} days` + (prev !== null ? ` (${pct(now, prev)})` : '') + '.';
  }
  if (metric === 'fill') {
    const f = p => { let v = 0, c = 0; p.forEach(x => x.l.forEach(cl => { v += cl.b; c += cl.c; })); return c ? Math.round(v / c * 100) : null; };
    const now = f(pts), prev = prevOk ? f(series(metric, days, days)) : null;
    return now !== null ? `Classes were ${now}% full on average` + (prev !== null ? ` (${prev}% in the previous ${days} days)` : '') + '.' : '';
  }
  const have = pts.filter(p => p.v !== null);
  return have.length ? `${have[have.length - 1].v} today` + (have.length > 1 ? `, ${have[0].v} on ${dDate(have[0].t)}` : '') + '.' : '';
}
/** Hapana's "Active Packages": clients holding any current package (Clients tab). */
export function activePackages() { return D.clients.filter(c => c.pkgs).length; }
export function todaySnapshotCounts() {
  const key = ymd(Date.now());
  if (!D.snapshots || D.snapshots.some(s => s.d === key)) return null;
  return { active: D.members.filter(m => m.status !== 'Cancelling').length, fu: followUpNow().length, short: shortOfPlan().length, susp: D.suspended.length, packs: activePackages() };
}

// ---------- packages, cancellations, Fringe List ----------
export const FRINGE_DAYS = 30, FRINGE_MAX = 3;
/** How long an intro offer runs: from the package name (e.g. "28 Day Challenge"), else Hapana's length. */
export const introDays = x => { const m = String(x.plan || '').match(/(\d+)\s*-?\s*day/i); return m ? Number(m[1]) : (x.len || 28); };
/** When someone actually started their intro: a date set on the dashboard wins, otherwise their first class on/after
 *  buying it. { s: ms or null (not started yet), src: 'set' | 'class' | null }. x.d stays the purchase date. */
export function introStart(x) {
  return memo('istart|' + (x.e || x.n) + '|' + x.d, () => {
    const n = x.e ? D.notes[lc(x.e)] : null;
    const newest = x.e ? Math.max(...(D.intros || []).filter(y => y.e === x.e).map(y => y.d)) : x.d;   // a set date belongs to their latest intro
    if (n && n.introStart && x.d === newest && n.introStart >= x.d - DAY) return { s: n.introStart, src: 'set' };
    const ci = findClient(x.e, x.n);
    if (ci < 0 || !byClient[ci]) return { s: null, src: null };
    let first = null;
    byClient[ci].forEach(i => { const t = D.classes[i].t; if (t >= x.d - DAY && (first === null || t < first)) first = t; });
    return first ? { s: dayStart(first), src: 'class' } : { s: null, src: null };
  });
}
/** When the intro ends: start + its length (from the purchase date until they've started). */
export const introEnd = x => (introStart(x).s || x.d) + introDays(x) * DAY;
/** The most recent intro offer for someone (last 4 months), converted or not. */
export const latestIntro = (e, n) => (D.intros || []).filter(x => same(x, e, n) && x.d >= B().today - 120 * DAY).sort((a, c) => c.d - a.d)[0] || null;
export function activeIntro(e, n) {
  return (D.intros || []).filter(x => same(x, e, n) && !x.convOn && introEnd(x) >= B().today).sort((a, c) => c.d - a.d)[0] || null;
}
/** A Hapana cancellation an Editor said wasn't really one (changed membership type, wrong purchase, now staff). Only covers
 *  cancellations up to the day it was marked, so a genuine cancellation later on still counts. Returns the note, or null. */
export function notCxOf(x) {
  const n = x && x.e ? D.notes[lc(x.e)] : null;
  // covers the cancellation that was dismissed, even when Hapana dates it in the future (a cancellation booked ahead).
  // Marks saved before that date was stored fall back to 90 days after marking.
  const upTo = n && n.ncReason ? Math.max(n.ncOn || 0, n.ncUpTo || ((n.ncOn || 0) + 90 * DAY)) : 0;
  return n && n.ncReason && x.d && x.d <= upTo + 2 * DAY ? n : null;
}
/** Cancelled members, leaving out the ones marked as not really cancelled. */
export const cancelledList = () => (D.cancelled || []).filter(x => !notCxOf(x));
export const notCancelledList = () => (D.cancelled || []).concat((D.changes && D.changes.Cancelled) || []).filter(x => notCxOf(x))
  .filter((x, i, a) => a.findIndex(y => y.e === x.e) === i);
export const cancelledRecent = () => ((D.changes && D.changes.Cancelled) || []).filter(x => !notCxOf(x));
/** A Hapana cancellation for this person (Cancelled tab or this week's Member Movement), whether or not it's been marked. */
export function hapanaCxOf(e, n) {
  return (D.cancelled || []).find(x => same(x, e, n) && !/^Marked/.test(x.src || '')) || ((D.changes && D.changes.Cancelled) || []).find(x => same(x, e, n)) || null;
}
export function cxOf(e, n) { return cancelledList().find(x => same(x, e, n)) || null; }
export function pkgInfo(e, n) {
  const cx = cxOf(e, n); if (cx) return { type: 'Cancelled', detail: `${cx.plan ? shortPlan(cx.plan) + ' · ' : ''}cancelled ${dDate(cx.d)}` };
  const sp = D.suspended.find(x => same(x, e, n)); if (sp) return { type: 'Suspended', detail: sp.plan };
  const m = D.members.find(x => same(x, e, n));
  if (m) return m.status === 'Cancelling' ? { type: 'Cancelling', detail: m.plan } : { type: 'Membership', detail: m.plan };
  const it = activeIntro(e, n);
  if (it) return { type: 'Intro offer', detail: `${shortPlan(it.plan)} · ${introStart(it).s ? 'ends ' + dDate(introEnd(it)) : 'bought ' + dDate(it.d) + ', not started yet'}` };
  const pk = (D.packs || []).filter(x => same(x, e, n)).sort((a, c) => c.d - a.d)[0];
  if (pk) return { type: 'Pack / casual', detail: `${pk.plan}${pk.exp ? ' · expires ' + dDate(pk.exp) : ' · bought ' + dDate(pk.d)}` };
  const mv = (D.movers || []).find(x => same(x, e, n) && /^(new|renewal)$/i.test(x.type) && !/membership/i.test(x.kind));
  if (mv) return { type: 'Pack / casual', detail: `${mv.plan} · bought ${dDate(mv.d)}` };
  return { type: 'Package not on file', detail: '' };
}
export function pkgText(ci) { const c = D.clients[ci] || {}; const p = pkgInfo(c.e, c.n); return p.type === 'Membership' ? p.detail : p.detail ? `${p.type}: ${p.detail}` : p.type; }
export function geronimoFringe() {
  return memo('gfringe', () => {
    const b = B(), from = b.today - (FRINGE_DAYS - 1) * DAY, out = [], seen = new Set(), newOnes = [];
    D.members.forEach(m => {
      if (['Excluded', 'Cancelling', 'Duplicate', 'Check Plan'].indexOf(m.status) > -1 || isSuspended(m) || recentlyBack(m)) return;
      seen.add(lc(m.n));
      const visits = countFor(m.ci, from, b.now);
      if (visits > FRINGE_MAX) return;
      const row = { n: m.n, e: m.e, ci: m.ci, m, type: 'Membership', detail: m.plan, visits, last: (D.clients[m.ci] || {}).l };
      if (m.joined && m.joined > from) newOnes.push(row); else out.push(row);
    });
    (D.intros || []).filter(x => !x.convOn && introEnd(x) >= b.today && !seen.has(lc(x.n))).forEach(x => {
      const st = introStart(x).s; if (!st) return;                       // bought but not started yet: not on the Fringe List
      const ci = findClient(x.e, x.n), start = Math.max(from, st), visits = countFor(ci, start, b.now);
      if ((b.now - st) / DAY < 7) return;
      if (visits > FRINGE_MAX) return;
      out.push({ n: x.n, e: x.e, ci, type: 'Intro offer', detail: `${shortPlan(x.plan)} · ends ${dDate(introEnd(x))}`, visits, last: (D.clients[ci] || {}).l });
    });
    out.sort((a, c) => a.visits - c.visits || (a.last || 0) - (c.last || 0));
    return { list: out, newOnes };
  });
}

// ---------- everyone (All members) ----------
export const TYPE_PILL = { 'Membership': 'green', 'Suspended': 'lilac', 'Cancelling': 'red', 'Intro offer': 'orange', 'Pack / casual': 'grey', 'Cancelled': 'red', 'Package not on file': 'grey' };
export const TYPES = ['Membership', 'Intro offer', 'Pack / casual', 'Suspended', 'Cancelling', 'Cancelled', 'Package not on file'];
export function everyone() {
  return memo('everyone', () => {
    const map = {}, byEmail = {}, byName = {};
    const find = (e, n) => (e && byEmail[lc(e)]) || byName[lc(n)] || null;
    const put = (e, n, o) => {
      let k = find(e, n);
      if (!k) { k = e ? lc(e) : 'name:' + lc(n); map[k] = {}; }
      Object.entries(o).forEach(([key, v]) => { if (v !== undefined && v !== null && v !== '') map[k][key] = v; });
      if (map[k].e) byEmail[lc(map[k].e)] = k; byName[lc(map[k].n || n)] = k;
    };
    D.clients.forEach((c, ci) => put(c.e, c.n, { n: c.n, e: c.e, ph: c.ph, ci, type: 'Non-member' }));
    D.members.forEach(m => put(m.e, m.n, { n: m.n, e: m.e, plan: m.plan, m, ci: m.ci > -1 ? m.ci : undefined,
      type: m.status === 'Cancelling' ? 'Cancelling' : 'Membership' }));
    D.suspended.forEach(p => put(p.e, p.n, { n: p.n, e: p.e, plan: p.plan, type: 'Suspended', susp: p }));
    cancelledList().forEach(p => { if (!find(p.e, p.n)) put(p.e, p.n, { n: p.n, e: p.e, plan: p.plan, type: 'Non-member', ci: -1 }); });
    (D.movers || []).forEach(p => { if (!find(p.e, p.n)) put(p.e, p.n, { n: p.n, e: p.e, ph: p.ph, plan: p.plan, type: 'Non-member', ci: -1 });
      else { const r = map[find(p.e, p.n)]; if (!r.ph && p.ph) r.ph = p.ph; } });
    return Object.values(map).map(p => {
      p.ci = p.ci === undefined ? -1 : p.ci; p.c = p.ci > -1 ? D.clients[p.ci] : null;
      const cx = cxOf(p.e, p.n);
      if (cx) { p.type = 'Cancelled'; p.cx = cx; p.plan = pkgInfo(p.e, p.n).detail; }
      else if (p.type === 'Non-member') { const k = pkgInfo(p.e, p.n); p.type = k.type; p.plan = k.detail; }
      return p;
    });
  });
}

// ---------- celebrations ----------
export const SRC = { 'Client Registered By Self': 'Self sign-up (app/web)' };
export const srcText = s => s ? (SRC[s] || s) : '';
export function lifetimeOf(c) { return c ? (c.lt != null ? c.lt : c.ytd) : 0; }
export function firstOf(c) { return c ? (c.first || c.f || null) : null; }
function rewarded(c, label) { return D.rewards.some(r => r.k === lc(c.k) && String(r.v) === String(label)); }
export function streakOf(m) {
  if (!m || !m.x || m.ci < 0) return 0;
  let s = 0; const mon = B().monday;
  for (let w = 1; w <= 26; w++) { if (countFor(m.ci, mon - w * 7 * DAY, mon - (w - 1) * 7 * DAY) >= m.x) s++; else break; }
  return s;
}
function anniversaryOf(c) {
  const f = firstOf(c); if (!f) return null;
  const fy = Number(fmt(f, { year: 'numeric' })), ty = Number(fmt(B().today, { year: 'numeric' }));
  for (const y of [ty - 1, ty, ty + 1]) {
    const yrs = y - fy; if (yrs < 1) continue;
    const t = f + Math.round(yrs * 365.2425) * DAY;
    if (t >= B().today - 6 * DAY && t <= B().today + 14 * DAY) return { yrs, t };
  }
  return null;
}
export function celebrationsFor(ci) {
  const c = D.clients[ci], b = B(), m = memberOf(ci), out = [], soon = [];
  if (!c) return { now: out, soon };
  const lt = lifetimeOf(c), wk = countFor(ci, b.last7, b.now), lt7 = lt - wk, f = firstOf(c);
  if (c.ltExact) {
    D.lifeMilestones.forEach(v => { if (lt >= v && lt7 < v) out.push({ label: v + ' visits', kind: v >= 100 ? 'long' : v >= 50 ? 'habit' : 'new', why: `Lifetime visit ${v}` }); });
    const next = D.lifeMilestones.find(v => v > lt);
    if (next && next - lt <= 5) soon.push({ label: next + ' visits', kind: next >= 100 ? 'long' : next >= 50 ? 'habit' : 'new', why: `${next - lt} to go (${lt} so far)` });
  }
  if (f && f >= b.last7 && f <= b.now) out.push({ label: 'First class', kind: 'new', why: 'First visit ' + dDate(f) });
  if (f && b.today - f >= 28 * DAY && b.today - f < 35 * DAY && countFor(ci, f, f + 28 * DAY + DAY) >= 4)
    out.push({ label: 'First month done', kind: 'new', why: `${countFor(ci, f, f + 29 * DAY)} visits in their first 4 weeks` });
  const s = streakOf(m);
  if (s && s % 4 === 0) out.push({ label: s + '-week streak', kind: 'habit', why: `Hit their plan ${s} weeks in a row` });
  else if (s && (s + 1) % 4 === 0) soon.push({ label: (s + 1) + '-week streak', kind: 'habit', why: 'One more on-plan week' });
  const an = anniversaryOf(c);
  if (an) (an.t <= b.today ? out : soon).push({ label: an.yrs + (an.yrs === 1 ? ' year' : ' years') + ' with us', kind: 'long', why: (an.t <= b.today ? 'Anniversary ' : 'On ') + dDate(an.t) });
  out.forEach(e => e.done = rewarded(c, e.label));
  return { now: out, soon, streak: s };
}
export function allCelebrations() {
  return memo('cel', () => {
    const now = [], soon = [];
    D.clients.forEach((c, ci) => { if (!c.mem && !c.pkgs && !(c.l && c.l >= B().today - 60 * DAY)) return;
      const r = celebrationsFor(ci); r.now.forEach(e => now.push(Object.assign({ ci, c }, e))); r.soon.forEach(e => soon.push(Object.assign({ ci, c }, e))); });
    return { now, soon };
  });
}
/** Birthdays in the next `days` days (and the last few), for anyone current. Needs the updated Apps Script (birthday month/day). */
export function birthdays(days = 14, back = 3) {
  return memo('bd' + days + '|' + back, () => {
    const b = B(), y = Number(fmt(b.today, { year: 'numeric' })), out = [];
    D.clients.forEach((c, ci) => {
      if (!c.bd) return;
      if (!c.mem && !c.pkgs && !(c.l && c.l >= b.today - 60 * DAY)) return;
      if (cxOf(c.e, c.n)) return;
      for (const yy of [y - 1, y, y + 1]) {
        const t = Date.parse(`${yy}-${c.bd}T12:00:00+09:30`);
        const diff = Math.round((t - (b.today + 12 * H)) / DAY);
        if (diff >= -back && diff <= days) out.push({ ci, c, t, diff, age: c.age != null ? c.age + (diff > 0 ? 1 : 0) : null });
      }
    });
    return out.sort((a, c) => a.diff - c.diff);
  });
}

// ---------- Risks workflow ----------
export const INACTIVE_DAYS = 14, LAPSED_DAYS = 30;
export const REASONS = [['all', 'All reasons'], ['red', 'Red flag'], ['orange', 'Orange flag'], ['fringe', 'Fringe List'], ['inactive', 'Inactive 14+ days'], ['lapsed', 'Lapsed 30+ days'], ['never', 'Bought, never came']];
export function riskPool() {
  return memo('pool', () => {
    const map = {}, b = B();
    const add = (e, n, ci, m, plan, code, label, cls) => {
      const k = e ? lc(e) : 'name:' + lc(n);
      const p = map[k] = map[k] || { k, e: e ? lc(e) : '', n, ci, m, plan, reasons: [] };
      if (!p.plan && plan) p.plan = plan; if (!p.m && m) p.m = m; if (p.ci < 0 && ci > -1) p.ci = ci;
      if (!p.reasons.some(r => r.code === code)) p.reasons.push({ code, label, cls });
    };
    redList().forEach(m => add(m.e, m.n, m.ci, m, m.plan, 'red', m.level === 'missed' ? 'Red: no visits last week' : `Red: ${m.att} of ${m.x} last week`, 'red'));
    orangeList().forEach(m => add(m.e, m.n, m.ci, m, m.plan, 'orange', m.level === 'nothing' ? 'Orange: nothing this week' : `Orange: ${m.att + m.bk} of ${m.x} this week`, m.level === 'nothing' ? 'red' : 'orange'));
    geronimoFringe().list.forEach(r => add(r.e, r.n, r.ci, r.m, r.detail, 'fringe', `Fringe: ${r.visits} in 30 days`, 'orange'));
    const holders = D.members.filter(tracked).map(m => ({ e: m.e, n: m.n, ci: m.ci, m, plan: m.plan, d: m.joined }));
    (D.purchAll || []).filter(x => !/membership/i.test(x.type) && (!x.exp || x.exp >= b.today)).forEach(x => {
      if (isSuspended(x)) return; holders.push({ e: x.e, n: x.n, ci: findClient(x.e, x.n), m: null, plan: x.plan, d: x.d }); });
    holders.forEach(h => {
      const c = D.clients[h.ci], back = returnOf(h.e, h.n), last = Math.max(c && c.l || 0, back || 0) || null, ds = daysSince(last);
      if (back && B().now - back < BACK_GRACE_DAYS * DAY) return;
      const since = back && (!c || !c.l || back > c.l) ? ' since coming back' : '';
      if (last && ds >= LAPSED_DAYS) add(h.e, h.n, h.ci, h.m, h.plan, 'lapsed', `Lapsed: ${ds} days${since}`, 'red');
      else if (last && ds >= INACTIVE_DAYS) add(h.e, h.n, h.ci, h.m, h.plan, 'inactive', `Inactive: ${ds} days${since}`, 'orange');
    });
    (D.purchAll || []).forEach(x => {
      if (!x.d || b.today - x.d < 3 * DAY || b.today - x.d > 60 * DAY || isSuspended(x)) return;
      const ci = findClient(x.e, x.n);
      if (countFor(ci, x.d - DAY, b.now) === 0 && !(ci > -1 && D.clients[ci].l && D.clients[ci].l >= x.d - DAY))
        add(x.e, x.n, ci, memberOf(ci) || null, x.plan, 'never', `Bought ${dDate(x.d)}, not in yet`, 'red');
    });
    const list = Object.values(map).filter(p => !cxOf(p.e, p.n));
    list.forEach(p => { const c = D.clients[p.ci]; p.last = c ? c.l : null; p.src = c ? c.src : ''; p.ph = c ? c.ph : ''; });
    return list;
  });
}
export function stageOf(p) {
  const n = noteFor(p.e), st = n.status || '', on = n.on || 0, b = B();
  if (!st || st === 'Pending' || !on || b.now - on > 30 * DAY) return 'todo';
  if (st === 'Not Needed') return 'done';
  if (p.ci > -1 && countFor(p.ci, on, b.now) > 0) return 'back';
  if (st === 'No Response' || (st === 'Contacted' && b.now - on >= 7 * DAY)) return 'unresp';
  return 'contacted';
}
export function workflow() {
  return memo('wf', () => {
    const pool = riskPool().slice(), byKey = {}; pool.forEach(p => byKey[p.k] = p);
    Object.keys(D.notes).forEach(e => { const n = D.notes[e];
      if (!n.on || B().now - n.on > 30 * DAY || !n.status || n.status === 'Pending' || byKey[e]) return;
      if (cxOf(e, '')) return;
      const ci = findClient(e, ''), m = memberOf(ci) || D.members.find(x => x.e === e) || null, c = D.clients[ci];
      const p = { k: e, e, n: (m && m.n) || (c && c.n) || e, ci, m, plan: m ? m.plan : (ci > -1 ? pkgText(ci) : ''), reasons: [], last: c ? c.l : null, src: c ? c.src : '', ph: c ? c.ph : '' };
      byKey[e] = p; pool.push(p); });
    const g = { todo: [], contacted: [], unresp: [], back: [], done: [] };
    pool.forEach(p => { p.stage = stageOf(p); if (p.stage !== 'todo' || p.reasons.length) g[p.stage].push(p); });
    return g;
  });
}

// ---------- extras from the Netlify template ----------
/** Visits per week for the last n weeks (oldest first), for the expandable attendance strip. */
export function weeklyVisits(ci, weeks = 8) {
  const mon = B().monday, out = [];
  for (let w = weeks - 1; w >= 0; w--) {
    const a = mon - w * 7 * DAY, b = a + 7 * DAY;
    out.push({ a, n: countFor(ci, a, Math.min(b, B().now)), booked: w === 0 ? countFor(ci, B().now, b) : 0, current: w === 0 });
  }
  return out;
}
/** Booked but didn't come, within a range. */
export function noShows(a, b) {
  const out = [];
  D.classes.forEach(c => { if (c.t >= a && c.t < b) (c.ns || []).forEach(ci => out.push({ ci, cl: c })); });
  return out.sort((x, y) => y.cl.t - x.cl.t);
}
/** New faces grouped into their first four weeks, like the template's onboarding board. */
export function onboardingWeeks() {
  const b = B(), out = [[], [], [], []];
  D.clients.forEach((c, ci) => {
    if (!c.f || c.f < b.today - 28 * DAY + DAY || c.f > b.now) return;
    const wk = Math.min(3, Math.floor((b.today - dayStartOf(c.f)) / (7 * DAY)));
    const visits = countFor(ci, c.f, b.now), booked = countFor(ci, b.now, b.now + 14 * DAY);
    const daysIn = Math.floor((b.now - c.f) / DAY);
    const risk = (visits <= 1 && !booked && daysIn > 3) || (wk >= 2 && visits < wk + 1 && !booked);
    out[wk].push({ ci, c, visits, booked, risk, daysIn });
  });
  out.forEach(l => l.sort((a, c) => (c.risk - a.risk) || (a.c.f - c.c.f)));
  return out;
}
const dayStartOf = ms => ms - ((ms - B().today) % DAY + DAY) % DAY;

// ---------- Geronimo Academy reports (their exact definitions) ----------
// Red Flag: 0 visits Monday–Sunday of the past full week. Orange Flag: 0 visits Monday–Wednesday of this week.
// Fringe List: 3 or fewer visits in the last 30 days (geronimoFringe above). Hall of Fame: 250+ visits since the studio opened.
/** Members Geronimo counts: on a membership, not paused, not just back from a break, and joined before the period started. */
function geronimoPool(start) {
  return D.members.filter(m => ['Excluded', 'Duplicate', 'Not Tracked (Comp)'].indexOf(m.status) === -1)
    .map(m => ({ m, skip: isSuspended(m) ? 'On suspension' : recentlyBack(m) ? 'Back from a break' : (m.joined && m.joined > start) ? 'Joined during the week' : '' }));
}
export function geronimoRed() {
  return memo('gRed', () => {
    const b = B(), a = b.lastMonday, z = b.monday, pool = geronimoPool(a);
    // Geronimo: 0 visits from last Monday up to today. Anyone who has come back since this Monday is no longer a Red Flag.
    const zero = pool.filter(x => !x.skip && countFor(x.m.ci, a, z) === 0);
    const back = x => countFor(x.m.ci, z, b.now);
    const cameBack = zero.filter(x => back(x) > 0).map(x => ({ m: x.m, skip: `Came back this week (${back(x)})` }));
    const list = zero.filter(x => back(x) === 0).map(x => x.m);
    return { list, cameBack, skipped: cameBack.concat(pool.filter(x => x.skip)), from: a, to: z - DAY };
  });
}
export function geronimoOrange() {
  return memo('gOrange', () => {
    const b = B(), a = b.monday, z = Math.min(b.monday + 3 * DAY, b.now), pool = geronimoPool(a);
    // Studio rule: anyone already booked in for later this week is on schedule, so they aren't an Orange Flag at all
    const zero = pool.filter(x => !x.skip && countFor(x.m.ci, a, z) === 0);
    // ...and so is anyone who has already come in Thursday–Sunday (e.g. a Thursday/Saturday regular)
    const thu = b.monday + 3 * DAY, from = Math.max(thu, b.now);
    const came = x => b.now > thu ? countFor(x.m.ci, thu, b.now) : 0;
    const booked = x => countFor(x.m.ci, from, b.nextMonday);
    const why = x => [came(x) ? `Came in this week (${came(x)})` : '', booked(x) ? `Booked later this week (${booked(x)})` : ''].filter(Boolean).join(' · ');
    const bookedLater = zero.filter(x => came(x) + booked(x) > 0).map(x => ({ m: x.m, skip: why(x) }));
    const list = zero.filter(x => came(x) + booked(x) === 0).map(x => {
      const u = usualDays(x.m.ci);
      return Object.assign({}, x.m, { booked: 0, usual: u, group: u.late ? 'late' : 'check' });
    });
    return { list, check: list.filter(m => m.group === 'check'), late: list.filter(m => m.group === 'late'), bookedLater,
      skipped: bookedLater.concat(pool.filter(x => x.skip)), from: a, to: a + 2 * DAY, complete: b.now >= b.monday + 3 * DAY };
  });
}
/** Which days someone usually trains, from the last 6 full weeks. late = (almost) always Thursday to Sunday. */
const LATE_DAYS = ['Thu', 'Fri', 'Sat', 'Sun'];
export function usualDays(ci) {
  const out = { total: 0, early: 0, days: {}, late: false, text: '' };
  if (ci < 0 || !byClient[ci]) return out;
  const from = shiftDays(B().monday, -42), to = B().monday;
  byClient[ci].forEach(i => { const t = D.classes[i].t; if (t < from || t >= to) return;
    const d = fmt(t, { weekday: 'short' }); out.days[d] = (out.days[d] || 0) + 1; out.total++; if (LATE_DAYS.indexOf(d) === -1) out.early++; });
  out.late = out.total >= 3 && out.early / out.total < 0.2;
  out.text = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].filter(d => out.days[d]).map(d => d).join(', ');
  return out;
}
export const HALL_OF_FAME = 250;
export function hallOfFame() {
  return memo('hof', () => {
    const b = B(), out = [];
    D.clients.forEach((c, ci) => {
      const lt = lifetimeOf(c); if (lt < HALL_OF_FAME) return;
      const before = lt - countFor(ci, b.last7, b.now);
      out.push({ ci, c, lt, exact: !!c.ltExact, isNew: before < HALL_OF_FAME, member: !!memberOf(ci) });
    });
    return out.sort((x, y) => (y.isNew - x.isNew) || y.lt - x.lt);
  });
}

// ---------- Weekly numbers for the Geronimo Metrics sheet ----------
/** The most recent report day (default Friday) on or before today, as studio-time midnight. */
export function lastReportDay(dow = 5) {
  const b = B(); let t = b.today;
  for (let i = 0; i < 7; i++) { const d = new Date(t + 12 * H).getUTCDay(); if (d === dow) return t; t = shiftDays(t, -1); }
  return b.today;
}
const isMem = x => /membership/i.test(x.type || '') || /membership/i.test(x.cat || '');
/** Everything the weekly sheet needs for the 7 days ending on `end` (a midnight). Each figure carries the people behind it. */
/** Fridays going back from the latest one (DST-safe). */
export function reportDays(n, dow = 5) { const out = [lastReportDay(dow)]; while (out.length < n) out.push(shiftDays(out[out.length - 1], -7)); return out; }
export function weeklyNumbers(end) {
  const b = B(), from = shiftDays(end, -6), to = shiftDays(end, 1), inWk = t => t >= from && t < to;
  const asOfNow = end >= b.today - DAY;
  const snap = (D.snapshots || []).find(s => s.d === ymdOf(end));
  // stock figures: today's live numbers for the current week, otherwise the daily snapshot if one was saved
  const autopay = asOfNow ? D.members.filter(m => m.status !== 'Cancelling').length : (snap ? snap.active : null);
  // Suspended Member # on the Metrics sheet = suspensions that started during the week (not everyone currently paused)
  // Uses the full suspension history when the Sheet sends it (everyone whose pause started that week, even if they're back now)
  const suspSrc = D.suspStarts ? D.suspStarts.concat(D.suspScheduled || []) : (D.suspended || []).concat(D.suspScheduled || []);
  // Suspended rule: each pause counts once, in the week it starts, but one that starts on the Thursday or
  // Friday rolls into the following week. So a Sat-Fri week counts pauses starting from the Thursday before to the Wednesday.
  // People who have since cancelled are left out.
  const seenS = {}, suspList = suspSrc.filter(x => x.d && inWk(shiftDays(x.d, 2)) && !cxOf(x.e, x.n)).filter(x => { const k = (x.e || lc(x.n)) + '|' + dKey(x.d); return seenS[k] ? false : (seenS[k] = true); });
  const suspended = suspList.length;
  const cancelling = D.members.filter(m => m.status === 'Cancelling');
  const packHolders = {};
  (D.purchAll || []).filter(x => !isMem(x) && x.d < to && (!x.exp || x.exp >= end)).forEach(x => { packHolders[x.e] = packHolders[x.e] || x; });
  // sales in the week
  const purch = (D.purchAll || []).filter(x => x.d && inWk(x.d));
  const introPack = purch.filter(x => !isMem(x));
  const conv = (D.intros || []).filter(x => x.convOn && inWk(x.convOn));
  const convE = new Set(conv.map(x => x.e));
  const memSales = purch.filter(x => isMem(x) && !convE.has(x.e) &&
    !(D.purchAll || []).some(y => y.e === x.e && isMem(y) && y.d < x.d && y.d >= x.d - 45 * DAY));      // not a renewal or plan switch
  const ending = (D.intros || []).filter(x => { const e = introEnd(x); return e >= from && e < to && !x.already; });
  const endConv = ending.filter(x => x.convOn);
  const cx = cancelledList().filter(x => inWk(x.d));
  const monthStart = midnightOfMonth(end);
  const cxMtd = cancelledList().filter(x => x.d >= monthStart && x.d < to);
  const cls = D.classes.filter(c => inWk(c.t) && c.t < b.now);
  const attendance = cls.reduce((s, c) => s + c.b, 0);
  const people = new Set(); cls.forEach(c => c.p.forEach(ci => people.add(ci)));
  const sb = scoreIn(from, to), sbMtd = scoreIn(monthStart, to);
  return {
    sb: sb.covered ? sb : null, sbMtd: sbMtd.covered ? sbMtd : null,
    from, to: end, asOfNow, complete: b.now >= to, autopay, cancelling, suspended, suspList, suspNow: (D.suspended || []).length, packs: asOfNow ? activePackages() : (snap && snap.packs != null ? snap.packs : null), packList: D.clients.filter(c => c.pkgs),
    sales: (D.salesLog || []).find(x => x.week === ymdOf(end)) || null,
    introPack, memSales, rollovers: conv, rolloverPct: ending.length ? Math.round(endConv.length / ending.length * 100) : null, ending, endConv,
    cancels: cx, cancelsMtd: cxMtd, churnPct: autopay ? Math.round(cxMtd.length / autopay * 1000) / 10 : null,
    attendance, people: people.size, avgVisits: autopay ? Math.round(attendance / autopay * 100) / 100 : null,
    net: conv.length + memSales.length - cx.length,
    red: geronimoRed().list.length, orange: geronimoOrange().check.length, orangeAll: geronimoOrange().list.length, fringe: geronimoFringe().list.length
  };
}
function ymdOf(ms) { return dKey(ms).split('/').reverse().join('-'); }
function midnightOfMonth(ms) { const [, m, y] = dKey(ms).split('/').map(Number); return midnight(y, m, 1); }


// ---------- Scoreboard (read-only copy of the team's monthly Scoreboard tabs in the Metrics sheet) ----------
export const scoreboard = () => D.scoreboard || null;
const sbDays = () => memo('sbd', () => ((D.scoreboard && D.scoreboard.days) || []).map(x => Object.assign({ t: fromYmd(x.d) }, x)));
/** Totals for [from, to). covered = the Scoreboard has rows for every day in the range (so it can stand in for Hapana's count). */
export function scoreIn(from, to) {
  const ds = sbDays().filter(x => x.t >= from && x.t < to);
  const sum = k => ds.reduce((t, x) => t + (Number(x[k]) || 0), 0);
  const want = Math.round((Math.min(to, B().today + DAY) - from) / DAY);
  return { days: ds, covered: ds.length > 0 && ds.length >= want, r: sum('r'), m: sum('m'), pl: sum('pl'), ol: sum('ol'), c: sum('c'), i: sum('i') };
}
/** Months the Scoreboard has, newest first: [{ key: '2026-10', from, to, label }] */
export function scoreMonths() {
  const seen = {};
  sbDays().forEach(x => { const k = x.d.slice(0, 7); if (!seen[k]) { const [y, m] = k.split('-').map(Number); seen[k] = { key: k, from: midnight(y, m, 1), to: midnight(m === 12 ? y + 1 : y, m === 12 ? 1 : m + 1, 1) }; } });
  return Object.values(seen).sort((a, c) => c.from - a.from);
}
const nameIn = (n, text) => {
  const w = lc(n).replace(/[^a-z' -]/g, ' ').split(/\s+/).filter(Boolean); if (!w.length) return true;
  const t = ' ' + lc(text).replace(/[^a-z' ]/g, ' ') + ' ', f = w[0], l = w.length > 1 ? w[w.length - 1] : '';
  return t.includes(' ' + f + ' ') && (!l || t.includes(' ' + l + ' ') || t.includes(' ' + f + ' ' + l[0] + ' ') || t.includes(' ' + l.slice(0, 3)));
};
/** What Hapana recorded in [from, to) that we can't find on the Scoreboard (looked for a few days either side). Read only: the team adds them to their sheet. */
export function notOnScoreboard(from, to) {
  return memo('nos' + from + '|' + to, () => {
    const ds = sbDays(); if (!ds.length) return null;
    const first = ds[0].t, upTo = Math.min(to, B().now);
    const near = (t, keys) => ds.filter(x => x.t >= t - 3 * DAY && x.t <= t + 6 * DAY).map(x => keys.map(k => x[k]).join(' ')).join(' ');
    const ok = t => t >= Math.max(from, first) && t < upTo;
    const intros = (D.intros || []).filter(x => ok(x.d) && !x.already && !nameIn(x.n, near(x.d, ['iN', 'x'])));
    const roll = (D.intros || []).filter(x => x.convOn && ok(x.convOn) && !nameIn(x.n, near(x.convOn, ['rN', 'mN', 'x'])));
    const rolled = new Set((D.intros || []).filter(x => x.convOn).map(x => x.e));
    const mem = (D.purchAll || []).filter(x => isMem(x) && ok(x.d) && !rolled.has(x.e) &&
      !(D.purchAll || []).some(y => y.e === x.e && isMem(y) && y.d < x.d && y.d >= x.d - 45 * DAY) && !nameIn(x.n, near(x.d, ['mN', 'rN', 'x'])));
    const cx = cancelledList().filter(x => ok(x.d) && !nameIn(x.n, near(x.d, ['iN', 'rN', 'mN', 'x'])));
    return { intros, roll, mem, cx, total: intros.length + roll.length + mem.length + cx.length };
  });
}
