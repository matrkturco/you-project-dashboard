import { Activity, Footprints, Users, PhoneCall, TrendingDown, AlertTriangle, PauseCircle, Sparkles, UserPlus, UserX, PartyPopper, Cake, CreditCard, ShoppingBag, ChevronRight, CheckCircle2, Hourglass, Package, CalendarClock } from 'lucide-react';
import { openList, openPerson } from '../components/people.jsx';
import * as L from '../lib/logic.js';
import { D, B, DAY, plural } from '../lib/logic.js';
import { goto, useNav, setView } from '../lib/store.js';
import { MARK_VIEWBOX, MARK_PATH } from '../components/mark.js';
import { STUDIO } from '../studio.js';
import { TZ } from '../../shared/time.js';
import TodayPanel from './Today.jsx';
import { Card, Seg, Section, cx } from '../components/ui.jsx';
import { TrendChart, WeekCards } from '../components/charts.jsx';

export function TrendSection() {
  const { v } = useNav();
  const days = v.tDays || 30, metric = v.tMetric || 'visits';
  const pts = L.series(metric, days), summary = L.trendSummary(metric, days, pts);
  const enough = pts.filter(p => p.v !== null).length >= 2;
  return (
    <Card title={`Last ${days} days`} icon={Activity}
      right={<><Seg options={L.METRICS} value={metric} onChange={x => setView({ tMetric: x })} /><Seg options={[[30, '30 days'], [90, '90 days']]} value={days} onChange={x => setView({ tDays: x })} /></>}
      footer={pts.some(p => p.avg !== null) ? 'Faint line: each day · Solid line: 7-day average · Click a point to see that day’s classes' : null}>
      <div className="px-4 pb-2 pt-4">
        {summary && <p className="mb-2 px-1 text-[13px] text-muted">{summary}</p>}
        {enough ? <TrendChart pts={pts} metric={metric} /> : <p className="px-1 py-10 text-center text-[13px] text-muted">{metric === 'members' || metric === 'risk'
          ? 'This line builds up one day at a time from the first day the dashboard is opened. Check back in a few days.' : 'Not enough data yet for this range.'}</p>}
        {!D.hasHistory && <p className="px-1 pb-2 text-[12px] text-faint">Earlier history is still loading, so the start of the line may be low for now.</p>}
      </div>
    </Card>
  );
}

const TONE = {
  red: { chip: 'bg-red/20 text-red ring-red/40', num: 'text-red', bar: 'bg-red' },
  orange: { chip: 'bg-orange/20 text-orange ring-orange/40', num: 'text-orange', bar: 'bg-orange' },
  green: { chip: 'bg-green/20 text-green ring-green/40', num: 'text-green', bar: 'bg-green' },
  lilac: { chip: 'bg-lilac/20 text-lilac ring-lilac/40', num: 'text-lilac', bar: 'bg-lilac' },
  accent: { chip: 'bg-accent/20 text-accent ring-accent/40', num: 'text-accent', bar: 'bg-accent' },
  gold: { chip: 'bg-gold/20 text-gold ring-gold/40', num: 'text-gold', bar: 'bg-gold' },
  primary: { chip: 'bg-primary/20 text-primary ring-primary/40', num: 'text-primary', bar: 'bg-primary' }
};
const Chip = ({ icon: Icon, tone, big }) => (
  <span className={cx('grid shrink-0 place-items-center rounded-xl ring-1', TONE[tone].chip, big ? 'h-11 w-11' : 'h-9 w-9')}><Icon className={big ? 'h-5 w-5' : 'h-[18px] w-[18px]'} strokeWidth={2.25} /></span>
);
const PanelHead = ({ title, hint, right }) => (
  <div className="flex items-end justify-between gap-3 px-5 pb-3 pt-4">
    <div><h2 className="font-display text-[13.5px] tracking-sub text-ink">{title}</h2>{hint && <p className="mt-0.5 text-[12px] text-faint">{hint}</p>}</div>{right}
  </div>
);

/** One "needs attention" line: coloured icon, what it is in plain words, how many, and where it goes. */
function ActionRow({ icon, tone, title, what, value, onClick }) {
  const clear = !value;
  return (
    <button onClick={onClick} className="group flex w-full items-center gap-4 border-t border-line/[.07] px-5 py-3.5 text-left transition-colors hover:bg-raised/50">
      <Chip icon={clear ? CheckCircle2 : icon} tone={clear ? 'green' : tone} />
      <div className="min-w-0 flex-1">
        <div className="text-[14px] font-medium text-ink">{title}</div>
        <div className="text-[12.5px] leading-snug text-muted sm:truncate">{clear ? 'All clear' : what}</div>
      </div>
      <span className={cx('font-display text-[26px] font-medium tabular-nums leading-none', clear ? 'text-faint' : TONE[tone].num)}>{value}</span>
      <ChevronRight className="h-4 w-4 shrink-0 text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
    </button>
  );
}

