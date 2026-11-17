// Applies a saved change to the dashboard data, so the page (and the cached copy on the server)
// update straight away instead of waiting for the next full refresh from the Google Sheet.
import { fromYmd, ymd } from './time.js';

const lc = s => String(s || '').trim().toLowerCase();
const noteOf = (D, e) => (D.notes[e] = D.notes[e] || { status: '', note: '', tags: [] });

export function applyChange(D, action, args, result, user) {
  const e = lc(args[0]);
  switch (action) {
    case 'saveMemberNote': {
      const [, , status, note] = args, n = noteOf(D, e);
      n.status = status;
      if (note !== null && note !== undefined) n.note = String(note);
      if (result) { n.by = result.by; n.on = result.at; n.hist = result.hist; }
      break;
    }
    case 'saveMemberTags':
      noteOf(D, e).tags = (args[2] || []).map(t => String(t).trim()).filter(Boolean);
      break;
    case 'saveIntroStart':
      noteOf(D, e).introStart = args[2] ? fromYmd(args[2]) : null;
      break;
    case 'saveSuspensionEnd': {
      const ms = args[2] ? fromYmd(args[2]) : null;
      noteOf(D, e).suspensionEnds = ms;
      (D.suspended || []).concat(D.suspScheduled || []).forEach(s => { if (s.e === e) s.ends = ms; });
      break;
    }
    case 'saveReward':
      (D.rewards = D.rewards || []).push({ k: lc(args[0]), v: String(args[2]), d: Date.now() });
      break;
    case 'saveSnapshot': {
      const c = args[0] || {}, key = ymd(Date.now());
      D.snapshots = D.snapshots || [];
      if (!D.snapshots.some(s => s.d === key)) D.snapshots.push({ d: key, active: c.active, fu: c.fu, short: c.short, susp: c.susp, packs: c.packs == null ? null : c.packs });
      break;
    }
    case 'saveSalesValue': {
      const p = args[0] || {};
      D.salesLog = (D.salesLog || []).filter(x => x.week !== p.week);
      D.salesLog.push({ week: p.week, oneOff: p.oneOff, memberships: p.memberships, total: p.total, payments: p.payments, detail: p.detail || '',
        by: (result && result.by) || (user && user.name) || '', on: (result && result.on) || Date.now() });
      break;
    }
    case 'saveSalesPrices':
      D.salesPrices = (args[0] || []).filter(r => r && r.name).map(r => ({ name: String(r.name), price: Number(r.price) || 0, fortnights: Number(r.fortnights) || 13, confirmed: !!r.confirmed, notes: r.notes || '' }));
      break;
    case 'appendMovements':
      if (result) (D.uploads = D.uploads || []).push({ at: Date.now(), file: args[1] || '', rows: (args[0] || []).length, added: result.added, skipped: result.skipped, range: '', by: (user && user.name) || '' });
      break;
    case 'saveTask': {
      const t = args[0] || {}; if (!t.id) break;
      D.tasks = D.tasks || [];
      const cur = D.tasks.find(x => x.id === t.id);
      const fields = { t: String(t.t || ''), n: String(t.n || ''), a: String(t.a || (user && user.email) || '').toLowerCase(), ty: t.ty || 'once',
        wd: t.wd === '' || t.wd === undefined ? null : t.wd, due: Number(t.due) || null, p: String(t.p || ''), me: String(t.me || '').toLowerCase(), mn: String(t.mn || ''),
        ev: Number(t.ev) || null, st: Number(t.st) || null, mr: String(t.mr || ''), adm: !!t.adm };
      if (cur) Object.assign(cur, fields);
      else D.tasks.push(Object.assign({ id: t.id, by: (result && result.by) || (user && user.name) || '', on: (result && result.on) || Date.now(), done: [] }, fields));
      break;
    }
    case 'tickTask': {
      const [id, key, done] = args, t = (D.tasks || []).find(x => x.id === id); if (!t) break;
      t.done = (t.done || []).filter(x => x.k !== key);
      if (done) t.done.unshift({ k: key, by: (result && result.by) || (user && user.name) || '', at: (result && result.at) || Date.now() });
      break;
    }
    case 'takeTask': {
      const t = (D.tasks || []).find(x => x.id === args[0]); if (!t || !user) break;
      if (t.a !== String(user.email || '').toLowerCase()) { t.tk = (result && result.from) || t.tk || ''; t.a = String(user.email || '').toLowerCase(); }
      break;
    }
    case 'saveEvent': {
      const ev = args[0] || {}; if (!ev.id) break;
      D.cal = D.cal || { classes: [], events: [] }; D.cal.events = D.cal.events || [];
      const f = { t: String(ev.t || ''), ty: ev.ty || 'meeting', s: Number(ev.s) || null, e: Number(ev.e) || null, ad: !!ev.ad, who: (ev.who || []).map(String),
        wh: String(ev.wh || ''), n: String(ev.n || ''), rp: Number(ev.rp) || 0, ru: Number(ev.ru) || null };
      const cur = D.cal.events.find(x => x.id === ev.id);
      if (cur) Object.assign(cur, f); else D.cal.events.push(Object.assign({ id: ev.id, by: (result && result.by) || (user && user.name) || '', on: Date.now() }, f));
      break;
    }
    case 'sbcSave': {
      // Sell By Chat: the saved row comes back from Apps Script with the stage/date rules already applied
      const row = result && result.row; if (!row) break;
      D.sellByChat = D.sellByChat || { target: 5, quietDays: 7, rows: [] }; D.sellByChat.rows = D.sellByChat.rows || [];
      const key = u => String(u || '').trim().toLowerCase().replace(/^@/, '');
      const old = key((args[0] && args[0].oldUsername) || row.username);
      const i = D.sellByChat.rows.findIndex(r => key(r.username) === old);
      if (i > -1) D.sellByChat.rows[i] = row; else D.sellByChat.rows.push(row);
      break;
    }
    case 'saveTemplate': {
      const t = args[0] || {}; if (!t.id) break;
      D.templates = D.templates || [];
      const f = { n: String(t.n || ''), cat: t.cat || 'Other', sub: String(t.sub || ''), t: String(t.t || ''), by: (result && result.by) || '', at: Date.now() };
      const cur = D.templates.find(x => x.id === t.id);
      if (cur) Object.assign(cur, f); else D.templates.push(Object.assign({ id: t.id }, f));
      break;
    }
    case 'deleteTemplate':
      D.templates = (D.templates || []).filter(x => x.id !== args[0]);
      break;
    case 'deleteEvent':
      if (D.cal && D.cal.events) D.cal.events = D.cal.events.filter(x => x.id !== args[0]);
      break;
    case 'deleteTask':
      D.tasks = (D.tasks || []).filter(x => x.id !== args[0]);
      break;
    case 'saveNotCancelled': {
      const n = noteOf(D, e), reason = String(args[2] || '');
      if (reason) { n.ncReason = reason; n.ncBy = (result && result.by) || (user && user.name) || 'staff'; n.ncOn = (result && result.on) || Date.now(); n.ncUpTo = Number(args[3]) || null; }
      else { n.ncReason = ''; n.ncBy = ''; n.ncOn = null; n.ncUpTo = null; }
      break;
    }
    case 'saveCancelled': {
      const [, name, dateStr, reason] = args, n = noteOf(D, e);
      D.cxMembers = D.cxMembers || [];
      if (dateStr) {
        const by = (result && result.by) || (user && user.name) || 'staff', d = fromYmd(dateStr);
        n.cxOn = d; n.cxBy = by;
        if (reason) n.note = String(reason);
        const mi = D.members.findIndex(m => m.e === e);
        let m = null;
        if (mi > -1) { m = D.members[mi]; D.members.splice(mi, 1); if (!D.cxMembers.some(x => x.e === e)) D.cxMembers.push(m); }
        else m = D.cxMembers.find(x => x.e === e) || null;
        D.suspended = (D.suspended || []).filter(s => s.e !== e);
        D.suspScheduled = (D.suspScheduled || []).filter(s => s.e !== e);
        const ci = D.clients.findIndex(c => c.e === e), c = ci > -1 ? D.clients[ci] : null;
        if (c) delete c.mem;
        const prev = (D.cancelled || []).find(x => x.e === e) || {};
        D.cancelled = (D.cancelled || []).filter(x => x.e !== e);
        D.cancelled.push({ n: (m && m.n) || prev.n || (c && c.n) || name || e, e, plan: (m && m.plan) || prev.plan || (c && c.pkgs) || '',
          d, reason: prev.reason || '', by, src: 'Marked by ' + by,
          first: (c && (c.first || c.f)) || prev.first || null, lt: c ? c.lt : (prev.lt == null ? null : prev.lt),
          ltExact: c ? !!c.ltExact : !!prev.ltExact, last: c ? c.l : (prev.last || null) });
      } else {
        n.cxOn = null; n.cxBy = '';
        D.cancelled = (D.cancelled || []).filter(x => !(x.e === e && /^Marked/.test(x.src || '')));
        const ri = D.cxMembers.findIndex(x => x.e === e);
        if (ri > -1) {
          const m = D.cxMembers[ri]; D.cxMembers.splice(ri, 1);
          if (!D.members.some(x => x.e === e)) D.members.push(m);
          if (m.ci > -1 && D.clients[m.ci]) D.clients[m.ci].mem = 1;
        }
      }
      break;
    }
  }
  return D;
}
