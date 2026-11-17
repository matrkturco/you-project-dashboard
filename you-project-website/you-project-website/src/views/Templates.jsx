// Message templates (spiels): saved in the Sheet's Templates tab (Templates.gs). Admins only.
// Blanks like {first name} fill in for the person you're messaging; Copy puts the finished message on the clipboard.
// Members can also be emailed from the studio inbox (STUDIO.email; sent by Apps Script; opted-out members are never emailed).
import { useState, useEffect } from 'react';
import { Copy, Check, Plus, Trash2, Mail, FileText, Send, PenLine } from 'lucide-react';
import { D, lc, dDate } from '../lib/logic.js';
import { save, toast, openDrawer, backDrawer } from '../lib/store.js';
import { Note, Pill, Warn, cx } from '../components/ui.jsx';
import { STUDIO } from '../studio.js';

export const CATS = ['Sell By Chat', 'Members at risk', 'Email', 'Other', 'Signature'];
const BLANKS = [['{first name}', 'their first name'], ['{name}', 'full name'], ['{username}', 'Instagram / Facebook handle'], ['{last visit}', 'date of their last class'], ['{my name}', 'your name']];
const myEmail = () => lc(D.user && D.user.email);
/** The signature for whoever is signed in: their own (Subject = their email), else the shared one. Same rule as Templates.gs. */
const firstWord = s => lc(String(s || '').trim().split(/\s+/)[0]);
export const signatures = () => (D.templates || []).filter(t => t.cat === 'Signature').sort((a, c) => a.t.localeCompare(c.t));
/** The signer's own signature: Subject = their email, or its name starts with their first name. Same rule as Templates.gs. */
export const mySignature = () => { const s = signatures(), me = firstWord(D.user && D.user.name); return s.find(t => lc(t.sub) === myEmail()) || s.find(t => me && firstWord(t.t) === me) || null; };
const whoFor = sub => { if (!sub) return 'Everyone without their own'; const p = (D.team || []).find(x => x.e === lc(sub)); return p ? p.n : sub; };
const all = () => (D.templates || []).slice().sort((a, c) => CATS.indexOf(a.cat) - CATS.indexOf(c.cat) || a.n.localeCompare(c.n));
const newId = () => 'tp' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

/** Fills the blanks for one person. ctx = { name, first, username, last (ms) } */
export function fill(text, ctx = {}) {
  const first = ctx.first || String(ctx.name || '').trim().split(/\s+/)[0] || '';
  const me = String((D.user && D.user.name) || '').split(' ')[0];
  const map = { 'first name': first, 'name': ctx.name || first, 'username': ctx.username || '', 'last visit': ctx.last ? dDate(ctx.last) : 'a little while ago', 'my name': me };
  return String(text || '').replace(/\{\s*(first name|name|username|last visit|my name)\s*\}/gi, (m, k) => map[lc(k)] !== undefined && map[lc(k)] !== '' ? map[lc(k)] : m);
}
async function copyText(t) {
  try { await navigator.clipboard.writeText(t); toast('Copied'); }
  catch (e) { const a = document.createElement('textarea'); a.value = t; document.body.appendChild(a); a.select(); try { document.execCommand('copy'); toast('Copied'); } catch (er) { toast('Couldn’t copy. Select the text and copy it.', 'error'); } a.remove(); }
}

// ---------- the list (More → Message templates) ----------
export function TemplatesPage() {
  const list = all();
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Note>Spiels you can copy in one tap, or email to a member from {STUDIO.email}. Blanks like <b>{'{first name}'}</b> fill in when you open a template from someone’s card. Saved in the Templates tab of the Sheet.</Note>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => openTemplateEditor(null)} className="btn btn-primary"><Plus className="h-3.5 w-3.5" />New template</button>
        </div>
      </div>
      {CATS.map(cat => {
        const rows = list.filter(t => t.cat === cat);
        if (!rows.length) return null;
        return (
          <section key={cat} className="space-y-2">
            <h3 className="label px-1">{cat}</h3>
            <div className="grid gap-3 md:grid-cols-2">
              {rows.map(t => (
                <div key={t.id} className="card flex flex-col p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0"><div className="truncate text-[14px] text-ink">{t.n}</div>{t.cat === 'Signature' ? <div className="truncate text-[12px] text-faint">For: {whoFor(t.sub)}</div> : t.sub && <div className="truncate text-[12px] text-faint">Subject: {t.sub}</div>}</div>
                    <button onClick={() => openTemplateEditor(t)} className="btn btn-ghost px-2 py-1 text-[12px]"><PenLine className="h-3.5 w-3.5" />Edit</button>
                  </div>
                  <p className="mt-2 line-clamp-5 whitespace-pre-line text-[13px] text-muted">{t.t}</p>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-faint">{t.by ? `Updated by ${t.by}` : ''}</span>
                    <button onClick={() => copyText(t.t)} className="btn px-2.5 py-1 text-[12px]"><Copy className="h-3.5 w-3.5" />Copy</button>
                  </div>
                </div>))}
            </div>
          </section>);
      })}
      {!list.length && <p className="text-[13px] text-faint">No templates yet. Add your first one, or run setupDashboard in Apps Script to get a few starters.</p>}
    </div>
  );
}

