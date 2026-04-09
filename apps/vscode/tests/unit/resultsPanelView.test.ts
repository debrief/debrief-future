/**
 * Regression: ResultsPanelViewProvider must handle webview lifecycle
 * correctly — specifically, stale `_view` / `_isReady` state after
 * the webview is disposed.
 *
 * User-reported bug (fourth round):
 *
 *   "I selected two tracks, and ran 'Range-bearing'. No graph was shown."
 *
 * Root cause: the view provider cached `_view` and `_isReady` on first
 * `resolveWebviewView` but never reset them on dispose.  If the user
 * had ever opened the Debrief Results panel and then closed/collapsed
 * it (or if VS Code disposed the webview for memory reasons), the
 * next `postMessage()` call sent the message to a dead webview
 * reference — the message was silently dropped, the Results panel
 * stayed empty, the user saw "tool completed" but no chart.
 *
 * Fix:
 *   1. Register with `retainContextWhenHidden: true` so collapse
 *      does not dispose the webview.
 *   2. Register `onDidDispose` to reset `_view = undefined` and
 *      `_isReady = false` on every actual dispose.
 *
 * This test validates the `onDidDispose` half of the fix.  It mocks
 * a WebviewView, drives the provider through a full resolve → post
 * → dispose → resolve → post cycle, and asserts that:
 *
 *   a) Messages posted before ready are queued.
 *   b) `results:webviewReady` flushes the queue to the webview.
 *   c) Dispose resets the ready state.
 *   d) After dispose, new messages queue until the NEXT resolve.
 *   e) The NEXT resolve delivers the queued messages to the NEW webview.
 *
 * Feature: 178-vscode-tabular-results
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { ResultsPanelViewProvider } from '../../src/views/resultsPanelView';
import type { ResultsPanelService } from '../../src/services/resultsPanelService';

/** Build a mocked WebviewView whose postMessage captures into an array. */
function buildMockWebviewView(): {
  view: vscode.WebviewView;
  posted: Array<Record<string, unknown>>;
  triggerDispose: () => void;
  triggerReceive: (msg: unknown) => void;
} {
  const posted: Array<Record<string, unknown>> = [];
  let disposeHandler: (() => void) | undefined;
  let messageHandler: ((msg: unknown) => void) | undefined;

  const webview = {
    html: '',
    options: {},
    cspSource: 'vscode-webview://mock',
    asWebviewUri: (uri: vscode.Uri): vscode.Uri => uri,
    postMessage: vi.fn(async (msg: Record<string, unknown>) => {
      posted.push(msg);
      return true;
    }),
    onDidReceiveMessage: vi.fn((cb: (msg: unknown) => void) => {
      messageHandler = cb;
      return { dispose: () => {} };
    }),
  };

  const view = {
    webview,
    visible: true,
    onDidDispose: vi.fn((cb: () => void) => {
      disposeHandler = cb;
      return { dispose: () => {} };
    }),
    onDidChangeVisibility: vi.fn(() => ({ dispose: () => {} })),
    show: vi.fn(),
  } as unknown as vscode.WebviewView;

  return {
    view,
    posted,
    triggerDispose: () => disposeHandler?.(),
    triggerReceive: (msg: unknown) => messageHandler?.(msg),
  };
}

