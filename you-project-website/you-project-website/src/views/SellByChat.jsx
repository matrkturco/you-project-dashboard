// Leads → Sell By Chat: the daily Instagram / Facebook outreach, read from (and saved to) the SellByChat tab.
// Admins only (coaches never receive this data). Same rules as typing in the tab: SellByChat.gs → sbcSave.
import { useState, useMemo } from 'react';
import { MessageCircle, Plus, Target, CalendarDays, Reply, Flame, Moon, Check, Phone, Mail, Copy, Search, AlertTriangle, FileText } from 'lucide-react';
import { D, B, DAY, lc, plural, dDate } from '../lib/logic.js';
import { ymd, fromYmd, addDays, TZ } from '../../shared/time.js';
import { STUDIO } from '../studio.js';
import { useNav, setView, save, toast, openDrawer, backDrawer, goto } from '../lib/store.js';
import { openTemplates } from './Templates.jsx';
import { Card, Stat, StatGrid, Seg, Note, Pill, Warn, SearchBox, cx } from '../components/ui.jsx';

const STAGES = ['Opened', 'Replied', 'Content sent', 'Collecting details', 'Warm lead', 'Referred', 'Joined', 'Not interested'];
const PATHWAYS = STUDIO.pathways;   // must match SellByChat.gs SBC.PATHWAYS
const PLATFORMS = ['Instagram', 'Facebook'];
const SOURCES = ['New follow', 'Like', 'Comment', 'Story view / reply', 'Mention / tag', 'DM / request'];
const TONE = { 'Opened': 'grey', 'Replied': 'accent', 'Content sent': 'green', 'Collecting details': 'gold', 'Warm lead': 'primary', 'Referred': 'lilac', 'Joined': 'teal', 'Not interested': 'grey' };
const HINT = {
  'Opened': 'Messages sent, waiting for a reply', 'Replied': 'They answered, pathway not clear yet', 'Content sent': 'Pathway A: here for the content',
  'Collecting details': 'Pathway B: asked for number + email', 'Warm lead': 'Details in: add to the Warm Leads sheet', 'Referred': 'Pathway C: sent to another service',
  'Joined': 'Became a client or member', 'Not interested': 'Closed, no chasing'
};
const key = u => String(u || '').trim().toLowerCase().replace(/^@/, '');
const at = u => (String(u || '').trim().startsWith('@') ? '' : '@') + String(u || '').trim();

function sbc() {
  const s = D.sellByChat || {}, b = B(), today = ymd(b.today), mon = ymd(b.monday), quiet = s.quietDays || 7;
  const rows = (s.rows || []).map(r => {
    const age = r.dateOpened ? Math.round((b.today - fromYmd(r.dateOpened)) / DAY) : null;
    return Object.assign({}, r, { age, quiet: r.stage === 'Opened' && age !== null && age >= quiet });
  });
  const sent = rows.filter(r => r.openerSent);
  const todayN = sent.filter(r => r.dateOpened === today).length;
  const weekN = sent.filter(r => r.dateOpened >= mon && r.dateOpened <= today).length;
  const daysSoFar = Math.round((b.today - b.monday) / DAY) + 1;
  const replied = sent.filter(r => r.stage && r.stage !== 'Opened').length;
  const days = [...Array(14)].map((_, i) => { const d = ymd(addDays(b.today, -i)); return { d, n: sent.filter(r => r.dateOpened === d).length }; }).reverse();
  return {
    s, rows, target: s.target || 5, quiet, today, todayN, weekN, weekTarget: (s.target || 5) * daysSoFar, replied, sentN: sent.length,
    rate: sent.length ? Math.round(replied / sent.length * 100) : 0, days,
    warmToCopy: rows.filter(r => r.stage === 'Warm lead' && !r.inWarmLeads),
    waiting: rows.filter(r => r.stage === 'Opened' && !r.quiet), goneQuiet: rows.filter(r => r.quiet),
    streak: (() => { let n = 0; for (let i = days.length - 1; i >= 0; i--) { if (days[i].n >= (s.target || 5)) n++; else if (i === days.length - 1) continue; else break; } return n; })()
  };
}