/** A small labelled figure inside the Membership panel. */
function Mini({ icon, tone, value, label, sub, onClick }) {
  return (
    <button onClick={onClick} className="group flex items-center gap-3 rounded-xl border border-line/[.08] bg-raised/30 p-3 text-left transition-colors hover:border-primary/30 hover:bg-raised/60">
      <Chip icon={icon} tone={tone} />
      <div className="min-w-0">
        <div className="flex items-baseline gap-1.5"><span className={cx('font-display text-xl font-medium tabular-nums leading-none', TONE[tone].num)}>{value}</span><span className="truncate text-[12.5px] text-ink">{label}</span></div>
        <div className="mt-1 truncate text-[11.5px] text-faint">{sub}</div>
      </div>
    </button>
  );
}

/** Ring gauge for class fill. */
function Ring({ pct, tone }) {
  const r = 26, c = 2 * Math.PI * r, v = Math.max(0, Math.min(100, pct || 0));
  return (
    <svg viewBox="0 0 64 64" className={cx('h-16 w-16 shrink-0 -rotate-90', TONE[tone].num)} aria-hidden="true">
      <circle cx="32" cy="32" r={r} fill="none" stroke="currentColor" strokeOpacity=".15" strokeWidth="7" />
      <circle cx="32" cy="32" r={r} fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" strokeDasharray={`${c * v / 100} ${c}`} />
    </svg>
  );
}


/** Brand banner at the top of Home. Always dark, in both themes; colours from --brand / --hero-* in index.css, words from studio.js. */
function Hero({ visits, fu, alerts, due, coachLine }) {
  const now = new Date(), hr = Number(new Intl.DateTimeFormat('en-AU', { hour: 'numeric', hourCycle: 'h23', timeZone: TZ }).format(now));
  const hello = hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening';
  const first = String((D.user && D.user.name) || '').split(' ')[0];
  const date = new Intl.DateTimeFormat('en-AU', { weekday: 'long', day: 'numeric', month: 'long', timeZone: TZ }).format(now);
  const Hi = ({ children }) => <span className="font-medium text-[rgb(var(--brand))]">{children}</span>;
  return (
    <section className="relative isolate overflow-hidden rounded-3xl bg-[rgb(var(--hero-bg))] px-6 py-8 text-[rgb(var(--hero-ink))] ring-1 ring-white/[.06] sm:px-10 sm:py-11"
      style={{ backgroundImage: 'radial-gradient(120% 140% at 0% 100%, rgb(var(--brand) / .16) 0%, transparent 55%), radial-gradient(60% 90% at 85% 10%, rgb(var(--brand) / .10) 0%, transparent 60%)' }}>
      {/* diagonal light bands */}
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-[420px] w-[420px] rotate-[35deg] opacity-[.5]">
        <div className="absolute left-0 top-0 h-full w-14 bg-gradient-to-b from-[rgb(var(--brand)/0.25)] to-transparent" />
        <div className="absolute left-20 top-0 h-full w-6 bg-gradient-to-b from-[rgb(var(--brand)/0.15)] to-transparent" />
      </div>
      {/* large watermark mark */}
      <svg aria-hidden="true" viewBox={MARK_VIEWBOX} className="pointer-events-none absolute -bottom-16 right-[18%] hidden h-[260px] text-[rgb(var(--brand))] opacity-[.05] md:block"><path d={MARK_PATH} fill="currentColor" /></svg>
      {/* rotating badge around the mark */}
      <div aria-hidden="true" className="pointer-events-none absolute right-8 top-1/2 hidden h-40 w-40 -translate-y-1/2 lg:block xl:right-14 xl:h-44 xl:w-44">
        <svg viewBox="0 0 200 200" className="h-full w-full animate-[spin_40s_linear_infinite] motion-reduce:animate-none">
          <defs><path id="hero-ring" d="M100,100 m-78,0 a78,78 0 1,1 156,0 a78,78 0 1,1 -156,0" /></defs>
          <text fontSize="17" style={{ fill: 'rgb(var(--brand))', fontFamily: '"Space Grotesk", system-ui, sans-serif', fontWeight: 500 }}>
            <textPath href="#hero-ring" textLength="484" lengthAdjust="spacing">{(STUDIO.ringText + ' • ').repeat(4)}</textPath>
          </text>
        </svg>
        <svg viewBox={MARK_VIEWBOX} className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 text-[rgb(var(--brand))]"><path d={MARK_PATH} fill="currentColor" /></svg>
      </div>

      <div className="relative max-w-3xl">
        <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.25em] text-[rgb(var(--hero-ink)/0.7)]">
          <span>{hello}{first ? ', ' + first : ''}</span><span className="h-px w-10 bg-[rgb(var(--brand)/0.5)]" /><span className="hidden sm:inline">{date}</span>
        </div>
        <div className="mt-5 flex items-center gap-4 sm:gap-6">
          <svg viewBox={MARK_VIEWBOX} className="h-14 w-auto shrink-0 text-[rgb(var(--brand))] sm:h-[84px]" role="img" aria-label={STUDIO.name}><path d={MARK_PATH} fill="currentColor" /></svg>
          <h1 className="font-display leading-[0.95] tracking-[0.18em]">
            <span className="block text-[34px] font-medium text-[rgb(var(--hero-ink))] sm:text-[60px]">{STUDIO.wordmark[0]}</span>
            <span className="block text-[20px] font-normal text-transparent sm:text-[34px] sm:tracking-[0.42em]" style={{ WebkitTextStroke: '1.2px rgb(var(--brand))' }}>{STUDIO.wordmark[1]}</span>
          </h1>
        </div>
        <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-[rgb(var(--hero-ink)/0.8)] sm:text-[16px]">
          {coachLine || <><Hi>{visits} visits</Hi> so far this week and <Hi>{plural(fu, 'member')}</Hi> to follow up{alerts ? <>, with <Hi>{plural(due, 'reward')}</Hi> due.</> : '.'}</>}
        </p>
      </div>
    </section>
  );
}

