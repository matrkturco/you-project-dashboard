import { ResponsiveContainer, ComposedChart, Line, Bar, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import { D, dDate, fmt, dKey, plural, DAY, H } from '../lib/logic.js';
import { openDay } from './people.jsx';
import { cx } from './ui.jsx';

/** The data point under the pointer (works with Recharts 2 and 3). */
function picked(e, data) {
  if (!e) return null;
  const idx = e.activeTooltipIndex != null ? e.activeTooltipIndex : e.activeIndex;
  if (idx != null && data[Number(idx)]) return data[Number(idx)];
  return e.activePayload && e.activePayload[0] ? e.activePayload[0].payload : null;
}

/** Reads a theme colour from the CSS variables (so charts follow dark/light mode). */
export function color(name, alpha = 1) {
  const v = getComputedStyle(document.documentElement).getPropertyValue('--' + name).trim() || '255 255 255';
  return `rgb(${v} / ${alpha})`;
}

function TipBox({ active, payload, unit }) {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-line/15 bg-raised px-3 py-2 text-[12px] shadow-xl">
      <div className="mb-0.5 text-ink">{dDate(p.t)}</div>
      <div className="text-muted">{p.v === null ? 'No data' : `${p.v}${unit}`}{p.avg != null ? ` · 7-day avg ${Math.round(p.avg)}${unit}` : ''}</div>
      {p.l && p.l.length ? <div className="mt-0.5 text-faint">Click to see the classes</div> : null}
    </div>
  );
}

export function TrendChart({ pts, metric }) {
  const unit = metric === 'fill' ? '%' : '';
  const smooth = pts.some(p => p.avg !== null);
  const data = pts.map(p => ({ ...p, label: fmt(p.t, { day: 'numeric', month: 'short' }) }));
  return (
    <div className="h-[240px] w-full">
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 10, right: 12, bottom: 0, left: -18 }}
          onClick={e => { const p = picked(e, data); if (p && p.l && p.l.length) openDay(p.t, p.l); }}>
          <CartesianGrid stroke={color('line', 0.07)} vertical={false} />
          <XAxis dataKey="label" tick={{ fill: color('faint'), fontSize: 11 }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={28} />
          <YAxis tick={{ fill: color('faint'), fontSize: 11 }} tickLine={false} axisLine={false} domain={metric === 'fill' ? [0, 100] : [0, 'auto']} allowDecimals={false} unit={unit} />
          <Tooltip content={<TipBox unit={unit} />} cursor={{ stroke: color('line', 0.15) }} />
          <Line type="monotone" dataKey="v" stroke={smooth ? color('primary', 0.35) : color('primary')} strokeWidth={smooth ? 1.5 : 2.5} connectNulls={false}
            dot={{ r: pts.length > 45 ? 1.5 : 2.5, fill: color('surface'), stroke: color('primary', 0.7), strokeWidth: 1.2 }} activeDot={{ r: 5, fill: color('primary'), cursor: 'pointer' }} isAnimationActive={false} />
          {smooth && <Line type="monotone" dataKey="avg" stroke={color('primary')} strokeWidth={2.5} dot={false} activeDot={false} isAnimationActive={false} />}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Visits per day as bars (click a bar for that day's classes). */
export function DayBars({ days }) {
  const data = days.map(d => ({ ...d, label: days.length > 10 ? fmt(d.t, { day: 'numeric' }) : fmt(d.t, { weekday: 'short', day: 'numeric' }) }));
  return (
    <div className="h-[200px] w-full">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 16, right: 8, bottom: 0, left: -22 }}
          onClick={e => { const p = picked(e, data); if (p) openDay(p.t, p.l); }}>
          <CartesianGrid stroke={color('line', 0.07)} vertical={false} />
          <XAxis dataKey="label" tick={{ fill: color('faint'), fontSize: 11 }} tickLine={false} axisLine={false} interval={0} />
          <YAxis tick={{ fill: color('faint'), fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip cursor={{ fill: color('line', 0.05) }} content={({ active, payload }) => active && payload && payload[0] ? (
            <div className="rounded-lg border border-line/15 bg-raised px-3 py-2 text-[12px] shadow-xl"><div className="text-ink">{dDate(payload[0].payload.t)}</div><div className="text-muted">{payload[0].payload.v} visits</div></div>) : null} />
          <Bar dataKey="v" maxBarSize={64} radius={[5, 5, 2, 2]} isAnimationActive={false} cursor="pointer" label={{ position: 'top', fill: color('faint'), fontSize: 10 }}>
            {data.map((d, i) => <Cell key={i} fill={color('primary', 0.7)} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Seven day cards for a week, with a booked bar each. */
export function WeekCards({ start }) {
  const today = dKey(Date.now());
  const days = [...Array(7)].map((_, i) => { const mid = start + i * DAY + 12 * H, k = dKey(mid); return { mid, k, list: D.classes.filter(c => dKey(c.t) === k).sort((a, b) => a.t - b.t) }; })
    .filter(d => d.list.length);            // closed days (Sundays, public holidays) aren't shown
  const max = Math.max(1, ...days.map(d => d.list.reduce((t, x) => t + x.b, 0)));
  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-1 scroll-thin sm:mx-0 sm:px-0"><div className="grid min-w-[640px] gap-2" style={{ gridTemplateColumns: `repeat(${Math.max(days.length, 1)}, minmax(0, 1fr))` }}>
      {days.map(d => {
        const bk = d.list.reduce((t, x) => t + x.b, 0), cp = d.list.reduce((t, x) => t + x.c, 0);
        return (
          <button key={d.k} onClick={() => openDay(d.mid, d.list)}
            className={cx('card flex min-h-[150px] flex-col p-3 text-left transition-colors hover:border-primary/40 hover:bg-raised/40', d.k === today && 'border-primary/50 ring-1 ring-primary/30')}>
            <span className="font-display text-[12px] tracking-sub text-ink">{fmt(d.mid, { weekday: 'short' }).toUpperCase()}</span>
            <span className="text-[11.5px] text-faint">{fmt(d.mid, { day: 'numeric', month: 'short' })}</span>
            <span className="mt-auto flex h-14 items-end"><i className="block w-full rounded-md bg-primary/75" style={{ height: `${Math.round(bk / max * 100)}%`, minHeight: bk ? 4 : 0 }} /></span>
            <span className="mt-2 text-[11px] leading-snug text-muted">{d.list.length ? `${bk} booked · ${plural(d.list.length, 'class')}${cp ? ' · ' + Math.round(bk / cp * 100) + '% full' : ''}` : 'No classes'}</span>
          </button>
        );
      })}
    </div></div>
  );
}
