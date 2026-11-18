import { useState } from 'react';
import { Users, PauseCircle, UserX, PhoneCall, AlertTriangle, TrendingDown, CalendarClock, CreditCard, ArrowRightLeft, ChevronDown, Flag, ShoppingBag, Repeat, CheckCircle2 } from 'lucide-react';
import * as L from '../lib/logic.js';
import { D, B, DAY, lc, dDate, plural, ago, noteFor, fmt, shortPlan } from '../lib/logic.js';
import { goto, useNav, setView, save, toast } from '../lib/store.js';
import { Card, Stat, StatGrid, Seg, SearchBox, Select, Pill, Row, List, Empty, More, Note, TagList, HeadRow, Toolbar, cx } from '../components/ui.jsx';
import { openMember, openClient, openPerson, openList, CxControl, SuspensionEnd, WeekStrip } from '../components/people.jsx';

const lastText = ms => ms ? 'Last visit ' + (/^(\d|Today|Yesterday)/.test(ago(ms)) ? ago(ms).toLowerCase() : ago(ms)) : 'No visits on record';

// ---------------- All members (everyone) ----------------
export function MembersEveryone() {
  const [q, setQ] = useState(''), [type, setType] = useState('Everyone'), [sort, setSort] = useState('name');
  const all = L.everyone(), qq = lc(q).replace(/\s/g, '');
  const rows = all.filter(p => (type === 'Everyone' || p.type === type) && (!qq || [p.n, p.e, p.ph].some(v => lc(v).replace(/\s/g, '').includes(qq))));
  rows.sort(sort === 'name' ? (a, c) => a.n.localeCompare(c.n) : sort === 'last' ? (a, c) => (a.c ? a.c.l || 0 : 0) - (c.c ? c.c.l || 0 : 0) : (a, c) => ((c.c || {}).ytd || 0) - ((a.c || {}).ytd || 0));
  const counts = t => all.filter(p => p.type === t).length;
  const cols = 'md:grid-cols-[minmax(170px,1.4fr)_150px_minmax(150px,1.3fr)_120px_100px_110px]';
  return (
    <Card title="Everyone" icon={Users} count={all.length}
      right={<Toolbar><SearchBox value={q} onChange={setQ} placeholder="Search by name, email or phone" className="sm:w-72" />
        <Select label="Type" value={type} onChange={setType} options={[['Everyone', `Everyone (${all.length})`], ...L.TYPES.map(t => [t, `${t} (${counts(t)})`])]} />
        <Select label="Sort" value={sort} onChange={setSort} options={[['name', 'Sort: name'], ['last', 'Sort: longest since last visit'], ['ytd', 'Sort: most visits this year']]} /></Toolbar>}
      footer={`${plural(rows.length, 'person')} shown${rows.length > 400 ? ' (first 400; search to narrow down)' : ''}. Includes everyone who has booked a class in the last six months or appears in the membership exports.`}>
      <HeadRow cols={cols}><div>Name</div><div>Type</div><div>Email</div><div>Phone</div><div>Gender / age</div><div>Last attended</div></HeadRow>
      <List rows={rows.slice(0, 400)} empty="Nobody matches." render={p => (
        <Row key={p.e || p.n} onClick={() => p.m ? openMember(p.m) : p.ci > -1 ? openClient(p.ci) : openPerson(p.susp || p.cx || { n: p.n, e: p.e, plan: p.plan })}>
          <div className={cx('grid grid-cols-[1fr_auto] items-center gap-3', cols)}>
            <div className="min-w-0"><div className="truncate text-[13.5px] text-ink">{p.n}</div><div className="sub truncate">{p.plan || (p.c ? `${p.c.ytd} visits this year` : '')}</div></div>
            <div><Pill tone={L.TYPE_PILL[p.type] || 'grey'}>{p.type}</Pill></div>
            <div className="sub hidden truncate md:block">{p.e || ''}</div>
            <div className="sub hidden md:block">{p.ph || ''}</div>
            <div className="sub hidden md:block">{p.c ? [p.c.g, p.c.age].filter(Boolean).join(', ') : ''}</div>
            <div className="sub hidden md:block">{p.c ? ago(p.c.l) : '—'}</div>
          </div>
        </Row>)} />
    </Card>
  );
}

