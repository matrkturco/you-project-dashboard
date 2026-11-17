// SAMPLE DATA for preview mode only (VITE_DEMO=1). Every name, email and number here is made up.
// It has the same shape as getDashboardData() in apps-script/Dashboard.gs, so every page can be tried out
// before the studio's Hapana is connected. The live site never loads this file unless VITE_DEMO=1 is set.
import { TZ, DAY, H, boundsNow, addDays, ymd } from '../../shared/time.js';

const WD = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], wdFmt = new Intl.DateTimeFormat('en-AU', { timeZone: TZ, weekday: 'short' });
const weekday = ms => WD.indexOf(wdFmt.format(ms + 12 * H).slice(0, 3));   // 0 = Monday

// Small repeatable random generator, so the sample looks the same every time it loads.
function rng(seed) { return () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }; }

const FIRST = ['Olivia', 'Mia', 'Charlotte', 'Amelia', 'Isla', 'Ava', 'Grace', 'Chloe', 'Zoe', 'Ruby', 'Sophie', 'Ella', 'Harper', 'Lily', 'Matilda',
  'Ivy', 'Willow', 'Evie', 'Hannah', 'Sienna', 'Jack', 'Oliver', 'Noah', 'Leo', 'Henry', 'Lucas', 'Max', 'Tom', 'Sam', 'Ben', 'Liam', 'James',
  'Ethan', 'Archie', 'Hugo', 'Kate', 'Jess', 'Emma', 'Laura', 'Nina', 'Tessa', 'Bree', 'Claire', 'Dani', 'Georgia', 'Holly', 'Jade', 'Kira',
  'Lucy', 'Maddie', 'Nadia', 'Phoebe', 'Rosie', 'Sarah', 'Tara', 'Vanessa', 'Alex', 'Chris', 'Dan', 'Josh', 'Matt', 'Nick', 'Ryan', 'Sean',
  'Will', 'Zac', 'Amy', 'Beth', 'Cara', 'Elise', 'Fran', 'Gemma', 'Jo', 'Leah', 'Meg', 'Pip'];
const LAST = ['Sample', 'Example', 'Demo', 'Placeholder', 'Tester', 'Preview', 'Mockley', 'Dummy', 'Trial', 'Specimen'];
const SCHEDULE = [   // weekday (0 = Mon) → [hour, minute, class, coach, capacity]
  [[6, 0, 'Reformer Pilates', 'Coach A', 14], [7, 0, 'Mat Pilates', 'Coach B', 14], [9, 30, 'Yin Yoga', 'Coach C', 12], [17, 30, 'Reformer Pilates', 'Coach A', 14], [18, 30, 'Mat Pilates', 'Coach B', 14]],
  [[6, 0, 'Mat Pilates', 'Coach B', 14], [7, 0, 'Reformer Pilates', 'Coach A', 14], [12, 15, 'Express Reformer', 'Coach C', 12], [17, 30, 'Yin Yoga', 'Coach C', 12], [18, 30, 'Reformer Pilates', 'Coach A', 14]],
  [[6, 0, 'Reformer Pilates', 'Coach A', 14], [7, 0, 'Mat Pilates', 'Coach B', 14], [9, 30, 'Yin Yoga', 'Coach C', 12], [17, 30, 'Reformer Pilates', 'Coach A', 14], [18, 30, 'Mat Pilates', 'Coach B', 14]],
  [[6, 0, 'Mat Pilates', 'Coach B', 14], [7, 0, 'Reformer Pilates', 'Coach A', 14], [12, 15, 'Express Reformer', 'Coach C', 12], [17, 30, 'Yin Yoga', 'Coach C', 12], [18, 30, 'Reformer Pilates', 'Coach A', 14]],
  [[6, 0, 'Reformer Pilates', 'Coach A', 14], [7, 0, 'Mat Pilates', 'Coach B', 14], [9, 30, 'Yin Yoga', 'Coach C', 12], [17, 30, 'Reformer Pilates', 'Coach A', 14]],
  [[8, 0, 'Vinyasa Flow', 'Coach A', 16], [9, 0, 'Reformer Pilates', 'Coach B', 14]],
  [[9, 0, 'Yin Yoga', 'Coach C', 12]]
];
const PLANS = [['Unlimited Membership', 4, '$69/wk'], ['3x Week Membership', 3, '$59/wk'], ['2x Week Membership', 2, '$49/wk']];

