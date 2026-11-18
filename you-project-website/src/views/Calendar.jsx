// Team hub → Calendar: Hapana's class timetable (by coach) plus meetings, leave and events the team adds.
// Classes: "Schedule" + "Schedule_Ahead" tabs (Calendar.gs). Events: the Sheet's "Calendar" tab.
import { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Check, Trash2, MapPin, Users, CalendarDays, Plane, Star, Dumbbell, Repeat } from 'lucide-react';
import { D, B, lc, fmt } from '../lib/logic.js';
import { TZ, DAY, H, addDays, dayStart, ymd, fromYmd, offsetAt } from '../../shared/time.js';
import { useNav, setView, save, toast, openDrawer, backDrawer } from '../lib/store.js';
import { Seg, Note, Pill, cx } from '../components/ui.jsx';
import { openClass } from '../components/people.jsx';

// ---------- colours: the theme palette, one per person ----------
const PERSON_TONES = ['accent', 'lilac', 'red', 'green', 'orange', 'gold', 'mark'];   // most distinct first; coaches get these
const TEAM_TONE = 'teal';
const LEAD_COACH = '';   // first name, lower case, of the coach who gets the brand colour (optional)                       // events for the whole team
const tint = (tone, a) => `rgb(var(--${tone}) / ${a})`;
const firstName = s => String(s || '').trim().split(/[\s|,&/]+/)[0];
const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;
const coachesOf = i => String(i || '').split(/\s*[,&/]\s*|\s+and\s+/i).map(firstName).filter(Boolean);

/** Everyone who shows up on the calendar (coaches + the team), each with a fixed colour. LEAD_COACH (if set) gets the brand colour. */
function people() {
  const names = new Map();
  const addName = n => { const f = cap(lc(firstName(n))); if (f && !names.has(lc(f))) names.set(lc(f), f); };
  ((D.cal && D.cal.classes) || []).forEach(c => coachesOf(c.i).forEach(addName));
  const coaches = new Set(names.keys());
  (D.team || []).forEach(p => addName(p.n));
  ((D.cal && D.cal.events) || []).forEach(e => (e.who || []).forEach(addName));
  const list = [...names.values()].sort((a, b) => (lc(b) === LEAD_COACH) - (lc(a) === LEAD_COACH) || coaches.has(lc(b)) - coaches.has(lc(a)) || a.localeCompare(b));
  let k = 0;
  return list.map(n => ({ n, tone: lc(n) === LEAD_COACH ? 'primary' : PERSON_TONES[k++ % PERSON_TONES.length] }));
}