function TemplateEditor({ t }) {
  const [f, setF] = useState(() => t ? { n: t.n, cat: t.cat, sub: t.sub || '', t: t.t } : { n: '', cat: 'Sell By Chat', sub: '', t: '' });
  const isNew = !t || t.isNew;
  const [busy, setBusy] = useState(false), [sure, setSure] = useState(false);
  const set = k => e => setF(x => Object.assign({}, x, { [k]: e.target.value }));
  const submit = async () => {
    if (!f.n.trim() || !f.t.trim()) return toast('Give it a name and some text', 'error');
    setBusy(true);
    try { await save('saveTemplate', { id: !isNew ? t.id : newId(), n: f.n.trim(), cat: f.cat, sub: f.sub.trim(), t: f.t }); toast('Template saved'); backDrawer(); } catch (e) { toast(e.message, 'error'); }
    setBusy(false);
  };
  const del = async () => { if (!sure) return setSure(true); setBusy(true); try { await save('deleteTemplate', t.id); toast('Deleted'); backDrawer(); } catch (e) { toast(e.message, 'error'); } setBusy(false); };
  const lbl = 'mb-1 block text-[12px] text-muted';
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className={lbl}>Name</label><input autoFocus value={f.n} onChange={set('n')} className="input" placeholder="e.g. Opener: new follow" /></div>
        <div><label className={lbl}>Category</label><select value={f.cat} onChange={set('cat')} className="input">{CATS.map(c => <option key={c}>{c}</option>)}</select></div>
      </div>
      {(f.cat === 'Email' || f.cat === 'Members at risk') && <div><label className={lbl}>Email subject (for emails)</label><input value={f.sub} onChange={set('sub')} className="input" /></div>}
      {f.cat === 'Signature' && <div><label className={lbl}>Whose signature</label>
        <select value={lc(f.sub)} onChange={set('sub')} className="input"><option value="">Everyone without their own</option>
          {(D.team || []).filter(p => p.role !== 'Coach' || p.e === lc(f.sub)).concat((D.team || []).some(p => p.e === myEmail()) ? [] : [{ e: myEmail(), n: (D.user && D.user.name) || myEmail() }]).map(p => <option key={p.e} value={p.e}>{p.n}{p.e === myEmail() ? ' (me)' : ''}</option>)}</select>
        <p className="mt-1 text-[12px] text-faint">Line 1 is the name (shown in capitals), then the title, e.g. “Head Coach”. The studio logo, address and links (Templates.gs) are added underneath automatically.</p></div>}
      <div><label className={lbl}>Text</label><textarea value={f.t} onChange={set('t')} rows={9} className="input" /></div>
      <div className="rounded-xl border border-line/10 bg-raised/30 px-3 py-2.5 text-[12px] text-muted">
        <div className="mb-1 text-ink">Blanks that fill in</div>
        <div className="flex flex-wrap gap-1.5">{BLANKS.map(([k, d]) => <button key={k} onClick={() => setF(x => Object.assign({}, x, { t: x.t + k }))} title={d} className="rounded-md border border-line/15 px-1.5 py-0.5 font-mono text-[11.5px] hover:bg-raised">{k}</button>)}</div>

      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button disabled={busy} onClick={submit} className="btn btn-primary"><Check className="h-3.5 w-3.5" />{busy ? 'Saving…' : 'Save'}</button>
        <button onClick={backDrawer} className="btn btn-ghost">Cancel</button>
        {!isNew && <button disabled={busy} onClick={del} className={cx('btn ml-auto', sure && 'border-red/40 text-red')}><Trash2 className="h-3.5 w-3.5" />{sure ? 'Tap again to delete' : 'Delete'}</button>}
      </div>
    </div>
  );
}
export const openTemplateEditor = t => openDrawer(t && !t.isNew ? 'Edit template' : 'New template', t ? t.n : 'A spiel you can copy or email', () => <TemplateEditor key={t && !t.isNew ? t.id : 'new' + (t ? t.cat : '')} t={t} />);

