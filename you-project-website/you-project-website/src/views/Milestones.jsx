import { useState } from 'react';
import { PartyPopper, CalendarClock, Trophy, Cake } from 'lucide-react';
import * as L from '../lib/logic.js';
import { D, dDate, fmt, plural } from '../lib/logic.js';
import { useNav, setView, save, toast } from '../lib/store.js';
import { Card, Seg, Pill, Row, List, Warn, Note, Toolbar, cx } from '../components/ui.jsx';
import { openClient } from '../components/people.jsx';

const KINDS = [['all', 'Everyone'], ['new', 'New members'], ['habit', 'Building the habit'], ['long', 'Long-timers']];
const KIND_PILL = { new: 'green', habit: 'orange', long: 'gold' };

function MsNotes() {
  return (
    <div className="space-y-3">
      {!D.lifeCut && <Warn>Lifetime visit milestones (10 to 500) appear once the one-off lifetime backfill has run. Until then, only first class, first month, streaks and anniversaries show.</Warn>}
      <Note>Lifetime milestones: {D.lifeMilestones.join(', ')} visits (change them on the Celebrations tab of the sheet), plus first class, first month, 4-week plan streaks and anniversaries.</Note>
    </div>
  );
}

function MarkButton({ x }) {
  const [busy, setBusy] = useState(false);
  return (
    <button disabled={busy} className="btn btn-primary px-2.5 py-1 text-[12px]" onClick={async e => {
      e.stopPropagation(); setBusy(true);
      try { await save('saveReward', x.c.k, x.c.n, x.label); toast(`${x.c.n}: ${x.label} celebrated`); } catch (er) { toast(er.message, 'error'); setBusy(false); }
    }}>{busy ? 'Saving…' : 'Mark celebrated'}</button>
  );
}

function CelebrateRow({ x, showBtn }) {
  return (
    <Row onClick={() => openClient(x.ci)} dim={showBtn && x.done}>
      <div className="grid grid-cols-[1fr_auto] items-center gap-3 md:grid-cols-[1.2fr_auto_1.2fr_140px]">
        <div className="min-w-0"><div className="truncate">{x.c.n}</div><div className="sub truncate">{L.pkgText(x.ci)}</div></div>
        <Pill tone={KIND_PILL[x.kind] || 'primary'}>{x.label}</Pill>
        <div className="sub hidden md:block">{x.why}</div>
        <div className="hidden justify-end md:flex">{!showBtn ? null : x.done ? <Pill>Celebrated</Pill> : L.isEditor() ? <MarkButton x={x} /> : null}</div>
      </div>
    </Row>
  );
}

export function MsCelebrate() {
  const { v } = useNav(), k = v.msKind || 'all';
  const rows = L.allCelebrations().now.filter(x => k === 'all' || x.kind === k).sort((a, c) => (a.done - c.done) || a.c.n.localeCompare(c.c.n));
  return (
    <div className="space-y-5">
      <MsNotes />
      <Toolbar><Seg options={KINDS} value={k} onChange={x => setView({ msKind: x })} /></Toolbar>
      <Card title="Celebrate this week" icon={PartyPopper} tone="gold" count={`${rows.filter(x => !x.done).length} to celebrate`} countTone="gold">
        <List rows={rows} empty="Nothing to celebrate in this group this week." render={(x, i) => <CelebrateRow key={i} x={x} showBtn />} />
      </Card>
    </div>
  );
}

export function MsComing() {
  const { v } = useNav(), k = v.msKind || 'all';
  const rows = L.allCelebrations().soon.filter(x => k === 'all' || x.kind === k).sort((a, c) => a.c.n.localeCompare(c.c.n));
  return (
    <div className="space-y-5">
      <MsNotes />
      <Toolbar><Seg options={KINDS} value={k} onChange={x => setView({ msKind: x })} /></Toolbar>
      <Card title="Coming up" icon={CalendarClock} count={rows.length}>
        <List rows={rows} empty="Nothing coming up in this group." render={(x, i) => <CelebrateRow key={i} x={x} />} />
      </Card>
    </div>
  );
}