// ---------------- Active members ----------------
export function MembersActive() {
  const [q, setQ] = useState(''), [plan, setPlan] = useState('All plans'), [st, setSt] = useState('All statuses'), [sort, setSort] = useState('name');
  const hasDemo = D.clients.some(c => c.g || c.age), qq = lc(q).replace(/\s/g, '');
  const plans = ['All plans', ...new Set(D.members.map(m => m.plan))];
  let rows = D.members.map(m => Object.assign({ s: L.statusOf(m), c: D.clients[m.ci] || {} }, m))
    .filter(m => (plan === 'All plans' || m.plan === plan) && (st === 'All statuses' || m.s[1] === st || (st === 'Not checked' && m.s[0] === 'grey'))
      && (!qq || [m.n, m.e, m.c.ph].some(v => lc(v).replace(/\s/g, '').includes(qq))));
  rows.sort(sort === 'name' ? (a, c) => a.n.localeCompare(c.n) : (a, c) => (a.c.l || 0) - (c.c.l || 0));
  const cols = 'md:grid-cols-[minmax(170px,1.4fr)_120px_minmax(150px,1.3fr)_120px_100px_110px]';
  return (
    <Card title="Active members" icon={Users} count={D.members.length} countTone="green"
      right={<Toolbar><SearchBox value={q} onChange={setQ} placeholder="Search by name, email or phone" className="sm:w-64" />
        <Select label="Plan" value={plan} onChange={setPlan} options={plans} />
        <Select label="Status" value={st} onChange={setSt} options={['All statuses', 'Follow up', 'Short of plan', 'On track', 'Not checked']} />
        <Select label="Sort" value={sort} onChange={setSort} options={[['name', 'Sort: name'], ['last', 'Sort: longest since last visit']]} /></Toolbar>}
      footer={`${plural(rows.length, 'member')} shown. People marked as cancelled are left out.`}>
      <HeadRow cols={cols}><div>Member</div><div>Status</div><div>Email</div><div>Phone</div><div>{hasDemo ? 'Gender / age' : ''}</div><div>Last attended</div></HeadRow>
      <List rows={rows} empty="No members match." render={m => (
        <Row key={m.e || m.n} onClick={() => openMember(m)}>
          <div className={cx('grid grid-cols-[1fr_auto] items-center gap-3', cols)}>
            <div className="min-w-0"><div className="truncate text-[13.5px] text-ink">{m.n}</div><div className="sub truncate">{m.plan}</div></div>
            <div><Pill tone={m.s[0]}>{m.s[1]}</Pill>{L.pausingOf(m.e, m.n) && <div className="mt-1"><Pill tone="lilac">Pausing {L.fmt(L.pausingOf(m.e, m.n).d, { day: 'numeric', month: 'short' })}</Pill></div>}</div>
            <div className="sub hidden truncate md:block">{m.e}</div>
            <div className="sub hidden md:block">{m.c.ph || ''}</div>
            <div className="sub hidden md:block">{hasDemo ? [m.c.g, m.c.age].filter(Boolean).join(', ') : ''}</div>
            <div className="sub hidden md:block">{ago(m.c.l)}</div>
          </div>
        </Row>)} />
    </Card>
  );
}

// ---------------- Suspended ----------------
export function MembersSuspended() {
  const b = B(), rows = D.suspended.slice().sort((a, c) => (a.ends || Infinity) - (c.ends || Infinity));
  const cols = 'md:grid-cols-[minmax(150px,1.2fr)_minmax(140px,1.3fr)_120px_170px_90px]';
  return (
    <div className="space-y-5">
      <StatGrid cols="lg:grid-cols-3">
        <Stat icon={PauseCircle} label="On suspension" value={rows.length} tone="lilac" />
        <Stat icon={CalendarClock} label="Back within 2 weeks" value={rows.filter(p => p.ends && p.ends < b.today + 14 * DAY).length} />
        <Stat icon={AlertTriangle} label="End date to be confirmed" value={rows.filter(p => !p.ends).length} tone="orange" />
      </StatGrid>
      {(D.suspScheduled || []).length > 0 && <button onClick={() => goto('members', 'scheduled')} className="text-[12.5px] text-accent hover:underline">{plural(D.suspScheduled.length, 'more pause')} booked for later → To be suspended</button>}
      <Card title="Suspended members" icon={PauseCircle} tone="lilac" count={rows.length} countTone="lilac"
        footer="Suspensions come from the weekly Member Movement export. Hapana doesn’t send the end date of a suspension, so Editors add it here when known. It saves straight to the sheet.">
        <HeadRow cols={cols}><div>Member</div><div>Plan</div><div>Suspended from</div><div>Suspended until</div><div>Days so far</div></HeadRow>
        <List rows={rows} empty="Nobody is on suspension." render={p => (
          <Row key={p.e || p.n} onClick={() => openPerson(p)}>
            <div className={cx('grid grid-cols-[1fr_auto] items-center gap-3', cols)}>
              <div className="min-w-0"><div className="truncate text-[13.5px]">{p.n}</div><div className="sub truncate md:hidden">{p.plan}</div></div>
              <div className="sub hidden md:block">{p.plan}</div>
              <div className="sub hidden md:block">{dDate(p.d)}</div>
              <SuspensionEnd p={p} />
              <div className="sub hidden md:block">{p.d ? Math.max(0, Math.round((b.today - p.d) / DAY)) + ' days' : ''}</div>
            </div>
          </Row>)} />
      </Card>
    </div>
  );
}

