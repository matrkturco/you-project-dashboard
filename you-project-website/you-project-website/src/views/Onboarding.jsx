import { Sparkles, UserCheck, ShoppingBag, GraduationCap, UserPlus, Layers, AlertTriangle } from 'lucide-react';
import * as L from '../lib/logic.js';
import { D, B, DAY, H, dDate, dTime, plural } from '../lib/logic.js';
import { Card, Pill, Row, List, Note, Warn, Stat, StatGrid, cx } from '../components/ui.jsx';
import { openClient, openClass, openPerson } from '../components/people.jsx';
import { RiskRow } from './Members.jsx';

/** Everyone whose first visit was in the last 30 days, as action rows. Once Contacted / Not needed is tapped they move to "Actioned". */
function newFaces() {
  const b = B(), since = b.today - 30 * DAY;
  return D.clients.map((c, ci) => ({ ci, c })).filter(x => x.c.f && x.c.f >= since).map(x => {
    const visits = L.countFor(x.ci, x.c.f, b.now), booked = L.countFor(x.ci, b.now, b.now + 14 * DAY);
    const status = visits >= 3 ? ['green', 'Building a habit'] : (visits <= 1 && !booked && b.now - x.c.f > 3 * DAY) ? ['red', 'Needs a nudge'] : ['orange', 'Getting started'];
    const p = { k: x.c.e || 'ci:' + x.ci, e: x.c.e || '', n: x.c.n, ci: x.ci, m: null, plan: L.pkgText(x.ci), last: x.c.l, src: x.c.src, ph: x.c.ph,
      sub: `First visit ${dDate(x.c.f)}${x.c.src ? ' · via ' + L.srcText(x.c.src) : ''}`,
      reasons: [{ code: 'new', label: status[1], cls: status[0] }, { code: 'vb', label: `${plural(visits, 'visit')} · ${booked} booked`, cls: 'grey' }], f: x.c.f, status };
    const n = L.noteFor(p.e);
    // only outreach logged since their first visit counts (an old note from years ago doesn't)
    p.stage = n.on && n.on >= x.c.f - DAY ? L.stageOf(p) : 'todo';
    return p;
  }).sort((a, c) => (a.status[1] === 'Needs a nudge' ? -1 : 0) - (c.status[1] === 'Needs a nudge' ? -1 : 0) || c.f - a.f);
}

export function ObNew() {
  const all = newFaces(), rows = all.filter(p => p.stage === 'todo'), done = all.length - rows.length;
  return (
    <div className="space-y-5">
      {!D.hasHistory && <Warn>Earlier history is still loading, so some regular clients may briefly show as new.</Warn>}
      <Card title="New faces to action" icon={Sparkles} tone="green" count={rows.length} countTone="green"
        footer={`First visit in the last 30 days. Tap Contacted or Not needed and they move to Actioned${done ? ` (${done} there now)` : ''}.`}>
        <List rows={rows} empty="Everyone new in the last 30 days has been actioned." render={p => <RiskRow key={p.k} p={p} />} />
      </Card>
    </div>
  );
}

export function ObActioned() {
  const rows = newFaces().filter(p => p.stage !== 'todo').map(p => Object.assign(p, { undo: true })).sort((a, c) => (L.noteFor(c.e).on || 0) - (L.noteFor(a.e).on || 0));
  return (
    <Card title="New faces, actioned" icon={UserCheck} tone="accent" count={rows.length} countTone="accent"
      footer="New faces someone has already contacted or marked Not needed, newest first. Tap Undo to send someone back to New faces.">
      <List rows={rows} empty="Nobody has been actioned yet." render={p => <RiskRow key={p.k} p={p} />} />
    </Card>
  );
}

