// Who is signed in (or 401).
import { json, currentUser } from '../lib/auth.mjs';

export default async (req) => {
  try {
    const user = await currentUser(req);
    return user ? json({ user }) : json({ error: 'Not signed in.' }, 401);
  } catch (e) {
    return json({ error: String(e.message || e) }, 500);
  }
};
export const config = { path: '/api/session' };