describe('ResultsPanelViewProvider — lifecycle handling (Feature 178)', () => {
  let provider: ResultsPanelViewProvider;
  let serviceStub: ResultsPanelService;

  beforeEach(() => {
    provider = new ResultsPanelViewProvider(vscode.Uri.file('/mock/ext'));
    serviceStub = {
      handleSave: vi.fn(),
      handleSaveAs: vi.fn(),
      handleRetry: vi.fn(),
      handleCloseTab: vi.fn(),
    } as unknown as ResultsPanelService;
    provider.setService(serviceStub);
  });

  it('queues messages sent before resolveWebviewView', () => {
    provider.postMessage({ type: 'results:setVisibility', payload: { visible: true } });
    provider.postMessage({ type: 'results:setTabs', payload: { tabs: [], activeTabId: null } });

    // No webview yet — messages must still have been accepted.
    // We can't directly inspect _pendingMessages, but we can verify
    // that after resolve + ready, they get flushed.
    const mock = buildMockWebviewView();
    provider.resolveWebviewView(mock.view, {} as vscode.WebviewViewResolveContext, {} as vscode.CancellationToken);

    // Before ready: no messages posted yet.
    expect(mock.posted).toHaveLength(0);

    // Simulate the React app posting results:webviewReady.
    mock.triggerReceive({ type: 'results:webviewReady' });

    // Queue flushed — both pre-resolve messages should now be delivered.
    expect(mock.posted).toHaveLength(2);
    expect(mock.posted[0]).toMatchObject({ type: 'results:setVisibility' });
    expect(mock.posted[1]).toMatchObject({ type: 'results:setTabs' });
  });

  it('delivers messages directly once _isReady is true', () => {
    const mock = buildMockWebviewView();
    provider.resolveWebviewView(mock.view, {} as vscode.WebviewViewResolveContext, {} as vscode.CancellationToken);
    mock.triggerReceive({ type: 'results:webviewReady' });

    mock.posted.length = 0; // clear post-ready baseline

    provider.postMessage({ type: 'results:setTabs', payload: { tabs: [], activeTabId: null } });
    expect(mock.posted).toHaveLength(1);
    expect(mock.posted[0]).toMatchObject({ type: 'results:setTabs' });
  });

  it('resets _view and _isReady on onDidDispose (the user-reported bug)', () => {
    const mock1 = buildMockWebviewView();
    provider.resolveWebviewView(mock1.view, {} as vscode.WebviewViewResolveContext, {} as vscode.CancellationToken);
    mock1.triggerReceive({ type: 'results:webviewReady' });

    // Baseline: subsequent postMessage delivers directly.
    mock1.posted.length = 0;
    provider.postMessage({ type: 'results:setTabs', payload: { tabs: [], activeTabId: null } });
    expect(mock1.posted).toHaveLength(1);

    // VS Code disposes the webview (simulating panel close or extension reload).
    mock1.triggerDispose();

    // Next postMessage must NOT go to the stale webview — instead it
    // should queue.  The old mock should receive nothing new.
    mock1.posted.length = 0;
    provider.postMessage({ type: 'results:setVisibility', payload: { visible: true } });
    provider.postMessage({ type: 'results:setTabs', payload: { tabs: [{ id: 'tab-1' }], activeTabId: 'tab-1' } });
    expect(mock1.posted).toHaveLength(0); // Old webview got nothing

    // When a NEW webview is resolved (via the next reveal / focus
    // command cycle), the queued messages must flush to the new one.
    const mock2 = buildMockWebviewView();
    provider.resolveWebviewView(mock2.view, {} as vscode.WebviewViewResolveContext, {} as vscode.CancellationToken);
    mock2.triggerReceive({ type: 'results:webviewReady' });

    expect(mock2.posted).toHaveLength(2);
    expect(mock2.posted[0]).toMatchObject({ type: 'results:setVisibility' });
    expect(mock2.posted[1]).toMatchObject({
      type: 'results:setTabs',
      payload: { activeTabId: 'tab-1' },
    });
  });

  it('registers onDidDispose on every resolveWebviewView call', () => {
    const mock1 = buildMockWebviewView();
    provider.resolveWebviewView(mock1.view, {} as vscode.WebviewViewResolveContext, {} as vscode.CancellationToken);
    expect(mock1.view.onDidDispose).toHaveBeenCalledTimes(1);

    const mock2 = buildMockWebviewView();
    provider.resolveWebviewView(mock2.view, {} as vscode.WebviewViewResolveContext, {} as vscode.CancellationToken);
    expect(mock2.view.onDidDispose).toHaveBeenCalledTimes(1);
  });

  it('routes incoming results:save to the service', () => {
    const mock = buildMockWebviewView();
    provider.resolveWebviewView(mock.view, {} as vscode.WebviewViewResolveContext, {} as vscode.CancellationToken);

    mock.triggerReceive({ type: 'results:save', payload: { tabId: 'tab-1' } });
    expect(serviceStub.handleSave).toHaveBeenCalledWith('tab-1');
  });
});
