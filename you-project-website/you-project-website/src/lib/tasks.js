// Team to-dos: one-off, daily, weekly and project tasks, saved in the Sheet's Tasks tab (Team.gs).
import { D, B, DAY, lc, dDate, fmt } from './logic.js';
import { TZ, ymd, addDays, dayStart, midnight } from '../../shared/time.js';

export const TYPES = [['once', 'One-off'], ['repeat', 'Repeats'], ['project', 'Project']];   // 'repeat' covers weekly / every N weeks / monthly
export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const myEmail = () => lc(D.user && D.user.email);
export const newId = () => 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

/** Everyone tasks can be given to (Access tab), with the signed-in person first. */
export function team() {
  const list = (D.team || []).slice(), me = myEmail();
  if (me && !list.some(p => p.e === me)) list.push({ e: me, n: (D.user && D.user.name) || me.split('@')[0] });
  return list.sort((a, c) => (c.e === me) - (a.e === me) || a.n.localeCompare(c.n));
}
export const TEAM = 'team';   // the shared team list: anyone can tick it or take it
export const isTeam = t => t.a === TEAM;
export const nameOf = e => { if (e === TEAM) return 'Team list'; const p = team().find(x => x.e === lc(e)); return p ? p.n : (e ? String(e).split('@')[0] : 'Unassigned'); };
export const isMine = t => t.a === myEmail();

/** The Monday of this week, 0 = Monday ... 6 = Sunday. */
const monday = () => B().monday;
const dayIdx = () => Math.round((B().today - monday()) / DAY);

