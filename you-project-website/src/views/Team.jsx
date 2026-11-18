// Team hub: to-dos for everyone (one-off, daily, weekly, projects). Saved to the Sheet's Tasks tab.
import { useState } from 'react';
import { Check, Plus, ListChecks, Users, FolderKanban, Trash2, CalendarDays, ChevronDown, Hand, Hourglass } from 'lucide-react';
import * as T from '../lib/tasks.js';
import * as L from '../lib/logic.js';
import { STUDIO } from '../studio.js';
import { D, B, DAY, lc, plural } from '../lib/logic.js';
import { toInput } from '../lib/logic.js';
import { fromYmd } from '../../shared/time.js';
import { save, toast, openDrawer, backDrawer, goto } from '../lib/store.js';
import { Card, Seg, Pill, Note, cx } from '../components/ui.jsx';
import { openPerson } from '../components/people.jsx';

const DUE_TONE = { overdue: 'text-muted', today: 'text-accent', soon: 'text-muted', later: 'text-faint', anytime: 'text-faint' };   // calm on purpose: no red, nobody's being chased

// ---------- add / edit ----------
function TaskEditor({ task, preset }) {
  const t0 = task || Object.assign({ ty: 'once', a: T.myEmail() }, preset || {});
  const isRep = ['weekly', 'monthly', 'daily'].includes(t0.ty);
  const mr = String(t0.mr || 'd:1').split(':');
  // "How often" for repeating to-dos: w1..w4 = every 1-4 weeks, md = monthly on a date, mn = monthly on e.g. the first Monday
  const freq0 = t0.ty === 'daily' ? 'daily' : t0.ty === 'monthly' ? (mr[0] === 'n' ? 'mn' : 'md') : 'w' + Math.max(1, Math.min(4, Number(t0.ev) || 1));
  const [f, setF] = useState({ t: t0.t || '', n: t0.n || '', a: t0.a || T.myEmail(), ty: isRep ? 'repeat' : (t0.ty || 'once'), freq: freq0,
    wd: t0.wd == null ? T.weekdayOf(Date.now()) : t0.wd, st: toInput(t0.st || B().today),
    md: mr[0] === 'd' ? (mr[1] || '1') : '1', nn: mr[0] === 'n' ? mr[1] : '1', nwd: mr[0] === 'n' ? mr[2] : '0',
    due: t0.due ? toInput(t0.due) : '', p: t0.p || '', me: t0.me || '', mn: t0.mn || '', adm: !!t0.adm });
  const [busy, setBusy] = useState(false), [sure, setSure] = useState(false);
  const set = k => e => setF(x => Object.assign({}, x, { [k]: e && e.target ? e.target.value : e }));
  const rep = f.ty === 'repeat', weekly = rep && f.freq[0] === 'w', ev = weekly ? Number(f.freq.slice(1)) : 1;
  const build = () => {
    const base = { id: task ? task.id : T.newId(), t: f.t.trim(), n: f.n.trim(), a: f.a, p: f.ty === 'project' ? f.p.trim() : '', me: f.me, mn: f.mn, adm: L.isEditor() && !!f.adm,
      wd: null, ev: null, st: null, mr: '', due: null };
    if (!rep) return Object.assign(base, { ty: f.ty, due: f.due ? fromYmd(f.due) : null });
    if (f.freq === 'daily') return Object.assign(base, { ty: 'daily' });
    if (weekly) return Object.assign(base, { ty: 'weekly', wd: Number(f.wd), ev, st: ev > 1 ? fromYmd(f.st) : null });
    return Object.assign(base, { ty: 'monthly', mr: f.freq === 'md' ? 'd:' + f.md : `n:${f.nn}:${f.nwd}` });
  };
  const preview = rep ? T.dueOf(Object.assign({ done: [] }, build())).text : '';
  const submit = async () => {
    if (!f.t.trim()) return toast('Give the to-do a title', 'error');
    if (f.ty === 'project' && !f.p.trim()) return toast('Name the project', 'error');
    setBusy(true);
    try {
      const r = await save('saveTask', build());
      toast(f.a === T.TEAM ? 'Added to the team list' : r.notified ? `Saved, and ${T.nameOf(f.a)} has been emailed` : 'Saved');
      backDrawer();
    } catch (e) { toast(e.message, 'error'); }
    setBusy(false);
  };
  const del = async () => {
    if (!sure) return setSure(true);
    setBusy(true);
    try { await save('deleteTask', task.id); toast('Deleted'); backDrawer(); } catch (e) { toast(e.message, 'error'); }
    setBusy(false);
  };
  const lbl = 'mb-1 block text-[12px] text-muted';
  return (
    <div className="space-y-4">
      <div><label className={lbl}>What needs doing?</label>
        <input autoFocus value={f.t} onChange={set('t')} onKeyDown={e => { if (e.key === 'Enter') submit(); }} className="input" placeholder="e.g. Call Adele about her shoulder" /></div>
      <div><label className={lbl}>Type</label><Seg options={T.TYPES} value={f.ty} onChange={set('ty')} /></div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className={lbl}>Who’s doing it</label>
          <select value={f.a} onChange={set('a')} className="input">
            {T.team().filter(p => !f.adm || p.role !== 'Coach' || p.e === f.a).map(p => <option key={p.e} value={p.e}>{p.e === T.myEmail() ? `${p.n} (me)` : p.n}</option>)}
            <option value={T.TEAM}>Team list (anyone can do it)</option></select></div>
        {rep ? <div><label className={lbl}>How often</label>
          <select value={f.freq} onChange={set('freq')} className="input">
            <option value="w1">Every week</option><option value="w2">Every 2 weeks (fortnightly)</option><option value="w3">Every 3 weeks</option><option value="w4">Every 4 weeks</option>
            <option value="md">Monthly, on a date</option><option value="mn">Monthly, e.g. the first Monday</option>
            {f.freq === 'daily' && <option value="daily">Every day</option>}
          </select></div>
          : <div><label className={lbl}>Due (optional)</label><input type="date" value={f.due} onChange={set('due')} className="input" /></div>}
      </div>
      {weekly && <div className="grid gap-3 sm:grid-cols-2">
        <div><label className={lbl}>On</label>
          <select value={f.wd} onChange={set('wd')} className="input">{T.WEEKDAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}</select></div>
        {ev > 1 && <div><label className={lbl}>Starting the week of</label><input type="date" value={f.st} onChange={set('st')} className="input" /></div>}
      </div>}
      {rep && f.freq === 'md' && <div><label className={lbl}>On the</label>
        <select value={f.md} onChange={set('md')} className="input">{Array.from({ length: 31 }, (_, i) => String(i + 1)).concat(['last']).map(d => <option key={d} value={d}>{d === 'last' ? 'Last day of the month' : T.monthlyText('d:' + d).replace('the ', '') + ' of the month'}</option>)}</select></div>}
      {rep && f.freq === 'mn' && <div className="grid gap-3 sm:grid-cols-2">
        <div><label className={lbl}>Which one</label><select value={f.nn} onChange={set('nn')} className="input">{T.NTH.map(([n, l]) => <option key={n} value={n}>The {l}</option>)}</select></div>
        <div><label className={lbl}>Day</label><select value={f.nwd} onChange={set('nwd')} className="input">{T.WEEKDAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}</select></div>
      </div>}
      {rep && <p className="rounded-lg bg-raised/40 px-3 py-2 text-[12.5px] text-muted">{preview}</p>}
      {f.ty === 'project' && <div><label className={lbl}>Project</label>
        <input value={f.p} onChange={set('p')} list="studio-projects" className="input" placeholder={STUDIO.projectExample} />
        <datalist id="studio-projects">{T.projects().map(p => <option key={p} value={p} />)}</datalist></div>}
      {L.isEditor() && <label className="flex items-start gap-2 rounded-lg border border-line/10 bg-raised/30 px-3 py-2 text-[13px]">
        <input type="checkbox" checked={f.adm} onChange={e => setF(x => Object.assign({}, x, { adm: e.target.checked }))} className="mt-0.5 h-4 w-4 accent-[rgb(var(--primary))]" />
        <span><span className="text-ink">Admins only</span><span className="block text-[12px] text-faint">Only Admins (set on the Access tab) can see this to-do. Coaches never see it.</span></span></label>}
      <div><label className={lbl}>Notes (optional)</label><textarea value={f.n} onChange={set('n')} rows={3} className="input" placeholder="Anything that helps" /></div>
      {f.mn && <p className="text-[12.5px] text-muted">About <button className="text-accent hover:underline" onClick={() => openPerson({ n: f.mn, e: f.me })}>{f.mn}</button></p>}
      {f.a === T.TEAM ? <p className="text-[12px] text-faint">Goes on the team list. Anyone can tick it off or tap <b>Take it</b>. No emails are sent.</p>
        : f.a !== T.myEmail() && <p className="text-[12px] text-faint">{T.nameOf(f.a)} will get an email about this.</p>}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button disabled={busy} onClick={submit} className="btn btn-primary"><Check className="h-3.5 w-3.5" />{busy ? 'Saving…' : task ? 'Save changes' : 'Add to-do'}</button>
        <button onClick={backDrawer} className="btn btn-ghost">Cancel</button>
        {task && <button disabled={busy} onClick={del} className={cx('btn ml-auto', sure && 'border-red/40 text-red')}><Trash2 className="h-3.5 w-3.5" />{sure ? 'Tap again to delete' : 'Delete'}</button>}
      </div>
      {task && <p className="text-[11.5px] text-faint">Added by {task.by || 'someone'}{task.on ? ' on ' + new Date(task.on).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) : ''}{task.tk ? `. Taken from ${task.tk}` : ''}.</p>}
    </div>
  );
}
export const openTaskEditor = (task, preset) => openDrawer(task ? 'Edit to-do' : 'New to-do', preset && preset.mn ? 'About ' + preset.mn : task ? task.t : 'For you or anyone on the team',
  () => <TaskEditor key={task ? task.id : 'new'} task={task} preset={preset} />);