// ---------- Today ----------
export function SbcToday() {
  const x = sbc();
  if (!D.sellByChat) return <Note>The Sell By Chat tab isn’t connected yet. Add SellByChat.gs to Apps Script, run setupSellByChat once, then press Refresh.</Note>;
  const pct = Math.min(1, x.todayN / x.target), left = Math.max(0, x.target - x.todayN);
  return (
    <div className="space-y-5">
      {x.s.error && <Warn>Couldn’t read the SellByChat tab: {x.s.error}</Warn>}
      <section className="card flex flex-col gap-5 p-5 sm:flex-row sm:items-center">
        <div className="relative grid h-[118px] w-[118px] shrink-0 place-items-center self-center">
          <svg viewBox="0 0 120 120" className="absolute inset-0 -rotate-90">
            <circle cx="60" cy="60" r="52" fill="none" stroke="rgb(var(--line) / .1)" strokeWidth="10" />
            <circle cx="60" cy="60" r="52" fill="none" stroke={`rgb(var(--${pct >= 1 ? 'green' : 'primary'}))`} strokeWidth="10" strokeLinecap="round" strokeDasharray={`${pct * 326.7} 326.7`} />
          </svg>
          <div className="text-center"><div className="font-display text-[30px] leading-none text-ink">{x.todayN}<span className="text-[16px] text-faint">/{x.target}</span></div><div className="mt-1 text-[11px] text-muted">today</div></div>
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-[17px] tracking-sub text-ink">{left ? `${plural(left, 'chat')} to go today` : 'Daily target hit 💪'}</h2>
          <p className="mt-1 text-[13px] text-muted">Check new follows, comments, likes and story replies, pre-qualify (local, real, not already a member), then open with the approved message. Log each one here.</p>
          <div className="mt-3 flex flex-wrap gap-2"><button onClick={() => openSbcEditor(null)} className="btn btn-primary"><Plus className="h-3.5 w-3.5" />Log a chat</button>
            <button onClick={() => openTemplates({}, 'Sell By Chat')} className="btn"><FileText className="h-3.5 w-3.5" />Message templates</button>
            {x.streak > 1 && <Pill tone="green"><Flame className="mr-1 inline h-3 w-3" />{x.streak} days in a row at {x.target}+</Pill>}</div>
        </div>
      </section>

      <StatGrid>
        <Stat icon={CalendarDays} label="This week" value={`${x.weekN}/${x.weekTarget}`} sub={`Target so far: ${x.target} a day`} tone={x.weekN >= x.weekTarget ? 'green' : 'primary'} />
        <Stat icon={Reply} label="Reply rate" value={`${x.rate}%`} sub={`${x.replied} of ${x.sentN} opened`} tone="accent" onClick={() => goto('leads', 'pipeline')} />
        <Stat icon={Flame} label="Warm leads to copy" value={x.warmToCopy.length} sub="Not on the Warm Leads sheet yet" tone={x.warmToCopy.length ? 'orange' : 'grey'} />
        <Stat icon={Moon} label="Gone quiet" value={x.goneQuiet.length} sub={`No reply after ${x.quiet}+ days (no chasing)`} tone="grey" />
      </StatGrid>

      <Card title="Last 14 days" icon={Target} footer={`Chats opened each day. Green = hit the ${x.target}-a-day target.`}>
        <div className="flex h-[150px] items-end gap-1.5 px-5 pb-3 pt-6">
          {x.days.map(d => {
            const h = Math.min(1, d.n / Math.max(x.target * 1.6, ...x.days.map(z => z.n), 1)), hit = d.n >= x.target, isToday = d.d === x.today;
            return (
              <div key={d.d} className="relative flex h-full flex-1 flex-col items-center justify-end" title={`${dDate(fromYmd(d.d))}: ${d.n}`}>
                <span className="mb-1 text-[10.5px] tabular-nums text-muted">{d.n || ''}</span>
                <div className={cx('w-full rounded-t-md', hit ? 'bg-green/70' : d.n ? 'bg-primary/55' : 'bg-line/10')} style={{ height: `${Math.max(3, h * 100)}%` }} />
                <span className={cx('mt-1.5 text-[10px]', isToday ? 'text-accent' : 'text-faint')}>{new Intl.DateTimeFormat('en-AU', { weekday: 'narrow', timeZone: TZ }).format(fromYmd(d.d) + 12 * 3600e3)}</span>
              </div>);
          })}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Warm leads to add to the Warm Leads sheet" icon={Flame} count={x.warmToCopy.length} countTone="orange" footer="Copy them onto the Warm Leads spreadsheet, then tick “In Warm Leads” on their card.">
          <Rows rows={x.warmToCopy} empty="All warm leads are on the Warm Leads sheet." />
        </Card>
        <Card title="Waiting for a reply" icon={MessageCircle} count={x.waiting.length} footer={`After ${x.quiet} days with no reply they move to “Gone quiet”. No chasing.`}>
          <Rows rows={x.waiting.slice().sort((a, c) => a.age - c.age)} empty="Nobody waiting." />
        </Card>
      </div>
    </div>
  );
}