// ---------- time helpers (studio time) ----------
const hmFmt = new Intl.DateTimeFormat('en-AU', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
const minsOf = t => { const [h, m] = hmFmt.format(new Date(t)).split(':').map(Number); return h * 60 + m; };
const tShort = t => fmt(t, { hour: 'numeric', minute: '2-digit' }).replace(':00', '').replace(/\s/g, '').toLowerCase();
/** A studio-time date ('yyyy-mm-dd') + time ('hh:mm') → ms. */
function at(dateStr, timeStr) {
  const [y, m, d] = dateStr.split('-').map(Number), [h, mi] = String(timeStr || '0:0').split(':').map(Number);
  const guess = Date.UTC(y, m - 1, d, h || 0, mi || 0);
  return guess - offsetAt(guess - offsetAt(guess));
}
const hhmm = t => hmFmt.format(new Date(t));
const newId = () => 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

const TYPES = [['meeting', 'Meeting', Users], ['leave', 'Away / leave', Plane], ['event', 'Event', Star], ['other', 'Other', CalendarDays]];
const typeIcon = ty => (TYPES.find(x => x[0] === ty) || TYPES[0])[2];

/** Classes + events (repeats expanded) between two moments, as calendar items. */
function itemsBetween(from, to, ppl) {
  const toneOf = n => (ppl.find(p => lc(p.n) === lc(firstName(n))) || {}).tone || 'mark';
  const out = [];
  ((D.cal && D.cal.classes) || []).forEach(c => {
    if (c.t < from || c.t >= to) return;
    const who = coachesOf(c.i);
    out.push({ k: 'c' + c.t + c.n, kind: 'class', s: c.t, e: c.t + (c.m || 60) * 6e4, title: c.n, who, sub: c.i, tone: toneOf(who[0]), c });
  });
  ((D.cal && D.cal.events) || []).forEach(ev => {
    const len = Math.max((ev.e || ev.s + H) - ev.s, 15 * 6e4), step = ev.rp > 0 ? ev.rp * 7 : 0;
    const startDay = dayStart(ev.s), offset = ev.s - startDay;
    for (let i = 0; i < (step ? 400 : 1); i++) {
      const d = step ? addDays(startDay, i * step) : startDay, s = d + offset;
      if (s >= to || (ev.ru && d > ev.ru)) break;
      if (s + len <= from) continue;
      out.push({ k: ev.id + '|' + i, kind: 'event', s, e: s + len, title: ev.t, who: ev.who || [], sub: ev.wh, ad: ev.ad, ev, occ: d,
        tone: (ev.who || []).length === 1 ? toneOf(ev.who[0]) : TEAM_TONE });
    }
  });
  return out.sort((a, b) => a.s - b.s || (b.e - b.s) - (a.e - a.s));
}

/** Side-by-side lanes for overlapping items in one day. */
function lanes(items) {
  const res = []; let cluster = [], clusterEnd = 0, laneEnds = [];
  const flush = () => { const w = laneEnds.length; cluster.forEach(x => { x.w = w; }); cluster = []; laneEnds = []; };
  items.forEach(it => {
    if (cluster.length && it.s >= clusterEnd) flush();
    let l = laneEnds.findIndex(e => e <= it.s); if (l < 0) { l = laneEnds.length; laneEnds.push(0); }
    laneEnds[l] = it.e; it.l = l; cluster.push(it); clusterEnd = Math.max(clusterEnd, it.e); res.push(it);
  });
  flush();
  return res;
}

function openItem(it) {
  if (it.kind === 'event') return openEventEditor(it.ev);
  const c = (D.classes || []).find(x => x.t === it.c.t && x.n === it.c.n);
  if (c) return openClass(c);
  openDrawer(it.title, `${fmt(it.s, { weekday: 'long', day: 'numeric', month: 'long' })}, ${tShort(it.s)}–${tShort(it.e)}`, () => (
    <div className="space-y-2 text-[13.5px]">
      <p>Coach: <b>{it.sub || 'Not set in Hapana'}</b></p>
      {it.c.c > 0 && <p className="text-muted">{it.c.c} spots</p>}
      <p className="text-[12.5px] text-faint">From Hapana’s timetable. Bookings show here from the week of the class.</p>
    </div>));
}

// ---------- the page ----------
export function TeamCalendar() {
  const { v } = useNav(), b = B(), ppl = people();
  const off = v.calOff || 0, who = v.calWho || 'all', showClasses = v.calClasses !== false;
  const view = v.calView || (typeof window !== 'undefined' && window.innerWidth < 760 ? 'list' : 'week');
  const mon = addDays(b.monday, 7 * off), next = addDays(mon, 7);
  const all = itemsBetween(mon, next, ppl).filter(it => (showClasses || it.kind !== 'class') &&
    (who === 'all' || it.who.some(n => lc(firstName(n)) === lc(who)) || (it.kind === 'event' && !it.who.length)));
  let days = [...Array(7)].map((_, i) => addDays(mon, i));
  if (!all.some(it => it.s >= days[6])) days = days.slice(0, 6);       // no Sunday column unless something's on
  const cal = D.cal;
  const range = `${fmt(mon, { day: 'numeric', month: 'short' })} – ${fmt(addDays(mon, days.length - 1), { day: 'numeric', month: 'short', year: 'numeric' })}`;
  const noTimetable = off > 0 && cal && cal.aheadTo && mon > cal.aheadTo;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Note>Hapana’s class timetable, coloured by coach, plus anything the team adds: meetings, leave, events. Tap a class to see who’s booked, or tap a free spot to add something.</Note>
        <button onClick={() => openEventEditor(null, { date: ymd(Math.max(b.today, mon)) })} className="btn btn-primary"><Plus className="h-3.5 w-3.5" />Add to calendar</button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => setView({ calOff: off - 1 })} className="btn px-2" aria-label="Previous week"><ChevronLeft className="h-4 w-4" /></button>
          <button onClick={() => setView({ calOff: 0 })} className={cx('btn px-3', off === 0 && 'border-primary/50')}>This week</button>
          <button onClick={() => setView({ calOff: off + 1 })} className="btn px-2" aria-label="Next week"><ChevronRight className="h-4 w-4" /></button>
          <span className="ml-1 font-display text-[13.5px] tracking-sub text-ink">{range}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setView({ calClasses: !showClasses })} aria-pressed={showClasses} className={cx('btn px-2.5 py-1 text-[12.5px]', !showClasses && 'opacity-60')}>
            <Dumbbell className="h-3.5 w-3.5" />{showClasses ? 'Classes shown' : 'Classes hidden'}</button>
          <Seg options={[['week', 'Week'], ['list', 'List']]} value={view} onChange={x => setView({ calView: x })} />
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Chip active={who === 'all'} onClick={() => setView({ calWho: 'all' })}>Everyone</Chip>
        {ppl.map(p => <Chip key={p.n} tone={p.tone} active={lc(who) === lc(p.n)} onClick={() => setView({ calWho: lc(who) === lc(p.n) ? 'all' : p.n })}>{p.n}</Chip>)}
        <span className="inline-flex items-center gap-1.5 px-2 py-1 text-[12px] text-faint"><span className="h-2.5 w-2.5 rounded-full" style={{ background: tint(TEAM_TONE, 1) }} />Whole team</span>
      </div>

      {cal && cal.error && <p className="text-[12.5px] text-red">Couldn’t read the calendar: {cal.error}</p>}
      {!cal && <p className="text-[12.5px] text-muted">The calendar isn’t set up in Apps Script yet (Calendar.gs). Classes and events will show once it is.</p>}
      {noTimetable && <p className="text-[12.5px] text-faint">Hapana’s timetable is pulled 4 weeks ahead, so classes this far out aren’t in yet. Team events still show.</p>}

      {view === 'week' ? <WeekGrid days={days} items={all} b={b} /> : <AgendaList days={days} items={all} b={b} />}
    </div>
  );
}

