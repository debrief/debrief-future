/**
 * @vitest-environment jsdom
 *
 * Unit tests for MapPanel.handleWebviewMessage('webviewReady', ...) (#108).
 *
 * Asserts that when the webview signals readiness, the host posts:
 *   - setCurrentTime (existing — when time is non-null)
 *   - setDisplayMode (existing)
 *   - setDrawingMode (new for #108)
 *   - setDrawingPaletteIndex (new for #108)
 *
 * The MapPanel constructor is tightly bound to a real vscode.WebviewPanel, so
 * we exercise the handler via a prototype-synthesised instance — same pattern
 * as mapPanel-setFeatures.test.ts.
 *
 * jsdom environment is needed because @debrief/components transitively imports
 * Leaflet at module-init time.
 */

import { describe, it, expect, vi } from 'vitest';
import { MapPanel } from '../../src/webview/mapPanel';
import type { DrawingMode } from '@debrief/session-state';

interface MapPanelInternals {
  isWebviewReady: boolean;
  pendingMessages: unknown[];
  panel: { webview: { postMessage: ReturnType<typeof vi.fn> } };
  postMessage: (msg: unknown) => void;
  activeSession?: { getState: () => unknown };
}

interface WebviewReadyTestState {
  currentTime: number | null;
  displayMode: 'full' | 'historical' | 'snail';
  drawingMode: DrawingMode;
  drawingPaletteIndex: number;
}

function makePanel(activeSessionState: WebviewReadyTestState | null): {
  panel: MapPanel;
  posted: unknown[];
} {
  const panel = Object.create(MapPanel.prototype) as MapPanel;
  const internals = panel as unknown as MapPanelInternals;

  const posted: unknown[] = [];
  const panelPostMessage = vi.fn((msg: unknown) => {
    posted.push(msg);
    return Promise.resolve(true);
  });
  internals.panel = { webview: { postMessage: panelPostMessage } };
  internals.isWebviewReady = false;
  internals.pendingMessages = [];

  // Match real MapPanel.postMessage signature — push to webview when ready,
  // else queue. Wired identically to the production path so the test exercises
  // the same gate.
  internals.postMessage = (msg: unknown) => {
    if (internals.isWebviewReady) {
      void internals.panel.webview.postMessage(msg);
    } else {
      internals.pendingMessages.push(msg);
    }
  };

  if (activeSessionState !== null) {
    internals.activeSession = {
      getState: () => activeSessionState,
    };
  }

  return { panel, posted };
}

function sendWebviewReady(panel: MapPanel): void {
  // handleWebviewMessage is private; invoke via the prototype handle to
  // exercise the real production code path under test.
  const handler = (
    panel as unknown as {
      handleWebviewMessage: (msg: { type: string }) => void;
    }
  ).handleWebviewMessage.bind(panel);
  handler({ type: 'webviewReady' });
}

describe('MapPanel webviewReady — drawing state flush (#108)', () => {
  it('flushes drawing mode on webviewReady when a session is active (C-1)', () => {
    const { panel, posted } = makePanel({
      currentTime: null,
      displayMode: 'full',
      drawingMode: 'polygon',
      drawingPaletteIndex: 0,
    });

    sendWebviewReady(panel);

    const drawingModePosts = posted.filter(
      (m): m is { type: 'setDrawingMode'; drawingMode: DrawingMode } =>
        typeof m === 'object' &&
        m !== null &&
        (m as { type?: string }).type === 'setDrawingMode',
    );
    expect(drawingModePosts).toHaveLength(1);
    expect(drawingModePosts[0]!.drawingMode).toBe('polygon');
  });

  it('flushes drawing palette index on webviewReady when a session is active (C-2)', () => {
    const { panel, posted } = makePanel({
      currentTime: null,
      displayMode: 'full',
      drawingMode: 'polygon',
      drawingPaletteIndex: 2,
    });

    sendWebviewReady(panel);

    const paletteIndexPosts = posted.filter(
      (m): m is { type: 'setDrawingPaletteIndex'; paletteIndex: number } =>
        typeof m === 'object' &&
        m !== null &&
        (m as { type?: string }).type === 'setDrawingPaletteIndex',
    );
    expect(paletteIndexPosts).toHaveLength(1);
    expect(paletteIndexPosts[0]!.paletteIndex).toBe(2);
  });

  it('posts drawing mode unconditionally — including the null/un-armed default (Decision 3)', () => {
    const { panel, posted } = makePanel({
      currentTime: null,
      displayMode: 'full',
      drawingMode: null,
      drawingPaletteIndex: 0,
    });

    sendWebviewReady(panel);

    const drawingModePosts = posted.filter(
      (m): m is { type: 'setDrawingMode'; drawingMode: DrawingMode } =>
        typeof m === 'object' &&
        m !== null &&
        (m as { type?: string }).type === 'setDrawingMode',
    );
    expect(drawingModePosts).toHaveLength(1);
    expect(drawingModePosts[0]!.drawingMode).toBeNull();

    const paletteIndexPosts = posted.filter(
      (m): m is { type: 'setDrawingPaletteIndex'; paletteIndex: number } =>
        typeof m === 'object' &&
        m !== null &&
        (m as { type?: string }).type === 'setDrawingPaletteIndex',
    );
    expect(paletteIndexPosts).toHaveLength(1);
    expect(paletteIndexPosts[0]!.paletteIndex).toBe(0);
  });

  it('does not post drawing state when no active session exists (C-3)', () => {
    const { panel, posted } = makePanel(null);

    sendWebviewReady(panel);

    const drawingPosts = posted.filter(
      (m) =>
        typeof m === 'object' &&
        m !== null &&
        ((m as { type?: string }).type === 'setDrawingMode' ||
          (m as { type?: string }).type === 'setDrawingPaletteIndex'),
    );
    expect(drawingPosts).toHaveLength(0);
  });

  it('still posts the pre-existing setDisplayMode message (no regression)', () => {
    const { panel, posted } = makePanel({
      currentTime: 1234,
      displayMode: 'historical',
      drawingMode: null,
      drawingPaletteIndex: 0,
    });

    sendWebviewReady(panel);

    const displayModePost = posted.find(
      (m): m is { type: 'setDisplayMode'; displayMode: string } =>
        typeof m === 'object' &&
        m !== null &&
        (m as { type?: string }).type === 'setDisplayMode',
    );
    expect(displayModePost).toBeDefined();
    expect(displayModePost!.displayMode).toBe('historical');

    const currentTimePost = posted.find(
      (m): m is { type: 'setCurrentTime'; time: number } =>
        typeof m === 'object' &&
        m !== null &&
        (m as { type?: string }).type === 'setCurrentTime',
    );
    expect(currentTimePost).toBeDefined();
    expect(currentTimePost!.time).toBe(1234);
  });
});
