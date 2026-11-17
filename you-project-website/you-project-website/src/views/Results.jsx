// Geronimo → Results: the same view as Geronimo's portal, rebuilt from the Metrics sheet's Dashboard tab (read only).
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { BarChart3, ExternalLink, CalendarDays } from 'lucide-react';
import { D, fmt } from '../lib/logic.js';
import { fromYmd } from '../../shared/time.js';
import { useNav, setView } from '../lib/store.js';
import { Card, Seg, Note, cx } from '../components/ui.jsx';
import { color } from '../components/charts.jsx';
import { STUDIO } from '../studio.js';

// Geronimo's 6-week sales cycle. The current one started with the 9 Oct 2026 report (so 30 Oct = week 4 of 6).
const CYCLE_START = STUDIO.geronimoCycleStart, CYCLE_WEEKS = 6, WEEK = 7 * 864e5;
// Start values Geronimo set for a cycle that aren't on that week's report (their baseline for the cycle). Everything else = the cycle's first report.
const BASELINES = {};   // e.g. { '2026-11-06': { intro: 2, conv: 39 } } when Geronimo gives start values that differ from that week's report

const money = v => v == null ? '—' : v >= 1000 ? '$' + (v / 1000).toFixed(1).replace(/\.0$/, '') + 'K' : '$' + Math.round(v);
const moneyDiff = v => Math.abs(v) >= 1000 ? '$' + (Math.abs(v) / 1000).toFixed(1).replace(/\.0$/, '') + 'K' : '$' + Math.round(Math.abs(v));
const num = (v, dp = 0) => v == null ? '—' : (Math.round(v * 10 ** dp) / 10 ** dp).toLocaleString('en-AU');
// key, label, how to show it, is "up" good?, kind ('money' | 'pct' | 'n')
const M = {
  rev: ['Rolling 30 Day Revenue', money, true, 'money'],
  autopay: ['Members on Autopay', v => num(v), true, 'n'],
  packs: ['Total # Of Active Packs In The Business', v => num(v), true, 'n'],
  paid: ['Total Paid Leads', v => num(v), true, 'n'],
  organic: ['Total Organic Leads', v => num(v), true, 'n'],
  leads: ['Total leads', v => num(v), true, 'n'],
  intro: ['Total Intro/Membership Sales', v => num(v), true, 'n'],
  conv: ['Sales Conversion Rate', v => v == null ? '—' : Math.round(v) + '%', true, 'pct'],
  rollPct: ['Rollover', v => v == null ? '—' : Math.round(v) + '%', true, 'pct'],
  avg: ['Average Weekly Visits Per Member', v => num(v, 1), true, 'n'],
  churn: ['Churn', v => v == null ? '—' : Math.round(v) + '%', false, 'pct'],
  net: ['Net Member Growth/Loss', v => num(v), true, 'n']
};
const RESULT_CARDS = ['rev', 'autopay', 'intro', 'rollPct', 'churn', 'leads', 'conv'];
const REPORTED = ['rev', 'autopay', 'packs', 'paid', 'organic', 'intro', 'conv', 'rollPct', 'avg', 'churn', 'net'];

function weeksData() {
  const m = D.metrics;
  return ((m && m.weeks) || []).map(w => Object.assign({ t: fromYmd(w.d), leads: w.paid == null && w.organic == null ? null : (w.paid || 0) + (w.organic || 0) }, w)).sort((a, c) => a.t - c.t);
}
const day = t => fmt(t + 12 * 3600e3, { day: 'numeric', month: 'short', year: 'numeric' });

/** ▲ / ▼ with green when it's a good change, red when bad, — when flat. */
function Change({ k, d, big }) {
  if (d == null || isNaN(d)) return <span className="text-faint">—</span>;
  const [, , upGood, kind] = M[k], r = Math.round(d * 10) / 10;
  const txt = kind === 'money' ? moneyDiff(d) : kind === 'pct' ? Math.abs(Math.round(d)) + ' pts' : Math.abs(r).toLocaleString('en-AU');
  if (Math.abs(d) < (kind === 'n' ? 0.05 : 0.5)) return <span className={cx('text-muted', big && 'font-medium')}>— {kind === 'pct' ? '0 pts' : 0}</span>;
  const good = d > 0 === upGood;
  return <span className={cx(good ? 'text-green' : 'text-red', big && 'font-medium')}>{d > 0 ? '▲' : '▼'} {txt}</span>;
}