// ---------- one task ----------
/** "Take it": move someone else's (or the team list's) to-do to me. */
export async function takeTask(t) {
  try { await save('takeTask', t.id); toast('It’s yours now. It’s in My to-dos.'); } catch (er) { toast(er.message, 'error'); }
}

export function TaskRow({ t, showWho, hideWho, hideProject, noTake }) {
  const [busy, setBusy] = useState(false);
  const done = T.doneNow(t), due = T.dueOf(t), canTake = !noTake && !done && !T.isMine(t);
  const take = async e => { e.stopPropagation(); setBusy(true); await takeTask(t); setBusy(false); };
  const tick = async e => {
    e.stopPropagation(); setBusy(true);
    try { await save('tickTask', t.id, T.periodKey(t), !done); } catch (er) { toast(er.message, 'error'); }
    setBusy(false);
  };
  return (
    <div role="button" tabIndex={0} onClick={() => openTaskEditor(t)} onKeyDown={e => { if (e.key === 'Enter') openTaskEditor(t); }}
      className="flex cursor-pointer items-start gap-3 border-t border-line/[.07] px-5 py-3 transition-colors first:border-t-0 hover:bg-raised/40">
      <button onClick={tick} disabled={busy} aria-label={done ? 'Mark as not done' : 'Mark as done'}
        className={cx('mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border transition-colors', done ? 'border-green bg-green text-onprimary' : 'border-line/30 hover:border-green', busy && 'opacity-50')}>
        {done && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
      </button>
      <div className="min-w-0 flex-1">
        <div className={cx('text-[13.5px]', done ? 'text-faint line-through' : 'text-ink')}>{t.t}</div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px]">
          <span className={done ? 'text-faint' : DUE_TONE[due.state]}>{due.text}</span>
          {t.adm && <Pill tone="primary">Admins only</Pill>}
          {t.p && !hideProject && <Pill tone="lilac">{t.p}</Pill>}
          {t.mn && <button onClick={e => { e.stopPropagation(); openPerson({ n: t.mn, e: t.me }); }} className="text-accent hover:underline">{t.mn}</button>}
          {!hideWho && (showWho || !T.isMine(t)) && <span className="text-muted">· {T.isMine(t) ? 'me' : T.nameOf(t.a)}</span>}
          {t.tk && !done && <span className="text-faint">· taken from {t.tk}</span>}
          {done && <span className="text-faint">· done by {T.fmtDone(done)}</span>}
          {t.n && !done && <span className="truncate text-faint">· {t.n}</span>}
        </div>
      </div>
      {canTake && <button onClick={take} disabled={busy} title={`Move this to your to-dos${T.isTeam(t) ? '' : ' (from ' + T.nameOf(t.a) + ')'}`}
        className={cx('btn shrink-0 px-2.5 py-1 text-[12px]', busy && 'opacity-50')}><Hand className="h-3.5 w-3.5" />Take it</button>}
    </div>
  );
}
const List = ({ rows, empty, ...o }) => rows.length ? rows.map(t => <TaskRow key={t.id} t={t} {...o} />) : <p className="px-5 py-4 text-[13px] text-faint">{empty}</p>;
const NewBtn = ({ preset, label = 'New to-do' }) => <button onClick={() => openTaskEditor(null, preset)} className="btn btn-primary"><Plus className="h-3.5 w-3.5" />{label}</button>;

