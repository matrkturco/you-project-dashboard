// Person / class drawers and the editors (outreach, tags, cancelled), shared by every page.
import { useEffect, useRef, useState } from 'react';
import { X, ChevronLeft, Phone, Mail, Check, CalendarX2, Undo2, ArrowRightLeft, Sparkles, FileText } from 'lucide-react';
import { openTemplates, openEmail } from '../views/Templates.jsx';
import * as L from '../lib/logic.js';
import { D, lc, dDate, dTime, plural, ago, B, DAY, noteFor, pkgText, pkgInfo, memberOf } from '../lib/logic.js';
import { useDrawer, useDataVersion, backDrawer, closeDrawer, openDrawer, freshDrawer, save, toast } from '../lib/store.js';
import { Pill, Row, SearchBox, Empty, cx, TagList } from './ui.jsx';
import { AddTodoButton } from '../views/Team.jsx';

// ---------------- the drawer ----------------
export function Drawer() {
  const stack = useDrawer();
  useDataVersion();
  const top = stack[stack.length - 1];
  const panel = useRef(null);
  useEffect(() => {
    const k = e => { if (e.key === 'Escape') closeDrawer(); };
    document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k);
  }, []);
  useEffect(() => { if (top && panel.current) panel.current.scrollTop = 0; }, [top && top.id]);
  return (
    <div className={cx('fixed inset-0 z-40', !top && 'pointer-events-none')} aria-hidden={!top}>
      <div onClick={closeDrawer} className={cx('absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity', top ? 'opacity-100' : 'opacity-0')} />
      <aside role="dialog" aria-modal="true" aria-label={top ? top.title : ''}
        className={cx('absolute right-0 top-0 flex h-full w-full max-w-[560px] flex-col border-l border-line/10 bg-surface shadow-2xl transition-transform duration-200',
          top ? 'translate-x-0' : 'translate-x-full')}>
        {top && <>
          <div className="flex items-start gap-3 border-b border-line/10 px-6 pb-4 pt-5">
            <div className="min-w-0 flex-1">
              {stack.length > 1 && <button onClick={backDrawer} className="mb-1.5 inline-flex items-center gap-1 text-[12.5px] text-accent hover:underline"><ChevronLeft className="h-3.5 w-3.5" />Back</button>}
              <h3 className="truncate text-xl text-ink">{top.title}</h3>
              {top.sub && <p className="sub mt-0.5">{top.sub}</p>}
            </div>
            <button onClick={closeDrawer} className="btn btn-ghost -mr-2 px-2" aria-label="Close"><X className="h-4 w-4" /></button>
          </div>
          <div ref={panel} className="flex-1 overflow-y-auto px-6 py-5 scroll-thin">{top.render()}</div>
        </>}
      </aside>
    </div>
  );
}

// ---------------- openers ----------------
export function openPerson(p) {
  const m = D.members.find(x => x.e && x.e === lc(p.e)); if (m) return openMember(m);
  const ci = D.clients.findIndex(c => (p.e && c.e === lc(p.e)) || lc(c.n) === lc(p.n)); if (ci > -1) return openClient(ci);
  openDrawer(p.n, p.plan, () => (
    <div className="space-y-5">
      <p className="sub">{[p.kind, p.d ? dDate(p.d) : ''].filter(Boolean).join(' ')}{p.reason ? '. Reason: ' + p.reason : ''}</p>
      <Empty>No classes in the last two months.</Empty>
      <div className="flex flex-wrap gap-2"><AddTodoButton n={p.n} e={p.e} /></div>
      <TagEditor email={p.e} name={p.n} />
      <NotCxControl e={p.e} n={p.n} />
      <CxControl p={{ n: p.n, e: p.e }} />
      <BreakControl email={p.e} name={p.n} />
      <NoteEditor email={p.e} name={p.n} />
    </div>
  ));
}
export function openClient(ci) { const m = memberOf(ci); if (m) return openMember(m); openDrawer(D.clients[ci].n, pkgText(ci), () => <PersonView ci={ci} m={null} />); }
export function openMember(m) { openDrawer(m.n, m.plan, () => <PersonView ci={m.ci} m={m} />); }