function Chip({ tone, active, onClick, children, title }) {
  return (
    <button onClick={onClick} title={title} aria-pressed={active}
      className={cx('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] transition-colors', active ? 'border-line/40 bg-raised text-ink' : 'border-line/10 text-muted hover:text-ink')}>
      {tone && <span className="h-2.5 w-2.5 rounded-full" style={{ background: tint(tone, 1) }} />}{children}
    </button>
  );
}

const HOUR_PX = 52;
function WeekGrid({ days, items, b }) {
  const timed = items.filter(it => !it.ad), allDay = items.filter(it => it.ad);
  const startM = Math.min(6 * 60, ...timed.map(it => minsOf(it.s))), endM = Math.max(19 * 60, ...timed.map(it => Math.min(24 * 60, minsOf(it.s) + (it.e - it.s) / 6e4)));
  const h0 = Math.floor(startM / 60), h1 = Math.min(24, Math.ceil(endM / 60)), hours = [...Array(h1 - h0)].map((_, i) => h0 + i);
  const nowM = minsOf(b.now);
  const addAt = (d, e) => {
    const r = e.currentTarget.getBoundingClientRect(), m = h0 * 60 + Math.floor(((e.clientY - r.top) / HOUR_PX) * 2) * 30;
    const hh = String(Math.floor(m / 60)).padStart(2, '0'), mm = String(m % 60).padStart(2, '0');
    openEventEditor(null, { date: ymd(d), from: `${hh}:${mm}` });
  };
  return (
    <div className="card overflow-x-auto scroll-thin">
      <div style={{ minWidth: 120 + days.length * 120 }}>
        <div className="sticky top-0 z-10 grid border-b border-line/10 bg-surface" style={{ gridTemplateColumns: `52px repeat(${days.length}, 1fr)` }}>
          <div />
          {days.map(d => (
            <div key={d} className={cx('px-2 py-2.5 text-center', d === b.today && 'text-accent')}>
              <div className="text-[11px] uppercase tracking-sub text-faint">{fmt(d, { weekday: 'short' })}</div>
              <div className={cx('font-display text-[16px]', d === b.today ? 'text-accent' : 'text-ink')}>{fmt(d, { day: 'numeric' })}</div>
            </div>))}
        </div>
        {allDay.length > 0 && <div className="grid border-b border-line/10" style={{ gridTemplateColumns: `52px repeat(${days.length}, 1fr)` }}>
          <div className="px-1 py-2 text-right text-[10.5px] text-faint">all day</div>
          {days.map(d => <div key={d} className="space-y-1 border-l border-line/[.06] p-1">
            {allDay.filter(it => it.s < addDays(d, 1) && it.e > d).map(it => <Block key={it.k + d} it={it} flat />)}</div>)}
        </div>}
        <div className="grid" style={{ gridTemplateColumns: `52px repeat(${days.length}, 1fr)` }}>
          <div className="relative" style={{ height: hours.length * HOUR_PX }}>
            {hours.map((h, i) => <div key={h} className="absolute right-2 -translate-y-1/2 text-[10.5px] text-faint" style={{ top: i * HOUR_PX }}>{i ? (h % 12 || 12) + (h < 12 ? 'am' : 'pm') : ''}</div>)}
          </div>
          {days.map(d => {
            const list = lanes(timed.filter(it => it.s >= d && it.s < addDays(d, 1)));
            return (
              <div key={d} onClick={e => addAt(d, e)} className={cx('relative cursor-copy border-l border-line/[.06]', d === b.today && 'bg-accent/[.03]')} style={{ height: hours.length * HOUR_PX }}>
                {hours.map((h, i) => <div key={h} className="absolute inset-x-0 border-t border-line/[.06]" style={{ top: i * HOUR_PX }} />)}
                {d === b.today && nowM >= h0 * 60 && nowM <= h1 * 60 && <div className="pointer-events-none absolute inset-x-0 z-[5] border-t-2 border-accent" style={{ top: (nowM - h0 * 60) / 60 * HOUR_PX }}><span className="absolute -left-1 -top-[5px] h-2 w-2 rounded-full bg-accent" /></div>}
                {list.map(it => {
                  const top = (minsOf(it.s) - h0 * 60) / 60 * HOUR_PX, ht = Math.max(22, (it.e - it.s) / H * HOUR_PX - 2);
                  return <div key={it.k} className="absolute px-0.5" style={{ top, height: ht, left: `${it.l / it.w * 100}%`, width: `${100 / it.w}%` }}><Block it={it} /></div>;
                })}
              </div>);
          })}
        </div>
      </div>
    </div>
  );
}