// ---------- Team list: shared to-dos anyone can pick up ----------
export function TeamList() {
  const b = B(), all = T.allTasks();
  const open = T.sortTasks(all.filter(t => T.isTeam(t) && !T.doneNow(t)));
  const waiting = T.sortTasks(all.filter(t => !T.isTeam(t) && !T.isMine(t) && T.waitingLong(t)));
  // finished in the last 14 days that started on the team list (still on it, or taken from it)
  const done = all.filter(t => (T.isTeam(t) || t.tk === 'Team list') && T.doneNow(t) && T.doneNow(t).at >= b.today - 14 * DAY).sort((a, c) => T.doneNow(c).at - T.doneNow(a).at);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Note>Jobs anyone can do. Add things here when you’re away or when it doesn’t matter who does it. Tick it off when it’s done, or tap <b>Take it</b> to make it yours first so nobody doubles up.</Note>
        <NewBtn preset={{ a: T.TEAM }} label="Add to team list" />
      </div>
      <Card title="Team list" icon={Users} tone="accent" count={open.length} countTone="accent">
        <List rows={open} hideWho empty="Nothing on the team list. Nice." />
      </Card>
      {waiting.length > 0 && <Card title="Waiting a while" icon={Hourglass} count={waiting.length}
        footer="Someone else’s to-dos that are past their date or were added over a week ago. If you’ve got time, tap Take it.">
        <List rows={waiting} showWho empty="" />
      </Card>}
      {done.length > 0 && <Card title="Done from the team list" icon={Check} tone="green" count={done.length} countTone="green" footer="The last 14 days.">
        <List rows={done} hideWho empty="" />
      </Card>}
    </div>
  );
}