// ---------- picking a template for one person ----------
function Picker({ ctx, cat }) {
  const list = all().filter(t => t.cat !== 'Signature');
  const cats = [...new Set(list.map(t => t.cat))];
  const [c, setC] = useState(cats.includes(cat) ? cat : cats[0] || '');
  const shown = list.filter(t => t.cat === c);
  return (
    <div className="space-y-3">
      {cats.length > 1 && <div className="flex flex-wrap gap-1.5">{cats.map(k => <button key={k} onClick={() => setC(k)} className={cx('rounded-full border px-2.5 py-1 text-[12px]', c === k ? 'border-primary/50 bg-primary/10 text-ink' : 'border-line/10 text-muted')}>{k}</button>)}</div>}
      {shown.map(t => {
        const text = fill(t.t, ctx);
        return (
          <div key={t.id} className="rounded-xl border border-line/10 bg-raised/30 p-3">
            <div className="mb-1.5 flex items-center justify-between gap-2"><span className="text-[13px] text-ink">{t.n}</span>
              <button onClick={() => openTemplateEditor(t)} className="btn btn-ghost px-2 py-0.5 text-[12px]"><PenLine className="h-3.5 w-3.5" />Edit</button></div>
            <p className="whitespace-pre-line text-[13px] text-muted">{text}</p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              <button onClick={() => copyText(text)} className="btn btn-primary px-2.5 py-1 text-[12.5px]"><Copy className="h-3.5 w-3.5" />Copy</button>
              {ctx.email && <button onClick={() => openEmail(ctx, t)} className="btn px-2.5 py-1 text-[12.5px]"><Mail className="h-3.5 w-3.5" />Email</button>}
            </div>
          </div>);
      })}
      {!list.length && <p className="text-[13px] text-faint">No templates yet.</p>}
      <button onClick={() => openTemplateEditor({ cat: c || cat || 'Sell By Chat', n: '', sub: '', t: '', isNew: true })} className="btn"><Plus className="h-3.5 w-3.5" />New {c || cat || ''} template</button>
    </div>
  );
}
/** ctx = { name, first, username, email, last, risk }; cat = the category to open on */
export const openTemplates = (ctx, cat) => openDrawer('Templates', ctx.name || ctx.username || '', () => <Picker key={(ctx.email || ctx.username || '') + cat} ctx={ctx} cat={cat} />);