const WD_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const wdFmt = new Intl.DateTimeFormat('en-AU', { timeZone: TZ, weekday: 'short' });
/** 0 = Monday ... 6 = Sunday, in studio time. */
export const weekdayOf = ms => WD_SHORT.indexOf(wdFmt.format(ms).slice(0, 3));
const mondayOf = ms => addDays(dayStart(ms), -weekdayOf(ms));
export const NTH = [[1, 'first'], [2, 'second'], [3, 'third'], [4, 'fourth'], [-1, 'last']];
const ord = n => n + (n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th');

/** Monthly rule "d:15", "d:last", "n:1:0" (first Monday), "n:-1:4" (last Friday): the date it falls on in a given month. */
export function monthlyOn(mr, y, m) {
  const dim = new Date(Date.UTC(y, m, 0)).getUTCDate(), p = String(mr || 'd:1').split(':');
  if (p[0] === 'n') {
    const n = Number(p[1]) || 1, wd = Number(p[2]) || 0;
    if (n === -1) { const last = midnight(y, m, dim); return midnight(y, m, dim - ((weekdayOf(last) - wd + 7) % 7)); }
    const first = 1 + ((wd - weekdayOf(midnight(y, m, 1)) + 7) % 7);
    return midnight(y, m, Math.min(dim, first + 7 * (n - 1)));
  }
  return midnight(y, m, p[1] === 'last' ? dim : Math.min(dim, Number(p[1]) || 1));
}
export function monthlyText(mr) {
  const p = String(mr || 'd:1').split(':');
  if (p[0] === 'n') return `the ${(NTH.find(x => x[0] === Number(p[1])) || NTH[0])[1]} ${WEEKDAYS[Number(p[2]) || 0]}`;
  return p[1] === 'last' ? 'the last day' : 'the ' + ord(Number(p[1]) || 1);
}
export const repeatText = t => t.ty === 'monthly' ? 'Monthly on ' + monthlyText(t.mr)
  : t.ty === 'weekly' ? ((Number(t.ev) || 1) > 1 ? `Every ${Number(t.ev)} weeks on ` : 'Every ') + WEEKDAYS[t.wd == null ? 0 : Number(t.wd)] : t.ty === 'daily' ? 'Every day' : '';

/** The current "round" of a repeating task: which occurrence it's on, when that is, and its tick key. */
function round(t) {
  const b = B(), today = b.today;
  if (t.ty === 'weekly') {
    const wd = t.wd == null ? 0 : Number(t.wd), ev = Math.max(1, Number(t.ev) || 1);
    const anchor = ev > 1 && t.st ? mondayOf(t.st) : monday();
    const weeks = Math.round((monday() - anchor) / (7 * DAY));
    if (weeks < 0) return { key: 'w' + ymd(anchor), at: addDays(anchor, wd), next: null, future: true };     // hasn't started yet
    const occMon = addDays(monday(), -7 * (weeks % ev));
    return { key: 'w' + ymd(occMon), at: addDays(occMon, wd), next: addDays(addDays(occMon, 7 * ev), wd), thisWeek: occMon === monday() };
  }
  if (t.ty === 'monthly') {
    const [y, m] = ymd(today).split('-').map(Number), at = monthlyOn(t.mr, y, m);
    const ny = m === 12 ? y + 1 : y, nm = m === 12 ? 1 : m + 1;
    return { key: 'm' + y + '-' + String(m).padStart(2, '0'), at, next: monthlyOn(t.mr, ny, nm) };
  }
  return null;
}

/** Which "round" of a task a tick belongs to: today's date (daily), the occurrence's week (weekly) or month (monthly), or once. */
export function periodKey(t) {
  if (t.ty === 'daily') return ymd(B().today);
  const r = round(t);
  return r ? r.key : 'once';
}
export const doneNow = t => (t.done || []).find(x => x.k === periodKey(t)) || null;

/** When it's due, as a state for sorting and colours: overdue, today, soon (this week), later, anytime. */
export function dueOf(t) {
  const b = B(), weekEnd = addDays(monday(), 7);
  if (t.ty === 'daily') return { state: 'today', at: b.today, text: 'Every day' };
  const r = round(t);
  if (r) {
    const label = repeatText(t), done = (t.done || []).some(x => x.k === r.key);
    if (r.future) return { state: 'later', at: r.at, text: `${label} · starts ${dDate(r.at)}` };
    if (done && r.next && r.at <= b.today) return { state: r.next < weekEnd ? 'soon' : 'later', at: r.next, text: `${label} · next ${dDate(r.next)}` };
    const state = r.at < b.today ? 'overdue' : r.at < b.today + DAY ? 'today' : r.at < weekEnd ? 'soon' : 'later';
    const plain = t.ty === 'weekly' && (Number(t.ev) || 1) === 1 && state !== 'overdue';       // "Every Wednesday" says it all
    return { state, at: r.at, text: plain ? label : `${label} · ${state === 'overdue' ? 'was due ' : state === 'today' ? 'today, ' : ''}${dDate(r.at)}` };
  }
  if (!t.due) return { state: 'anytime', at: Infinity, text: t.ty === 'project' ? 'No due date' : 'Anytime' };
  const d = t.due;
  const state = d < b.today ? 'overdue' : d < b.today + DAY ? 'today' : d < weekEnd ? 'soon' : 'later';
  return { state, at: d, text: state === 'today' ? 'Today' : state === 'overdue' ? 'Was due ' + dDate(d) : 'Due ' + dDate(d) };
}

/** Open (not done this round) tasks first, by due date. */
const ORDER = { overdue: 0, today: 1, soon: 2, later: 3, anytime: 4 };
export function sortTasks(list) {
  return list.slice().sort((a, c) => (!!doneNow(a) - !!doneNow(c)) || (ORDER[dueOf(a).state] - ORDER[dueOf(c).state]) || (dueOf(a).at - dueOf(c).at) || a.t.localeCompare(c.t));
}
export const allTasks = () => D.tasks || [];
/** What needs doing today for a person: overdue + due today (daily, this weekday, dated today), not done yet. */
export const todayFor = e => allTasks().filter(t => t.a === lc(e) && !doneNow(t) && ['overdue', 'today'].includes(dueOf(t).state));
export const projects = () => [...new Set(allTasks().map(t => t.p).filter(Boolean))].sort();
/** Open to-dos that have been waiting a while: 7+ days since they were added, or past their due date. */
export const waitingLong = t => !doneNow(t) && (dueOf(t).state === 'overdue' || (t.on && Date.now() - t.on >= 7 * DAY && !['daily', 'weekly', 'monthly'].includes(t.ty)));
export const fmtDone = x => x ? `${x.by || 'Someone'} · ${fmt(x.at, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}` : '';
