// Talks to the Apps Script "API" deployment (Api.gs). The secret never leaves the server.

export async function callSheet(action, args = [], user = '', extra = {}) {
  const url = process.env.APPS_SCRIPT_URL, secret = process.env.APPS_SCRIPT_SECRET;
  if (!url || !secret) throw new Error('The dashboard is not connected to the Google Sheet yet (APPS_SCRIPT_URL / APPS_SCRIPT_SECRET).');
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },   // plain text avoids a CORS preflight and works with Apps Script
    body: JSON.stringify({ secret, action, args, user, ...extra }),
    redirect: 'follow'
  });
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch (e) {
    throw new Error('The Google Sheet did not answer properly (HTTP ' + res.status + '). Check the Apps Script API deployment.');
  }
  if (!body.ok) throw new Error(body.error || 'The Google Sheet reported an error.');
  return body;
}