// ---------- emailing a member from the studio inbox ----------
function EmailBox({ ctx, t }) {
  const [sub, setSub] = useState(fill((t && t.sub) || 'Checking in from ' + STUDIO.name, ctx));
  const [body, setBody] = useState(fill(t ? t.t : '', ctx));
  const [check, setCheck] = useState(null), [busy, setBusy] = useState(false), [sure, setSure] = useState(false);
  const [mark, setMark] = useState(!!ctx.risk);
  useEffect(() => { let live = true; save('emailCheck', ctx.email).then(r => { if (live) setCheck(r); }).catch(e => { if (live) setCheck({ error: e.message }); }); return () => { live = false; }; }, [ctx.email]);
  const sigs = signatures();
  const [sigId, setSigId] = useState(() => (mySignature() || sigs[0] || {}).id || '');
  const sigT = sigs.find(x => x.id === sigId);
  const sigLines = String((sigT || { t: '{my name}\n' + STUDIO.name }).t).replace(/\{my name\}/gi, (D.user && D.user.name) || '').split('\n').map(s => s.trim()).filter(Boolean);
  const sig = sigLines.map((l, i) => i ? l : l.toUpperCase()).join('\n');
  const blocked = check && (check.error || !check.known || !check.optIn || !check.from);
  const send = async () => {
    if (!sure) return setSure(true);
    setBusy(true);
    try {
      await save('sendMemberEmail', ctx.email, sub, body, sigId || null);
      if (mark) { try { await save('saveMemberNote', ctx.email, ctx.name, 'Contacted', null); } catch (e) {} }
      toast(`Sent to ${ctx.first || ctx.name} from ${STUDIO.email}`); backDrawer(); backDrawer();
    } catch (e) { toast(e.message, 'error'); setSure(false); }
    setBusy(false);
  };
  const lbl = 'mb-1 block text-[12px] text-muted';
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-line/10 bg-raised/30 px-3 py-2.5 text-[12.5px] text-muted">
        <div>To: <span className="text-ink">{ctx.name} &lt;{ctx.email}&gt;</span></div>
        <div>From: <span className="text-ink">{STUDIO.name} &lt;{STUDIO.email}&gt;</span></div>
      </div>
      {!check && <p className="text-[12.5px] text-faint">Checking they can be emailed…</p>}
      {check && check.error && <Warn>{check.error}</Warn>}
      {check && !check.error && !check.known && <Warn>This email isn’t on the Clients tab, so it can’t be sent from the dashboard.</Warn>}
      {check && !check.error && check.known && !check.optIn && <Warn>{ctx.first || ctx.name} has opted out of emails in Hapana, so they can’t be emailed. Copy the message and text or call them instead.</Warn>}
      {check && !check.error && check.known && check.optIn && !check.from && <Warn>Emails can’t come from {STUDIO.email} yet: the Apps Script runs as {check.me}. Run <b>checkEmailSetup</b> in Apps Script for what to do.</Warn>}
      <div><label className={lbl}>Subject</label><input value={sub} onChange={e => setSub(e.target.value)} className="input" /></div>
      <div><label className={lbl}>Message</label><textarea value={body} onChange={e => setBody(e.target.value)} rows={9} className="input" /></div>
      <div><div className="mb-1 flex items-center justify-between gap-2"><span className="text-[12px] text-muted">Signature</span>
        {sigs.length > 0 && <select value={sigId} onChange={e => setSigId(e.target.value)} className="input w-auto py-1 text-[12.5px]">
          {sigs.map(x => <option key={x.id} value={x.id}>{String(x.t).split('\n')[0]}</option>)}</select>}</div>
        <div className="rounded-lg border border-line/10 bg-white px-4 py-3 font-sans text-[12px] leading-relaxed text-black">
          {sigLines.map((l, i) => <div key={i} className={i ? '' : 'font-bold'}>{i ? l : l.toUpperCase()}</div>)}
          {D.emailLogo && <img src={D.emailLogo} alt={STUDIO.name} className="my-2 w-[150px]" />}
          {D.emailFooter && <div className="whitespace-pre-line text-[11.5px] text-[#222]">{D.emailFooter}</div>}
        </div>
        <p className="mt-1 text-[11.5px] text-faint">Change names and titles under More → Message templates → Signature.</p></div>
      {ctx.risk !== undefined && <label className="flex items-center gap-2 text-[13px] text-muted"><input type="checkbox" checked={mark} onChange={e => setMark(e.target.checked)} className="h-4 w-4 accent-[rgb(var(--primary))]" />Mark as Contacted</label>}
      <div className="flex flex-wrap items-center gap-2">
        <button disabled={busy || !check || blocked} onClick={send} className={cx('btn btn-primary', sure && 'ring-2 ring-primary/40')}><Send className="h-3.5 w-3.5" />{busy ? 'Sending…' : sure ? `Tap again to send to ${ctx.first || ctx.name}` : 'Send email'}</button>
        <button onClick={() => copyText(body + (sig ? '\n\n' + sig : ''))} className="btn"><Copy className="h-3.5 w-3.5" />Copy instead</button>
        <button onClick={backDrawer} className="btn btn-ghost">Cancel</button>
      </div>
      <p className="text-[11.5px] text-faint">Replies go to {STUDIO.email}. Each email is noted in the Sheet’s API_Log.</p>
    </div>
  );
}
export const openEmail = (ctx, t) => openDrawer('Email ' + (ctx.first || ctx.name), 'From ' + STUDIO.email, () => <EmailBox key={ctx.email + (t ? t.id : '')} ctx={ctx} t={t} />);