// ---------- My to-dos ----------
export function MyTasks() {
  const [showDone, setShowDone] = useState(false);
  const mine = T.sortTasks(T.allTasks().filter(T.isMine)), open = mine.filter(t => !T.doneNow(t)), done = mine.filter(T.doneNow);
  const by = st => open.filter(t => st.includes(T.dueOf(t).state));
  const given = T.sortTasks(T.allTasks().filter(t => !T.isMine(t) && !T.isTeam(t) && lc(t.by) === lc(D.user && D.user.name) && !T.doneNow(t)));
  const teamOpen = T.allTasks().filter(t => T.isTeam(t) && !T.doneNow(t)).length;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Note>Anything you’ve added for yourself, plus anything someone has left for you. Tick things off when they’re done so the team can see.</Note>
        <NewBtn />
      </div>
      <Card title="Now" icon={CalendarDays} tone="accent" count={by(['overdue', 'today']).length} countTone="accent">
        <List rows={by(["overdue", "today"])} empty="Nothing due right now." />
      </Card>
      <Card title="Later this week" icon={ListChecks} count={by(['soon']).length}><List rows={by(['soon'])} empty="Nothing else this week." /></Card>
      <Card title="Coming up and anytime" icon={ListChecks} count={by(['later', 'anytime']).length}><List rows={by(['later', 'anytime'])} empty="Nothing here." /></Card>
      {teamOpen > 0 && <button onClick={() => goto('team', 'shared')} className="card flex w-full items-center gap-3 px-5 py-3 text-left text-[13px] hover:bg-raised/40">
        <Users className="h-4 w-4 text-accent" /><span className="flex-1 text-muted"><b className="text-ink">{plural(teamOpen, 'to-do')}</b> on the team list that anyone can pick up</span><span className="text-primary">Open</span></button>}
      {given.length > 0 && <Card title="Given to others by me" icon={Users} count={given.length}><List rows={given} showWho empty="" /></Card>}
      {done.length > 0 && <Card title={`Done (${done.length})`} icon={Check} tone="green"
        right={<button className="btn btn-ghost px-2 py-1 text-[12px]" onClick={() => setShowDone(v => !v)}>{showDone ? 'Hide' : 'Show'}<ChevronDown className={cx('h-3.5 w-3.5 transition-transform', showDone && 'rotate-180')} /></button>}>
        {showDone && <List rows={done} empty="" />}
      </Card>}
    </div>
  );
}