// ---------------- To be suspended (pause booked for later) ----------------
export function MembersScheduled() {
  const b = B(), rows = (D.suspScheduled || []).slice().sort((a, c) => a.d - c.d);
  const soon = rows.filter(p => p.d < b.today + 8 * DAY).length;
  const inDays = t => { const d = Math.round((t - b.today) / DAY); return d <= 0 ? 'Today' : d === 1 ? 'Tomorrow' : `In ${d} days`; };
  const cols = 'md:grid-cols-[minmax(150px,1.2fr)_minmax(140px,1.3fr)_150px_170px_110px]';
  return (
    <div className="space-y-5">
      <StatGrid cols="lg:grid-cols-3">
        <Stat icon={CalendarClock} label="To be suspended" value={rows.length} sub="Pause booked in Hapana" tone="lilac" />
        <Stat icon={AlertTriangle} label="Starting within 7 days" value={soon} tone="orange" />
        <Stat icon={PauseCircle} label="On suspension now" value={D.suspended.length} sub="See Suspended" onClick={() => goto('members', 'suspended')} />
      </StatGrid>
      <Card title="To be suspended" icon={CalendarClock} tone="lilac" count={rows.length} countTone="lilac"
        footer="Pauses booked ahead in Hapana (from the Member Movement export). They stay on Active members and are still checked for Red/Orange flags until the pause starts, then move to Suspended automatically.">
        <HeadRow cols={cols}><div>Member</div><div>Plan</div><div>Pause starts</div><div>Back on</div><div>Last visit</div></HeadRow>
        <List rows={rows} empty="No pauses booked ahead." render={p => {
          const ci = L.findClient(p.e, p.n), c = ci > -1 ? D.clients[ci] : null;
          return (
            <Row key={(p.e || p.n) + p.d} onClick={() => openPerson(p)}>
              <div className={cx('grid grid-cols-[1fr_auto] items-center gap-3', cols)}>
                <div className="min-w-0"><div className="truncate text-[13.5px]">{p.n}</div><div className="sub truncate md:hidden">From {dDate(p.d)}</div></div>
                <div className="sub hidden md:block">{p.plan}</div>
                <div className="hidden md:block"><div>{dDate(p.d)}</div><div className="sub">{inDays(p.d)}</div></div>
                <SuspensionEnd p={p} />
                <div className="sub hidden md:block">{c ? ago(c.l) : '—'}</div>
              </div>
            </Row>
          );
        }} />
      </Card>
    </div>
  );
}

