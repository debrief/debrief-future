/**
 * React app entry point for Debrief Web Shell.
 * Data quality: sensor-only plots merged into track companions, timestamps fixed.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from '@debrief/components';
import App from './App';
import './App.css';

// Import Leaflet CSS for map rendering
import 'leaflet/dist/leaflet.css';

// Import vscrui codicon CSS for icon rendering
import 'vscrui/dist/codicon.css';

// Import GoldenLayout base CSS for panel management
import 'golden-layout/dist/css/goldenlayout-base.css';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element not found');
}

const root = createRoot(container);

root.render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>
);
