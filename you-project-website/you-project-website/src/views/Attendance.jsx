import { useState } from 'react';
import { Footprints, Users, CalendarDays, Gauge, CircleSlash, BarChart3, Dumbbell, UserRound, Sparkles } from 'lucide-react';
import * as L from '../lib/logic.js';
import { D, B, DAY, H, dDate, dTime, dKey, plural, ago, lc } from '../lib/logic.js';
import { useNav, setView } from '../lib/store.js';
import { Card, Stat, StatGrid, Seg, Pill, Row, List, More, Note, Warn, Toolbar, SearchBox, cx } from '../components/ui.jsx';
import { DayBars, WeekCards } from '../components/charts.jsx';
import { openClient, openClass, openClients, openClassList, openList } from '../components/people.jsx';

export function RangeBar() {
  const { v } = useNav();
  return <Toolbar><Seg options={L.RANGES} value={v.range} onChange={x => setView({ range: x })} /></Toolbar>;
}
const EarlyNote = ({ a }) => !D.hasHistory && a < D.firstClass - DAY ? <Warn>Older history is still being loaded from Hapana, so this range may be incomplete for now.</Warn> : null;

export function AttOverview() {
  const { v } = useNav();
  const [a, b, label] = L.rangeBounds(v.range), cls = L.classesIn(a, b).filter(c => c.t < B().now);
  const visits = cls.reduce((t, c) => t + c.b, 0), cap = cls.reduce((t, c) => t + c.c, 0);
  const people = new Set(); cls.forEach(c => c.p.forEach(ci => people.add(ci)));
  const days = []; for (let t = a + 12 * H; t < b; t += DAY) { const k = dKey(t); const l = cls.filter(c => dKey(c.t) === k); days.push({ t, l, v: l.reduce((s, c) => s + c.b, 0) }); }
  const grp = keyFn => { const m = {}; cls.forEach(c => { const k = keyFn(c); (m[k] = m[k] || { k, s: 0, v: 0, c: 0 }); m[k].s++; m[k].v += c.b; m[k].c += c.c; }); return Object.values(m).sort((x, y) => y.v - x.v); };
  const ns = []; cls.forEach(c => (c.ns || []).forEach(ci => ns.push({ ci, cl: c })));
  const grow = g => (
    <div key={g.k} className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-line/[.06] px-5 py-3 last:border-0 md:grid-cols-[1.4fr_1fr_auto_100px]">
      <div className="truncate">{g.k}</div><div className="sub hidden md:block">{plural(g.s, 'session')}</div>
      <Pill tone="primary">{g.v} visits</Pill><div className="sub hidden text-right md:block">{g.c ? Math.round(g.v / g.c * 100) + '% full' : ''}</div>
    </div>
  );
  return (
    <div className="space-y-5">
      <RangeBar /><EarlyNote a={a} />
      <StatGrid cols={L.D.statusKnown ? 'lg:grid-cols-5' : 'lg:grid-cols-4'}>
        <Stat icon={Footprints} label="Visits" value={visits} sub={label} />
        <Stat icon={Users} label="Different people" value={people.size} sub="Click to see who" tone="accent"
          onClick={() => openClients('People who came', label, [...people].map(ci => ({ ci, c: D.clients[ci], n: L.countFor(ci, a, b) })).sort((x, y) => y.n - x.n))} />
        <Stat icon={CalendarDays} label="Classes" value={cls.length} sub="Click to see each class" onClick={() => openClassList(label, cls)} />
        <Stat icon={Gauge} label="Average fill" value={cap ? Math.round(visits / cap * 100) + '%' : '—'} tone="green" />
        {D.statusKnown && <Stat icon={CircleSlash} label="No-shows" value={ns.length} sub="Booked but didn’t come" tone="red" onClick={() => openNoShows(label, ns)} />}
      </StatGrid>
      <Card title="Visits by day" icon={BarChart3} footer="Click a bar to see that day’s classes."><div className="px-3 pt-4"><DayBars days={days} /></div></Card>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="By class type" icon={Dumbbell}><List rows={grp(c => c.n.replace(/\s+$/, ''))} render={grow} empty="No classes in this range." max={460} /></Card>
        <Card title="By instructor" icon={UserRound}><List rows={grp(c => c.i.replace(/\s*\(sub\)/i, '') || 'Unassigned')} render={grow} empty="No classes in this range." max={460} /></Card>
      </div>
    </div>
  );
}

const openNoShows = (label, ns) => openList('No-shows', label + ' · ' + plural(ns.length, 'booking'), ns, r => D.clients[r.ci].n, r => `${r.cl.n} · ${dDate(r.cl.t)}, ${dTime(r.cl.t)}`, r => openClient(r.ci));

