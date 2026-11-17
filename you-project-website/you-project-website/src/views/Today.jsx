import { useState } from 'react';
import { CalendarClock, ChevronDown, ChevronUp, Users } from 'lucide-react';
import * as L from '../lib/logic.js';
import { D, B, DAY, H, dDate, dTime, lc, noteFor, plural } from '../lib/logic.js';
import { Pill, Seg, cx } from '../components/ui.jsx';
import { openClient, openClass } from '../components/people.jsx';

const HIDE_KEY = 'studio.todayHidden';
const first = s => lc(String(s || '').split(/[\s|,&]+/)[0]);

/** Who's signed in, as a first name that can be matched against the coach name on a Hapana class. */
function myName() {
  const u = D.user || {};
  return first(u.name) || first(String(u.email || '').split('@')[0].replace(/[._-]+/g, ' '));
}
export const isMine = c => { const me = myName(); return !!me && String(c.i || '').split(/\s*[,&/]\s*|\s+and\s+/i).some(x => first(x) === me); };

/** The things worth knowing about one person walking into one class. Most important first. */
export function badgesFor(ci, t) {
  const c = D.clients[ci], b = B(), out = [];
  if (!c) return out;
  const before = L.countFor(ci, b.today - 400 * DAY, t);
  const f = L.firstOf(c);                                           // first visit ever (from Hapana where known)
  if (!f && !before) out.push(['green', 'First class']);
  else if (f && f >= b.today - 30 * DAY && before + 1 <= 4) out.push(['green', before ? `New · visit ${before + 1}` : 'First class']);
  const intro = (D.intros || []).find(x => x.e && x.e === c.e && !x.convOn && x.d - DAY <= t && t < L.introEnd(x));
  if (intro) {
    const st = L.introStart(intro).s || b.today, len = L.introDays(intro), day = Math.floor((t - st) / DAY) + 1, ends = st + len * DAY;
    out.push(len - day <= 7 ? ['orange', `Intro ends ${dDate(ends)}`] : ['accent', `Intro day ${day} of ${len}`]);
  }
  if (c.bd) {
    const y = Number(L.fmt(t, { year: 'numeric' })), bd = Date.parse(`${y}-${c.bd}T12:00:00+09:30`), diff = Math.round((bd - (b.today + 12 * H)) / DAY);
    if (diff === 0) out.push(['gold', 'Birthday today']); else if (diff > -4 && diff < 4) out.push(['gold', diff < 0 ? 'Birthday this week' : `Birthday ${L.fmt(bd, { weekday: 'short' })}`]);
  }
  if (c.ltExact && (D.lifeMilestones || []).length) {
    const lt0 = L.lifetimeOf(c) - L.countFor(ci, b.today, b.now), n = lt0 + L.countFor(ci, b.today, t) + 1;
    if (D.lifeMilestones.indexOf(n) > -1) out.push(['gold', `${n}th visit`]);
  }
  const e = c.e;
  // admins see the Geronimo flag names; coaches see what it means instead
  if (e && L.geronimoRed().list.some(m => m.e === e)) out.push(['red', L.isEditor() ? 'Red Flag: no visits since last Mon' : 'First visit in over a week']);
  else if (e && L.geronimoOrange().list.some(m => m.e === e)) out.push(['orange', L.isEditor() ? 'Orange Flag' : 'Quiet start to the week']);
  if (L.recentlyBack({ e, n: c.n })) out.push(['lilac', 'Back from a break']);
  if (c.pay) out.push(['red', 'Payment issue']);
  (noteFor(e).tags || []).forEach(tg => out.push(['grey', tg]));
  return out;
}

function ClassBlock({ c, open: open0 }) {
  const b = B(), [open, setOpen] = useState(open0);
  const end = c.t + 60 * 60 * 1000, now = c.t <= b.now && b.now < end, done = b.now >= end;
  const ns = c.ns || [], known = !!c.a || ns.length > 0;          // known = Hapana check-ins are in (next morning's update)
  const people = c.p.map(ci => ({ ci, c: D.clients[ci], tags: badgesFor(ci, c.t) })).filter(x => x.c)
    .sort((a, z) => z.tags.filter(t => t[0] !== 'grey').length - a.tags.filter(t => t[0] !== 'grey').length || a.c.n.localeCompare(z.c.n))
    .concat(ns.map(ci => ({ ci, c: D.clients[ci], tags: [['red', 'No-show']].concat(badgesFor(ci, c.t)), noshow: true })).filter(x => x.c));
  const heads = people.filter(x => !x.noshow && x.tags.some(t => t[0] !== 'grey')).length;
  const booked = c.p.length + ns.length;
  const count = !done ? `${booked} booked · ${c.c} spots`
    : known ? `${c.p.length}/${booked} attended${ns.length ? ` · ${plural(ns.length, 'no-show')}` : ''}`
    : `${booked} booked · check-ins update after 8pm`;
  return (
    <div className={cx('border-t border-line/[.07]', done && 'opacity-70')}>
      <button onClick={() => setOpen(o => !o)} className="flex w-full items-center gap-4 px-5 py-3.5 text-left transition-colors hover:bg-raised/40">
        <div className="w-[84px] shrink-0"><div className="whitespace-nowrap font-display text-[15px] tabular-nums text-ink">{dTime(c.t)}</div>
          {now ? <span className="pill pill-green mt-1">Now</span> : done ? <span className="text-[11px] text-faint">Done</span> : null}</div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-medium text-ink">{c.n}</div>
          <div className="truncate text-[12.5px] text-muted">{c.i || 'No coach listed'} · {count}{heads ? ` · ${plural(heads, 'person', 'people')} to know about` : ''}</div>
        </div>
        <ChevronDown className={cx('h-4 w-4 shrink-0 text-faint transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="px-5 pb-4">
          {people.length ? <div className="grid gap-1.5 sm:grid-cols-2">{people.map(x => (
            <button key={x.ci + (x.noshow ? 'ns' : '')} onClick={() => openClient(x.ci)} className={cx('flex min-w-0 flex-col items-start gap-1 rounded-lg border px-3 py-2 text-left transition-colors hover:border-primary/30 hover:bg-raised/60', x.noshow ? 'border-red/25 bg-red/[.05]' : 'border-line/[.08] bg-raised/30')}>
              <span className="truncate text-[13px] text-ink">{x.c.n}</span>
              {x.tags.length ? <span className="flex flex-wrap gap-1">{x.tags.map(([tone, label]) => <Pill key={label} tone={tone}>{label}</Pill>)}</span>
                : <span className="text-[11.5px] text-faint">{L.pkgText(x.ci)}</span>}
            </button>))}</div>
            : <p className="text-[12.5px] text-faint">Nobody booked yet.</p>}
          <button onClick={() => openClass(c)} className="mt-2 text-[12px] text-primary hover:underline">Class details</button>
        </div>
      )}
    </div>
  );
}