// ---------------- Cancelled ----------------
export function MembersCancelled() {
  const { v } = useNav(), b = B(), days = v.cxDays || 'all';
  const [q, setQ] = useState('');
  const all = L.cancelledList().slice().sort((a, c) => c.d - a.d), notCx = L.notCancelledList();
  const rows0 = all.filter(x => days === 'all' || x.d >= b.today - days * DAY);
  const rows = rows0.filter(x => !q || lc(x.n).includes(lc(q)));
  const tens = rows0.filter(x => x.first).map(x => (x.d - x.first) / (30.44 * DAY));
  const avg = tens.length ? Math.round(tens.reduce((s, x) => s + x, 0) / tens.length) : null;
  const cols = 'md:grid-cols-[minmax(150px,1.3fr)_minmax(130px,1.1fr)_100px_110px_130px_150px_minmax(140px,1.2fr)]';
  return (
    <div className="space-y-5">
      <Toolbar><Seg options={[['all', 'All on record'], [90, 'Last 90 days'], [30, 'Last 30 days']]} value={days} onChange={x => setView({ cxDays: x })} /></Toolbar>
      <StatGrid cols="lg:grid-cols-3">
        <Stat icon={UserX} label="Cancelled" value={rows0.length} sub={notCx.length ? `Plan switches left out · ${notCx.length} not really cancelled` : 'Plan switches are left out'} tone="red" />
        <Stat icon={CalendarClock} label="Average time with us" value={avg === null ? '—' : avg + ' mo'} />
        <Stat icon={Flag} label="Marked on the dashboard" value={rows0.filter(x => /^Marked/.test(x.src || '')).length} sub="The rest come from Hapana" />
      </StatGrid>
      <Card title="Cancelled members" icon={UserX} tone="red" count={rows0.length} countTone="red" right={<SearchBox value={q} onChange={setQ} placeholder="Search by name" className="sm:w-64" />}
        footer="Only people who ended their membership entirely. They come from cancellations in the Member Movement export (where the person no longer holds a membership) and from anyone an Editor marks as cancelled on All members. They’re left out of Active members, Suspended and Risks. Total visits show a + until the lifetime backfill covers them.">
        <HeadRow cols={cols}><div>Member</div><div>Membership</div><div>Status</div><div>Last attended</div><div>Total visits</div><div>Cancelled</div><div>Notes</div></HeadRow>
        <List rows={rows} empty="No cancellations match." render={x => {
          const n = noteFor(x.e);
          return (
            <Row key={x.e || x.n} onClick={() => openPerson(x)}>
              <div className={cx('grid grid-cols-[1fr_auto] items-center gap-3', cols)}>
                <div className="min-w-0"><div className="truncate text-[13.5px] font-medium text-ink">{x.n}</div><TagList tags={n.tags} /></div>
                <div className="sub hidden md:block">{shortPlan(x.plan)}</div>
                <div>{L.isSuspended(x) ? <Pill tone="lilac">Suspended</Pill> : <Pill tone="red">Cancelled</Pill>}</div>
                <div className="sub hidden md:block">{x.last ? dDate(x.last) : 'No visits on record'}</div>
                <div className="hidden md:block"><div className="tabular-nums">{x.lt == null ? '—' : (x.ltExact ? x.lt : x.lt + '+')}</div><div className="sub">{x.first ? 'since ' + fmt(x.first, { month: 'short', year: 'numeric' }) + ' · ' + L.tenure(x.first, x.d) : ''}</div></div>
                <div className="hidden md:block"><div>{dDate(x.d)}</div><div className="sub">{x.src === 'Hapana' ? 'From Hapana' : x.src}</div><CxControl p={x} compact /></div>
                <div className="sub hidden md:block">{n.note ? <div className="truncate" title={n.note}>{n.note}</div> : (x.reason ? 'Reason: ' + x.reason : '—')}
                  {n.by && n.on ? <div>{n.status} by {n.by} · {fmt(n.on, { day: 'numeric', month: 'short' })}</div> : null}</div>
              </div>
            </Row>
          );
        }} />
      </Card>
      {notCx.length > 0 && <More title={`Not counted as cancelled (${notCx.length})`}>
        <List rows={notCx} render={x => { const n = noteFor(x.e); return (
          <Row key={x.e || x.n} onClick={() => openPerson(x)}>
            <div className="flex items-center justify-between gap-3"><div className="min-w-0"><div className="truncate">{x.n}</div><div className="sub truncate">{shortPlan(x.plan)} · Hapana cancellation {dDate(x.d)}</div></div>
              <div className="text-right"><Pill tone="green">{n.ncReason}</Pill><div className="sub mt-1">{n.ncBy ? 'by ' + n.ncBy : ''}{n.ncOn ? ' · ' + dDate(n.ncOn) : ''}</div></div></div>
          </Row>); }} />
      </More>}
    </div>
  );
}

// ---------------- Risks ----------------
const STAGES = [['todo', 'To contact'], ['contacted', 'Contacted'], ['unresp', 'Unresponsive'], ['back', 'Back on track'], ['done', 'Not needed']];
const STAGE_NOTE = {
  todo: 'Everyone flagged and not yet contacted. Tap Contacted once you’ve reached out and they move to the Contacted list, stamped with your name and the date.',
  contacted: 'Waiting to hear back. They move to Back on track automatically when they next attend, or to Unresponsive after 7 days with no visit.',
  unresp: 'Contacted 7+ days ago with no visit, or marked No response.', back: 'Came in after being contacted. No action needed.',
  done: 'Marked as not needed (for example, on holiday). They return to To contact after 30 days if still flagged.'
};
const EMPTY = { todo: 'Nobody left to contact. Nice work.', contacted: 'Nobody is waiting on a reply.', unresp: 'No unresponsive members.', back: 'Nobody has come back yet this month.', done: 'Nothing marked as not needed.' };