export function GResults() {
  const { v } = useNav(), m = D.metrics, weeks = weeksData();
  if (!m) return <Note>The Metrics sheet isn’t connected yet. Once its link is in Apps Script (Tools.gs), the numbers you submit to Geronimo show here, read only.</Note>;
  if (m.error) return <Note>{m.error}</Note>;
  if (!weeks.length) return <Note>No reported weeks found on the Metrics sheet’s Dashboard tab yet.</Note>;
  const latest = weeks[weeks.length - 1];
  const since = CYCLE_START ? Math.round((latest.t - fromYmd(CYCLE_START)) / WEEK) : 0, cycleWeek = ((since % CYCLE_WEEKS) + CYCLE_WEEKS) % CYCLE_WEEKS + 1;
  const cycleStartT = latest.t - (cycleWeek - 1) * WEEK, start0 = weeks.find(w => Math.abs(w.t - cycleStartT) < 2 * 864e5) || weeks.find(w => w.t >= cycleStartT) || latest;
  const start = Object.assign({}, start0, BASELINES[start0.d] || {});
  const last3 = weeks.slice(-3), avg = k => { const xs = last3.map(w => w[k]).filter(x => x != null); return xs.length ? xs.reduce((a, c) => a + c, 0) / xs.length : null; };
  // reported numbers for a chosen week, vs the week before
  const pickD = v.resWeek && weeks.some(w => w.d === v.resWeek) ? v.resWeek : latest.d, pi = weeks.findIndex(w => w.d === pickD), pick = weeks[pi], prev = weeks[pi - 1];
  const range = v.resRange || 6, shown = weeks.filter(w => w.t > latest.t - (range - 0.5) * WEEK);
  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-2xl bg-[#1c1d1f] text-[#FFFAF0] ring-1 ring-white/[.06]">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div><h2 className="font-display text-[17px] tracking-sub">{STUDIO.name} · Results</h2>
            <p className="mt-0.5 text-[12.5px] text-[#FFFAF0]/70">Latest report {day(latest.t)}{CYCLE_START ? ` · Sales cycle, week ${cycleWeek} of ${CYCLE_WEEKS}` : ''}</p></div>
          <a href={m.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-[12.5px] text-[#FFFAF0]/80 hover:bg-white/5"><ExternalLink className="h-3.5 w-3.5" />Metrics sheet</a>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {RESULT_CARDS.map(k => {
          const [label, show, , kind] = M[k];
          return (
            <div key={k} className="card p-5">
              <div className="flex items-start justify-between gap-2"><div className="text-[13px] text-muted">{label}</div>{k === 'conv' && <span className="pill pill-green">Cycle metric</span>}</div>
              <div className="mt-1 font-display text-[34px] font-medium leading-tight tabular-nums text-ink">{show(latest[k])}</div>
              <div className="mt-1 text-[12px] text-faint">Latest submission · {day(latest.t)}</div>
              <div className="text-[12px] text-faint">3-week average · <span className="text-muted">{kind === 'money' ? money(avg(k)) : kind === 'pct' ? (avg(k) == null ? '—' : (Math.round(avg(k) * 10) / 10) + '%') : num(avg(k), 1)}</span></div>
              <div className="mt-3 grid grid-cols-2 border-t border-line/10 pt-3 text-[12px]">
                <div><div className="text-faint">Start</div><div className="font-medium text-ink">{show(start[k])}</div></div>
                <div><div className="text-faint">Change</div><Change k={k} d={latest[k] == null || start[k] == null ? null : latest[k] - start[k]} big /></div>
              </div>
            </div>
          );
        })}
      </div>

      <Card title={`Reported numbers · ${day(pick.t)}`} icon={CalendarDays}
        right={<select value={pickD} onChange={e => setView({ resWeek: e.target.value })} className="rounded-lg border border-line/15 bg-bg/60 px-3 py-1.5 text-[13px] text-ink">
          {weeks.slice().reverse().map(w => <option key={w.d} value={w.d}>{day(w.t)}</option>)}</select>}
        footer="Change vs the previous week. Straight from the Dashboard tab of the Metrics sheet, the same numbers submitted to Geronimo.">
        <div className="grid gap-2 p-4 sm:grid-cols-2 lg:grid-cols-3">
          {REPORTED.map(k => (
            <div key={k} className="rounded-xl border border-line/10 bg-raised/30 p-3">
              <div className="text-[12px] text-muted">{M[k][0]}</div>
              <div className="mt-1 flex items-baseline gap-2"><span className="font-display text-[22px] tabular-nums text-ink">{M[k][1](pick[k])}</span>
                <span className="text-[11.5px]"><Change k={k} d={prev && pick[k] != null && prev[k] != null ? pick[k] - prev[k] : null} /></span></div>
            </div>))}
        </div>
      </Card>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h3 className="font-display text-[14px] tracking-sub text-ink">Reporting trends</h3>
          <p className="text-[12px] text-faint">{shown.length ? `${day(shown[0].t)} – ${day(latest.t)}` : ''}</p></div>
        <Seg options={[[6, '6 weeks'], [13, '3 months'], [26, '6 months'], [52, '12 months']]} value={range} onChange={x => setView({ resRange: x })} />
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {RESULT_CARDS.concat(['packs', 'avg']).map(k => (
          <Card key={k} title={M[k][0]} icon={BarChart3}>
            <div className="h-[170px] px-2 pb-2 pt-3">
              <ResponsiveContainer>
                <LineChart data={shown.map(w => ({ label: fmt(w.t + 12 * 3600e3, { day: 'numeric', month: 'short' }), v: w[k] }))} margin={{ top: 6, right: 12, bottom: 0, left: -6 }}>
                  <CartesianGrid stroke={color('line', 0.07)} vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: color('faint'), fontSize: 10.5 }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={18} />
                  <YAxis tick={{ fill: color('faint'), fontSize: 10.5 }} tickLine={false} axisLine={false} width={52} tickFormatter={x => M[k][3] === 'money' ? '$' + Math.round(x / 1000) + 'K' : M[k][3] === 'pct' ? Math.round(x * 10) / 10 + '%' : Math.round(x * 10) / 10} />
                  <Tooltip formatter={x => [M[k][1](x), M[k][0]]} contentStyle={{ background: color('raised'), border: '1px solid ' + color('line', 0.15), borderRadius: 8, fontSize: 12 }} labelStyle={{ color: color('muted') }} />
                  <Line type="monotone" dataKey="v" stroke={color('primary')} strokeWidth={2.2} dot={{ r: 2.5, fill: color('surface'), stroke: color('primary') }} connectNulls isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>))}
      </div>
    </div>
  );
}