export function AttClasses() {
  const { v } = useNav(), off = v.wkOff || 0, start = off ? B().lastMonday : B().monday, end = start + 7 * DAY + 2 * H;
  const wk = D.classes.filter(c => c.t >= start && c.t < end).sort((a, b) => a.t - b.t);
  return (
    <div className="space-y-5">
      <Toolbar><Seg options={[[-1, 'Last week'], [0, 'This week']]} value={off} onChange={x => setView({ wkOff: x })} /></Toolbar>
      <WeekCards start={start} />
      <Card title="All classes" icon={CalendarDays} count={wk.length}>
        <List rows={wk} empty="No classes this week." render={(c, i) => (
          <Row key={i} onClick={() => openClass(c)}>
            <div className="grid grid-cols-[1fr_auto] items-center gap-3 md:grid-cols-[1.4fr_1fr_auto_90px]">
              <div className="min-w-0"><div className="truncate">{c.n}</div><div className="sub">{dDate(c.t)}, {dTime(c.t)}</div></div>
              <div className="sub hidden md:block">{c.i}</div>
              <Pill tone={c.c && c.b >= c.c ? 'green' : 'grey'}>{c.b}/{c.c}</Pill>
              <div className="sub hidden text-right md:block">{c.c ? Math.round(c.b / c.c * 100) + '% full' : ''}</div>
            </div>
          </Row>)} />
      </Card>
    </div>
  );
}

/** From the template: a proper No-shows list (Hapana marks attended / no-show on each booking). */
export function AttNoShows() {
  const { v } = useNav();
  const [q, setQ] = useState('');
  const [a, b, label] = L.rangeBounds(v.range);
  if (!D.statusKnown) return <div className="space-y-5"><RangeBar /><Warn>No-shows appear once Hapana attendance statuses are coming through (the 6am refresh marks each booking as attended or no-show).</Warn></div>;
  const ns = L.noShows(a, Math.min(b, B().now));
  const by = {}; ns.forEach(r => { (by[r.ci] = by[r.ci] || { ci: r.ci, c: D.clients[r.ci], list: [] }).list.push(r.cl); });
  const people = Object.values(by).filter(p => !q || lc(p.c.n).includes(lc(q))).sort((x, y) => y.list.length - x.list.length || x.c.n.localeCompare(y.c.n));
  const repeat = people.filter(p => p.list.length >= 2).length;
  return (
    <div className="space-y-5">
      <RangeBar />
      <StatGrid cols="lg:grid-cols-3">
        <Stat icon={CircleSlash} label="No-shows" value={ns.length} sub={label} tone="red" />
        <Stat icon={Users} label="People" value={Object.keys(by).length} sub="Booked and didn’t come" />
        <Stat icon={Sparkles} label="Two or more" value={repeat} sub="Worth a friendly check-in" tone="orange" />
      </StatGrid>
      <Card title="No-shows by person" icon={CircleSlash} tone="red" count={people.length} countTone="red" right={<SearchBox value={q} onChange={setQ} placeholder="Search by name" className="sm:w-64" />}
        footer="Bookings Hapana marked as no-show or late cancel. They aren’t counted as visits anywhere on the dashboard.">
        <List rows={people} empty="No no-shows in this range." render={p => (
          <Row key={p.ci} onClick={() => openClient(p.ci)}>
            <div className="grid grid-cols-[1fr_auto] items-center gap-3 md:grid-cols-[1.1fr_1.8fr_auto]">
              <div className="min-w-0"><div className="truncate">{p.c.n}</div><div className="sub truncate">{L.pkgText(p.ci)}</div></div>
              <div className="sub hidden truncate md:block">{p.list.slice(0, 3).map(c => `${c.n} ${L.fmt(c.t, { weekday: 'short', day: 'numeric' })}`).join(' · ')}{p.list.length > 3 ? ` +${p.list.length - 3}` : ''}</div>
              <Pill tone={p.list.length >= 2 ? 'red' : 'orange'}>{plural(p.list.length, 'no-show')}</Pill>
            </div>
          </Row>)} />
      </Card>
    </div>
  );
}

export function AttFringe() {
  const { v } = useNav();
  const [a, b] = L.rangeBounds(v.range), fr = L.fringe(a, Math.min(b, B().now));
  const mod = fr.filter(f => f.n <= 2), eng = fr.filter(f => f.n >= 3);
  const row = f => (
    <Row key={f.ci} onClick={() => openClient(f.ci)}>
      <div className="grid grid-cols-[1fr_auto] items-center gap-3">
        <div className="min-w-0"><div className="truncate">{f.c.n}</div><div className="sub truncate">{L.pkgText(f.ci)}</div></div>
        <div className="text-right"><Pill tone="primary">{plural(f.n, 'visit')}</Pill><div className="sub mt-0.5">Last {ago(f.c.l).toLowerCase()}</div></div>
      </div>
    </Row>
  );
  return (
    <div className="space-y-5">
      <RangeBar /><EarlyNote a={a} />
      <Note>People who came in during this period but aren’t on an ongoing membership: intro offers, class packs and casuals. These are your membership conversations. For members at risk of dropping off, see the Fringe List under Members › Risks.</Note>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="Engaged: 3+ visits" count={eng.length} countTone="green"><List rows={eng} render={row} empty="Nobody in this range." max={520} /></Card>
        <Card title="Moderate: 1–2 visits" count={mod.length} countTone="orange"><List rows={mod} render={row} empty="Nobody in this range." max={520} /></Card>
      </div>
    </div>
  );
}
