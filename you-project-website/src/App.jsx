import { useCallback, useEffect, useRef, useState } from 'react';
import { Home as HomeIcon, Flag, Users, BarChart3, Award, Sprout, RefreshCw, Moon, Sun, LogOut, CheckCircle2, AlertCircle, Menu as MenuIcon, X, Wrench, Calculator, Upload, LifeBuoy, ChevronRight, ListChecks, ChevronDown, CalendarDays, UserRound, LineChart, Check, MessageCircle, FileText, MoreHorizontal } from 'lucide-react';
import * as L from './lib/logic.js';
import { api, bump, goto, useNav, useDataVersion, useToast, toast, setReloader, pullFresh, useRefreshing } from './lib/store.js';
import { STUDIO } from './studio.js';
import * as SBC from './views/SellByChat.jsx';
import * as TP from './views/Templates.jsx';
import { applyChange } from '../shared/patch.js';
import { Drawer } from './components/people.jsx';
import { Skeleton, cx } from './components/ui.jsx';
import { MARK_VIEWBOX, MARK_PATH } from './components/mark.js';
import Home from './views/Home.jsx';
import * as M from './views/Members.jsx';
import * as A from './views/Attendance.jsx';
import * as MS from './views/Milestones.jsx';
import * as O from './views/Onboarding.jsx';
import * as TM from './views/Team.jsx';
import * as G from './views/Geronimo.jsx';
import { GResults } from './views/Results.jsx';
import { TeamCalendar } from './views/Calendar.jsx';
import Help from './views/Help.jsx';

const SECTIONS = {
  home: { label: 'Home', title: 'Studio overview', hero: true, Icon: HomeIcon, subs: [['home', 'Overview', Home]] },
  team: { label: 'Team', title: 'Team hub', Icon: ListChecks, subs: [['updates', 'Updates', TM.TeamUpdates], ['calendar', 'Calendar', TeamCalendar], ['shared', 'Team list', TM.TeamList], ['mine', 'My to-dos', TM.MyTasks], ['projects', 'Projects', TM.TeamProjects]] },
  members: { label: 'Members', title: 'Members', Icon: Users, subs: [['all', 'All members', M.MembersEveryone], ['active', 'Active', M.MembersActive], ['suspended', 'Suspended', M.MembersSuspended], ['scheduled', 'To be suspended', M.MembersScheduled],
    ['cancelled', 'Cancelled', M.MembersCancelled], ['risks', 'To contact', M.MembersRisks]] },
  attendance: { label: 'Attendance', title: 'Attendance', Icon: BarChart3, subs: [['overview', 'Overview', A.AttOverview], ['classes', 'Classes', A.AttClasses], ['noshows', 'No-shows', A.AttNoShows], ['fringe', 'Intro & pack clients', A.AttFringe]] },
  milestones: { label: 'Milestones', title: 'Milestones', Icon: Award, subs: [['celebrate', 'Celebrate', MS.MsCelebrate], ['coming', 'Coming up', MS.MsComing], ['birthdays', 'Birthdays', MS.MsBirthdays], ['leaderboard', 'Leaderboard', MS.MsBoard]] },
  onboarding: { label: 'Onboarding', title: 'Onboarding', Icon: Sprout, subs: [['new', 'New faces', O.ObNew], ['actioned', 'Actioned', O.ObActioned], ['board', 'Week by week', O.ObBoard], ['never', 'Bought, never came', O.ObNever], ['inductions', 'Inductions', O.ObInductions], ['signups', 'New sign-ups', O.ObSignups]] },
  // "More ▾" (far right, admins): used weekly rather than daily, so they stay out of the main tabs
  // Results and Scoreboard only show when the Metrics sheet is connected (Tools.gs METRICS_SHEET_URL): see sections()
  geronimo: { label: 'Geronimo', more: 'Weekly reports, Red / Orange Flag, Fringe List', title: 'Geronimo reports', Icon: Flag, subs: [['results', 'Results', GResults], ['weekly', 'Weekly numbers', G.GWeekly], ['score', 'Scoreboard', G.GScore], ['red', 'Red Flag', G.GRed], ['orange', 'Orange Flag', G.GOrange], ['fringe', 'Fringe List', G.GFringe], ['hof', 'Hall of Fame 250+', G.GHall], ['plan', 'Under plan', G.GPlan]] },
  leads: { label: 'Sell By Chat', more: 'Today’s chats, pipeline, warm leads', title: 'Sell By Chat', Icon: MessageCircle, subs: [['today', 'Today', SBC.SbcToday], ['pipeline', 'Pipeline', SBC.SbcPipeline], ['summary', 'Summary', SBC.SbcSummary]] },
  mreports: { label: 'Membership reports', more: 'Rollovers, payment issues', title: 'Membership reports', Icon: LineChart, subs: [['rollovers', 'Rollovers', M.MembersRollovers], ['payments', 'Payments', M.MembersPayments]] },
  templates: { label: 'Message templates', more: 'Spiels to copy or email', title: 'Message templates', Icon: FileText, subs: [['all', 'Templates', TP.TemplatesPage]] },
  help: { label: 'Help', title: 'How to use the dashboard', Icon: LifeBuoy, menuOnly: true, subs: [['help', 'Help', Help]] }
};
// Coaches: no Geronimo, Tools or the admin side of Members (cancellations, risks, changes, rollovers, payments).
// What they can't see is also left out of the data their browser gets (netlify/lib/redact.mjs).
const COACH_MEMBER_SUBS = ['all', 'active', 'suspended', 'scheduled'];
const COACH_SECTIONS = Object.fromEntries(Object.entries(SECTIONS).filter(([k, s]) => !s.more)
  .map(([k, s]) => [k, k === 'members' ? Object.assign({}, s, { subs: s.subs.filter(x => COACH_MEMBER_SUBS.includes(x[0])) }) : s]));