/** Coaches' Home: the heads-ups a coach can act on in class. No sales, payments or Geronimo numbers. */
function CoachHome() {
  const b = B(), wk = L.classesIn(b.monday, b.nextMonday), visits = wk.filter(c => c.t < b.now).reduce((t, c) => t + c.b, 0);
  const todayN = L.classesIn(b.today, b.tomorrow).length, in7 = b.today + 7 * DAY, in14 = b.today + 14 * DAY;
  const Hi = ({ children }) => <span className="font-medium text-[rgb(var(--brand))]">{children}</span>;
  const row = (n, e, sub) => ({ n, e, sub });
  const intros = (D.intros || []).filter(x => !x.convOn && L.introStart(x).s && L.introEnd(x) >= b.today && L.introEnd(x) < in7)
    .sort((a, c) => L.introEnd(a) - L.introEnd(c)).map(x => row(x.n, x.e, `${L.shortPlan(x.plan)} · ends ${L.dDate(L.introEnd(x))}`));
  const notStarted = (D.intros || []).filter(x => !x.convOn && !L.introStart(x).s && x.d >= b.today - 30 * DAY).map(x => row(x.n, x.e, `${L.shortPlan(x.plan)} · bought ${L.dDate(x.d)}, not started yet`));
  const packs = (D.packs || []).filter(p => p.exp && p.exp >= b.today && p.exp < in14).sort((a, c) => a.exp - c.exp).map(p => row(p.n, p.e, `${L.shortPlan(p.plan)} · expires ${L.dDate(p.exp)}`));
  const memEnd = (D.cancelled || []).filter(x => x.d >= b.today && !L.notCxOf(x)).sort((a, c) => a.d - c.d).map(x => row(x.n, x.e, `${L.shortPlan(x.plan || 'Membership')} · finishes ${L.dDate(x.d)}`));
  const back = (D.suspended || []).filter(s => s.ends && s.ends >= b.today && s.ends < in7).map(s => row(s.n, s.e, `Back from a break ${L.dDate(s.ends)}`));
  const bd = L.birthdays(7, 0).map(x => row(x.c.n, x.c.e, x.diff === 0 ? 'Birthday today' : 'Birthday ' + L.dDate(x.t) + (x.age ? ` (turning ${x.age})` : '')));
  const cel = L.alertsOn() ? L.allCelebrations().now.filter(e => !e.done).map(e => row(e.c.n, e.c.e, e.label)) : [];
  const show = (title, rows) => () => openList(title, plural(rows.length, 'person'), rows, r => r.n, r => r.sub, r => openPerson(r));
  const items = [
    { icon: Hourglass, tone: 'orange', title: 'Intro offers ending soon', what: 'Ending in the next 7 days: a good moment to chat about what’s next', value: intros.length, onClick: show('Intro offers ending soon', intros) },
    { icon: Package, tone: 'orange', title: 'Packs running out', what: 'Class packs expiring in the next 14 days', value: packs.length, onClick: show('Packs running out', packs) },
    { icon: CalendarClock, tone: 'red', title: 'Memberships finishing', what: 'Cancelled, with a finish date still to come', value: memEnd.length, onClick: show('Memberships finishing', memEnd) },
    { icon: PauseCircle, tone: 'lilac', title: 'Back from a break this week', what: 'Suspensions ending in the next 7 days', value: back.length, onClick: show('Back from a break', back) },
    { icon: Sparkles, tone: 'accent', title: 'Bought an intro, not started', what: 'Bought in the last 30 days, no class yet', value: notStarted.length, onClick: show('Bought an intro, not started yet', notStarted) },
    { icon: Cake, tone: 'gold', title: 'Birthdays', what: 'In the next 7 days', value: bd.length, onClick: show('Birthdays this week', bd) }
  ].concat(L.alertsOn() ? [{ icon: PartyPopper, tone: 'gold', title: 'Milestones to celebrate', what: 'Reached a visit milestone', value: cel.length, onClick: () => goto('milestones', 'celebrate') }] : []);
  return (
    <div className="space-y-8">
      <Hero coachLine={<><Hi>{plural(todayN, 'class')}</Hi> today and <Hi>{visits} visits</Hi> so far this week.</>} />
      <TodayPanel />
      <section className="card overflow-hidden">
        <PanelHead title="Heads-ups for coaches" hint="Tap a line to see who" />
        {items.map(a => <ActionRow key={a.title} {...a} />)}
      </section>
      <Section title="This week"><WeekCards start={b.monday} /></Section>
    </div>
  );
}

