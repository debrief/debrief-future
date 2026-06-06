import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { useBriefingStore } from './store';

// Vendor the Leaflet stylesheet into the bundle — FR-015 forbids any
// runtime network request, so we cannot pull `leaflet.css` from a CDN
// at boot. Vite inlines this via its CSS import pipeline.
import 'leaflet/dist/leaflet.css';

// Tiny test-helper surface for the Playwright evidence-capture suite.
// Production users will never touch this; the handle is name-spaced and
// has no side-effects until called.
(window as unknown as {
  __briefingTestHelpers__?: {
    forceEmpty: () => void;
    forceError: (msg: string) => void;
    forceHalt: () => void;
    gotoScene: (index: number) => void;
    setTime: (epochMs: number) => void;
  };
}).__briefingTestHelpers__ = {
  forceEmpty: () => useBriefingStore.setState({ bootState: 'empty', scenes: [] }),
  forceError: (msg: string) =>
    useBriefingStore.setState({ bootState: 'error', bootError: msg }),
  forceHalt: () =>
    useBriefingStore.setState({
      bootState: 'halted',
      haltedReason: {
        kind: 'adapter',
        adapter: 'BrowserMapAdapter',
        message: 'Synthetic halt for screenshot capture',
      },
    }),
  // #280 trail-mode evidence helpers — drive the active Scene and playback
  // clock directly so the Playwright growth test can sample the rendered
  // trail at exact times (including on instant Scenes that have no slider).
  gotoScene: (index: number) => useBriefingStore.getState().setCurrentSceneIndex(index),
  setTime: (epochMs: number) => useBriefingStore.getState().setCurrentTime(epochMs),
};

const container = document.getElementById('briefing-root');
if (!container) {
  throw new Error('briefing-renderer: missing #briefing-root mount point');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