// Results / Scoreboard need the Metrics sheet; hide them until it's connected.
const withData = S => Object.assign({}, S, { geronimo: Object.assign({}, S.geronimo, { subs: S.geronimo.subs.filter(([k]) => (k !== 'results' || L.D.metrics) && (k !== 'score' || L.D.scoreboard)) }) });
const sections = () => (L.isEditor() ? withData(SECTIONS) : COACH_SECTIONS);
const roleLabel = u => (u.role === 'Editor' ? 'Admin' : 'Coach');

// ---------- theme ----------
function useTheme() {
  const [theme, setTheme] = useState(() => { try { return localStorage.getItem('studio.theme') || 'light'; } catch (e) { return 'light'; } });
  useEffect(() => { document.documentElement.dataset.theme = theme; try { localStorage.setItem('studio.theme', theme); } catch (e) {} }, [theme]);
  return [theme, () => setTheme(t => (t === 'dark' ? 'light' : 'dark'))];
}

export const Mark = ({ className }) => (
  <svg viewBox={MARK_VIEWBOX} className={cx('text-mark', className)} aria-hidden="true"><path fill="currentColor" d={MARK_PATH} /></svg>
);
export function Wordmark({ small }) {
  return (
    <div className="leading-none">
      <div className={cx('font-display font-medium tracking-brand text-ink', small ? 'text-[15px]' : 'text-2xl')}>{STUDIO.wordmark[0]}</div>
      <div className={cx('font-display font-medium tracking-brand text-primary', small ? 'mt-1 text-[8.5px]' : 'mt-2 text-[11px]')}>{STUDIO.wordmark[1]}</div>
    </div>
  );
}