// ---------- Updates: what everyone's working on, and what's been done ----------
export function TeamUpdates() {
  const people = T.team(), b = B();
  const [who, setWho] = useState('all');
  const keep = t => who === 'all' || t.a === who;
  // every tick in the last 30 days, newest first (weekly tasks can appear once per week)
  const feed = [];
  T.allTasks().filter(keep).forEach(t => (t.done || []).forEach(d => { if (d.at >= b.today - 30 * DAY) feed.push({ t, d }); }));
  feed.sort((a, c) => c.d.at - a.d.at);
  const groups = [['This week', x => x.d.at >= b.monday], ['Last week', x => x.d.at >= b.lastMonday && x.d.at < b.monday], ['Earlier', x => x.d.at < b.lastMonday]]
    .map(([l, f]) => [l, feed.filter(f)]).filter(g => g[1].length);
  const open = T.sortTasks(T.allTasks().filter(t => keep(t) && !T.doneNow(t)));
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Note>What the team is working on and what’s been finished. Check it whenever it’s useful; there’s nothing you need to keep on top of here.</Note>
        <NewBtn label="Add something" />
      </div>
      <Seg options={[['all', 'Everyone']].concat(people.map(p => [p.e, p.e === T.myEmail() ? p.n + ' (me)' : p.n]))} value={who} onChange={setWho} />
      <Card title="Done recently" icon={Check} tone="green" count={feed.length} countTone="green" footer="The last 30 days.">
        {groups.length ? groups.map(([l, rows]) => (
          <div key={l}>
            <div className="border-t border-line/[.07] bg-raised/20 px-5 py-1.5 text-[11.5px] uppercase tracking-sub text-faint first:border-t-0">{l}</div>
            {rows.map((x, i) => (
              <button key={x.t.id + x.d.k + i} onClick={() => openTaskEditor(x.t)} className="flex w-full items-start gap-3 border-t border-line/[.05] px-5 py-2.5 text-left hover:bg-raised/40">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md bg-green/20 text-green"><Check className="h-3.5 w-3.5" strokeWidth={3} /></span>
                <span className="min-w-0 flex-1"><span className="block text-[13.5px] text-ink">{x.t.t}</span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-faint">
                    <span>{T.fmtDone(x.d)}</span>{x.t.p && <Pill tone="lilac">{x.t.p}</Pill>}{T.repeatText(x.t) && <span>· {T.repeatText(x.t).toLowerCase()}</span>}
                    {x.t.mn && <span className="text-accent">· {x.t.mn}</span>}</span></span>
              </button>))}
          </div>)) : <p className="px-5 py-4 text-[13px] text-faint">Nothing ticked off in the last 30 days{who !== 'all' ? ' for ' + T.nameOf(who) : ''}.</p>}
      </Card>
      <Card title="In progress" icon={ListChecks} count={open.length}>
        <List rows={open} showWho={who === 'all'} hideWho={who !== 'all'} empty="Nothing in progress." />
      </Card>
    </div>
  );
}

