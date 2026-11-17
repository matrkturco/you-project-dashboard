// Tiny shared state: the data version (bumped after every save), navigation and the side drawer.
import { useSyncExternalStore } from 'react';
import { invalidate, D } from './logic.js';
import { applyChange } from '../../shared/patch.js';

function createStore(initial) {
  let state = initial; const subs = new Set();
  return {
    get: () => state,
    set: next => { state = typeof next === 'function' ? next(state) : next; subs.forEach(f => f()); },
    sub: f => { subs.add(f); return () => subs.delete(f); }
  };
}
const use = s => useSyncExternalStore(s.sub, s.get);

// ----- data version -----
const dataStore = createStore(0);
export const useDataVersion = () => use(dataStore);
export function bump() { invalidate(); dataStore.set(v => v + 1); }

// ----- navigation -----
const NAV_KEY = 'studio.nav';
const savedNav = (() => { try { return JSON.parse(sessionStorage.getItem(NAV_KEY)) || null; } catch (e) { return null; } })();
const navStore = createStore(Object.assign({ sec: 'home', sub: 'home', v: { flag: 'orange', range: 'week', lbScope: 'all', wkOff: 0, tMetric: 'visits', tDays: 30 } }, savedNav || {}));
export const useNav = () => use(navStore);
export const SUBS = {
  home: ['home'], team: ['updates', 'calendar', 'shared', 'mine', 'projects'], members: ['all', 'active', 'suspended', 'scheduled', 'cancelled', 'risks'],
  mreports: ['rollovers', 'payments'], templates: ['all'],
  geronimo: ['results', 'weekly', 'score', 'red', 'orange', 'fringe', 'hof', 'plan'],
  attendance: ['overview', 'classes', 'noshows', 'fringe'], milestones: ['celebrate', 'coming', 'birthdays', 'leaderboard'],
  leads: ['today', 'pipeline', 'summary'],
  onboarding: ['new', 'actioned', 'board', 'never', 'inductions', 'signups'],
  help: ['help'],
};
export function goto(sec, sub, patch) {
  navStore.set(n => ({ sec, sub: sub || SUBS[sec][0], v: Object.assign({}, n.v, patch || {}) }));
  try { sessionStorage.setItem(NAV_KEY, JSON.stringify(navStore.get())); } catch (e) {}
  closeDrawer();
  window.scrollTo(0, 0);
}
export function setView(patch) {
  navStore.set(n => ({ ...n, v: Object.assign({}, n.v, patch) }));
  try { sessionStorage.setItem(NAV_KEY, JSON.stringify(navStore.get())); } catch (e) {}
}

// ----- drawer (a stack, so "Back" works) -----
const drawerStore = createStore([]);
export const useDrawer = () => use(drawerStore);
/** title, sub, render: () => JSX. fresh = start a new stack. */
export function openDrawer(title, sub, render, fresh) {
  drawerStore.set(st => (fresh ? [] : st).concat([{ title, sub, render, id: Math.random() }]));
}
export const freshDrawer = (title, sub, render) => openDrawer(title, sub, render, true);
export const backDrawer = () => drawerStore.set(st => st.slice(0, -1));
export const closeDrawer = () => drawerStore.set([]);

// ----- toasts -----
const toastStore = createStore(null);
export const useToast = () => use(toastStore);
let toastTimer = null;
export function toast(text, kind = 'ok') {
  toastStore.set({ text, kind, id: Date.now() });
  clearTimeout(toastTimer); toastTimer = setTimeout(() => toastStore.set(null), kind === 'error' ? 6000 : 2600);
}

// ----- server calls -----
export async function api(path, opts = {}) {
  const res = await fetch(path, Object.assign({ credentials: 'same-origin' }, opts));
  let body = null;
  try { body = await res.json(); } catch (e) { body = null; }
  if (res.status === 401) { window.dispatchEvent(new Event('studio:signed-out')); }
  if (!res.ok && res.status !== 202) throw new Error((body && body.error) || `Request failed (${res.status})`);
  return Object.assign({ _status: res.status }, body || {});
}

/** Saves a change through the server, then updates the page straight away. */
export async function save(action, ...args) {
  const r = await api('/api/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, args }) });
  applyChange(D, action, args, r.result, D.user);
  bump();
  return r.result || {};
}

// ----- pulling a fresh copy from the Sheet (Refresh button, after an upload) -----
let reloader = null;
export const setReloader = fn => { reloader = fn; };
const refreshStore = createStore(false);
export const useRefreshing = () => use(refreshStore);
/** Asks the server to rebuild its copy from the Google Sheet, waits for it, then reloads the page data. */
export async function pullFresh({ before, kick = true } = {}) {
  if (refreshStore.get()) return false;
  refreshStore.set(true);
  try {
    if (before == null) before = (await api('/api/data?meta=1')).at || 0;
    const asked = Date.now() - 5000;
    if (kick) await fetch('/api/refresh?manual=1', { method: 'POST', credentials: 'same-origin' });
    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, i < 5 ? 2000 : 3000));
      const m = await api('/api/data?meta=1');
      if ((m.at || 0) > before) { if (reloader) await reloader(); toast('Up to date'); return true; }
      // the refresh finished but couldn't get the data: say why instead of spinning
      if (kick && m.last && m.last.ok === false && m.last.at > asked) { toast('Couldn’t refresh: ' + m.last.error, 'error'); return false; }
    }
    toast('Still updating in the background. Try Refresh again in a minute.', 'error');
    return false;
  } catch (e) { toast(e.message, 'error'); return false; }
  finally { refreshStore.set(false); }
}