export function sampleData() {
  const r = rng(20261112), pick = a => a[Math.floor(r() * a.length)];
  const b = boundsNow(), now = b.now, today = b.today;
  const at = (day, h, m) => day + h * H + (m || 0) * 6e4;   // fine for preview purposes (ignores daylight-saving edges)
  const start = addDays(today, -182), end = addDays(b.monday, 6);

  // ----- people -----
  const people = [];
  const N = 78;
  for (let i = 0; i < N; i++) {
    const first = FIRST[i % FIRST.length], last = LAST[i % LAST.length];
    const e = `${first}.${last}${i}`.toLowerCase() + '@example.com';
    const kind = i < 56 ? 'member' : i < 62 ? 'suspended' : i < 70 ? 'intro' : i < 74 ? 'pack' : 'cancelled';
    const plan = PLANS[i % 3];
    // how often they actually come compared with their plan (some are slipping, to show the flag lists)
    const keen = kind === 'cancelled' ? 0 : i % 9 === 0 ? 0.2 : i % 7 === 0 ? 0.5 : 0.8 + r() * 0.3;
    const joinedDaysAgo = kind === 'intro' ? Math.floor(r() * 20) + 1 : 40 + Math.floor(r() * 700);
    const bdM = 1 + Math.floor(r() * 12), bdD = 1 + Math.floor(r() * 28);
    people.push({ i, n: `${first} ${last}`, e, kind, plan, keen, joined: addDays(today, -joinedDaysAgo),
      ph: '614' + String(10000000 + Math.floor(r() * 89999999)), g: r() < 0.65 ? 'Female' : 'Male',
      bd: String(bdM).padStart(2, '0') + '-' + String(bdD).padStart(2, '0'), age: 22 + Math.floor(r() * 35),
      src: pick(['Instagram', 'Referral', 'Google', 'Walk-in', 'Facebook']), base: Math.floor(r() * 220) });
  }
  // a couple of birthdays this week, so the Birthdays list has something in it
  [3, 11].forEach((k, j) => { people[k].bd = ymd(addDays(today, j + 1)).slice(5); });

  // ----- classes + attendance -----
  const classes = [];
  for (let d = start; d <= end; d = addDays(d, 1)) {
    const wd = weekday(d);
    SCHEDULE[wd].forEach(([h, m, n, coach, cap]) => classes.push({ t: at(d, h, m), n, i: coach, c: cap, b: 0, p: [], day: d }));
  }
  const clients = people.map(p => ({ k: p.e, n: p.n, e: p.e, ph: p.ph, ytd: 0, f: null, l: null, m: 0, ns: 0 }));
  const weekly = p => p.kind === 'member' || p.kind === 'suspended' ? p.plan[1] * p.keen : p.kind === 'intro' ? 2.5 : p.kind === 'pack' ? 1.2 : 2;
  classes.forEach(c => {
    people.forEach(p => {
      if (c.t < p.joined) return;
      if (p.kind === 'cancelled' && c.t > addDays(today, -30)) return;
      if (p.kind === 'suspended' && c.t > addDays(today, -14 - p.i)) return;
      if (c.p.length >= c.c) return;
      if (r() < weekly(p) / 33) c.p.push(p.i);
    });
  });
  classes.forEach(c => {
    if (c.t > now) { c.b = c.p.length; return; }
    c.a = 1;
    c.p = c.p.filter(ci => { if (r() < 0.04) { (c.ns = c.ns || []).push(ci); if (c.t >= b.monthStart - 31 * DAY) clients[ci].ns++; return false; } return true; });
    c.b = c.p.length;
    c.p.forEach(ci => {
      const cl = clients[ci];
      if (c.t >= b.yearStart) { cl.ytd++; if (c.t >= b.monthStart) cl.m++; }
      if (!cl.f || c.t < cl.f) cl.f = c.t;
      if (!cl.l || c.t > cl.l) cl.l = c.t;
    });
  });
  classes.forEach(c => { delete c.day; });

  // ----- client details + members -----
  const members = [], suspended = [], suspStarts = [], intros = [], packs = [], purchAll = [], cancelled = [], movers = [];
  const changes = { Back: [], Cancelled: [], Ended: [], New: [] };
  people.forEach(p => {
    const c = clients[p.i];
    Object.assign(c, { g: p.g, bd: p.bd, age: p.age, join: p.joined, first: p.joined, src: p.src, st: p.kind === 'cancelled' ? 'Inactive' : 'Active',
      lt: p.base + c.ytd, ltExact: 1 });
    if (p.kind === 'member' || p.kind === 'suspended') {
      c.mem = 1; c.pkgs = p.plan[0];
      members.push({ n: p.n, e: p.e, plan: p.plan[0], x: p.plan[1], rate: p.plan[2], status: p.joined > addDays(today, -7) ? 'New This Week' : '', ci: p.i, joined: p.joined });
      purchAll.push({ e: p.e, n: p.n, plan: p.plan[0], cat: 'Membership', type: 'Membership', d: p.joined, exp: null });
      if (p.i % 13 === 5) c.pay = 1;
    }
    if (p.kind === 'suspended') {
      const d = addDays(today, -14 - p.i % 6), ends = addDays(today, 7 + p.i % 10);
      suspended.push({ n: p.n, e: p.e, ph: p.ph, plan: p.plan[0], kind: 'Membership', type: 'Suspension Start', amt: '', d, reason: pick(['Travel', 'Injury', 'Work']), ends });
      suspStarts.push({ n: p.n, e: p.e, plan: p.plan[0], d, ends });
    }
    if (p.kind === 'intro') {
      const conv = p.i % 3 === 0 && p.joined < addDays(today, -10);
      c.pkgs = conv ? '2x Week Membership' : '2 Week Intro';
      const item = { n: p.n, e: p.e, ph: p.ph, plan: '2 Week Intro', kind: 'Session Package', type: 'New', amt: '$49', reason: '', d: p.joined, len: 14, real: true,
        convOn: conv ? addDays(p.joined, 13) : null, convPlan: conv ? '2x Week Membership' : '', convKind: conv ? 'membership' : '', already: false };
      intros.push(item); changes.New.push(item); movers.push(item);
      purchAll.push({ e: p.e, n: p.n, plan: '2 Week Intro', cat: 'Intro Offer', type: 'Session Package', d: p.joined, exp: addDays(p.joined, 14) });
    }
    if (p.kind === 'pack') {
      c.pkgs = '10 Class Pack';
      const d = addDays(today, -20 - p.i), exp = addDays(d, 90);
      packs.push({ n: p.n, e: p.e, plan: '10 Class Pack', d, exp });
      purchAll.push({ e: p.e, n: p.n, plan: '10 Class Pack', cat: 'Class Pack', type: 'Session Package', d, exp });
    }
    if (p.kind === 'cancelled') {
      const d = addDays(today, -3 - (p.i % 20));
      const item = { n: p.n, e: p.e, ph: p.ph, plan: p.plan[0], kind: 'Membership', type: 'Cancelled', amt: '', d, reason: pick(['Moving away', 'Cost', 'Schedule change', 'Injury']) };
      cancelled.push(Object.assign({ src: 'Hapana', first: p.joined, lt: c.lt, ltExact: true, last: c.l }, item));
      movers.push(item); if (d >= addDays(today, -7)) changes.Cancelled.push(item);
    }
  });
  const backFromBreak = [{ n: people[20].n, e: people[20].e, d: addDays(today, -5) }];
  changes.Back.push({ n: people[20].n, e: people[20].e, ph: people[20].ph, plan: people[20].plan[0], kind: 'Membership', type: 'Suspension End', amt: '', d: addDays(today, -5), reason: '' });
  const suspScheduled = [{ n: people[30].n, e: people[30].e, ph: people[30].ph, plan: people[30].plan[0], kind: 'Membership', type: 'Suspension Start', amt: '', d: addDays(today, 6), reason: 'Holiday', ends: addDays(today, 20) }];

  // ----- notes the team has left -----
  const notes = {};
  [9, 18, 27].forEach((k, j) => { notes[people[k].e] = { status: j === 2 ? 'No Response' : 'Contacted', note: 'Sent a check-in message (sample note)', by: 'Ange', on: addDays(today, -2 - j * 3), tags: j === 0 ? ['Injury'] : [] }; });

  // ----- team, to-dos, calendar -----
  const team = [{ e: 'ange@example.com', role: 'Admin', n: 'Ange' }, { e: 'nicole@example.com', role: 'Admin', n: 'Nicole' }, { e: 'mark@example.com', role: 'Admin', n: 'Mark' }, { e: 'coach@example.com', role: 'Coach', n: 'Coach A' }];
  const T = (id, t, a, due, extra) => Object.assign({ id, t, n: '', a, ty: 'once', wd: null, due, p: '', me: '', mn: '', by: 'Ange', on: addDays(today, -3), ev: null, st: null, mr: '', tk: '', adm: false, done: [] }, extra || {});
  const tasks = [
    T('s1', 'Call this week’s new intro clients', 'team', addDays(today, 1)),
    T('s2', 'Plan next month’s challenge', 'ange@example.com', addDays(today, 5), { p: 'Summer challenge' }),
    T('s3', 'Update the class timetable on the website', 'mark@example.com', addDays(today, 2)),
    T('s4', 'Weekly numbers check', 'nicole@example.com', null, { ty: 'repeat', wd: 0, ev: 1 })
  ];
  const calClasses = classes.filter(c => c.t >= today).map(c => ({ t: c.t, m: c.n === 'Express Reformer' ? 30 : 45, n: c.n, ty: 'Class', i: c.i, c: c.c }));
  for (let d = addDays(end, 1); d <= addDays(end, 14); d = addDays(d, 1)) {
    const wd = weekday(d);
    SCHEDULE[wd].forEach(([h, m, n, coach, cap]) => calClasses.push({ t: at(d, h, m), m: n === 'Express Reformer' ? 30 : 45, n, ty: 'Class', i: coach, c: cap }));
  }
  const ev = (id, t, ty, s, len, who) => ({ id, t, ty, s, e: s + len, ad: false, who, wh: 'Studio', n: '', rp: 0, ru: null, by: 'Ange', on: addDays(today, -4) });
  const cal = { classes: calClasses, aheadTo: calClasses.length ? calClasses[calClasses.length - 1].t : null,
    events: [ev('e1', 'Team meeting', 'meeting', at(addDays(today, 2), 13, 0), H, ['ange@example.com', 'nicole@example.com', 'mark@example.com']),
      ev('e2', 'Community workout', 'event', at(addDays(today, 9), 8, 0), 2 * H, [])] };

  // ----- Sell By Chat -----
  const stages = ['Opened', 'Replied', 'Content sent', 'Collecting details', 'Warm lead', 'Referred', 'Joined', 'Not interested'];
  const sbcRows = Array.from({ length: 18 }, (_, k) => {
    const opened = addDays(today, -Math.floor(k * 1.5)), st = k < 4 ? 'Opened' : stages[k % stages.length];
    return { row: k + 2, dateOpened: ymd(opened), username: '@sample_' + (k + 1), name: k % 3 ? FIRST[k + 20] : '', platform: k % 2 ? 'Instagram' : 'Facebook',
      source: pick(['Liked a post', 'New follower', 'Commented']), preQualified: k % 4 !== 0, followedBack: k % 3 === 0, openerSent: true, stage: st,
      pathway: st === 'Warm lead' || st === 'Collecting details' ? 'B – Studio (warm lead)' : st === 'Content sent' ? 'A – Content' : st === 'Referred' ? 'C – Other service' : '',
      dateReplied: st === 'Opened' ? '' : ymd(addDays(opened, 1)), detailsDate: st === 'Warm lead' ? ymd(addDays(opened, 2)) : '',
      hasPhone: st === 'Warm lead', hasEmail: st === 'Warm lead', phone: st === 'Warm lead' ? '0400 000 000' : '', email: st === 'Warm lead' ? 'lead@example.com' : '',
      updated: addDays(opened, 1), inWarmLeads: false, notes: '' };
  });

  // ----- message templates -----
  const tpl = (id, n, cat, sub, t) => ({ id, n, cat, sub, t, by: 'Ange', at: addDays(today, -10) });
  const templates = [
    tpl('tp1', 'Missed you this week', 'Check-in', 'We missed you this week', 'Hi {first name},\n\nWe noticed we haven’t seen you in a little while and wanted to check in. Is there anything we can help with?\n\nSee you soon,'),
    tpl('tp2', 'Welcome to the studio', 'Onboarding', 'Welcome!', 'Hi {first name},\n\nWelcome! We’re so glad you’ve joined us. Here’s what to expect in your first week…'),
    tpl('tp3', 'Opener', 'Sell By Chat', '', 'Hey {first name}! Thanks for the follow. What got you interested in training with us?'),
    tpl('sig-ange', 'Ange', 'Signature', '', 'Ange\nOwner')
  ];

  const snapshots = Array.from({ length: 8 }, (_, k) => ({ d: ymd(addDays(b.monday, -7 * (8 - k))), active: 54 + k, fu: 9 - (k % 3), short: 12 - (k % 4), susp: 5 + (k % 2), packs: 4 }));

  return {
    sample: true, theme: { 'Show milestone alerts': 'No' }, bounds: b, notes, classes, clients, members, cxMembers: [], suspended, suspScheduled, suspStarts, backFromBreak,
    scoreboard: null, metrics: null, cal, sellByChat: { target: 5, quietDays: 7, stages, rows: sbcRows }, templates, emailLogo: null,
    emailFooter: 'A 10 Williams Street, Inverloch VIC 3996\nE info@youprojectco.com.au\nW www.youprojectco.com.au', tasks, team, changes, renewals: [], intros, packs, purchAll, cancelled, statusKnown: true,
    lifeMilestones: [10, 25, 50, 100, 250, 500], tagList: ['Injury', 'Travelling', 'VIP'], lifeCut: 0, movers,
    milestones: [{ v: 50, reward: 'Shout-out on socials' }, { v: 100, reward: 'Studio tee' }, { v: 250, reward: 'Hall of Fame' }],
    rewards: [], hasHistory: true, snapshots, mvLatest: addDays(today, -1), salesPrices: [], salesLog: [], uploads: [],
    todayKey: ymd(now), refreshedAt: today + 6 * H
  };
}
