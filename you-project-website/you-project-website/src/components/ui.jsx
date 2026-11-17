import { useState } from 'react';
import { Search as SearchIcon, ChevronDown, Inbox } from 'lucide-react';

export const cx = (...a) => a.filter(Boolean).join(' ');

export function Card({ title, icon: Icon, count, countTone = 'primary', right, children, className, bodyClass, footer, tone }) {
  return (
    <section className={cx('card overflow-hidden', className)}>
      {(title || right) && (
        <div className="card-head">
          <div className="flex min-w-0 items-center gap-2.5">
            {Icon && <span className={cx('grid h-7 w-7 place-items-center rounded-lg', toneBg(tone))}><Icon className="h-3.5 w-3.5" /></span>}
            <h2 className="truncate text-[13.5px] tracking-sub text-ink">{title}</h2>
            {count !== undefined && count !== null && <span className={cx('pill', 'pill-' + countTone)}>{count}</span>}
          </div>
          {right && <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2 sm:justify-end">{right}</div>}
        </div>
      )}
      <div className={bodyClass}>{children}</div>
      {footer && <div className="border-t border-line/10 px-5 py-3 text-[12px] text-faint">{footer}</div>}
    </section>
  );
}
export const toneBg = tone => ({
  red: 'bg-red/10 text-red', orange: 'bg-orange/10 text-orange', green: 'bg-green/10 text-green', gold: 'bg-gold/10 text-gold',
  lilac: 'bg-lilac/10 text-lilac', accent: 'bg-accent/10 text-accent', teal: 'bg-teal/15 text-teal'
}[tone] || 'bg-primary/10 text-primary');

/** A number tile. Clickable when onClick is given. */
export function Stat({ icon: Icon, label, value, sub, tone, onClick, small }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag onClick={onClick} className={cx('card group relative flex flex-col p-4 text-left transition-colors', onClick && 'cursor-pointer hover:border-primary/40 hover:bg-raised/40')}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[12.5px] leading-snug text-muted">{label}</p>
        {Icon && <span className={cx('rounded-lg p-1.5', toneBg(tone))}><Icon className="h-3.5 w-3.5" /></span>}
      </div>
      <p className={cx('mt-2 font-display font-medium tabular-nums text-ink', small ? 'text-2xl' : 'text-[28px] leading-tight')}>{value}</p>
      {sub && <p className="mt-1 text-[11.5px] leading-snug text-faint">{sub}</p>}
    </Tag>
  );
}
export const StatGrid = ({ children, cols = 'lg:grid-cols-4' }) => <div className={cx('grid grid-cols-2 gap-3', cols)}>{children}</div>;

export function Seg({ options, value, onChange, size = 'sm' }) {
  return (
    <div className="inline-flex max-w-full overflow-x-auto rounded-lg border border-line/15 bg-bg/40 p-0.5 scroll-thin" role="group">
      {options.map(([v, label]) => (
        <button key={String(v)} aria-pressed={v === value} onClick={() => onChange(v)}
          className={cx('whitespace-nowrap rounded-md px-3 transition-colors', size === 'sm' ? 'py-1 text-[12.5px]' : 'py-1.5 text-[13px]',
            v === value ? 'bg-primary text-onprimary font-medium' : 'text-muted hover:text-ink')}>{label}</button>
      ))}
    </div>
  );
}

export function SearchBox({ value, onChange, placeholder = 'Search…', className }) {
  return (
    <div className={cx('relative min-w-[200px] flex-1', className)}>
      <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" />
      <input type="search" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder}
        className="input pl-8" />
    </div>
  );
}

export function Select({ value, onChange, options, label }) {
  return (
    <select aria-label={label} value={value} onChange={e => onChange(e.target.value)}
      className="rounded-lg border border-line/15 bg-bg/60 px-3 py-2 text-[13px] text-ink focus:border-primary/60 focus:outline-none">
      {options.map(o => Array.isArray(o) ? <option key={o[0]} value={o[0]}>{o[1]}</option> : <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

export const Pill = ({ tone = 'grey', children, title }) => <span title={title} className={cx('pill', 'pill-' + tone)}>{children}</span>;
export const Toolbar = ({ children, className }) => <div className={cx('flex flex-wrap items-center gap-2', className)}>{children}</div>;
export const Note = ({ children }) => <p className="max-w-3xl text-[12.5px] leading-relaxed text-muted">{children}</p>;
export const Warn = ({ children }) => <div className="rounded-xl border border-gold/25 bg-gold/[.07] px-4 py-3 text-[13px] text-gold">{children}</div>;
export function Empty({ children, icon: Icon = Inbox }) {
  return <div className="py-10 text-center"><Icon className="mx-auto mb-2 h-7 w-7 text-faint/60" /><p className="text-[13px] text-muted">{children}</p></div>;
}
export const Section = ({ title, right, children }) => (
  <section className="space-y-3">
    {(title || right) && <div className="flex flex-wrap items-center justify-between gap-2">{title && <h3 className="label">{title}</h3>}{right}</div>}
    {children}
  </section>
);

/** Click-to-open row. Keyboard friendly. */
export function Row({ onClick, children, className, dim }) {
  return (
    <div role="button" tabIndex={0} onClick={onClick} onKeyDown={e => { if (e.key === 'Enter') onClick && onClick(e); }}
      className={cx('row', dim && 'opacity-60', className)}>{children}</div>
  );
}

export function List({ rows, render, empty, max, className }) {
  if (!rows.length) return <Empty>{empty}</Empty>;
  return <div className={cx(max && 'overflow-y-auto scroll-thin', className)} style={max ? { maxHeight: max } : null}>{rows.map(render)}</div>;
}

export function More({ title, children, open: initial }) {
  const [open, setOpen] = useState(!!initial);
  return (
    <div className="card overflow-hidden">
      <button onClick={() => setOpen(o => !o)} className="flex w-full items-center justify-between px-5 py-3.5 text-left text-[13px] font-medium text-ink hover:bg-raised/40">
        <span>{title}</span><ChevronDown className={cx('h-4 w-4 text-faint transition-transform', open && 'rotate-180')} />
      </button>
      {open && <div className="border-t border-line/10">{children}</div>}
    </div>
  );
}

export const Skeleton = ({ className }) => <div className={cx('animate-pulse rounded-lg bg-raised', className)} />;

export const TagList = ({ tags }) => tags && tags.length ? (
  <div className="mt-1 flex flex-wrap gap-1">{tags.map(t => <span key={t} className="rounded-full border border-line/15 px-2 py-px text-[11px] text-muted">{t}</span>)}</div>
) : null;

/** Simple header row for table-like lists. */
export const HeadRow = ({ cols, children }) => (
  <div className={cx('hidden border-b border-line/10 bg-raised/30 px-5 py-2.5 text-[11px] uppercase tracking-sub text-faint md:grid', cols)}>{children}</div>
);