/** From the template's onboarding pipeline: new people by week since their first visit. */
export function ObBoard() {
  const weeks = L.onboardingWeeks(), atRisk = weeks.flat().filter(x => x.risk).length;
  return (
    <div className="space-y-5">
      <StatGrid cols="lg:grid-cols-5">
        {weeks.map((w, i) => <Stat key={i} icon={Layers} label={`Week ${i + 1}`} value={w.length} sub={`${w.filter(x => x.risk).length} at risk`} tone={w.some(x => x.risk) ? 'orange' : 'green'} />)}
        <Stat icon={AlertTriangle} label="At risk overall" value={atRisk} sub="Few visits and nothing booked" tone="red" />
      </StatGrid>
      <Note>Everyone whose first visit was in the last four weeks, grouped by how far in they are. At risk means one visit or less and nothing booked (or falling behind about a visit a week by weeks 3 and 4). Click anyone to add a note.</Note>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {weeks.map((w, i) => (
          <div key={i} className="card flex max-h-[640px] flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-line/10 px-4 py-3">
              <h3 className="text-[12.5px] tracking-sub">WEEK {i + 1}</h3><Pill tone={w.some(x => x.risk) ? 'orange' : 'green'}>{w.length}</Pill>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto p-3 scroll-thin">
              {w.length ? w.map(x => (
                <button key={x.ci} onClick={() => openClient(x.ci)} className={cx('w-full rounded-xl border p-3 text-left transition-colors hover:bg-raised/60', x.risk ? 'border-red/30 bg-red/[.05]' : 'border-line/10 bg-raised/30')}>
                  <div className="flex items-start justify-between gap-2"><span className="truncate text-[13px] text-ink">{x.c.n}</span>{x.risk && <Pill tone="red">At risk</Pill>}</div>
                  <div className="sub mt-0.5 truncate">{L.pkgText(x.ci)}</div>
                  <div className="mt-2 flex items-center gap-3 text-[11.5px] text-faint"><span>{plural(x.visits, 'visit')}</span><span>{x.booked} booked</span><span>Day {x.daysIn + 1}</span></div>
                </button>
              )) : <p className="py-6 text-center text-[12.5px] text-faint">Nobody this week</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ObNever() {
  const rows = L.riskPool().filter(p => p.reasons.some(r => r.code === 'never'));
  rows.forEach(p => p.stage = L.stageOf(p));
  return (
    <Card title="Bought, never came" icon={ShoppingBag} tone="red" count={rows.length} countTone="red"
      footer="Bought a membership, intro offer or pack (3 to 60 days ago) and haven’t been to a class since. Lead source shows where they came from.">
      <List rows={rows} empty="Everyone who bought recently has been in." render={p => <RiskRow key={p.k} p={p} />} />
    </Card>
  );
}

export function ObInductions() {
  const b = B(), ind = D.classes.filter(c => /induction/i.test(c.n) && c.t >= b.today - 30 * DAY && c.t < b.now).sort((a, c) => c.t - a.t);
  return (
    <Card title="Inductions, last 30 days" icon={GraduationCap} count={ind.length} footer="Studio inductions and how many of those people have come back or booked again since.">
      <List rows={ind} empty="No inductions in the last 30 days." render={(c, i) => (
        <Row key={i} onClick={() => openClass(c)}>
          <div className="grid grid-cols-[1fr_auto] items-center gap-3 md:grid-cols-[1.3fr_1fr_auto_1.2fr]">
            <div className="truncate">{c.n}</div><div className="sub hidden md:block">{dDate(c.t)}, {dTime(c.t)}</div>
            <Pill tone="primary">{plural(c.b, 'person')}</Pill>
            <div className="sub hidden text-right md:block">{c.p.filter(ci => L.countFor(ci, c.t + H, b.now + 14 * DAY) > 0).length} came back or booked again</div>
          </div>
        </Row>)} />
    </Card>
  );
}

export function ObSignups() {
  const row = (m, extra) => (
    <Row key={(m.e || m.n) + m.d} onClick={() => openPerson(m)}>
      <div className="flex items-center justify-between gap-3"><div className="min-w-0"><div className="truncate">{m.n}</div><div className="sub truncate">{m.plan}</div></div>
        <div className="sub text-right">{dDate(m.d)}{extra ? <div>{extra}</div> : null}</div></div>
    </Row>
  );
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card title="New sign-ups, last 7 days" icon={UserPlus} tone="accent" count={D.changes.New.length} countTone="accent" footer="New packages and memberships from the Member Movement export.">
        <List rows={D.changes.New} render={m => row(m)} empty="No new sign-ups this week." />
      </Card>
      <Card title="Packs ended" icon={ShoppingBag} tone="orange" count={D.changes.Ended.length} countTone="orange">
        <List rows={D.changes.Ended} render={m => row(m, 'Offer a membership')} empty="No packs ran out this week." />
      </Card>
    </div>
  );
}