/** "More ▾" at the far right of the tabs: the admin pages used now and then (Geronimo, Sell By Chat, reports, templates, tools). */
function MoreMenu({ SEC, nav }) {
  const [open, setOpen] = useState(false);
  const items = Object.entries(SEC).filter(([, s]) => s.more);
  useEffect(() => { if (!open) return; const k = e => { if (e.key === 'Escape') setOpen(false); }; document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k); }, [open]);
  if (!items.length) return null;
  const here = items.find(([k]) => k === nav.sec);
  return (
    <div className="relative ml-1 shrink-0 border-l border-line/10 pl-1">
      <button onClick={() => setOpen(o => !o)} aria-expanded={open} aria-haspopup="menu"
        className={cx('flex h-full items-center gap-1.5 whitespace-nowrap border-b-2 px-3.5 py-2.5 text-[13px] transition-colors', here ? 'border-primary font-medium text-primary' : 'border-transparent text-muted hover:text-ink')}>
        <MoreHorizontal className="h-4 w-4" /><span className="hidden sm:inline">{here ? here[1].label : 'More'}</span><ChevronDown className={cx('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} />
      </button>
      {open && <>
        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
        <div role="menu" className="absolute right-0 top-full z-50 mt-1 w-72 overflow-hidden rounded-xl border border-line/15 bg-surface p-1 shadow-2xl">
          {items.map(([k, s]) => (
            <button key={k} role="menuitem" onClick={() => { setOpen(false); goto(k); }} className={cx('flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-raised', nav.sec === k && 'bg-raised/60')}>
              <s.Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span className="min-w-0"><span className="block text-[13.5px] text-ink">{s.label}</span><span className="block truncate text-[11.5px] text-faint">{s.more}</span></span>
            </button>))}
        </div>
      </>}
    </div>
  );
}

/** The logo + name at the top left: back to Home. */
function SiteSwitch() {
  return <button onClick={() => goto('home')} className="flex items-center gap-3" aria-label="Home"><Mark className="h-8 w-8" /><Wordmark small /></button>;
}

// ---------- sign in ----------
function SignIn({ onSignedIn, error: initialError }) {
  const btn = useRef(null);
  const [error, setError] = useState(initialError || '');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cfg = await api('/api/config');
        if (!cfg.clientId) { setError('Google sign-in isn’t set up yet (GOOGLE_CLIENT_ID is missing in Netlify).'); return; }
        await new Promise((res, rej) => {
          if (window.google && window.google.accounts) return res();
          const s = document.createElement('script'); s.src = 'https://accounts.google.com/gsi/client'; s.async = true; s.onload = res; s.onerror = () => rej(new Error('Could not load Google sign-in.'));
          document.head.appendChild(s);
        });
        if (cancelled) return;
        window.google.accounts.id.initialize({
          client_id: cfg.clientId, ux_mode: 'popup', auto_select: true, itp_support: true,
          callback: async resp => {
            setBusy(true); setError('');
            try { const r = await api('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ credential: resp.credential }) }); onSignedIn(r.user); }
            catch (e) { setError(e.message); setBusy(false); }
          }
        });
        window.google.accounts.id.renderButton(btn.current, { theme: document.documentElement.dataset.theme === 'light' ? 'outline' : 'filled_black', size: 'large', shape: 'pill', text: 'signin_with', width: 280 });
        window.google.accounts.id.prompt();
      } catch (e) { setError(e.message); }
    })();
    return () => { cancelled = true; };
  }, []);
  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-sm text-center">
        <Mark className="mx-auto h-16 w-16" />
        <div className="mt-6 flex justify-center"><Wordmark /></div>
        <p className="mt-8 text-[13.5px] text-muted">Studio dashboard. {STUDIO.signInHint}</p>
        <div className="mt-6 flex min-h-[44px] justify-center" ref={btn} />
        {busy && <p className="mt-4 text-[13px] text-muted">Signing you in…</p>}
        {error && <p className="mt-4 rounded-xl border border-red/25 bg-red/10 px-4 py-3 text-[13px] text-red">{error}</p>}
      </div>
    </div>
  );
}