/** Home, top: today's classes for whoever is signed in (or everyone's), with the people in them and what to know. */
export default function TodayPanel() {
  const b = B();
  const today = L.classesIn(b.today, b.today + DAY).slice().sort((a, z) => a.t - z.t);
  // after the last class (or on a closed day), show the next day the studio is open
  let list = today, label = 'Today';
  if (!today.some(c => c.t + H >= b.now)) {
    for (let i = 1; i <= 6; i++) { const d = L.shiftDays(b.today, i), next = L.classesIn(d, L.shiftDays(d, 1)); if (next.length) { list = next.slice().sort((a, z) => a.t - z.t); label = i === 1 ? 'Tomorrow' : dDate(d); break; } }
  }
  const mine = list.filter(isMine);
  const [scope, setScope] = useState(mine.length ? 'mine' : 'all');
  const [hidden, setHidden] = useState(() => { try { return localStorage.getItem(HIDE_KEY) === '1'; } catch (e) { return false; } });
  const [showDone, setShowDone] = useState(false);
  const toggle = () => setHidden(h => { try { localStorage.setItem(HIDE_KEY, h ? '0' : '1'); } catch (e) {} return !h; });
  const rows = scope === 'mine' ? mine : list;
  const isDone = c => b.now >= c.t + H;
  const done = rows.filter(isDone), upcoming = rows.filter(c => !isDone(c));
  const next = upcoming[0];
  const firstName = String((D.user && D.user.name) || '').split(' ')[0];
  const title = label === 'Today' ? 'Today’s classes' : `Next classes: ${label}`;
  return (
    <section className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <button onClick={hidden ? toggle : undefined} className={cx('flex min-w-0 items-center gap-3 text-left', !hidden && 'cursor-default')}>
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/20 text-primary ring-1 ring-primary/40"><CalendarClock className="h-[18px] w-[18px]" /></span>
          <div className="min-w-0"><h2 className="font-display text-[13.5px] tracking-sub text-ink">{title}</h2>
            <p className="mt-0.5 truncate text-[12px] text-faint">{hidden
              ? (next ? `${plural(rows.length, 'class')} · ${next.t <= b.now ? 'on now' : 'next'}: ${dTime(next.t)} ${next.n}` : `${plural(rows.length, 'class')}, all done`)
              : `${scope === 'mine' ? `Classes ${firstName || 'you'} ${label === 'Today' ? 'is' : 'are'} coaching` : 'Everyone’s classes'} · tap a class to see who’s in it`}</p></div>
        </button>
        <div className="flex items-center gap-2">
          {!hidden && <Seg options={[['mine', `Mine (${mine.length})`], ['all', `All (${list.length})`]]} value={scope} onChange={setScope} />}
          <button onClick={toggle} className="btn px-2.5 py-1 text-[12px]" aria-expanded={!hidden} title={hidden ? 'Show today’s classes' : 'Minimise'}>
            {hidden ? <><ChevronDown className="h-3.5 w-3.5" />Show</> : <><ChevronUp className="h-3.5 w-3.5" />Minimise</>}</button>
        </div>
      </div>
      {!hidden && (rows.length ? <>
          {done.length > 0 && upcoming.length > 0 && (
            <button onClick={() => setShowDone(v => !v)} className="flex w-full items-center justify-between border-t border-line/[.07] px-5 py-2.5 text-left text-[12.5px] text-muted transition-colors hover:bg-raised/40 hover:text-ink">
              <span>Earlier today: {plural(done.length, 'class')} done</span><ChevronDown className={cx('h-4 w-4 text-faint transition-transform', showDone && 'rotate-180')} /></button>)}
          {(showDone || !upcoming.length ? done : []).map(c => <ClassBlock key={c.t + c.n} c={c} open={false} />)}
          {upcoming.map((c, i) => <ClassBlock key={c.t + c.n} c={c} open={i === 0} />)}
        </>
        : <div className="flex items-center gap-3 border-t border-line/[.07] px-5 py-5 text-[13px] text-muted"><Users className="h-4 w-4" />
            {scope === 'mine' ? <>No classes with your name on them. <button className="text-primary hover:underline" onClick={() => setScope('all')}>See everyone’s</button></> : 'No classes on the timetable.'}</div>)}
    </section>
  );
}
