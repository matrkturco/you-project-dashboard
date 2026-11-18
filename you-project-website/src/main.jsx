import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import * as L from './lib/logic.js';
import * as S from './lib/store.js';
import './index.css';

// Handy for checking numbers in the browser console: add ?debug=1 to the address.
if (/[?&]debug=1/.test(location.search)) { window.__L = L; window.__S = S; }

// Preview mode: build with VITE_DEMO=1 to click through the dashboard on made-up sample data (no Hapana, Sheet or sign-in needed).
const DEMO = import.meta.env.VITE_DEMO === '1';
const PreviewBadge = () => (
  <div style={{ position: 'fixed', left: 12, bottom: 12, zIndex: 60, pointerEvents: 'none' }}
    className="rounded-full border border-orange/40 bg-orange/15 px-3 py-1 text-[11.5px] font-medium text-orange backdrop-blur">Preview · sample data, not real members</div>
);
const render = () => ReactDOM.createRoot(document.getElementById('root')).render(<>{DEMO && <PreviewBadge />}<App /></>);
if (DEMO) import('./demo/demoServer.js').then(m => { m.installDemo(); render(); });
else render();

// Installable on phones (Add to Home Screen). Never caches data.
if (!DEMO && 'serviceWorker' in navigator && location.hostname !== 'localhost') window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
