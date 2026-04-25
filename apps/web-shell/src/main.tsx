/**
 * React app entry point for Debrief Web Shell.
 * Data quality: sensor-only plots merged into track companions, timestamps fixed.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from '@debrief/components';
import App, { StoryboardEditHarnessMount } from './App';
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

// #230 US4 — top-level branch: when `?storyboard-edit-harness` is
// present, mount the harness view instead of the standard shell so
// Playwright can drive the polish loop without VS Code. Routed here
// (not in App) so App's hook order stays deterministic per-render.
const isHarness =
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).has('storyboard-edit-harness');

// #220 — request `system` so the ThemeProvider's resolved variant tracks
// the active source (auto-detected: vsCodeBodyClassSource if a `vscode-*`
// body class is present, else mediaQuerySource on prefers-color-scheme +
// prefers-contrast). With the default `{ variant: 'light' }` the source
// would be ignored and `data-theme` would never reflect runtime changes.
root.render(
  <StrictMode>
    <ThemeProvider theme={{ variant: 'system' }}>
      {isHarness ? <StoryboardEditHarnessMount /> : <App />}
    </ThemeProvider>
  </StrictMode>
);
