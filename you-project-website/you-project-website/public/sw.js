// Lets phones install the dashboard as an app. It doesn't cache anything (the data is always live);
// it only shows a friendly message when a page is opened with no internet connection.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  if (e.request.mode !== 'navigate') return;
  e.respondWith(fetch(e.request).catch(() => new Response(
    '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><body style="margin:0;font-family:system-ui;background:#26282B;color:#FDE4B9;display:grid;place-items:center;height:100vh;text-align:center"><div><h2>You’re offline</h2><p style="color:#bbb">Connect to the internet and try again.</p></div>',
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } })));
});