function SearchList({ rows, line, sub, onPick, right }) {
  const [q, setQ] = useState('');
  const shown = rows.filter(r => !q || lc(line(r)).includes(lc(q)));
  if (!rows.length) return <Empty>Nobody on this list right now.</Empty>;
  return (
    <div>
      {rows.length > 8 && <div className="mb-3"><SearchBox value={q} onChange={setQ} placeholder="Search this list" /></div>}
      <div className="-mx-6">{shown.map((r, i) => (
        <Row key={i} onClick={() => onPick(r)} className="px-6">
          <div className="flex items-center justify-between gap-3"><div className="min-w-0"><div className="truncate text-[13.5px] text-ink">{line(r)}</div><div className="sub truncate">{sub(r)}</div></div>{right && right(r)}</div>
        </Row>))}</div>
    </div>
  );
}
export const openList = (title, sub, rows, line, subFn, onPick, right) =>
  freshDrawer(title, sub, () => <SearchList rows={rows} line={line} sub={subFn} onPick={onPick} right={right} />);
export const openPeople = (title, rows) => openList(title, plural(rows.length, 'person'), rows, r => r.m.n, r => r.m.plan, r => openMember(r.m));
export const openClients = (title, sub, rows) => openList(title, `${sub} (${rows.length})`, rows, r => r.c.n,
  r => `${plural(r.n, 'visit')} · last ${dDate(r.c.l)}${r.c.ph ? ' · ' + r.c.ph : ''}`, r => openClient(r.ci));
export const openMoves = (title, rows, susp) => openList(title, plural(rows.length, 'person'), rows, m => m.n,
  m => `${m.plan} · ${susp ? 'since ' : ''}${dDate(m.d)}${susp ? (m.ends ? ' · back ' + dDate(m.ends) : ' · return date not set') : ''}`, openPerson);
export function openClassList(label, cls) {
  freshDrawer('Classes', label, () => <ClassRows cls={cls.slice().sort((a, b) => a.t - b.t)} withDate />);
}
export function openDay(t, rows) {
  freshDrawer(dDate(t), `${plural(rows.length, 'class')} · ${rows.reduce((s, c) => s + c.b, 0)} booked`,
    () => rows.length ? <ClassRows cls={rows.slice().sort((a, b) => a.t - b.t)} /> : <Empty>No classes on this day.</Empty>);
}
function ClassRows({ cls, withDate }) {
  return <div className="-mx-6">{cls.map((c, i) => (
    <Row key={i} onClick={() => openClass(c)} className="px-6">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0"><div className="truncate text-[13.5px] text-ink">{withDate ? dDate(c.t) + ', ' : ''}{dTime(c.t)} · {c.n}</div><div className="sub">{c.i}</div></div>
        <Pill tone={c.c && c.b >= c.c ? 'green' : 'grey'}>{c.b}/{c.c}</Pill>
      </div>
    </Row>))}</div>;
}
export function openClass(c) {
  const ns = (c.ns || []).length, known = !!c.a || ns > 0, booked = c.p.length + ns;
  const count = c.t >= B().now ? `${booked} booked of ${c.c} spots` : known ? `${c.p.length}/${booked} attended` + (ns ? ` · ${ns} no-show${ns === 1 ? '' : 's'}` : '') : `${booked} booked (check-ins update after 8pm)`;
  openDrawer(c.n, `${dDate(c.t)}, ${dTime(c.t)} with ${c.i} · ${count}`, () => {
    const ppl = c.p.map(ci => ({ ci, c: D.clients[ci] })).filter(r => r.c).sort((a, b) => a.c.n.localeCompare(b.c.n));
    return (
      <div className="space-y-6">
        <SearchList rows={ppl} line={r => r.c.n} sub={r => pkgText(r.ci)} onPick={r => openClient(r.ci)} />
        {(c.ns || []).length > 0 && <div>
          <h4 className="label mb-2">No-shows ({c.ns.length})</h4>
          <div className="-mx-6">{c.ns.map(ci => <Row key={ci} onClick={() => openClient(ci)} className="px-6"><div className="text-[13.5px]">{D.clients[ci].n}</div><div className="sub">{pkgText(ci)}</div></Row>)}</div>
        </div>}
      </div>
    );
  });
}

