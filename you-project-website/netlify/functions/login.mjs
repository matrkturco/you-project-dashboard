// Exchanges the Google sign-in token for a dashboard session.
import { json, verifyGoogle, roleFor, makeSessionCookie, sameOrigin } from '../lib/auth.mjs';

export default async (req) => {
  if (req.method !== 'POST' || !sameOrigin(req)) return json({ error: 'Not allowed.' }, 405);
  try {
    const { credential } = await req.json();
    const g = await verifyGoogle(String(credential || ''));
    const user = await roleFor(g.email, g.name);
    if (!user) return json({ error: `${g.email} doesn't have access to this dashboard. Sign in with your studio Google account, or ask an admin to add you on the Access tab.` }, 403);
    user.picture = g.picture;
    return json({ user }, 200, { 'Set-Cookie': await makeSessionCookie(user) });
  } catch (e) {
    return json({ error: 'Sign-in failed: ' + (e.message || e) }, 401);
  }
};
export const config = { path: '/api/login' };