function Block({ it, flat }) {
  const Icon = it.kind === 'event' ? typeIcon(it.ev.ty) : null, past = it.e < Date.now();
  return (
    <button onClick={e => { e.stopPropagation(); openItem(it); }} title={`${it.title}${it.sub ? ' · ' + it.sub : ''}`}
      className={cx('block h-full w-full overflow-hidden rounded-md px-1.5 py-1 text-left transition hover:brightness-110', past && 'opacity-55', it.kind === 'event' && it.ev.ty === 'leave' && 'bg-stripes')}
      style={{ backgroundColor: tint(it.tone, it.kind === 'event' ? 0.28 : 0.16), borderLeft: `3px solid ${tint(it.tone, 1)}` }}>
      <div className="flex items-center gap-1 truncate text-[11.5px] font-medium leading-tight text-ink">{Icon && <Icon className="h-3 w-3 shrink-0" />}{it.title}</div>
      {!flat && <div className="truncate text-[10.5px] leading-tight text-muted">{tShort(it.s)}{it.kind === 'class' ? ' · ' + it.who.join(', ') : it.who.length ? ' · ' + it.who.join(', ') : ''}</div>}
    </button>
  );
}

function AgendaList({ days, items, b }) {
  return (
    <div className="space-y-3">
      {days.map(d => {
        const list = items.filter(it => it.s < addDays(d, 1) && (it.ad ? it.e > d : it.s >= d));
        return (
          <section key={d} className={cx('card overflow-hidden', d < b.today && 'opacity-70')}>
            <div className="flex items-center justify-between border-b border-line/10 px-4 py-2.5">
              <div className={cx('font-display text-[13px] tracking-sub', d === b.today ? 'text-accent' : 'text-ink')}>{fmt(d, { weekday: 'long', day: 'numeric', month: 'short' })}{d === b.today ? ' · Today' : ''}</div>
              <button onClick={() => openEventEditor(null, { date: ymd(d) })} className="btn btn-ghost px-2 py-0.5 text-[12px]"><Plus className="h-3.5 w-3.5" />Add</button>
            </div>
            {list.length ? list.map(it => {
              const Icon = it.kind === 'event' ? typeIcon(it.ev.ty) : null;
              return (
                <button key={it.k} onClick={() => openItem(it)} className="flex w-full items-center gap-3 border-t border-line/[.06] px-4 py-2.5 text-left first:border-t-0 hover:bg-raised/40">
                  <span className="w-[62px] shrink-0 text-[12px] tabular-nums text-muted">{it.ad ? 'All day' : tShort(it.s)}</span>
                  <span className="h-8 w-1 shrink-0 rounded-full" style={{ background: tint(it.tone, 1) }} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 truncate text-[13.5px] text-ink">{Icon && <Icon className="h-3.5 w-3.5 shrink-0 text-muted" />}{it.title}</span>
                    <span className="block truncate text-[11.5px] text-faint">{it.kind === 'class' ? it.sub || 'No coach set' : [it.who.length ? it.who.join(', ') : 'Whole team', it.sub].filter(Boolean).join(' · ')}{!it.ad && it.kind === 'event' ? ` · until ${tShort(it.e)}` : ''}</span>
                  </span>
                </button>);
            }) : <p className="px-4 py-3 text-[12.5px] text-faint">Nothing on.</p>}
          </section>);
      })}
    </div>
  );
}