// ---------- Projects ----------
export function TeamProjects() {
  const names = T.projects();
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Note>Group to-dos into a project to see what’s left and who’s on it. Pick “Project” as the type when adding a to-do.</Note>
        <NewBtn preset={{ ty: 'project' }} label="New project to-do" />
      </div>
      {!names.length && <Card title="No projects yet" icon={FolderKanban}><p className="px-5 py-4 text-[13px] text-muted">Add a to-do with the type <b>Project</b> and give it a project name, for example a new training block or an event.</p></Card>}
      <div className="grid gap-4 lg:grid-cols-2">
        {names.map(n => {
          const rows = T.sortTasks(T.allTasks().filter(t => t.p === n)), dn = rows.filter(T.doneNow).length, pct = rows.length ? Math.round(dn / rows.length * 100) : 0;
          return (
            <Card key={n} title={n} icon={FolderKanban} tone="lilac" count={`${dn}/${rows.length}`} countTone={pct === 100 ? 'green' : 'lilac'}
              right={<button onClick={() => openTaskEditor(null, { ty: 'project', p: n })} className="btn px-2 py-1 text-[12px]"><Plus className="h-3.5 w-3.5" />Add</button>}>
              <div className="px-5 pb-3 pt-1"><div className="h-1.5 overflow-hidden rounded-full bg-lilac/15"><div className="h-full rounded-full bg-lilac" style={{ width: pct + '%' }} /></div>
                <div className="mt-1 text-[11.5px] text-faint">{pct}% done · {plural(rows.length - dn, 'to-do')} left</div></div>
              <List rows={rows} showWho hideProject empty="" />
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ---------- Home: my to-dos for today ----------
export function HomeTodos() {
  const mine = T.allTasks().filter(T.isMine);
  const today = T.sortTasks(mine.filter(t => ['overdue', 'today'].includes(T.dueOf(t).state) && !T.doneNow(t)));
  const doneToday = mine.filter(t => { const d = T.doneNow(t); return d && d.at >= B().today; }).length;
  const soon = mine.filter(t => T.dueOf(t).state === 'soon' && !T.doneNow(t)).length;
  return (
    <section className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-orange/20 text-orange ring-1 ring-orange/40"><ListChecks className="h-[18px] w-[18px]" /></span>
          <div><h2 className="font-display text-[13.5px] tracking-sub text-ink">My to-dos today</h2>
            <p className="mt-0.5 text-[12px] text-faint">{today.length ? `${plural(today.length, 'to-do')} left` : 'All done for today'}{doneToday ? ` · ${doneToday} ticked off today` : ''}{soon ? ` · ${soon} later this week` : ''}</p></div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => goto('team', 'mine')} className="btn px-2.5 py-1 text-[12px]">All my to-dos</button>
          <button onClick={() => openTaskEditor()} className="btn btn-primary px-2.5 py-1 text-[12px]"><Plus className="h-3.5 w-3.5" />New</button>
        </div>
      </div>
      {today.length > 0 && <div className="border-t border-line/[.07]">{today.slice(0, 6).map(t => <TaskRow key={t.id} t={t} />)}
        {today.length > 6 && <button onClick={() => goto('team', 'mine')} className="w-full border-t border-line/[.07] px-5 py-2.5 text-left text-[12.5px] text-primary hover:bg-raised/40">+ {today.length - 6} more</button>}</div>}
    </section>
  );
}

/** Small button for a member's profile: "Add to-do about Adele". */
export const AddTodoButton = ({ n, e }) => <button onClick={() => openTaskEditor(null, { mn: n, me: e })} className="btn px-2.5 py-1 text-[12px]"><Plus className="h-3.5 w-3.5" />Add to-do about {String(n).split(' ')[0]}</button>;
