// Public settings the sign-in page needs (the Google client ID is not secret).
import { json } from '../lib/auth.mjs';

export default async () => json({ clientId: process.env.GOOGLE_CLIENT_ID || '', studio: process.env.STUDIO_NAME || 'Studio' });
export const config = { path: '/api/config' };