function Rows({ rows, empty }) {
  if (!rows.length) return <p className="px-5 py-4 text-[13px] text-faint">{empty}</p>;
  return rows.map(r => (
    <button key={r.username} onClick={() => openSbcEditor(r)} className="flex w-full items-center gap-3 border-t border-line/[.06] px-5 py-2.5 text-left first:border-t-0 hover:bg-raised/40">
      <span className="min-w-0 flex-1"><span className="block truncate text-[13.5px] text-ink">{r.name || at(r.username)}</span>
        <span className="block truncate text-[11.5px] text-faint">{[r.name ? at(r.username) : '', r.platform, r.pathway].filter(Boolean).join(' · ')}</span></span>
      <span className="shrink-0 text-[11.5px] text-muted">{r.age === 0 ? 'today' : r.age === 1 ? 'yesterday' : r.age + ' days ago'}</span>
      <Pill tone={TONE[r.stage] || 'grey'}>{r.stage || 'No stage'}</Pill>
    </button>));
}

// ---------- Pipeline (GHL-style board) ----------
export function SbcPipeline() {
  const x = sbc(), { v } = useNav();
  const [q, setQ] = useState('');
  const showClosed = v.sbcClosed === true;
  if (!D.sellByChat) return <Note>The Sell By Chat tab isn’t connected yet.</Note>;
  const stages = showClosed ? STAGES : STAGES.filter(s => s !== 'Not interested');
  const match = r => !q || [r.username, r.name, r.notes].some(t => lc(t).includes(lc(q)));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Note>Every chat sits in one stage. Tap a card to move it along, add a pathway or contact details. Choosing pathway B and adding a number or email makes them a warm lead automatically.</Note>
        <button onClick={() => openSbcEditor(null)} className="btn btn-primary"><Plus className="h-3.5 w-3.5" />Log a chat</button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <SearchBox value={q} onChange={setQ} placeholder="Search username, name or notes" className="w-full sm:w-72" />
        <button onClick={() => setView({ sbcClosed: !showClosed })} aria-pressed={showClosed} className={cx('btn px-2.5 py-1 text-[12.5px]', !showClosed && 'opacity-70')}>{showClosed ? 'Showing “Not interested”' : 'Show “Not interested”'}</button>
      </div>
      <div className="-mx-4 overflow-x-auto px-4 pb-2 scroll-thin sm:mx-0 sm:px-0">
        <div className="flex gap-3" style={{ minWidth: stages.length * 236 }}>
          {stages.map(st => {
            const list = x.rows.filter(r => (r.stage || 'Opened') === st && match(r)).sort((a, c) => (c.updated || 0) - (a.updated || 0) || String(c.dateOpened).localeCompare(String(a.dateOpened)));
            return (
              <section key={st} className="flex w-[228px] shrink-0 flex-col rounded-2xl border border-line/10 bg-raised/25">
                <div className="border-b border-line/10 px-3 py-2.5">
                  <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-[13px] text-ink"><span className="h-2.5 w-2.5 rounded-full" style={{ background: `rgb(var(--${TONE[st] === 'grey' ? 'faint' : TONE[st]}))` }} />{st}</span><span className="text-[12px] tabular-nums text-muted">{list.length}</span></div>
                  <div className="mt-0.5 text-[11px] leading-snug text-faint">{HINT[st]}</div>
                </div>
                <div className="flex max-h-[62vh] flex-col gap-2 overflow-y-auto p-2 scroll-thin">
                  {list.map(r => (
                    <button key={r.username} onClick={() => openSbcEditor(r)} className={cx('rounded-xl border border-line/10 bg-surface px-3 py-2.5 text-left shadow-sm transition hover:border-primary/40', r.quiet && 'opacity-50')}>
                      <div className="truncate text-[13px] text-ink">{r.name || at(r.username)}</div>
                      <div className="truncate text-[11.5px] text-faint">{r.name ? at(r.username) + ' · ' : ''}{r.platform || 'Platform?'}</div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1">
                        {r.pathway && <Pill tone="lilac">{r.pathway.split(' – ')[0]}</Pill>}
                        {(r.hasPhone || r.hasEmail) && <Pill tone="green">Details</Pill>}
                        {r.stage === 'Warm lead' && !r.inWarmLeads && <Pill tone="orange">Copy to Warm Leads</Pill>}
                        {r.quiet && <Pill tone="grey">Gone quiet</Pill>}
                        <span className="ml-auto text-[10.5px] text-faint">{r.age === 0 ? 'today' : r.age != null ? r.age + 'd' : ''}</span>
                      </div>
                    </button>))}
                  {!list.length && <p className="px-1 py-3 text-center text-[11.5px] text-faint">Nobody here</p>}
                </div>
              </section>);
          })}
        </div>
      </div>
    </div>
  );
}