// ---------- add / edit an event ----------
function EventEditor({ ev, preset }) {
  const p = preset || {}, ppl = people();
  const [f, setF] = useState(() => ev ? {
    t: ev.t, ty: ev.ty || 'meeting', date: ymd(ev.s), from: hhmm(ev.s), to: hhmm(ev.e), ad: !!ev.ad, endDate: ymd(ev.ad ? ev.e - 1 : ev.e),
    who: ev.who || [], wh: ev.wh || '', n: ev.n || '', rp: String(ev.rp || 0), ru: ev.ru ? ymd(ev.ru) : ''
  } : { t: '', ty: 'meeting', date: p.date || ymd(B().today), from: p.from || '09:00', to: p.from ? `${String(Math.min(23, Number(p.from.slice(0, 2)) + 1)).padStart(2, '0')}:${p.from.slice(3)}` : '10:00',
    ad: false, endDate: '', who: [], wh: '', n: '', rp: '0', ru: '' });
  const [busy, setBusy] = useState(false), [sure, setSure] = useState(false);
  const set = k => e => setF(x => Object.assign({}, x, { [k]: e && e.target ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value) : e }));
  const toggleWho = n => setF(x => Object.assign({}, x, { who: x.who.includes(n) ? x.who.filter(y => y !== n) : x.who.concat(n) }));
  const submit = async () => {
    if (!f.t.trim()) return toast('Give it a title', 'error');
    let s, e;
    if (f.ad) { s = fromYmd(f.date); e = addDays(fromYmd(f.endDate && f.endDate >= f.date ? f.endDate : f.date), 1); }
    else { s = at(f.date, f.from); e = at(f.date, f.to); if (e <= s) return toast('The end time is before the start', 'error'); }
    setBusy(true);
    try {
      await save('saveEvent', { id: ev ? ev.id : newId(), t: f.t.trim(), ty: f.ty, s, e, ad: f.ad, who: f.who, wh: f.wh.trim(), n: f.n.trim(),
        rp: Number(f.rp) || 0, ru: Number(f.rp) && f.ru ? fromYmd(f.ru) : null });
      toast('Saved to the calendar'); backDrawer();
    } catch (er) { toast(er.message, 'error'); }
    setBusy(false);
  };
  const del = async () => {
    if (!sure) return setSure(true);
    setBusy(true);
    try { await save('deleteEvent', ev.id); toast('Deleted'); backDrawer(); } catch (er) { toast(er.message, 'error'); }
    setBusy(false);
  };
  const lbl = 'mb-1 block text-[12px] text-muted';
  return (
    <div className="space-y-4">
      <div><label className={lbl}>What is it?</label>
        <input autoFocus value={f.t} onChange={set('t')} onKeyDown={e => { if (e.key === 'Enter') submit(); }} className="input" placeholder="e.g. Team meeting" /></div>
      <div><label className={lbl}>Type</label><Seg options={TYPES.map(([k, l]) => [k, l])} value={f.ty} onChange={set('ty')} /></div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className={lbl}>{f.ad ? 'From' : 'Date'}</label><input type="date" value={f.date} onChange={set('date')} className="input" /></div>
        {f.ad ? <div><label className={lbl}>Until (optional)</label><input type="date" value={f.endDate} min={f.date} onChange={set('endDate')} className="input" /></div>
          : <div className="grid grid-cols-2 gap-2">
            <div><label className={lbl}>Start</label><input type="time" step={900} value={f.from} onChange={set('from')} className="input" /></div>
            <div><label className={lbl}>End</label><input type="time" step={900} value={f.to} onChange={set('to')} className="input" /></div></div>}
      </div>
      <label className="flex items-center gap-2 text-[13px] text-muted"><input type="checkbox" checked={f.ad} onChange={set('ad')} className="h-4 w-4 accent-[rgb(var(--primary))]" />All day{f.ty === 'leave' ? ' (handy for leave)' : ''}</label>
      <div><label className={lbl}>Who’s it for? <span className="text-faint">(nobody picked = the whole team)</span></label>
        <div className="flex flex-wrap gap-1.5">{ppl.map(x => <Chip key={x.n} tone={x.tone} active={f.who.includes(x.n)} onClick={() => toggleWho(x.n)}>{f.who.includes(x.n) && <Check className="h-3 w-3" />}{x.n}</Chip>)}</div></div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className={lbl}>Repeats</label>
          <select value={f.rp} onChange={set('rp')} className="input"><option value="0">Doesn’t repeat</option><option value="1">Every week</option><option value="2">Every 2 weeks</option><option value="4">Every 4 weeks</option></select></div>
        {f.rp !== '0' && <div><label className={lbl}>Until (optional)</label><input type="date" value={f.ru} min={f.date} onChange={set('ru')} className="input" /></div>}
      </div>
      <div><label className={lbl}>Where (optional)</label><input value={f.wh} onChange={set('wh')} className="input" placeholder="Studio, Zoom link…" /></div>
      <div><label className={lbl}>Notes (optional)</label><textarea value={f.n} onChange={set('n')} rows={3} className="input" placeholder="Agenda, anything that helps" /></div>
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button disabled={busy} onClick={submit} className="btn btn-primary"><Check className="h-3.5 w-3.5" />{busy ? 'Saving…' : ev ? 'Save changes' : 'Add to calendar'}</button>
        <button onClick={backDrawer} className="btn btn-ghost">Cancel</button>
        {ev && <button disabled={busy} onClick={del} className={cx('btn ml-auto', sure && 'border-red/40 text-red')}><Trash2 className="h-3.5 w-3.5" />{sure ? (ev.rp ? 'Tap again: deletes every repeat' : 'Tap again to delete') : 'Delete'}</button>}
      </div>
      {ev && <p className="text-[11.5px] text-faint">Added by {ev.by || 'someone'}{ev.rp ? ' · ' : ''}{ev.rp ? <><Repeat className="inline h-3 w-3" /> repeats every {ev.rp === 1 ? 'week' : ev.rp + ' weeks'}</> : ''}.</p>}
      {f.wh && /^https?:\/\//.test(f.wh.trim()) && <a href={f.wh.trim()} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[12.5px] text-accent hover:underline"><MapPin className="h-3.5 w-3.5" />Open link</a>}
    </div>
  );
}
export const openEventEditor = (ev, preset) => openDrawer(ev ? 'Edit' : 'Add to calendar', ev ? ev.t : 'Meetings, leave and events for the team',
  () => <EventEditor key={ev ? ev.id : 'new' + JSON.stringify(preset || {})} ev={ev} preset={preset} />);
