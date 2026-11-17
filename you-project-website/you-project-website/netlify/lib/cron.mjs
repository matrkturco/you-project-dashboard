// A key only the server can make, so the daily scheduled run can start the background refresh without a signed-in person.
import { createHmac } from 'node:crypto';
export const cronKey = () => createHmac('sha256', process.env.SESSION_SECRET || '').update('studio-daily-refresh').digest('hex');
