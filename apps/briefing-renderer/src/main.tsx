import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

// Vendor the Leaflet stylesheet into the bundle — FR-015 forbids any
// runtime network request, so we cannot pull `leaflet.css` from a CDN
// at boot. Vite inlines this via its CSS import pipeline.
import 'leaflet/dist/leaflet.css';

const container = document.getElementById('briefing-root');
if (!container) {
  throw new Error('briefing-renderer: missing #briefing-root mount point');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