function Stamp({ p }) {
  const n = noteFor(p.e);
  if (!n.status || n.status === 'Pending' || !n.on) return <Pill>Not contacted yet</Pill>;
  const auto = p.stage === 'unresp' && n.status === 'Contacted' ? ' · no visit since' : '';
  return <Pill tone={{ back: 'green', unresp: 'red', contacted: 'accent', done: 'grey' }[p.stage] || 'grey'}>{n.status}{n.by ? ' by ' + n.by : ''} · {fmt(n.on, { day: 'numeric', month: 'short' })}{auto}</Pill>;
}

export function RiskRow({ p }) {
  const [open, setOpen] = useState(false), [busy, setBusy] = useState('');
  const n = noteFor(p.e), editor = L.isEditor();
  const acts = !editor || !p.e ? [] : ({ todo: [['Contacted', 'Contacted'], ['Not Needed', 'Not needed']], contacted: [['Replied', 'Replied'], ['No Response', 'No response']],
    unresp: [['Contacted', 'Tried again']], back: [], done: [['Pending', 'Undo']] })[p.stage] || [];
  const shown = acts.filter(([st]) => st !== n.status || p.stage === 'unresp').concat(editor && p.e && p.undo && p.stage !== 'done' ? [['Pending', 'Undo']] : []);
  const quick = async (e, status) => {
    e.stopPropagation(); setBusy(status);
    try { await save('saveMemberNote', p.e, p.n, status, null); toast(`${p.n}: ${status}`); } catch (er) { toast(er.message, 'error'); }
    setBusy('');
  };
  const cols = 'lg:grid-cols-[minmax(150px,1.1fr)_minmax(150px,1.2fr)_minmax(150px,1.2fr)_minmax(170px,1.3fr)_auto]';
  return (
    <div className="border-b border-line/[.06] last:border-0">
      <div role="button" tabIndex={0} onClick={() => p.m ? openMember(p.m) : p.ci > -1 ? openClient(p.ci) : openPerson(p)} onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.click(); }}
        className={cx('grid cursor-pointer grid-cols-1 items-center gap-3 px-5 py-3.5 transition-colors hover:bg-raised/50 sm:grid-cols-2', cols, p.stage === 'done' && 'opacity-60')}>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {p.ci > -1 && <button aria-label="Show weekly attendance" aria-expanded={open} onClick={e => { e.stopPropagation(); setOpen(o => !o); }} className="-ml-1 rounded p-0.5 text-faint hover:bg-raised hover:text-ink">
              <ChevronDown className={cx('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} /></button>}
            <span className="truncate font-medium text-ink">{p.n}</span>
          </div>
          <TagList tags={n.tags} />
        </div>
        <div className="sub min-w-0"><div className="truncate">{p.plan || ''}</div><div className="truncate">{p.sub || <>{lastText(p.last)}{p.src ? ' · via ' + L.srcText(p.src) : ''}</>}</div></div>
        <div className="flex flex-wrap gap-1">{p.reasons.length ? p.reasons.map(r => <Pill key={r.code} tone={r.cls}>{r.label}</Pill>) : <span className="sub">No longer flagged</span>}</div>
        <div className="min-w-0"><Stamp p={p} />{n.note ? <div className="sub mt-1 truncate" title={n.note}>{n.note}</div> : null}</div>
        <div className="flex flex-wrap gap-1.5 lg:justify-end">{shown.map(([st, label]) => (
          <button key={st} disabled={!!busy} onClick={e => quick(e, st)} className={cx('btn px-2.5 py-1 text-[12px]', st === 'Contacted' && 'btn-primary')}>{busy === st ? 'Saving…' : label}</button>))}</div>
      </div>
      {open && <div className="bg-raised/25 px-5 pb-4 pt-3 sm:pl-12"><WeekStrip ci={p.ci} x={p.m && p.m.x} /></div>}
    </div>
  );
}

export function MembersRisks() {
  const { v } = useNav(), g = L.workflow();
  const stage = v.stage || 'todo', reason = v.reason || 'all', tag = v.tag || '';
  const [q, setQ] = useState('');
  const cnt = code => g.todo.filter(p => p.reasons.some(r => r.code === code)).length;
  const pay = D.clients.filter(c => c.pay).length;
  const rows = g[stage].filter(p => (reason === 'all' || p.reasons.some(r => r.code === reason)) && (!tag || (noteFor(p.e).tags || []).indexOf(tag) > -1) && (!q || lc(p.n).includes(lc(q))))
    .sort((a, c) => (c.reasons.filter(r => r.cls === 'red').length - a.reasons.filter(r => r.cls === 'red').length) || ((a.last || 0) - (c.last || 0)));
  const tags = [...new Set([].concat(D.tagList || [], ...Object.values(D.notes).map(n => n.tags || [])))];
  const pick = (st, rs) => () => setView({ stage: st, reason: rs || 'all' });
  return (
    <div className="space-y-5">
      <StatGrid cols="grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        <Stat small icon={PhoneCall} label="To contact" value={g.todo.length} sub="Flagged, not contacted yet" tone="red" onClick={pick('todo')} />
        <Stat small icon={TrendingDown} label="Inactive 14+ days" value={cnt('inactive')} sub="No visit for 2 weeks" tone="orange" onClick={pick('todo', 'inactive')} />
        <Stat small icon={AlertTriangle} label="Lapsed 30+ days" value={cnt('lapsed')} sub="No visit for a month" tone="red" onClick={pick('todo', 'lapsed')} />
        <Stat small icon={ShoppingBag} label="Bought, never came" value={cnt('never')} sub="No visit since buying" tone="red" onClick={pick('todo', 'never')} />
        <Stat small icon={CreditCard} label="Payment issues" value={pay} sub="Failed or outstanding" tone="red" onClick={() => goto('mreports', 'payments')} />
        <Stat small icon={PauseCircle} label="On suspension" value={D.suspended.length} sub="Not flagged while paused" tone="lilac" onClick={() => goto('members', 'suspended')} />
      </StatGrid>
      <button onClick={() => goto('geronimo')} className="flex w-full items-center justify-between rounded-xl border border-line/10 bg-raised/30 px-4 py-2.5 text-left text-[13px] text-muted hover:border-primary/40 hover:text-ink">
        <span><Flag className="mr-2 inline h-3.5 w-3.5 text-red" />Red Flag, Orange Flag, Fringe List and Hall of Fame for Geronimo are on the <b className="text-ink">Geronimo</b> tab.</span><span className="text-primary">Open →</span></button>
      <Card title={STAGES.find(s => s[0] === stage)[1]} icon={PhoneCall} tone="red" count={rows.length} countTone={stage === 'back' ? 'green' : stage === 'todo' || stage === 'unresp' ? 'red' : 'primary'}
        right={<Seg options={STAGES.map(([k, l]) => [k, `${l} (${g[k].length})`])} value={stage} onChange={x => setView({ stage: x })} />}
        footer={STAGE_NOTE[stage]}>
        <div className="flex flex-wrap gap-2 border-b border-line/10 px-5 py-3">
          <SearchBox value={q} onChange={setQ} placeholder="Search by name" />
          <Select label="Reason" value={reason} onChange={x => setView({ reason: x })} options={L.REASONS} />
          <Select label="Tag" value={tag} onChange={x => setView({ tag: x })} options={[['', 'All tags'], ...tags.map(t => [t, t])]} />
        </div>
        <List rows={rows} empty={EMPTY[stage]} render={p => <RiskRow key={p.k} p={p} />} />
      </Card>
    </div>
  );
}

export function PlanFlags() {
  const { v } = useNav(), b = B();
  const seg = <Seg options={[['red', 'Under plan last week'], ['orange', 'Short of plan this week']]} value={v.flag === 'red' ? 'red' : 'orange'} onChange={x => setView({ flag: x })} />;
  const isRed = v.flag === 'red', rows = isRed ? L.redList() : L.orangeList();
  const top = rows.filter(m => m.level === 'missed' || m.level === 'nothing').sort((a, c) => c.x - a.x);
  const rest = rows.filter(m => m.level === 'under' || m.level === 'short').sort((a, c) => (c.x - c.att - (c.bk || 0)) - (a.x - a.att - (a.bk || 0)));
  const skipped = D.members.filter(m => !L.tracked(m));
  const row = m => (
    <Row key={m.e || m.n} onClick={() => openMember(m)}>
      <div className="grid grid-cols-[1fr_auto] items-center gap-3">
        <div className="min-w-0"><div className="truncate">{m.n}</div><div className="sub truncate">{m.plan} · {noteFor(m.e).status || 'Pending'}</div></div>
        <div className="text-right"><Pill tone={m.level === 'missed' || m.level === 'nothing' ? 'red' : 'orange'}>{isRed ? `${m.att} of ${m.x}` : `${m.att + m.bk} of ${m.x}`}</Pill>
          <div className="sub mt-0.5">{isRed ? 'attended last week' : `${m.att} attended · ${m.bk} booked`}</div></div>
      </div>
    </Row>
  );
  return (
    <div className="space-y-4">
      {seg}
      <Note>{isRed ? `Members who attended fewer classes than their plan from ${dDate(b.lastMonday)} to ${dDate(b.monday - DAY)}. Best actioned on Monday.`
        : 'Classes attended since Monday plus classes already booked up to Sunday, compared with each member’s plan. Best actioned on Wednesday.'}</Note>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card title={isRed ? 'Didn’t come at all' : 'Nothing attended or booked'} count={top.length} countTone="red"><List rows={top} render={row} empty="Nobody in this group." max={420} /></Card>
        <Card title={isRed ? 'Came, but under plan' : 'Short of plan'} count={rest.length} countTone="orange"><List rows={rest} render={row} empty="Nobody in this group." max={420} /></Card>
      </div>
      <More title={`Not checked this week (${skipped.length})`}>
        <List rows={skipped} empty="Everyone is being checked." render={m => (
          <Row key={m.e || m.n} onClick={() => openMember(m)}><div className="flex items-center justify-between gap-3"><div><div>{m.n}</div><div className="sub">{m.plan}</div></div>
            <Pill tone={L.isSuspended(m) ? 'lilac' : 'grey'}>{L.isSuspended(m) ? 'Suspended' : m.status}</Pill></div></Row>)} />
      </More>
    </div>
  );
}

// ---------------- Changes ----------------
export function MembersChanges() {
  const c = D.changes;
  const block = (title, rows, susp, empty, Icon, tone) => (
    <Card title={title} icon={Icon} tone={tone} count={rows.length} countTone={tone}>
      <List rows={rows} empty={empty} max={420} render={m => (
        <Row key={(m.e || m.n) + m.d} onClick={() => openPerson(m)}>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0"><div className="truncate">{m.n}</div><div className="sub truncate">{m.plan}</div></div>
            <div className="sub text-right">{(susp ? 'Since ' : '') + dDate(m.d)}<div>{susp ? (m.ends ? 'Back ' + dDate(m.ends) : 'Return date not set') : (m.reason || '')}</div></div>
          </div>
        </Row>)} />
    </Card>
  );
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {block('On suspension', D.suspended, true, 'No suspensions on record.', PauseCircle, 'lilac')}
      {block('Back from suspension', c.Back, false, 'Nobody came back this week.', CheckCircle2, 'green')}
      {block('Cancelled this week', L.cancelledRecent(), false, 'No cancellations this week.', UserX, 'red')}
      {block('Packs ended', c.Ended, false, 'No packs ran out this week.', ShoppingBag, 'orange')}
    </div>
  );
}