// ---------------- person page ----------------
function Fact({ value, label }) {
  return <div className="rounded-xl border border-line/10 bg-raised/40 px-3 py-2.5"><b className="block font-display text-lg font-medium text-ink">{value}</b><span className="block text-[11px] leading-tight text-muted">{label}</span></div>;
}
export function WeekStrip({ ci, x }) {
  const weeks = L.weeklyVisits(ci, 8), max = Math.max(1, x || 0, ...weeks.map(w => w.n + w.booked));
  return (
    <div>
      <div className="flex h-16 items-end gap-1.5">
        {weeks.map((w, i) => {
          const hit = x ? w.n >= x : w.n > 0;
          return (
            <div key={i} className="flex flex-1 flex-col items-center justify-end gap-1" title={`Week of ${L.fmt(w.a, { day: 'numeric', month: 'short' })}: ${w.n} visit${w.n === 1 ? '' : 's'}${w.booked ? ', ' + w.booked + ' booked' : ''}`}>
              <span className="text-[10px] tabular-nums text-faint">{w.n + (w.booked ? '+' + w.booked : '') || ''}</span>
              <div className="flex w-full max-w-[34px] flex-col justify-end overflow-hidden rounded-md bg-raised/60" style={{ height: 40 }}>
                {w.booked > 0 && <div className="w-full bg-accent/40" style={{ height: `${w.booked / max * 100}%` }} />}
                <div className={cx('w-full', hit ? 'bg-green/70' : w.n ? 'bg-orange/70' : 'bg-red/50')} style={{ height: `${Math.max(w.n ? 8 : 4, w.n / max * 100)}%` }} />
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-1 flex gap-1.5">{weeks.map((w, i) => <span key={i} className="flex-1 text-center text-[10px] text-faint">{w.current ? 'Now' : L.fmt(w.a, { day: 'numeric', month: 'numeric' })}</span>)}</div>
      {x ? <p className="mt-1 text-[11px] text-faint">Plan: {x} a week. Green = hit plan, orange = under, blue = booked ahead.</p> : null}
    </div>
  );
}
export function PersonView({ ci, m }) {
  const c = ci > -1 ? D.clients[ci] : null, b = B(), name = m ? m.n : c.n, email = m ? m.e : c.e;
  const cel = ci > -1 ? L.celebrationsFor(ci) : null;
  const recent = ci > -1 ? L.byClient[ci].map(i => D.classes[i]) : [];
  const [all, setAll] = useState(false);
  const lastWk = L.countFor(ci, b.lastMonday, b.monday), thisAtt = L.countFor(ci, b.monday, b.now), thisBk = L.countFor(ci, b.now, b.nextMonday);
  const cxp = L.cxOf(email, name);
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
          {c && c.ph && <a className="inline-flex items-center gap-1.5 text-accent hover:underline" href={'tel:' + c.ph.replace(/[^\d+]/g, '').replace(/^0/, '+61')}><Phone className="h-3.5 w-3.5" />{c.ph}</a>}
          {email && <a className="inline-flex items-center gap-1.5 text-accent hover:underline" href={'mailto:' + email}><Mail className="h-3.5 w-3.5" />{email}</a>}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {m && !L.tracked(m) && <Pill tone={L.isSuspended(m) ? 'lilac' : 'grey'}>{L.isSuspended(m) ? 'Suspended' : m.status}</Pill>}
          {c && c.pay ? <Pill tone="red">Payment issue</Pill> : null}
          {c && c.ns ? <Pill tone="orange">{plural(c.ns, 'no-show')} recently</Pill> : null}
        </div>
        {c && (c.g || c.age || L.firstOf(c) || c.src) && <p className="sub">
          {[c.g, c.age ? c.age + ' years' : '', L.firstOf(c) ? 'Member since ' + L.fmt(L.firstOf(c), { month: 'short', year: 'numeric' }) : '', c.src ? 'Found us via ' + L.srcText(c.src) : ''].filter(Boolean).join(' · ')}
        </p>}
      </div>
      <StatusBanner email={email} name={name} cx={cxp} />
      <IntroStart email={email} name={name} />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Fact value={m ? `${lastWk}/${m.x}` : lastWk} label="Last week" />
        <Fact value={m ? `${thisAtt + thisBk}/${m.x}` : thisAtt + thisBk} label="This week, incl. booked" />
        <Fact value={c ? c.ytd : 0} label="Visits this year" />
        <Fact value={c ? (c.ltExact ? L.lifetimeOf(c) : L.lifetimeOf(c) + '+') : 0} label="Lifetime visits" />
      </div>
      {cel && (cel.now.length > 0 || cel.soon.length > 0 || cel.streak > 0) && <div className="flex flex-wrap gap-1.5">
        {cel.now.map(e => <Pill key={e.label} tone={e.done ? 'grey' : 'gold'}>{(e.done ? 'Celebrated: ' : 'Celebrate: ') + e.label}</Pill>)}
        {cel.streak ? <Pill tone="green">On plan {cel.streak} week{cel.streak === 1 ? '' : 's'} in a row</Pill> : null}
        {cel.soon.map(e => <Pill key={e.label}>Soon: {e.label}</Pill>)}
      </div>}
      {ci > -1 && <div><h4 className="label mb-3">Last 8 weeks</h4><WeekStrip ci={ci} x={m && m.x} /></div>}
      <div className="flex flex-wrap gap-2"><AddTodoButton n={name} e={email} /></div>
      <TagEditor email={email} name={name} />
      <NotCxControl e={email} n={name} />
      <CxControl p={{ n: name, e: email, cx: cxp }} />
      <BreakControl email={email} name={name} />
      <div>
        <h4 className="label mb-1">Recent classes</h4>
        {recent.length ? <div className="-mx-6">{(all ? recent : recent.slice(0, 8)).map((cl, i) => (
          <Row key={i} onClick={() => openClass(cl)} className="px-6">
            <div className="flex items-center justify-between gap-3"><span className="text-[13.5px]">{cl.n}</span><span className="sub">{dDate(cl.t)}, {dTime(cl.t)} · {cl.t < b.now ? 'attended' : 'booked'}</span></div>
          </Row>))}</div> : <p className="sub py-2">No classes in the last six months. If that seems wrong, check the name matches Hapana.</p>}
        {recent.length > 8 && !all && <button onClick={() => setAll(true)} className="mt-2 text-[12.5px] text-accent hover:underline">Show all {recent.length} recent classes</button>}
      </div>
      <NoteEditor email={email} name={name} />
    </div>
  );
}

// ---------------- editors ----------------
export function TagEditor({ email, name }) {
  const [busy, setBusy] = useState(false);
  if (!email) return null;
  const n = noteFor(email), canEdit = L.isEditor(), cur = new Set(n.tags || []);
  const all = [...new Set([].concat(D.tagList || [], [...cur]))];
  const toggle = async t => {
    const next = new Set(cur); next.has(t) ? next.delete(t) : next.add(t);
    setBusy(true);
    try { await save('saveMemberTags', email, name, [...next]); } catch (e) { toast(e.message, 'error'); }
    setBusy(false);
  };
  return (
    <div>
      <h4 className="label mb-2">Tags</h4>
      <div className="flex flex-wrap gap-1.5">
        {all.map(t => (
          <button key={t} disabled={!canEdit || busy} onClick={() => toggle(t)} aria-pressed={cur.has(t)}
            className={cx('rounded-full border px-2.5 py-1 text-[12px] transition-colors disabled:cursor-default',
              cur.has(t) ? 'border-primary bg-primary text-onprimary' : 'border-line/15 text-muted hover:border-line/30 hover:text-ink')}>{t}</button>
        ))}
      </div>
    </div>
  );
}

/** Templates + "Email" from the studio inbox for one member (admins). */
function OutreachButtons({ email, name }) {
  const ci = L.findClient(email, name), last = ci > -1 ? (D.clients[ci] || {}).l : null;
  const risk = L.workflow().todo.some(p => p.e === email);
  const ctx = { name, email, last, risk };
  return (
    <div className="flex flex-wrap gap-2">
      <button onClick={() => openTemplates(ctx, risk ? 'Members at risk' : 'Email')} className="btn px-2.5 py-1 text-[12.5px]"><FileText className="h-3.5 w-3.5" />Templates</button>
      <button onClick={() => openEmail(ctx, (D.templates || []).find(t => t.cat === 'Email') || null)} className="btn px-2.5 py-1 text-[12.5px]"><Mail className="h-3.5 w-3.5" />Email</button>
    </div>
  );
}

export function NoteEditor({ email, name }) {
  const n = noteFor(email), canEdit = L.isEditor();
  const [status, setStatus] = useState(n.status || 'Pending');
  const [note, setNote] = useState(n.note || '');
  const [busy, setBusy] = useState(false);
  useEffect(() => { setStatus(n.status || 'Pending'); setNote(n.note || ''); }, [email]);
  if (!email) return <p className="sub">No email on file, so notes can't be saved for this person.</p>;
  const submit = async () => {
    setBusy(true);
    try { const r = await save('saveMemberNote', email, name, status, note); toast('Saved' + (r.on ? ' ' + r.on : '')); } catch (e) { toast(e.message, 'error'); }
    setBusy(false);
  };
  return (
    <div className="space-y-3 border-t border-line/10 pt-5">
      <h4 className="label">Outreach</h4>
      {canEdit && <OutreachButtons email={email} name={name} />}
      {n.on && n.status && n.status !== 'Pending' && <p className="sub">{n.status}{n.by ? ' by ' + n.by : ''} on {dDate(n.on)}</p>}
      {n.hist && <details className="rounded-lg border border-line/10 bg-raised/30 px-3 py-2 text-[12.5px] text-muted"><summary className="cursor-pointer text-ink">Outreach history</summary><div className="mt-2 whitespace-pre-line">{n.hist}</div></details>}
      <div>
        <label className="mb-1 block text-[12px] text-muted" htmlFor="oStatus">Status</label>
        <select id="oStatus" disabled={!canEdit} value={status} onChange={e => setStatus(e.target.value)} className="input">
          {['Pending', 'Contacted', 'Replied', 'Booked In', 'No Response', 'Not Needed'].map(s => <option key={s}>{s}</option>)}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-[12px] text-muted" htmlFor="oNote">Notes</label>
        <textarea id="oNote" disabled={!canEdit} value={note} onChange={e => setNote(e.target.value)} rows={4} placeholder={canEdit ? 'What happened, what to do next' : ''} className="input resize-y" />
      </div>
      {canEdit ? <button disabled={busy} onClick={submit} className="btn btn-primary">{busy ? 'Saving…' : 'Save note'}</button>
        : <p className="sub">View only. Ask an admin to make you an Editor on the Access tab.</p>}
    </div>
  );
}

/** Mark someone as fully cancelled (or undo a manual mark). compact = small button in a list row. */
const NC_REASONS = ['Changed membership type', 'Incorrect purchase', 'Now staff'];
/** For people Hapana shows as cancelled when they weren't really (switched plans, bought the wrong thing, joined the staff):
 *  takes them out of Cancelled, "Cancelled this week" and the weekly cancel counts. Editors only, profile only. */
export function NotCxControl({ e, n }) {
  const [open, setOpen] = useState(false), [busy, setBusy] = useState(false), [other, setOther] = useState('');
  if (!L.isEditor() || !e) return null;
  const hx = L.hapanaCxOf(e, n);
  if (!hx) return null;
  const nc = L.notCxOf(hx);
  const run = async reason => {
    setBusy(true);
    try { await save('saveNotCancelled', e, n, reason, reason ? hx.d : null); toast(reason ? `${n} won’t be counted as cancelled` : `${n} is back on the Cancelled list`); setOpen(false); setOther(''); }
    catch (er) { toast(er.message, 'error'); }
    setBusy(false);
  };
  if (nc) return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-green/25 bg-green/[.06] px-4 py-3">
      <div className="min-w-0"><div className="text-[13px] font-medium text-ink">Not counted as a cancellation</div>
        <div className="sub">{nc.ncReason}{nc.ncBy ? ' · marked by ' + nc.ncBy : ''}{nc.ncOn ? ' on ' + dDate(nc.ncOn) : ''}</div></div>
      <button disabled={busy} className="btn px-2.5 py-1 text-[12px]" onClick={() => run('')}><Undo2 className="h-3.5 w-3.5" />{busy ? 'Saving…' : 'Undo'}</button>
    </div>
  );
  return (
    <div className="rounded-xl border border-line/10 bg-raised/30 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0"><div className="text-[13px] text-ink">Hapana shows a cancellation on {dDate(hx.d)}</div>
          <div className="sub">Not a real cancellation? Take them off the Cancelled list.</div></div>
        {!open && <button className="btn px-2.5 py-1 text-[12px]" onClick={() => setOpen(true)}><ArrowRightLeft className="h-3.5 w-3.5" />Not really cancelled</button>}
      </div>
      {open && (
        <div className="mt-3 grid gap-2">
          <div className="flex flex-wrap gap-1.5">
            {NC_REASONS.map(r => <button key={r} disabled={busy} className="btn px-2.5 py-1 text-[12px]" onClick={() => run(r)}>{r}</button>)}
          </div>
          <div className="flex gap-2">
            <input type="text" value={other} onChange={ev => setOther(ev.target.value)} placeholder="Another reason" className="input" />
            <button disabled={busy || !other.trim()} className="btn btn-primary" onClick={() => run(other.trim())}><Check className="h-3.5 w-3.5" />{busy ? 'Saving…' : 'Save'}</button>
            <button className="btn btn-ghost" onClick={() => setOpen(false)}>Back</button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Intro offer: when they bought it and when they actually started (first class, or a date set here). */
export function IntroStart({ email, name }) {
  const x = L.latestIntro(email, name);
  const [open, setOpen] = useState(false), [busy, setBusy] = useState(false);
  const st = x ? L.introStart(x) : null;
  const [date, setDate] = useState(st && st.s ? L.toInput(st.s) : L.toInput(B().today));
  if (!x) return null;
  const end = L.introEnd(x), canEdit = L.isEditor() && !!email;
  const run = async d => {
    setBusy(true);
    try { await save('saveIntroStart', email, name, d); toast(d ? `Start date set to ${dDate(L.fromYmd(d))}` : 'Back to their first class'); setOpen(false); }
    catch (e) { toast(e.message, 'error'); }
    setBusy(false);
  };
  return (
    <div className="rounded-xl border border-accent/20 bg-accent/[.05] px-4 py-3 text-[13px]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-accent" /><span className="text-ink">{L.shortPlan(x.plan)}</span>
          {x.convOn && <Pill tone={x.convKind === 'pack' ? 'lilac' : 'green'}>Rolled over to {x.convKind === 'pack' ? 'a pack' : 'a membership'} {dDate(x.convOn)}</Pill>}</div>
        {canEdit && !open && <button onClick={() => setOpen(true)} className="btn px-2 py-1 text-[12px]">{st.src === 'set' ? 'Change start date' : 'Set start date'}</button>}
      </div>
      <p className="mt-1 text-muted">Bought {dDate(x.d)} · {st.s ? <>started <b className="text-ink">{dDate(st.s)}</b>{st.src === 'set' ? '' : ' (first class)'} · {end < B().today ? 'ended' : 'ends'} {dDate(end)}</> : <>not started yet</>}</p>
      {open && <div className="mt-2 flex flex-wrap items-center gap-2">
        <input type="date" value={date} min={L.toInput(x.d)} onChange={e => setDate(e.target.value)} className="input w-auto" />
        <button disabled={busy || !date} onClick={() => run(date)} className="btn btn-primary"><Check className="h-3.5 w-3.5" />{busy ? 'Saving…' : 'Save'}</button>
        {st.src === 'set' && <button disabled={busy} onClick={() => run('')} className="btn">Use first class instead</button>}
        <button onClick={() => setOpen(false)} className="btn btn-ghost">Cancel</button>
      </div>}
    </div>
  );
}

export function CxControl({ p, compact }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const today = L.toInput(B().today);
  const [date, setDate] = useState(today);
  const [reason, setReason] = useState('');
  if (!L.isEditor() || !p.e) return null;
  const cx0 = p.cx || L.cxOf(p.e, p.n);
  const hx = L.hapanaCxOf(p.e, p.n);
  if (!cx0 && hx && L.notCxOf(hx)) return null;          // marked "not a real cancellation": nothing to mark here
  const stop = e => e.stopPropagation();
  const run = async (d, r) => {
    setBusy(true);
    try { await save('saveCancelled', p.e, p.n, d, r); toast(d ? `${p.n} marked as cancelled` : `Cancellation undone for ${p.n}`); setOpen(false); }
    catch (e) { toast(e.message, 'error'); }
    setBusy(false);
  };
  if (cx0) {
    if (!/^Marked/.test(cx0.src || '')) return null;      // Hapana cancellations: the status banner and "Not really cancelled" box cover it
    return (
      <div onClick={stop} className={cx('flex flex-wrap items-center gap-2', compact ? 'mt-1.5' : '')}>
        {!compact && <span className="sub">{cx0.src} · cancelled {dDate(cx0.d)}</span>}
        <button disabled={busy} className="btn px-2 py-1 text-[12px]" onClick={() => { if (confirm(`Undo the cancellation for ${p.n}? They go back to their usual lists.`)) run('', ''); }}>
          <Undo2 className="h-3.5 w-3.5" />{busy ? 'Saving…' : compact ? 'Undo' : 'Undo cancelled'}</button>
      </div>
    );
  }
  return (
    <div onClick={stop} className={cx('relative', compact && 'mt-1.5')}>
      {!open && <button className="btn px-2 py-1 text-[12px]" title="Cancelled their membership entirely (not a plan switch)" onClick={() => setOpen(true)}>
        <CalendarX2 className="h-3.5 w-3.5" />{compact ? 'Mark cancelled' : 'Mark as cancelled'}</button>}
      {open && (
        <div className={cx('grid w-64 gap-2 rounded-xl border border-line/15 bg-surface p-3 shadow-2xl', compact && 'absolute left-0 top-0 z-30')}>
          <label className="text-[12px] text-muted">Date cancelled</label>
          <input type="date" value={date} max={today} onChange={e => setDate(e.target.value)} className="input" />
          <input type="text" value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason (optional, saves to notes)" className="input" />
          <div className="flex gap-2">
            <button disabled={busy || !date} onClick={() => run(date, reason)} className="btn btn-primary"><Check className="h-3.5 w-3.5" />{busy ? 'Saving…' : 'Mark cancelled'}</button>
            <button onClick={() => setOpen(false)} className="btn btn-ghost">Back</button>
          </div>
        </div>
      )}
    </div>
  );
}

/** "Back from a break": the date someone returned from a pause, so they aren't flagged as a risk while settling back in. */
export function BreakControl({ email, name }) {
  const [busy, setBusy] = useState(false);
  if (!email || L.isSuspended({ e: email, n: name }) || L.cxOf(email, name)) return null;
  const back = L.returnOf(email, name), noteDate = (noteFor(email).suspensionEnds || null);
  const until = back ? back + L.BACK_GRACE_DAYS * DAY : null, recent = until && until > B().now;
  const set = async v => { setBusy(true); try { await save('saveSuspensionEnd', email, name, v); toast(v ? 'Saved' : 'Cleared'); } catch (e) { toast(e.message, 'error'); } setBusy(false); };
  if (!L.isEditor() && !back) return null;
  return (
    <div className="rounded-xl border border-line/10 bg-raised/30 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="label">Back from a pause</h4>
        {back ? <Pill tone={recent ? 'green' : 'grey'}>Back {dDate(back)}{recent ? ` · not flagged until ${dDate(until)}` : ''}</Pill> : null}
      </div>
      {L.isEditor() && <div className="mt-2 flex flex-wrap items-center gap-2">
        <input type="date" aria-label="Date they came back" disabled={busy} max={L.toInput(B().today)} defaultValue={L.toInput(noteDate && noteDate <= B().now ? noteDate : null)} key={noteDate || 'none'}
          onChange={e => e.target.value && set(e.target.value)} className="input w-auto py-1.5" />
        {noteDate ? <button disabled={busy} onClick={() => set('')} className="btn btn-ghost px-2 py-1 text-[12px]">Clear</button> : null}
        <span className="text-[11.5px] text-faint">For when Hapana’s weekly export hasn’t caught up yet. They won’t be flagged for {L.BACK_GRACE_DAYS} days after this date.</span>
      </div>}
    </div>
  );
}

/** Big status line at the top of a person: suspended since…, pause booked, cancelled. */
function StatusBanner({ email, name, cx: cxp }) {
  const b = B(), sp = L.suspensionOf(email, name), pz = L.pausingOf(email, name);
  if (cxp) return (
    <div className="rounded-xl border border-red/25 bg-red/[.07] px-4 py-3">
      <div className="font-medium text-red">Cancelled on {dDate(cxp.d)}</div>
      <div className="sub mt-0.5">{/^Marked/.test(cxp.src || '') ? cxp.src : 'From Hapana'}{cxp.reason ? ' · ' + cxp.reason : ''}</div>
    </div>
  );
  if (sp) return (
    <div className="rounded-xl border border-lilac/25 bg-lilac/[.07] px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><div className="font-medium text-lilac">Suspended since {dDate(sp.d)}</div>
          <div className="sub mt-0.5">{Math.max(0, Math.round((b.today - sp.d) / DAY))} days so far · {sp.ends ? 'back ' + dDate(sp.ends) : 'return date to be confirmed'}</div></div>
        {L.isEditor() ? <div className="flex items-center gap-2"><span className="text-[12px] text-muted">Back on</span><SuspensionEnd p={sp} /></div> : null}
      </div>
    </div>
  );
  if (pz) return (
    <div className="rounded-xl border border-lilac/25 bg-lilac/[.05] px-4 py-3">
      <div className="font-medium text-lilac">Pause booked from {dDate(pz.d)}</div>
      <div className="sub mt-0.5">Still a member until then{pz.ends ? ' · back ' + dDate(pz.ends) : ''}</div>
    </div>
  );
  return null;
}

export function SuspensionEnd({ p }) {
  const [busy, setBusy] = useState(false);
  if (!L.isEditor()) return p.ends ? <span>{dDate(p.ends)}</span> : <Pill>To be confirmed</Pill>;
  return (
    <div onClick={e => e.stopPropagation()} className="flex flex-col gap-1">
      <input type="date" aria-label={'Suspension end date for ' + p.n} defaultValue={L.toInput(p.ends)} disabled={busy} className="input w-auto py-1.5"
        onChange={async e => { setBusy(true); try { await save('saveSuspensionEnd', p.e, p.n, e.target.value); toast('Saved'); } catch (er) { toast(er.message, 'error'); } setBusy(false); }} />
      {!p.ends && <span className="text-[11px] text-faint">To be confirmed</span>}
    </div>
  );
}