// ---------- Pipeline summary (counts + pathway split) ----------
export function SbcSummary() {
  const x = sbc();
  if (!D.sellByChat) return <Note>The Sell By Chat tab isn’t connected yet.</Note>;
  const by = f => { const m = {}; x.rows.forEach(r => { const k = f(r) || 'Not set'; m[k] = (m[k] || 0) + 1; }); return m; };
  const st = by(r => r.stage), pw = by(r => r.pathway), src = by(r => r.source), pf = by(r => r.platform);
  const max = Math.max(1, ...Object.values(st));
  const Bars = ({ m, order }) => (order || Object.keys(m).sort((a, c) => m[c] - m[a])).filter(k => m[k]).map(k => (
    <div key={k} className="flex items-center gap-3 px-5 py-1.5 text-[13px]">
      <span className="w-[150px] shrink-0 truncate text-muted">{k}</span>
      <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-line/10"><span className="block h-full rounded-full bg-primary/70" style={{ width: `${m[k] / Math.max(1, ...Object.values(m)) * 100}%` }} /></span>
      <span className="w-8 text-right tabular-nums text-ink">{m[k]}</span>
    </div>));
  return (
    <div className="space-y-4">
      <StatGrid>
        <Stat icon={MessageCircle} label="Chats opened (all time)" value={x.sentN} tone="primary" />
        <Stat icon={Reply} label="Replied" value={x.replied} sub={`${x.rate}% reply rate`} tone="accent" />
        <Stat icon={Flame} label="Warm leads" value={st['Warm lead'] || 0} sub={`${x.warmToCopy.length} still to copy`} tone="orange" />
        <Stat icon={Check} label="Joined" value={st['Joined'] || 0} sub={x.sentN ? `${Math.round((st['Joined'] || 0) / x.sentN * 100)}% of chats opened` : ''} tone="green" />
      </StatGrid>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Pipeline" icon={Target}><div className="py-3"><Bars m={st} order={STAGES.concat(['Not set'])} /></div></Card>
        <Card title="Pathway" icon={MessageCircle}><div className="py-3"><Bars m={pw} order={PATHWAYS.concat(['Not set'])} /></div></Card>
        <Card title="Where they came from" icon={Search}><div className="py-3"><Bars m={src} /></div></Card>
        <Card title="Platform" icon={MessageCircle}><div className="py-3"><Bars m={pf} /></div></Card>
      </div>
    </div>
  );
}