export default function Home() {
  if (!L.isEditor()) return <CoachHome />;
  const b = B(), wk = L.classesIn(b.monday, b.nextMonday), past = wk.filter(c => c.t < b.now);
  const visits = past.reduce((t, c) => t + c.b, 0), ahead = wk.filter(c => c.t >= b.now).reduce((t, c) => t + c.b, 0), cap = past.reduce((t, c) => t + c.c, 0);
  const fill = cap ? Math.round(visits / cap * 100) : null;
  const fu = L.followUpNow(), sp = L.shortOfPlan(), fr = L.fringe(b.last7, b.now), fringe = L.geronimoFringe().list.length;
  const alerts = L.alertsOn(), due = alerts ? L.allCelebrations().now.filter(e => !e.done).length : 0;
  const faces = D.clients.filter(c => c.f && c.f >= b.today - 30 * DAY).length;
  const todo = L.workflow().todo.length, bdays = L.birthdays(7, 0).length, pay = D.clients.filter(c => c.pay).length;
  const sched = (D.suspScheduled || []).length, total = visits + ahead;
  const never = L.riskPool().filter(p => p.reasons.some(r => r.code === 'never')).length;
  const actions = [
    { icon: PhoneCall, tone: 'red', title: 'Members to contact', what: 'Flagged as at risk, and nobody has reached out yet', value: todo, onClick: () => goto('members', 'risks', { stage: 'todo', reason: 'all' }) },
    { icon: CreditCard, tone: 'red', title: 'Payment issues', what: 'Failed or outstanding payments in Hapana', value: pay, onClick: () => goto('mreports', 'payments') },
    { icon: ShoppingBag, tone: 'red', title: 'Bought, never came', what: 'Bought something in the last 60 days and haven’t been in since', value: never, onClick: () => goto('onboarding', 'never') },
    { icon: AlertTriangle, tone: 'orange', title: 'Fringe List', what: `${L.FRINGE_MAX} or fewer visits in the last ${L.FRINGE_DAYS} days`, value: fringe, onClick: () => goto('geronimo', 'fringe') },
    { icon: TrendingDown, tone: 'orange', title: 'Short of their plan', what: 'Still coming, but fewer classes than they pay for', value: sp.length, onClick: () => goto('geronimo', 'plan', { flag: 'orange' }) }
  ];
  const open = actions.filter(a => a.value).length;
  return (
    <div className="space-y-8">
      <Hero visits={visits} fu={fu.length} alerts={alerts} due={due} />

      <TodayPanel />

      <div className="grid gap-4 lg:grid-cols-5">
        <section className="card overflow-hidden lg:col-span-3">
          <PanelHead title="Needs attention" hint="Tap a line to see who" right={<span className={cx('pill', open ? 'pill-red' : 'pill-green')}>{open ? `${open} of ${actions.length} need action` : 'All clear'}</span>} />
          {actions.map(a => <ActionRow key={a.title} {...a} />)}
        </section>

        <section className="card flex flex-col overflow-hidden lg:col-span-2">
          <PanelHead title="Membership" hint="Last 7 days unless it says otherwise" />
          <button onClick={() => goto('members', 'active')} className="group mx-5 flex items-center gap-4 rounded-xl bg-gradient-to-br from-green/[.12] to-transparent p-4 text-left ring-1 ring-green/20 transition-colors hover:ring-green/40">
            <Chip icon={Users} tone="green" big />
            <div className="min-w-0 flex-1"><div className="font-display text-[34px] font-medium leading-none tabular-nums text-ink">{D.members.length}</div><div className="mt-1 text-[12.5px] text-muted">Active members on a membership</div></div>
            <ChevronRight className="h-4 w-4 text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
          </button>
          <div className="grid grid-cols-1 gap-2 p-5 pt-3 min-[420px]:grid-cols-2">
            <Mini icon={UserPlus} tone="green" value={D.changes.New.length ? `+${D.changes.New.length}` : '0'} label="joined" sub="New packages & memberships" onClick={() => goto('onboarding', 'signups')} />
            <Mini icon={UserX} tone="red" value={L.cancelledRecent().length ? `−${L.cancelledRecent().length}` : '0'} label="cancelled" sub="Memberships ended" onClick={() => goto('members', 'cancelled')} />
            <Mini icon={PauseCircle} tone="lilac" value={D.suspended.length} label="paused" sub={sched ? `${sched} more pause booked` : 'On suspension now'} onClick={() => goto('members', 'suspended')} />
            <Mini icon={Sparkles} tone="accent" value={faces} label="new faces" sub="First visit, last 30 days" onClick={() => goto('onboarding', 'new')} />
          </div>
          <button onClick={() => goto('milestones', alerts ? 'celebrate' : 'birthdays')} className="group mt-auto flex items-center gap-3 border-t border-line/[.07] px-5 py-3 text-left text-[13px] text-muted transition-colors hover:bg-raised/50 hover:text-ink">
            {alerts ? <PartyPopper className="h-4 w-4 text-gold" /> : <Cake className="h-4 w-4 text-gold" />}
            <span className="flex-1">{alerts ? <><b className="font-medium text-gold">{due}</b> milestones to celebrate this week</> : <><b className="font-medium text-gold">{bdays}</b> {bdays === 1 ? 'birthday' : 'birthdays'} in the next 7 days</>}</span>
            <ChevronRight className="h-4 w-4 text-faint transition-transform group-hover:translate-x-0.5" />
          </button>
        </section>
      </div>

      <TrendSection />

      <Section title="This week">
        <div className="card mb-3 grid divide-y divide-line/[.07] md:grid-cols-3 md:divide-x md:divide-y-0">
          <button onClick={() => goto('attendance', 'overview', { range: 'week' })} className="group p-5 text-left transition-colors hover:bg-raised/40">
            <div className="flex items-center gap-3"><Chip icon={Footprints} tone="primary" /><div><div className="text-[13px] text-muted">Visits so far</div><div className="font-display text-[26px] font-medium leading-tight tabular-nums text-ink">{visits}</div></div></div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-primary/15"><div className="h-full rounded-full bg-primary" style={{ width: total ? `${Math.round(visits / total * 100)}%` : 0 }} /></div>
            <div className="mt-2 flex justify-between text-[11.5px] text-faint"><span>{visits} done</span><span>{ahead} still booked in</span></div>
          </button>
          <button onClick={() => goto('attendance', 'classes')} className="group flex items-center gap-4 p-5 text-left transition-colors hover:bg-raised/40">
            <div className="relative grid place-items-center"><Ring pct={fill} tone={fill == null ? 'primary' : fill >= 80 ? 'green' : fill >= 60 ? 'primary' : 'orange'} /><span className="absolute font-display text-[13px] font-medium tabular-nums text-ink">{fill == null ? '—' : fill + '%'}</span></div>
            <div><div className="text-[14px] font-medium text-ink">Class fill</div><div className="text-[12.5px] text-muted">Of class spots used so far this week</div></div>
          </button>
          <button onClick={() => goto('attendance', 'fringe')} className="group flex items-center gap-4 p-5 text-left transition-colors hover:bg-raised/40">
            <Chip icon={Users} tone="accent" big />
            <div><div className="flex items-baseline gap-2"><span className="font-display text-[26px] font-medium leading-none tabular-nums text-accent">{fr.length}</span><span className="text-[14px] font-medium text-ink">intro & pack clients</span></div><div className="mt-1 text-[12.5px] text-muted">Came in the last 7 days, not on a membership</div></div>
          </button>
        </div>
        <WeekCards start={b.monday} />
      </Section>
    </div>
  );
}