// ---------- shell ----------
// ---------- ☰ menu ----------
function SideMenu({ open, onClose, user, theme, toggleTheme, onSignOut }) {
  const nav = useNav();
  useEffect(() => { const k = e => { if (e.key === 'Escape') onClose(); }; document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k); }, [onClose]);
  const go = (s, sb) => { goto(s, sb); onClose(); };
  const item = (active, Icon, label, onClick, extra) => (
    <button onClick={onClick} className={cx('flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[13.5px] transition-colors', active ? 'bg-primary/15 text-primary' : 'text-muted hover:bg-raised hover:text-ink')}>
      <Icon className="h-4 w-4 shrink-0" /><span className="flex-1">{label}</span>{extra}
    </button>
  );
  return (
    <div className={cx('fixed inset-0 z-40', !open && 'pointer-events-none')} aria-hidden={!open}>
      <div onClick={onClose} className={cx('absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity', open ? 'opacity-100' : 'opacity-0')} />
      <aside role="dialog" aria-label="Menu" className={cx('absolute left-0 top-0 flex h-full w-[300px] max-w-[85vw] flex-col border-r border-line/10 bg-surface shadow-2xl transition-transform duration-200', open ? 'translate-x-0' : '-translate-x-full')}>
        <div className="flex items-center justify-between border-b border-line/10 px-4 py-4">
          <div className="flex items-center gap-3"><Mark className="h-8 w-8" /><Wordmark small /></div>
          <button onClick={onClose} className="btn btn-ghost px-2" aria-label="Close menu"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex-1 space-y-5 overflow-y-auto px-3 py-4 scroll-thin">
          <div><div className="label mb-1.5 px-3">Dashboard</div>
            {Object.entries(sections()).filter(([, s]) => !s.menuOnly && !s.more).map(([k, s]) => <div key={k}>{item(nav.sec === k, s.Icon, s.label, () => go(k))}</div>)}</div>
          {Object.values(sections()).some(s => s.more) && <div><div className="label mb-1.5 px-3">More</div>
            {Object.entries(sections()).filter(([, s]) => s.more).map(([k, s]) => <div key={k}>{item(nav.sec === k, s.Icon, s.label, () => go(k), <ChevronRight className="h-3.5 w-3.5 opacity-50" />)}</div>)}</div>}
          <div><div className="label mb-1.5 px-3">Help</div>{item(nav.sec === 'help', LifeBuoy, 'How to use the dashboard', () => go('help'))}</div>
          <div><div className="label mb-1.5 px-3">Settings</div>
            {item(false, theme === 'dark' ? Sun : Moon, theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode', toggleTheme)}
            {item(false, LogOut, 'Sign out', () => { onClose(); onSignOut(); })}</div>
        </div>
        <div className="border-t border-line/10 px-5 py-3 text-[12px] text-faint">Signed in as {user.email}<br />{roleLabel(user)} · set on the Access tab of the Sheet</div>
      </aside>
    </div>
  );
}

// ---------- reminders at the top of every page ----------
function Banners() {
  useDataVersion();
  const b = L.B(), D = L.D, out = [];
  const admin = L.isEditor();                          // the data reminders are for admins
  const dismissKey = 'studio.banner.' + L.dKey(b.today);
  const [hidden, setHidden] = useState(() => { try { return JSON.parse(localStorage.getItem(dismissKey)) || []; } catch (e) { return []; } });
  const hide = id => { const next = [...hidden, id]; setHidden(next); try { localStorage.setItem(dismissKey, JSON.stringify(next)); } catch (e) {} };
  if (D.refreshedAt && b.now - D.refreshedAt > 26 * 3600e3)
    out.push({ id: 'hapana', tone: 'red', text: `Hapana’s morning refresh hasn’t run since ${L.dDate(D.refreshedAt)}, ${L.dTime(D.refreshedAt)}, so classes and attendance may be out of date. Check the API_Log tab in the Sheet.` });
  const shown = admin ? out.filter(x => !hidden.includes(x.id)) : [];
  if (!shown.length) return null;
  return (
    <div className="space-y-2">{shown.map(x => (
      <div key={x.id} className={cx('flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 text-[13px]', x.tone === 'red' ? 'border-red/30 bg-red/[.08] text-red' : 'border-orange/30 bg-orange/[.08] text-orange')}>
        <AlertCircle className="h-4 w-4 shrink-0" /><span className="min-w-[200px] flex-1 basis-[60%]">{x.text}</span>
        <span className="ml-auto flex items-center gap-3">
          {x.action && <button onClick={x.action[1]} className="btn px-3 py-1 text-[12.5px]">{x.action[0]}</button>}
          <button onClick={() => hide(x.id)} className="whitespace-nowrap text-[12px] opacity-70 hover:opacity-100" aria-label="Hide for today">Hide for today</button>
        </span>
      </div>))}</div>
  );
}

function Shell({ user, meta, onRefresh, refreshing, onSignOut, theme, toggleTheme }) {
  const nav = useNav();
  const [menu, setMenu] = useState(false);
  const closeMenu = useCallback(() => setMenu(false), []);
  useDataVersion();
  const SEC = sections();
  const S = SEC[nav.sec] || SEC.home;
  const sub = S.subs.find(s => s[0] === nav.sub) || S.subs[0];
  const View = sub[2];
  const badge = { members: L.isEditor() ? L.workflow().todo.length : 0, milestones: L.alertsOn() ? L.allCelebrations().now.filter(e => !e.done).length : 0 };
  const ago = meta.at ? Math.round((Date.now() - meta.at) / 60000) : null;
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-line/10 bg-bg/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6">
          <button onClick={() => setMenu(true)} className="btn btn-ghost -ml-2 px-2" aria-label="Open menu" title="Menu"><MenuIcon className="h-5 w-5" /></button>
          <SiteSwitch />
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <span className="hidden text-right text-[11.5px] leading-tight text-faint md:block">
              Hapana data from {L.dDate(L.D.refreshedAt)}, {L.dTime(L.D.refreshedAt)}<br />
              {ago === null ? '' : ago < 1 ? 'Synced just now' : `Synced ${ago} min ago`}
            </span>
            <button onClick={onRefresh} disabled={refreshing} className="btn" title="Pull the latest from the Google Sheet"><RefreshCw className={cx('h-3.5 w-3.5', refreshing && 'animate-spin')} /><span className="hidden sm:inline">{refreshing ? 'Updating…' : 'Refresh'}</span></button>
            <button onClick={toggleTheme} className="btn btn-ghost px-2" aria-label="Switch light or dark">{theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</button>
            <div className="hidden items-center gap-2 border-l border-line/10 pl-3 sm:flex">
              {user.picture ? <img src={user.picture} alt="" referrerPolicy="no-referrer" className="h-7 w-7 rounded-full" /> : <span className="grid h-7 w-7 place-items-center rounded-full bg-primary/20 text-[12px] text-primary">{(user.name || user.email)[0].toUpperCase()}</span>}
              <div className="leading-tight"><div className="text-[12.5px] text-ink">{user.name}</div><div className="text-[11px] text-faint">{roleLabel(user)}</div></div>
            </div>
            <button onClick={onSignOut} className="btn btn-ghost px-2" aria-label="Sign out" title="Sign out"><LogOut className="h-4 w-4" /></button>
          </div>
        </div>
        <div className="mx-auto flex max-w-7xl items-stretch px-2 sm:px-4">
        <nav className="flex min-w-0 flex-1 gap-1 overflow-x-auto scroll-thin" aria-label="Sections">
          {Object.entries(SEC).filter(([, s]) => !s.menuOnly && !s.more).map(([k, s]) => (
            <button key={k} onClick={() => goto(k)} aria-current={k === nav.sec ? 'page' : undefined}
              className={cx('flex items-center gap-2 whitespace-nowrap border-b-2 px-3.5 py-2.5 text-[13px] transition-colors',
                k === nav.sec ? 'border-primary font-medium text-primary' : 'border-transparent text-muted hover:border-line/20 hover:text-ink')}>
              <s.Icon className="h-4 w-4" />{s.label}
              {badge[k] ? <span className="rounded-full border border-red/30 bg-red/15 px-1.5 py-px text-[10.5px] font-semibold text-red">{badge[k]}</span> : null}
            </button>
          ))}
        </nav>
        <MoreMenu SEC={SEC} nav={nav} />
        </div>
      </header>
      <main className="mx-auto max-w-7xl space-y-6 px-4 pb-16 pt-6 sm:px-6">
        <Banners />
        {!S.hero && <div className="flex flex-wrap items-end justify-between gap-3">
          <h1 className="text-[22px] tracking-sub text-ink">{S.title}</h1>
        </div>}
        {S.subs.length > 1 && (
          <div className="-mt-2 flex gap-1.5 overflow-x-auto pb-1 scroll-thin" role="tablist">
            {S.subs.map(([k, label]) => (
              <button key={k} role="tab" aria-selected={k === sub[0]} onClick={() => goto(nav.sec, k)}
                className={cx('whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[12.5px] transition-colors',
                  k === sub[0] ? 'border-primary bg-primary text-onprimary font-medium' : 'border-line/15 text-muted hover:border-line/30 hover:text-ink')}>{label}</button>
            ))}
          </div>
        )}
        <View key={nav.sec + nav.sub} />
      </main>
      <Drawer />
      <SideMenu open={menu} onClose={closeMenu} user={user} theme={theme} toggleTheme={toggleTheme} onSignOut={onSignOut} />
    </div>
  );
}

function Toast() {
  const t = useToast();
  if (!t) return null;
  const err = t.kind === 'error';
  return (
    <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2" role="status">
      <div className={cx('flex items-center gap-2 rounded-xl border px-4 py-2.5 text-[13px] shadow-2xl', err ? 'border-red/30 bg-surface text-red' : 'border-green/25 bg-surface text-ink')}>
        {err ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4 text-green" />}{t.text}
      </div>
    </div>
  );
}

function Loading({ text }) {
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-10 sm:px-6">
      <div className="flex items-center gap-3"><Mark className="h-8 w-8 animate-pulse" /><span className="text-[13px] text-muted">{text}</span></div>
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-64 w-full" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}</div>
    </div>
  );
}

// ---------- app ----------
export default function App() {
  const [theme, toggleTheme] = useTheme();
  const [state, setState] = useState({ phase: 'checking' });   // checking | signin | loading | ready | error
  const [user, setUser] = useState(null);
  const [meta, setMeta] = useState({ at: 0 });
  const refreshing = useRefreshing();
  const snapSent = useRef(false);

  const loadData = useCallback(async (u, quiet) => {
    if (!quiet) setState({ phase: 'loading', text: 'Loading the latest numbers…' });
    for (let attempt = 0; attempt < 40; attempt++) {
      const res = await fetch('/api/data', { credentials: 'same-origin' });
      if (res.status === 401) { setState({ phase: 'signin' }); return; }
      if (res.status === 202) { setState({ phase: 'loading', text: 'Getting the first copy of your data ready. This takes about a minute the very first time…' }); await new Promise(r => setTimeout(r, 4000)); continue; }
      if (!res.ok) { let msg = ''; try { msg = (await res.json()).error; } catch (e) {} throw new Error(msg || `The dashboard couldn’t load its data (${res.status}).`); }
      const d = await res.json();
      d.user = u;
      L.setData(d); bump();
      setMeta({ at: Number(res.headers.get('X-Snapshot-At')) || Date.now() });
      setState({ phase: 'ready' });
      if (!snapSent.current) {
        snapSent.current = true;
        const counts = L.todaySnapshotCounts();
        if (counts) api('/api/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'saveSnapshot', args: [counts] }) })
          .then(() => { applyChange(L.D, 'saveSnapshot', [counts]); bump(); }).catch(() => {});
      }
      return;
    }
    throw new Error('The data is taking longer than usual to get ready. Please try again in a few minutes.');
  }, []);

  const start = useCallback(async u => {
    setUser(u);
    try { await loadData(u); } catch (e) { setState({ phase: 'error', text: e.message }); }
  }, [loadData]);

  useEffect(() => {
    (async () => {
      try { const r = await api('/api/session'); start(r.user); } catch (e) { setState({ phase: 'signin' }); }
    })();
    const out = () => setState({ phase: 'signin', text: 'Your session ended. Please sign in again.' });
    window.addEventListener('studio:signed-out', out);
    return () => window.removeEventListener('studio:signed-out', out);
  }, [start]);

  // Quietly pick up other people's changes when coming back to the tab, and keep "today" right.
  useEffect(() => {
    const onFocus = () => {
      if (state.phase !== 'ready' || !user || document.visibilityState !== 'visible') return;
      L.refreshBounds(); bump();
      if (Date.now() - meta.at > 10 * 60 * 1000) loadData(user, true).catch(() => {});
    };
    document.addEventListener('visibilitychange', onFocus);
    const t = setInterval(onFocus, 5 * 60 * 1000);
    return () => { document.removeEventListener('visibilitychange', onFocus); clearInterval(t); };
  }, [state.phase, user, meta.at, loadData]);

  useEffect(() => { setReloader(() => loadData(user, true)); }, [user, loadData]);
  const refresh = () => pullFresh();
  const signOut = async () => {
    try { await api('/api/logout', { method: 'POST' }); } catch (e) {}
    try { window.google && window.google.accounts && window.google.accounts.id.disableAutoSelect(); } catch (e) {}
    setUser(null); setState({ phase: 'signin' });
  };

  return (
    <>
      {state.phase === 'checking' && <Loading text="Checking your sign-in…" />}
      {state.phase === 'signin' && <SignIn onSignedIn={start} error={state.text} />}
      {state.phase === 'loading' && <Loading text={state.text} />}
      {state.phase === 'error' && <div className="mx-auto max-w-xl px-4 py-24 text-center"><Mark className="mx-auto h-12 w-12" /><p className="mt-6 rounded-xl border border-red/25 bg-red/10 px-4 py-3 text-[13.5px] text-red">{state.text}</p>
        <button className="btn mt-4" onClick={() => start(user)}>Try again</button></div>}
      {state.phase === 'ready' && <Shell user={user} meta={meta} onRefresh={refresh} refreshing={refreshing} onSignOut={signOut} theme={theme} toggleTheme={toggleTheme} />}
      <Toast />
    </>
  );
}