// ---------------- Rollovers (intro offer -> membership or class pack) ----------------
export function MembersRollovers() {
  const { v } = useNav(), b = B(), days = v.roDays || 90, from = b.today - (days - 1) * DAY;
  const rows = (D.intros || []).filter(r => r.d >= from).map(r => {
    const ci = L.findClient(r.e, r.n), st = L.introStart(r), end = L.introEnd(r);
    return Object.assign({}, r, { ci, end, st: st.s, stSrc: st.src, visits: L.countFor(ci, st.s || r.d, b.now), ph: r.ph || (ci > -1 ? D.clients[ci].ph : '') });
  });
  const conv = rows.filter(r => r.convOn).sort((a, c) => c.convOn - a.convOn);
  const already = rows.filter(r => r.already);
  const open = rows.filter(r => !r.convOn && !r.already);
  const onIntro = open.filter(r => r.end >= b.today).sort((a, c) => (!a.st) - (!c.st) || a.end - c.end);
  const finished = open.filter(r => r.end < b.today).sort((a, c) => c.end - a.end);
  const decided = conv.length + finished.length, rate = decided ? Math.round(conv.length / decided * 100) + '%' : '—';
  const endTxt = r => { if (!r.st) return 'Not started'; const d = Math.round((r.end - b.today) / DAY); return d > 1 ? `Ends in ${d} days` : d === 1 ? 'Ends tomorrow' : d === 0 ? 'Ends today' : `Ended ${-d} days ago`; };
  const openRow = r => (
    <Row key={(r.e || r.n) + r.d} onClick={() => r.ci > -1 ? openClient(r.ci) : openPerson(r)}>
      <div className="grid grid-cols-[1fr_auto] items-center gap-3">
        <div className="min-w-0"><div className="truncate">{r.n}</div><div className="sub truncate">{shortPlan(r.plan)} · {r.st ? `started ${dDate(r.st)}${r.stSrc === 'set' ? '' : ' (first class)'}` : 'not started yet'}{r.st && r.st - r.d > 1.5 * DAY ? ` · bought ${dDate(r.d)}` : ''}</div></div>
        <div className="text-right"><Pill tone={!r.st ? 'lilac' : r.end < b.today ? 'red' : (r.end - b.today) <= 7 * DAY ? 'orange' : 'grey'}>{endTxt(r)}</Pill><div className="sub mt-0.5">{plural(r.visits, 'visit')} so far</div></div>
      </div>
    </Row>
  );
  return (
    <div className="space-y-5">
      <Toolbar><Seg options={[[30, 'Last 30 days'], [90, 'Last 90 days'], [182, 'Last 6 months']]} value={days} onChange={x => setView({ roDays: x })} /></Toolbar>
      <StatGrid>
        <Stat icon={Repeat} label="Started an intro offer" value={rows.length} />
        <Stat icon={CheckCircle2} label="Rolled over" value={conv.length} sub={`${conv.filter(r => r.convKind !== 'pack').length} membership · ${conv.filter(r => r.convKind === 'pack').length} pack · rate ${rate}`} tone="green" />
        <Stat icon={CalendarClock} label="Still on their intro" value={onIntro.length} sub="Talk to them before it ends" tone="orange" />
        <Stat icon={AlertTriangle} label="Finished, not converted" value={finished.length} sub="Follow up" tone="red" />
      </StatGrid>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="Still on their intro" count={onIntro.length} countTone="orange"><List rows={onIntro} render={openRow} empty="Nobody is on an intro offer right now." max={460} /></Card>
        <Card title="Finished, not converted" count={finished.length} countTone="red"><List rows={finished} render={openRow} empty="Nobody to follow up." max={460} /></Card>
      </div>
      <Card title="Rolled over (membership or pack)" icon={ArrowRightLeft} tone="green" count={conv.length} countTone="green">
        <List rows={conv} empty="No conversions in this period yet." render={r => (
          <Row key={(r.e || r.n) + r.d} onClick={() => r.ci > -1 ? openClient(r.ci) : openPerson(r)}>
            <div className="grid grid-cols-[1fr_auto] items-center gap-3 md:grid-cols-[1fr_1.6fr_auto_auto]">
              <div className="truncate">{r.n}</div>
              <div className="sub hidden truncate md:block">{shortPlan(r.plan)} → {shortPlan(r.convPlan)}</div>
              <div className="sub hidden md:block">{r.convKind === 'pack' ? 'Pack' : 'Joined'} {dDate(r.convOn)}</div>
              <Pill tone={r.convKind === 'pack' ? 'lilac' : 'green'}>{r.convKind === 'pack' ? 'Pack · ' : ''}{Math.max(0, Math.round((r.convOn - r.d) / DAY))} days to convert</Pill>
            </div>
          </Row>)} />
      </Card>
      {already.length > 0 && <More title={`Already members when they did the intro (${already.length})`}><List rows={already} render={openRow} /></More>}
      <Note>Intro offers come from Hapana purchases and the weekly Member Movement export. Which packages count as intro offers is set on the Intro_Offers tab of the sheet.</Note>
    </div>
  );
}

