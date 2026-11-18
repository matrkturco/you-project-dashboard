// Studio-time helpers (Melbourne / Victoria), shared by the browser and the server functions. Change TZ to move the studio.
export const TZ = 'Australia/Melbourne';
export const DAY = 86400000, H = 3600000;

const partsFmt = new Intl.DateTimeFormat('en-AU', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
function parts(ms) {
  const o = {};
  partsFmt.formatToParts(new Date(ms)).forEach(p => { if (p.type !== 'literal') o[p.type] = Number(p.value); });
  return o;
}
/** Milliseconds the studio's time zone is ahead of UTC at a moment. */
export function offsetAt(ms) {
  const p = parts(ms);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(ms / 1000) * 1000;
}
/** Midnight (studio time) of the given calendar date. */
export function midnight(y, m, d) {
  const guess = Date.UTC(y, m - 1, d);
  return guess - offsetAt(guess - offsetAt(guess));
}
/** Midnight (studio time) of the day containing ms. */
export function dayStart(ms) { const p = parts(ms); return midnight(p.year, p.month, p.day); }
/** Midnight of the day n days after the day containing ms. */
export function addDays(ms, n) { return dayStart(dayStart(ms) + n * DAY + 6 * H); }
/** 'yyyy-mm-dd' (studio time). */
export function ymd(ms) { const p = parts(ms); return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`; }
/** Midnight (studio time) for a 'yyyy-mm-dd' string. */
export function fromYmd(s) { const [y, m, d] = String(s).split('-').map(Number); return y ? midnight(y, m, d) : null; }

/** Same date boundaries the Apps Script dashboard uses, worked out for right now. */
export function boundsNow(now = Date.now()) {
  const p = parts(now), today = midnight(p.year, p.month, p.day);
  const dow = (new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay() + 6) % 7;     // Mon = 0
  const monday = addDays(today, -dow);
  const monthStart = midnight(p.year, p.month, 1);
  const lastMonthStart = p.month === 1 ? midnight(p.year - 1, 12, 1) : midnight(p.year, p.month - 1, 1);
  return {
    now, today, tomorrow: addDays(today, 1), monday, nextMonday: addDays(monday, 7), lastMonday: addDays(monday, -7),
    last7: addDays(today, -6), monthStart, lastMonthStart, yearStart: midnight(p.year, 1, 1)
  };
}