/** From the template's celebrations panel: upcoming birthdays. */
export function MsBirthdays() {
  const { v } = useNav(), days = v.bdDays || 14;
  const rows = L.birthdays(days, 3);
  const has = D.clients.some(c => c.bd);
  const when = r => r.diff === 0 ? 'Today' : r.diff === 1 ? 'Tomorrow' : r.diff === -1 ? 'Yesterday' : r.diff < 0 ? `${-r.diff} days ago` : `In ${r.diff} days`;
  return (
    <div className="space-y-5">
      <Toolbar><Seg options={[[7, 'Next 7 days'], [14, 'Next 2 weeks'], [31, 'Next month']]} value={days} onChange={x => setView({ bdDays: x })} /></Toolbar>
      {!has && <Warn>Birthdays appear after the updated Apps Script has run (it adds each client’s birthday, month and day only, from Hapana).</Warn>}
      <Card title="Birthdays" icon={Cake} tone="gold" count={rows.length} countTone="gold" footer="Members, pack and intro clients, and anyone who has visited in the last 60 days. Cancelled members are left out.">
        <List rows={rows} empty="No birthdays in this window." render={r => (
          <Row key={r.ci + '-' + r.t} onClick={() => openClient(r.ci)} dim={r.diff < 0}>
            <div className="grid grid-cols-[1fr_auto] items-center gap-3 md:grid-cols-[1.2fr_1.4fr_auto_120px]">
              <div className="min-w-0"><div className="truncate">{r.c.n}</div><div className="sub">{fmt(r.t, { weekday: 'long', day: 'numeric', month: 'long' })}</div></div>
              <div className="sub hidden truncate md:block">{L.pkgText(r.ci)}</div>
              <Pill tone={r.diff === 0 ? 'gold' : r.diff < 0 ? 'grey' : 'primary'}>{when(r)}</Pill>
              <div className="sub hidden text-right md:block">{r.age ? `Turning ${r.age}` : ''}</div>
            </div>
          </Row>)} />
      </Card>
    </div>
  );
}

export function MsBoard() {
  const { v } = useNav(), life = v.lbLife !== false && !!D.lifeCut;
  const top = D.clients.map((c, ci) => ({ ci, c, v: life ? L.lifetimeOf(c) : c.ytd })).filter(x => x.v > 0 && (v.lbScope === 'all' || x.c.mem))
    .sort((a, b) => b.v - a.v).slice(0, 25);
  return (
    <div className="space-y-5">
      <MsNotes />
      <Toolbar>{D.lifeCut ? <Seg options={[[true, 'All time'], [false, 'This year']]} value={life} onChange={x => setView({ lbLife: x })} /> : null}
        <Seg options={[['all', 'Everyone'], ['mem', 'Members only']]} value={v.lbScope} onChange={x => setView({ lbScope: x })} /></Toolbar>
      <Card title={life ? 'Most visits, all time' : `Most visits in ${fmt(Date.now(), { year: 'numeric' })}`} icon={Trophy} tone="gold">
        <List rows={top} empty="No visits recorded yet." render={(x, i) => (
          <Row key={x.ci} onClick={() => openClient(x.ci)}>
            <div className="grid grid-cols-[40px_1fr_auto] items-center gap-3 md:grid-cols-[40px_1.3fr_1.4fr_auto_110px]">
              <span className={cx('font-display text-lg', i < 3 ? 'text-primary' : 'text-faint')}>{i + 1}</span>
              <div className="truncate">{x.c.n}</div>
              <div className="sub hidden truncate md:block">{L.pkgText(x.ci)}</div>
              <div className="text-right"><span className="font-display text-lg text-ink">{x.v}</span><span className="sub"> visits</span></div>
              <div className="sub hidden text-right md:block">{x.c.m} this month</div>
            </div>
          </Row>)} />
      </Card>
    </div>
  );
}