// ---------------- Payments (from the template's Finances tab, using what Hapana provides) ----------------
export function MembersPayments() {
  const [q, setQ] = useState('');
  const rows = D.clients.map((c, ci) => ({ ci, c })).filter(x => x.c.pay && (!q || lc(x.c.n).includes(lc(q)))).sort((a, b) => b.c.pay - a.c.pay || a.c.n.localeCompare(b.c.n));
  return (
    <Card title="Payment issues" icon={CreditCard} tone="red" count={rows.length} countTone="red" right={<SearchBox value={q} onChange={setQ} placeholder="Search by name" className="sm:w-64" />}
      footer="Failed and outstanding payments as Hapana reports them on each client (refreshed every morning). Sort them out in Hapana; they drop off here once cleared there.">
      <List rows={rows} empty="No failed or outstanding payments. All clear." render={r => (
        <Row key={r.ci} onClick={() => openClient(r.ci)}>
          <div className="grid grid-cols-[1fr_auto] items-center gap-3 md:grid-cols-[1.2fr_1.6fr_auto_1fr]">
            <div className="min-w-0"><div className="truncate">{r.c.n}</div><div className="sub truncate">{r.c.ph || r.c.e}</div></div>
            <div className="sub hidden truncate md:block">{L.pkgText(r.ci)}</div>
            <Pill tone="red">{plural(r.c.pay, 'payment')} to sort out</Pill>
            <div className="sub hidden md:block">{ago(r.c.l)}</div>
          </div>
        </Row>)} />
    </Card>
  );
}
