// Google sign-in + a signed session cookie. Only the studio's Google accounts (ALLOWED_DOMAINS) or people on the Access tab get in.
import { createRemoteJWKSet, jwtVerify, SignJWT } from 'jose';
import { readAccess } from './store.mjs';

const GOOGLE_JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
const COOKIE = 'studio_session';
const SESSION_DAYS = 7;

const secretKey = () => {
  const s = process.env.SESSION_SECRET || '';
  if (s.length < 32) throw new Error('SESSION_SECRET is missing or too short (it needs at least 32 characters).');
  return new TextEncoder().encode(s);
};
const allowedDomains = () => (process.env.ALLOWED_DOMAINS || '')
  .split(',').map(d => d.trim().toLowerCase()).filter(Boolean);

export const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers } });

/** Checks the token Google gives the browser after "Sign in with Google". */
export async function verifyGoogle(credential) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error('GOOGLE_CLIENT_ID is not set.');
  const { payload } = await jwtVerify(credential, GOOGLE_JWKS, {
    issuer: ['https://accounts.google.com', 'accounts.google.com'], audience: clientId
  });
  if (!payload.email || payload.email_verified !== true) throw new Error('Google could not confirm this email address.');
  return { email: String(payload.email).toLowerCase(), name: payload.given_name || payload.name || '', picture: payload.picture || '' };
}

function displayName(email, fromSheet, fromGoogle) {
  if (fromSheet) return fromSheet;
  const local = email.split('@')[0] || '';
  if (/^(hello|info|admin|team|studio)$/.test(local)) return process.env.STUDIO_NAME || 'Studio';
  return fromGoogle || local.split(/[._-]/)[0].replace(/^./, c => c.toUpperCase());
}

/** Access tab first (Admin / Coach / Blocked); anyone else with a studio Google account (ALLOWED_DOMAINS) gets the Coach view. */
export async function roleFor(email, googleName) {
  const access = await readAccess();
  const row = access.find(a => a.email === email);
  if (row && /^blocked$/i.test(row.role)) return null;
  const domain = email.split('@')[1] || '';
  if (!row && !allowedDomains().includes(domain)) return null;
  // Access tab: Admin (or the old "Editor") sees everything; Coach (or "Viewer", or a studio account not on the tab) gets the coach view.
  // Internally an admin is still role 'Editor', a coach is 'Coach'.
  return { email, role: row && /^(admin|editor)$/i.test(row.role) ? 'Editor' : 'Coach', name: displayName(email, row && row.name, googleName) };
}

export async function makeSessionCookie(user) {
  const token = await new SignJWT({ email: user.email, name: user.name || '', picture: user.picture || '' })
    .setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime(SESSION_DAYS + 'd').sign(secretKey());
  return `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}`;
}
export const clearCookie = () => `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;

/** The signed-in staff member for this request (role re-checked against the Access tab), or null. */
export async function currentUser(req) {
  const raw = (req.headers.get('cookie') || '').split(/;\s*/).find(c => c.startsWith(COOKIE + '='));
  if (!raw) return null;
  try {
    const { payload } = await jwtVerify(raw.slice(COOKIE.length + 1), secretKey(), { algorithms: ['HS256'] });
    const u = await roleFor(String(payload.email || '').toLowerCase(), payload.name);
    return u ? Object.assign(u, { picture: payload.picture || '' }) : null;
  } catch (e) {
    return null;
  }
}

/** Blocks requests coming from other websites (simple CSRF guard for the save buttons). */
export function sameOrigin(req) {
  const origin = req.headers.get('origin');
  if (!origin) return true;
  try { return new URL(origin).host === new URL(req.url).host; } catch (e) { return false; }
}
