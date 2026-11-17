// Geronimo Academy weekly reports: Red Flag, Orange Flag, Fringe List and Hall of Fame (250+), using Geronimo's own definitions.
import { useState } from 'react';
import { Flag, AlertTriangle, TrendingDown, Trophy, Copy, Download, CalendarDays, ClipboardList, Users, ShoppingBag, Repeat, UserX, Footprints, PauseCircle, Info, UserPlus, Table2, ExternalLink, SearchCheck } from 'lucide-react';
import * as L from '../lib/logic.js';
import { D, B, DAY, dDate, fmt, plural, noteFor, lc, shortPlan, shiftDays } from '../lib/logic.js';
import { useNav, setView, goto, toast } from '../lib/store.js';
import { Card, Seg, Pill, Row, List, More, Note, Toolbar, Stat, StatGrid, cx } from '../components/ui.jsx';
import { openClient, openMember, openList, openPerson } from '../components/people.jsx';
import { RiskRow, PlanFlags } from './Members.jsx';

const day = ms => fmt(ms, { weekday: 'short', day: 'numeric', month: 'short' });

function asRisk(m, code, label, cls) {
  const ci = m.ci, c = ci > -1 ? D.clients[ci] : null;
  const p = { k: m.e || 'name:' + lc(m.n), e: m.e ? lc(m.e) : '', n: m.n, ci, m: m.m || (m.x ? m : null), plan: m.plan || m.detail || '',
    reasons: [{ code, label, cls }], last: c ? c.l : null, src: c ? c.src : '', ph: c ? c.ph : '' };
  p.stage = L.stageOf(p);
  return p;
}
const outreach = e => { const n = noteFor(e); return n.status && n.status !== 'Pending' && n.on ? `${n.status}${n.by ? ' by ' + n.by : ''} ${fmt(n.on, { day: 'numeric', month: 'short' })}` : 'Not contacted yet'; };
const lastVisit = ci => { const c = D.clients[ci]; return c && c.l ? fmt(c.l, { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'No visits on record'; };

function exportButtons(name, head, rows) {
  const tsv = [head, ...rows].map(r => r.map(v => String(v == null ? '' : v).replace(/[\t\n]/g, ' ')).join('\t')).join('\n');
  const csv = [head, ...rows].map(r => r.map(v => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const copy = async () => { try { await navigator.clipboard.writeText(tsv); toast(`Copied ${plural(rows.length, 'row')}. Paste into the tracker.`); } catch (e) { toast('Couldn’t copy. Try Download instead.', 'error'); } };
  const download = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `${name} ${fmt(Date.now(), { year: 'numeric', month: '2-digit', day: '2-digit' }).split('/').reverse().join('-')}.csv`;
    a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  return <><button className="btn" onClick={copy} disabled={!rows.length}><Copy className="h-3.5 w-3.5" />Copy for tracker</button>
    <button className="btn" onClick={download} disabled={!rows.length}><Download className="h-3.5 w-3.5" />Download</button></>;
}

function Skipped({ skipped }) {
  if (!skipped.length) return null;
  return (
    <More title={`Not counted this time (${skipped.length})`}>
      <List rows={skipped} render={x => (
        <Row key={x.m.e || x.m.n} onClick={() => openMember(x.m)}>
          <div className="flex items-center justify-between gap-3"><div className="min-w-0"><div className="truncate">{x.m.n}</div><div className="sub truncate">{x.m.plan}</div></div><Pill tone="lilac">{x.skip}</Pill></div>
        </Row>)} />
    </More>
  );
}

function RedReport() {
  const r = L.geronimoRed(), b = B();
  const rows = r.list.map(m => asRisk(m, 'red', '0 visits since last Monday', 'red'));
  const head = ['Name', 'Phone', 'Email', 'Plan', 'Visits (week)', 'Last visit', 'Outreach', 'Notes'];
  const data = r.list.map(m => [m.n, (D.clients[m.ci] || {}).ph || '', m.e, m.plan, 0, lastVisit(m.ci), outreach(m.e), noteFor(m.e).note || '']);
  return (
    <div className="space-y-4">
      <Note>Members with <b>0 visits from {day(r.from)} up to today</b>. Anyone who has come in since {day(b.monday)} is back on track and isn’t flagged (see “Not counted” below). Run every Monday. Needs a call or personal message the same day; escalate to the owner if you can’t reach them.</Note>
      <Card title="Red Flag Report" icon={Flag} tone="red" count={r.list.length} countTone="red" right={exportButtons('Red Flag Report', head, data)}
        footer={`No visits since ${day(r.from)}. Tap Contacted once you’ve reached out; it’s stamped with your name and the date, and shows on Risks too.`}>
        <List rows={rows} empty="Nobody has 0 visits since last Monday." render={p => <RiskRow key={p.k} p={p} />} />
      </Card>
      <Skipped skipped={r.skipped} />
    </div>
  );
}

const GROUP_LABEL = { check: 'Needs a check-in', late: 'Usually trains Thu–Sun' };
function OrangeReport() {
  const r = L.geronimoOrange();
  const label = m => m.group === 'late' ? `0 visits Mon–Wed · usually ${m.usual.text}` : '0 visits Mon–Wed · not in since';
  const rowsOf = list => list.map(m => asRisk(m, 'orange', label(m), m.group === 'check' ? 'orange' : 'grey'));
  const head = ['Name', 'Phone', 'Email', 'Plan', 'Visits (Mon–Wed)', 'Usual days (last 6 weeks)', 'Group', 'Last visit', 'Outreach', 'Notes'];
  const data = r.list.map(m => [m.n, (D.clients[m.ci] || {}).ph || '', m.e, m.plan, 0, m.usual.text, GROUP_LABEL[m.group], lastVisit(m.ci), outreach(m.e), noteFor(m.e).note || '']);
  return (
    <div className="space-y-4">
      <Note>Members with <b>0 visits from {day(r.from)} to {day(r.to)} who haven’t come in since and have nothing booked for the rest of the week</b> ({r.list.length} this week). Anyone who has already come in on Thursday–Sunday, or is booked in, is on schedule and isn’t flagged (see “Not counted” below).
        Members who always train Thursday–Sunday are shown separately: they only need a light reminder to book.
        {!r.complete && <> <b>It’s not Wednesday night yet</b>, so this is the list so far.</>}</Note>
      <Card title="Needs a check-in" icon={AlertTriangle} tone="orange" count={r.check.length} countTone="orange" right={exportButtons('Orange Flag Report', head, data)}
        footer="0 visits Monday–Wednesday, not in since, nothing booked for the rest of the week, and they usually come earlier in the week. Download includes both groups, with a Group column.">
        <List rows={rowsOf(r.check)} empty="Nobody needs a check-in this week." render={p => <RiskRow key={p.k} p={p} />} />
      </Card>
      <More title={`Usually trains Thursday–Sunday (${r.late.length}): not booked yet, worth a light reminder`}>
        <List rows={rowsOf(r.late)} empty="Nobody." render={p => <RiskRow key={p.k} p={p} />} />
      </More>
      <Skipped skipped={r.skipped} />
    </div>
  );
}

function FringeReport() {
  const f = L.geronimoFringe();
  const rows = f.list.map(x => asRisk(x, 'fringe', `${plural(x.visits, 'visit')} in 30 days`, x.visits === 0 ? 'red' : 'orange'));
  const head = ['Name', 'Phone', 'Email', 'Membership / offer', 'Visits (30 days)', 'Last visit', 'Outreach', 'Notes'];
  const data = f.list.map(x => [x.n, (D.clients[x.ci] || {}).ph || '', x.e, (x.type === 'Membership' ? '' : x.type + ': ') + x.detail, x.visits, lastVisit(x.ci), outreach(x.e), noteFor(x.e).note || '']);
  return (
    <div className="space-y-4">
      <Note>Members with <b>{L.FRINGE_MAX} or fewer visits in the last {L.FRINGE_DAYS} days</b>, the highest churn-risk group. Includes intro offers after their first week. Run every Monday with the Red Flag Report and surface anyone the owner should personally reach out to.</Note>
      <Card title="Fringe List" icon={TrendingDown} tone="orange" count={f.list.length} countTone="orange" right={exportButtons('Fringe List', head, data)}>
        <List rows={rows} empty="Nobody is on the Fringe List right now." render={p => <RiskRow key={p.k} p={p} />} />
      </Card>
      {f.newOnes.length > 0 && <More title={`Joined in the last ${L.FRINGE_DAYS} days, not counted yet (${f.newOnes.length})`}>
        <List rows={f.newOnes} render={x => <Row key={x.e || x.n} onClick={() => openMember(x.m)}><div className="flex justify-between gap-3"><span>{x.n}</span><span className="sub">{plural(x.visits, 'visit')}</span></div></Row>} />
      </More>}
    </div>
  );
}

function HallReport() {
  const rows = L.hallOfFame(), fresh = rows.filter(x => x.isNew);
  const head = ['Name', 'Total visits', 'Member since', 'New this week'];
  const data = rows.map(x => [x.c.n, x.exact ? x.lt : x.lt + '+', L.firstOf(x.c) ? fmt(L.firstOf(x.c), { month: 'short', year: 'numeric' }) : '', x.isNew ? 'Yes' : '']);
  return (
    <div className="space-y-4">
      {!D.lifeCut && <Note><b>Lifetime totals aren’t complete yet.</b> Until the lifetime backfill has run, totals only count this year (shown with a +).</Note>}
      <Note>Members who have hit <b>{L.HALL_OF_FAME}+ visits since the studio opened</b>. Update the Milestone Tracker every Monday and use them for the newsletter’s All Stars, socials and member rewards.</Note>
      <StatGrid cols="lg:grid-cols-2">
        <Stat icon={Trophy} label="Hall of Fame members" value={rows.length} tone="gold" />
        <Stat icon={CalendarDays} label="Joined the Hall of Fame this week" value={fresh.length} sub="Celebrate these first" tone="green" />
      </StatGrid>
      <Card title="Hall of Fame" icon={Trophy} tone="gold" count={rows.length} countTone="gold" right={exportButtons('Milestone Tracker', head, data)}>
        <List rows={rows} empty={`Nobody has reached ${L.HALL_OF_FAME} visits yet.`} render={x => (
          <Row key={x.ci} onClick={() => openClient(x.ci)}>
            <div className="grid grid-cols-[1fr_auto] items-center gap-3 md:grid-cols-[1.3fr_1.3fr_auto_120px]">
              <div className="min-w-0"><div className="truncate">{x.c.n}</div><div className="sub">{L.firstOf(x.c) ? 'Member since ' + fmt(L.firstOf(x.c), { month: 'short', year: 'numeric' }) : ''}</div></div>
              <div className="sub hidden truncate md:block">{L.pkgText(x.ci)}</div>
              <div className="text-right"><span className="font-display text-lg text-ink">{x.exact ? x.lt : x.lt + '+'}</span><span className="sub"> visits</span></div>
              <div className="hidden justify-end md:flex">{x.isNew ? <Pill tone="gold">New this week</Pill> : null}</div>
            </div>
          </Row>)} />
      </Card>
    </div>
  );
}

function Summary() {
  const counts = { red: L.geronimoRed().list.length, orange: L.geronimoOrange().check.length, fringe: L.geronimoFringe().list.length, hof: L.hallOfFame().filter(x => x.isNew).length };
  return (
    <StatGrid>
      <Stat icon={Flag} label="Red Flag · Monday" value={counts.red} sub="0 visits since last Monday" tone="red" onClick={() => goto('geronimo', 'red')} />
      <Stat icon={AlertTriangle} label="Orange Flag · Wednesday" value={counts.orange} sub={`Need a check-in · ${L.geronimoOrange().late.length} more usually train Thu–Sun`} tone="orange" onClick={() => goto('geronimo', 'orange')} />
      <Stat icon={TrendingDown} label="Fringe List · Monday" value={counts.fringe} sub={`${L.FRINGE_MAX} or fewer visits in 30 days`} tone="orange" onClick={() => goto('geronimo', 'fringe')} />
      <Stat icon={Trophy} label="Hall of Fame · Monday" value={counts.hof} sub="New 250+ members this week" tone="gold" onClick={() => goto('geronimo', 'hof')} />
    </StatGrid>
  );
}
const page = Report => () => <div className="space-y-5"><Summary /><Report /></div>;
export const GRed = page(RedReport), GOrange = page(OrangeReport), GFringe = page(FringeReport), GHall = page(HallReport);
export function GPlan() {
  return (
    <div className="space-y-4">
      <Note>An extra check, which Geronimo doesn’t ask for: members who came <b>fewer times than their plan</b> (for example 1 of 3), not just zero. Handy for the 2 and 3 classes a week plans.</Note>
      <PlanFlags />
    </div>
  );
}

// ---------------- Weekly numbers for the Geronimo Metrics sheet ----------------
const copyText = async (text, what) => { try { await navigator.clipboard.writeText(text); toast(`Copied ${what}`); } catch (e) { toast('Couldn’t copy', 'error'); } };
const short = d => fmt(d, { day: '2-digit', month: '2-digit', year: '2-digit' });

function MetricRow({ row, label, value, how, onSee, seeLabel = 'See who', kpi, manual }) {
  return (
    <div className="grid grid-cols-[46px_1fr_auto] items-center gap-3 border-b border-line/[.06] px-5 py-3 last:border-0 md:grid-cols-[46px_1.2fr_110px_1.6fr_auto]">
      <span className="font-mono text-[11px] text-faint">Row {row}</span>
      <div className="min-w-0"><div className="truncate text-ink">{label}</div>{kpi && <div className="text-[11px] text-faint">{kpi}</div>}</div>
      <div className={cx('text-right font-display text-xl tabular-nums', manual ? 'text-faint' : 'text-ink')}>{value === null || value === undefined ? '—' : value}</div>
      <div className="sub hidden md:block">{how}</div>
      <div className="col-span-3 flex justify-end gap-1.5 md:col-span-1">
        {onSee && <button className="btn px-2 py-1 text-[12px]" onClick={onSee}>{seeLabel}</button>}
        {!manual && value !== null && value !== undefined && <button className="btn btn-ghost px-2 py-1 text-[12px]" title="Copy this number" onClick={() => copyText(String(value), label)}><Copy className="h-3.5 w-3.5" /></button>}
      </div>
    </div>
  );
}

function Block({ title, rows, copyRows, Icon, tone }) {
  return (
    <Card title={title} icon={Icon} tone={tone}
      right={copyRows ? <button className="btn" onClick={() => copyText(copyRows.values.map(v => v == null ? '' : v).join('\n'), `rows ${copyRows.label}`)}><Copy className="h-3.5 w-3.5" />Copy {copyRows.label.includes('–') ? 'rows' : 'row'} {copyRows.label}</button> : null}>
      {rows}
    </Card>
  );
}

export function GWeekly() {
  const { v } = useNav();
  const fridays = L.reportDays(8);
  const end = v.gWeek && fridays.includes(v.gWeek) ? v.gWeek : fridays[0];
  const w = L.weeklyNumbers(end);
  const list = (title, rows, line, sub, pick) => () => openList(title, `${short(w.from)} – ${short(w.to)}`, rows, line, sub, pick);
  const purchRow = x => openPerson({ n: x.n, e: x.e, plan: x.plan });
  // Sales, rollovers, cancels and leads: the team's own Scoreboard when it covers the week (so the numbers match theirs), otherwise Hapana
  const sb = w.sb, sbM = w.sbMtd;
  const V = { intro: sb ? sb.i : w.introPack.length, mem: sb ? sb.m : w.memSales.length, roll: sb ? sb.r : w.rollovers.length,
    cx: sb ? sb.c : w.cancels.length, cxMtd: sbM ? sbM.c : w.cancelsMtd.length, pl: sb ? sb.pl : null, ol: sb ? sb.ol : null };
  const src = (hap, what) => sb ? `From your Scoreboard · Hapana shows ${hap}` : what;
  const all = [
    ['Autopay Member #', w.autopay], ['Class Packs', w.packs], ['Suspended Member #', w.suspended],
    ...(sb ? [['# of Meta Paid Leads', V.pl], ['# Organic Leads', V.ol]] : []),
    ['# Intro + Pack Sales', V.intro], ['Number of Membership Sales This Week', V.mem],
    ['Rollovers', V.roll], ['Attendance', w.attendance], ['Weekly cancels', V.cx], ['Cancels MTD', V.cxMtd]
  ];
  return (
    <div className="space-y-5">
      <Toolbar>
        <span className="text-[13px] text-muted">Week ending</span>
        <select value={end} onChange={e => setView({ gWeek: Number(e.target.value) })} className="rounded-lg border border-line/15 bg-bg/60 px-3 py-2 text-[13px] text-ink">
          {fridays.map(f => <option key={f} value={f}>{fmt(f, { weekday: 'short', day: 'numeric', month: 'short' })} ({short(f)})</option>)}
        </select>
        <span className="sub">Counts the 7 days {day(w.from)} – {day(w.to)}{!w.complete ? ' (week still in progress)' : ''}.</span>
        <button className="btn ml-auto" onClick={() => copyText(all.map(([k, val]) => `${k}: ${val == null ? '' : val}`).join('\n'), 'all numbers')}><ClipboardList className="h-3.5 w-3.5" />Copy all as a list</button>
      </Toolbar>
      <Note>Same rows as Geronimo’s <b>Metrics Template</b>. Paste each block into the week’s column starting at the row shown; the sheet’s own formulas (cost per lead, conversion %, rollover %, visits per member, churn %, net gain) then work as usual. {sb ? <> Sales, rollovers, cancels and leads come from your <b>Scoreboard</b> (read only, it’s never changed), with Hapana’s count beside each as a check.</> : <> Revenue, Facebook spend, leads and sales value aren’t in Hapana’s data, so they’re still entered by hand.</>}</Note>

      <Block title="Members (rows 3–5)" Icon={Users} tone="green" copyRows={{ label: '3–5', values: [w.autopay, w.packs, w.suspended] }} rows={<>
        <MetricRow row={3} label="Autopay Member #" value={w.autopay} how={w.asOfNow ? `Active memberships right now, not counting ${plural(w.cancelling.length, 'member')} cancelling (Hapana still counts them until their last payment)` : w.autopay == null ? 'No saved count for that week' : 'Saved daily count for that day'} onSee={w.asOfNow ? () => openList('Autopay members', plural(D.members.length, 'member'), D.members.filter(m => m.status !== 'Cancelling'), m => m.n, m => m.plan, m => openMember(m)) : null} />
        <MetricRow row={4} label="Class Packs" value={w.packs} how={w.asOfNow ? 'Hapana’s “Active Packages”: clients holding any current package' : w.packs == null ? 'No saved count for that week' : 'Saved daily count for that day'} onSee={w.asOfNow ? () => openList('Active packages', plural(w.packList.length, 'client'), w.packList, c => c.n, c => String(c.pkgs), c => openClient(D.clients.indexOf(c))) : null} />
        <MetricRow row={5} label="Suspended Member #" value={w.suspended} how={`Pauses that started ${dDate(shiftDays(w.from, -2))} – ${dDate(shiftDays(w.to, -2))}: one starting on a Thursday or Friday counts the week after. ${w.suspNow} on suspension right now in total.`} onSee={list('Suspended that week', w.suspList, x => x.n, x => `${x.plan || ''} · from ${dDate(x.d)}${x.ends ? ' to ' + dDate(x.ends) : ''}`, x => openPerson(x))} />
      </>} />

      {sb && <Block title="Lead gen (rows 9–10)" Icon={UserPlus} tone="accent" copyRows={null} rows={<>
        <MetricRow row={9} label="# of Meta Paid Leads" value={V.pl} how="From your Scoreboard (Paid Leads column)" />
        <MetricRow row={10} label="# Organic Leads" value={V.ol} how="From your Scoreboard (Organic Leads column)" />
      </>} />}

      <Block title="Lead follow up / sales (rows 12–13)" Icon={ShoppingBag} tone="accent" copyRows={{ label: '12–13', values: [V.intro, V.mem] }} rows={<>
        <MetricRow row={12} label="# Intro + Pack Sales" value={V.intro} how={src(w.introPack.length, 'Intro offers and class packs bought this week (Hapana purchases)')} seeLabel={sb ? 'Hapana list' : 'See who'} onSee={list('Intro + pack sales (Hapana)', w.introPack, x => x.n, x => `${x.plan} · ${dDate(x.d)}`, purchRow)} />
        <MetricRow row={13} label="Number of Membership Sales This Week" value={V.mem} how={src(w.memSales.length, 'New memberships bought this week, not counting rollovers, renewals or plan switches')} seeLabel={sb ? 'Hapana list' : 'See who'} onSee={list('Membership sales (Hapana)', w.memSales, x => x.n, x => `${x.plan} · ${dDate(x.d)}`, purchRow)} />
      </>} />

      <Block title="Trial to member (row 17)" Icon={Repeat} tone="green" copyRows={{ label: '17', values: [V.roll] }} rows={<>
        <MetricRow row={17} label="Rollovers" value={V.roll} how={src(w.rollovers.length, 'Intro offer → membership or class pack this week')} seeLabel={sb ? 'Hapana list' : 'See who'} onSee={list('Rollovers', w.rollovers, x => x.n, x => `${shortPlan(x.plan)} → ${shortPlan(x.convPlan)} · ${dDate(x.convOn)}`, x => openPerson(x))} />
        <MetricRow row={18} label="Rollover % (check)" kpi="KPI 80% · your sheet calculates this" value={w.rolloverPct == null ? null : w.rolloverPct + '%'} manual
          how={`Our estimate: of the ${plural(w.ending.length, 'intro offer')} that ended this week, ${w.endConv.length} rolled over`} onSee={w.ending.length ? list('Intro offers ending this week', w.ending, x => x.n, x => (x.convOn ? 'Rolled over ' + dDate(x.convOn) : 'Not yet') + ' · ' + shortPlan(x.plan), x => openPerson(x)) : null} />
      </>} />

      <Block title="Engagement (row 20)" Icon={Footprints} copyRows={{ label: '20', values: [w.attendance] }} rows={<>
        <MetricRow row={20} label="Attendance" value={w.attendance} how={`Visits this week (${w.people} different ${w.people === 1 ? 'person' : 'people'})`} />
        <MetricRow row={21} label="Ave visit per member (check)" kpi="KPI 3–4 · your sheet calculates this" value={w.avgVisits} manual how="Attendance ÷ autopay members" />
      </>} />

      <Block title="Churn (rows 23–24)" Icon={UserX} tone="red" copyRows={{ label: '23–24', values: [V.cx, V.cxMtd] }} rows={<>
        <MetricRow row={23} label="Weekly cancels" value={V.cx} how={src(w.cancels.length, 'Full cancellations this week (plan switches left out)')} seeLabel={sb ? 'Hapana list' : 'See who'} onSee={list('Cancelled this week', w.cancels, x => x.n, x => `${shortPlan(x.plan)} · ${dDate(x.d)}`, x => openPerson(x))} />
        <MetricRow row={24} label="Cancels MTD" value={V.cxMtd} how={sbM ? `From your Scoreboard · Hapana shows ${w.cancelsMtd.length}` : 'Full cancellations since the 1st of the month'} seeLabel={sbM ? 'Hapana list' : 'See who'} onSee={list('Cancelled this month', w.cancelsMtd, x => x.n, x => `${shortPlan(x.plan)} · ${dDate(x.d)}`, x => openPerson(x))} />
        <MetricRow row={25} label="Monthly Churn % (check)" kpi="KPI 5% · your sheet calculates this" value={w.churnPct == null ? null : w.churnPct + '%'} manual how="Cancels MTD ÷ autopay members" />
        <MetricRow row={27} label="Net Gain or loss (check)" value={V.roll + V.mem - V.cx} manual how="Rollovers + membership sales − weekly cancels" />
      </>} />

      <Card title="Flag reports this week" icon={Flag} tone="red">
        <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-3">
          <button onClick={() => goto('geronimo', 'red')} className="rounded-xl border border-line/10 bg-raised/30 p-3 text-left hover:border-red/40"><div className="sub">Red Flag (last week)</div><div className="font-display text-2xl text-red">{w.red}</div></button>
          <button onClick={() => goto('geronimo', 'orange')} className="rounded-xl border border-line/10 bg-raised/30 p-3 text-left hover:border-orange/40"><div className="sub">Orange Flag (Mon–Wed)</div><div className="font-display text-2xl text-orange">{w.orange}</div><div className="text-[11px] text-faint">need a check-in · {w.orangeAll} flagged in total</div></button>
          <button onClick={() => goto('geronimo', 'fringe')} className="rounded-xl border border-line/10 bg-raised/30 p-3 text-left hover:border-orange/40"><div className="sub">Fringe List (30 days)</div><div className="font-display text-2xl text-orange">{w.fringe}</div></button>
        </div>
      </Card>
    </div>
  );
}


// ---------------- Scoreboard (read only, from the team's Metrics sheet) ----------------
const SB_COLS = [['r', 'Rollovers'], ['m', 'Memberships'], ['i', '28 Day (intro)'], ['c', 'Cancels'], ['pl', 'Paid leads'], ['ol', 'Organic leads']];
export function GScore() {
  const { v } = useNav(), sb = L.scoreboard();
  if (!sb) return <Note>The Scoreboard isn’t connected yet. Once the Metrics sheet link is added to Apps Script (Tools.gs), your monthly Scoreboard tabs show here, read only.</Note>;
  if (sb.error) return <Note>{sb.error}</Note>;
  const months = L.scoreMonths();
  if (!months.length) return <Note>No Scoreboard tabs found in “{sb.name}”. The dashboard looks for tabs named like “Nov Scoreboard”.</Note>;
  const mon = months.find(m => m.key === v.sbMonth) || months[0];
  const tot = L.scoreIn(mon.from, mon.to), miss = L.notOnScoreboard(mon.from, mon.to) || { intros: [], roll: [], mem: [], cx: [], total: 0 };
  const b = B(), days = tot.days.filter(d => d.t <= b.today).slice().reverse();
  const label = m => fmt(m.from + 12 * 3600e3, { month: 'long', year: 'numeric' });
  const group = (title, rows, line) => rows.length ? <div className="border-t border-line/[.07] px-5 py-3">
    <div className="mb-2 text-[12.5px] font-medium text-ink">{title} ({rows.length})</div>
    <div className="grid gap-1.5 sm:grid-cols-2">{rows.map((x, i) => <button key={i} onClick={() => openPerson(x)} className="rounded-lg border border-orange/25 bg-orange/[.05] px-3 py-2 text-left text-[13px] text-ink hover:border-orange/50">{x.n}<div className="sub">{line(x)}</div></button>)}</div>
  </div> : null;
  return (
    <div className="space-y-5">
      <Toolbar>
        <span className="text-[13px] text-muted">Month</span>
        <select value={mon.key} onChange={e => setView({ sbMonth: e.target.value })} className="rounded-lg border border-line/15 bg-bg/60 px-3 py-2 text-[13px] text-ink">
          {months.map(m => <option key={m.key} value={m.key}>{label(m)}</option>)}
        </select>
        <a href={sb.url} target="_blank" rel="noreferrer" className="btn ml-auto"><ExternalLink className="h-3.5 w-3.5" />Open the Scoreboard sheet</a>
      </Toolbar>
      <Note>A read-only copy of your <b>{label(mon).split(' ')[0]} Scoreboard</b> from “{sb.name}”. Keep updating the sheet as usual; the dashboard never changes it. It’s re-read with every refresh.</Note>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {SB_COLS.map(([k, l]) => <div key={k} className="card p-4"><div className="text-[12.5px] text-muted">{l}</div><div className={cx('mt-1 font-display text-[26px] tabular-nums', k === 'c' && tot[k] ? 'text-red' : 'text-ink')}>{tot[k]}</div></div>)}
      </div>
      <Card title="Not on the Scoreboard yet" icon={SearchCheck} tone={miss.total ? 'orange' : 'green'} count={miss.total} countTone={miss.total ? 'orange' : 'green'}
        footer="Recorded in Hapana this month, but we couldn’t find the name on the Scoreboard within a few days of it. If they belong there, add them to the sheet; if it’s a nickname or spelling difference, you can ignore it.">
        {miss.total ? <>
          {group('28 Day intros', miss.intros, x => `${shortPlan(x.plan)} · ${dDate(x.d)}`)}
          {group('Rollovers', miss.roll, x => `${shortPlan(x.convPlan || x.plan)} · ${dDate(x.convOn)}`)}
          {group('Memberships', miss.mem, x => `${shortPlan(x.plan)} · ${dDate(x.d)}`)}
          {group('Cancellations', miss.cx, x => `${shortPlan(x.plan)} · ${dDate(x.d)}`)}
        </> : <p className="px-5 py-4 text-[13px] text-muted">Everything Hapana recorded this month is on the Scoreboard. 🎉</p>}
      </Card>
      <Card title="Day by day" icon={Table2}>
        <div className="overflow-x-auto scroll-thin"><table className="w-full min-w-[760px] text-[12.5px]">
          <thead><tr className="text-left text-faint"><th className="px-5 py-2 font-normal">Day</th>{SB_COLS.map(([k, l]) => <th key={k} className="px-2 py-2 text-right font-normal">{l}</th>)}<th className="px-5 py-2 font-normal">Names</th></tr></thead>
          <tbody>{days.map(d => { const any = SB_COLS.some(([k]) => d[k]) || d.iN || d.rN || d.mN || d.x; return (
            <tr key={d.d} className={cx('border-t border-line/[.06] align-top', !any && 'text-faint')}>
              <td className="whitespace-nowrap px-5 py-2">{fmt(d.t + 12 * 3600e3, { weekday: 'short', day: 'numeric' })}</td>
              {SB_COLS.map(([k]) => <td key={k} className="px-2 py-2 text-right tabular-nums">{d[k] || ''}</td>)}
              <td className="px-5 py-2 text-muted">{[d.iN && '28 Day: ' + d.iN, d.rN && 'Rollover: ' + d.rN, d.mN && 'Membership: ' + d.mN, d.x].filter(Boolean).join(' · ')}</td>
            </tr>); })}</tbody>
        </table></div>
      </Card>
    </div>
  );
}