// ---------- add / edit ----------
function SbcEditor({ r }) {
  const isNew = !r;
  const [f, setF] = useState(() => r ? {
    username: r.username, name: r.name, platform: r.platform || 'Instagram', source: r.source, preQualified: r.preQualified, followedBack: r.followedBack,
    openerSent: r.openerSent, stage: r.stage || 'Opened', pathway: r.pathway, phone: r.phone || '', email: r.email || '', inWarmLeads: r.inWarmLeads, notes: r.notes
  } : { username: '', name: '', platform: 'Instagram', source: 'New follow', preQualified: true, followedBack: false, openerSent: true, stage: '', pathway: '', phone: '', email: '', inWarmLeads: false, notes: '' });
  const [stageTouched, setStageTouched] = useState(false), [busy, setBusy] = useState(false);
  const set = k => e => setF(x => Object.assign({}, x, { [k]: e && e.target ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value) : e }));
  const dupe = useMemo(() => isNew && f.username.trim() && (D.sellByChat && D.sellByChat.rows || []).find(x => key(x.username) === key(f.username)), [f.username]);
  const submit = async () => {
    if (!f.username.trim()) return toast('Add their username', 'error');
    if (dupe) return toast(`${at(f.username)} is already on the tracker`, 'error');
    setBusy(true);
    try {
      const payload = Object.assign({}, f, { username: f.username.trim().replace(/^@?/, '@'), isNew, oldUsername: r ? r.username : undefined });
      if (!stageTouched) { delete payload.stage; payload.autoStage = true; }
      const res = await save('sbcSave', payload);
      const row = res && res.row;
      toast(row && row.stage === 'Warm lead' && !row.inWarmLeads ? 'Saved: new warm lead, add them to the Warm Leads sheet' : isNew ? `Logged ${at(f.username)}` : 'Saved');
      backDrawer();
    } catch (er) { toast(er.message, 'error'); }
    setBusy(false);
  };
  const lbl = 'mb-1 block text-[12px] text-muted', tick = (k, label, hint) => (
    <label className="flex items-start gap-2 text-[13px]"><input type="checkbox" checked={!!f[k]} onChange={set(k)} className="mt-0.5 h-4 w-4 accent-[rgb(var(--primary))]" />
      <span><span className="text-ink">{label}</span>{hint && <span className="block text-[11.5px] text-faint">{hint}</span>}</span></label>);
  const copy = t => { try { navigator.clipboard.writeText(t); toast('Copied'); } catch (e) {} };
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className={lbl}>Username</label><input autoFocus={isNew} value={f.username} onChange={set('username')} className="input" placeholder="@their.handle" />
          {dupe && <p className="mt-1 flex items-center gap-1 text-[12px] text-red"><AlertTriangle className="h-3.5 w-3.5" />Already on the tracker ({dupe.stage || 'Opened'}, {dupe.dateOpened ? dDate(fromYmd(dupe.dateOpened)) : 'no date'}). Don’t message twice.</p>}</div>
        <div><label className={lbl}>Name</label><input value={f.name} onChange={set('name')} className="input" placeholder="First name" /></div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className={lbl}>Platform</label><Seg options={PLATFORMS.map(p => [p, p])} value={f.platform} onChange={set('platform')} /></div>
        <div><label className={lbl}>What they did</label><select value={f.source} onChange={set('source')} className="input"><option value="">—</option>{SOURCES.map(s => <option key={s}>{s}</option>)}</select></div>
      </div>
      <div className="grid gap-2 rounded-xl border border-line/10 bg-raised/30 p-3 sm:grid-cols-3">
        {tick('preQualified', 'Pre-qualified', 'Local, real, not a member')}
        {tick('followedBack', 'Followed back')}
        {tick('openerSent', 'Opener sent', 'Counts toward 5 a day')}
      </div>
      {!isNew && <>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className={lbl}>Pathway</label><select value={f.pathway} onChange={set('pathway')} className="input"><option value="">Not chosen yet</option>{PATHWAYS.map(s => <option key={s}>{s}</option>)}</select></div>
          <div><label className={lbl}>Stage {stageTouched ? '' : <span className="text-faint">(moves with the pathway)</span>}</label>
            <select value={f.stage} onChange={e => { setStageTouched(true); set('stage')(e); }} className="input">{STAGES.map(s => <option key={s}>{s}</option>)}</select></div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className={lbl}>Phone</label><div className="flex gap-1.5"><input value={f.phone} onChange={set('phone')} className="input" inputMode="tel" placeholder="04…" />{f.phone && <button onClick={() => copy(f.phone)} className="btn px-2" title="Copy"><Copy className="h-3.5 w-3.5" /></button>}</div></div>
          <div><label className={lbl}>Email</label><div className="flex gap-1.5"><input value={f.email} onChange={set('email')} className="input" inputMode="email" />{f.email && <button onClick={() => copy(f.email)} className="btn px-2" title="Copy"><Copy className="h-3.5 w-3.5" /></button>}</div></div>
        </div>
        {(f.stage === 'Warm lead' || f.phone || f.email) && tick('inWarmLeads', 'In Warm Leads', 'Tick once they’re copied onto the Warm Leads sheet')}
      </>}
      <div><div className="mb-1 flex items-center justify-between"><label className="text-[12px] text-muted">Notes</label>
        <button onClick={() => openTemplates({ name: f.name, username: at(f.username) }, 'Sell By Chat')} className="btn btn-ghost px-2 py-0.5 text-[12px]"><FileText className="h-3.5 w-3.5" />Templates</button></div>
        <textarea value={f.notes} onChange={set('notes')} rows={3} className="input" placeholder="What you said about their profile, what they replied…" /></div>
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button disabled={busy || !!dupe} onClick={submit} className="btn btn-primary"><Check className="h-3.5 w-3.5" />{busy ? 'Saving…' : isNew ? 'Log chat' : 'Save'}</button>
        <button onClick={backDrawer} className="btn btn-ghost">Cancel</button>
      </div>
      {r && <p className="text-[11.5px] text-faint">Opened {r.dateOpened ? dDate(fromYmd(r.dateOpened)) : '—'}{r.dateReplied ? ` · replied ${dDate(fromYmd(r.dateReplied))}` : ''}{r.detailsDate ? ` · details ${dDate(fromYmd(r.detailsDate))}` : ''} · row {r.row} of the SellByChat tab</p>}
      {isNew && <p className="text-[11.5px] text-faint">Today’s date is filled in for you. Pathway, stage and contact details come later, on their card, once they reply.</p>}
    </div>
  );
}
export const openSbcEditor = r => openDrawer(r ? (r.name || at(r.username)) : 'Log a chat', r ? [at(r.username), r.platform, r.stage].filter(Boolean).join(' · ') : 'Someone you’ve just messaged',
  () => <SbcEditor key={r ? r.username : 'new'} r={r} />);
