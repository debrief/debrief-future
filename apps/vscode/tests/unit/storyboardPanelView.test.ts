/**
 * @vitest-environment jsdom
 *
 * Unit tests for `StoryboardPanelViewProvider` (Feature 216, T302/T319).
 *
 * Covers computeSceneRowViewModels ordering, refresh → scenes post, and the
 * webview → extension message routing (ready, capture-clicked, scene-row-clicked, log).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { StoryboardPanelViewProvider } from '../../src/views/storyboardPanelView';
import type { SessionManager } from '../../src/services/sessionManager';
import type { MapPanel } from '../../src/webview/mapPanel';
import type { DebriefFeature } from '@debrief/components';

const extensionUri = { fsPath: '/ext', scheme: 'file', path: '/ext' } as unknown as vscode.Uri;

function makeSessionManager(): SessionManager {
  const disposables: (() => void)[] = [];
  return {
    onActiveSessionChange: (listener: () => void) => {
      disposables.push(listener);
      return { dispose: () => undefined };
    },
    getActiveSession: () => null,
    actor: 'test-actor',
  } as unknown as SessionManager;
}

function storyboardFeature(id: string, name: string): DebriefFeature {
  return {
    type: 'Feature',
    id,
    geometry: { type: 'Polygon', coordinates: [] },
    properties: {
      kind: 'STORYBOARD',
      id,
      name,
      schema_version: 1,
    },
  } as unknown as DebriefFeature;
}

function sceneFeature(
  id: string,
  storyboardId: string,
  timestamp: string,
): DebriefFeature {
  return {
    type: 'Feature',
    id,
    geometry: { type: 'Polygon', coordinates: [] },
    properties: {
      kind: 'STORYBOARD_SCENE',
      id,
      storyboard_id: storyboardId,
      title: `Title for ${id}`,
      timestamp,
      viewport: { center: [0, 0], zoom: 8, bearing: 0 },
      visible_feature_ids: [],
      feature_set_hash: 'abc',
      thumbnail_asset_ref: `scene-thumbnail-${id}`,
      transition_duration_ms: 500,
    },
  } as unknown as DebriefFeature;
}

function makeMapPanelStub(features: DebriefFeature[]): MapPanel {
  return {
    getCurrentFeatures: () => features.slice(),
    getCurrentPlot: () => ({
      id: 'plot-1',
      title: 'Test',
      datetime: '',
      itemPath: 'test/item.json',
      catalogId: 'cat',
      bbox: [-10, -10, 10, 10],
      timeExtent: ['a', 'b'],
      trackCount: 0,
      locationCount: 0,
    }),
    getCurrentStore: () => ({ path: '/store', id: 'store-1' }),
  } as unknown as MapPanel;
}

function makeWebview(): {
  webview: vscode.Webview;
  posts: unknown[];
  handler: ((msg: unknown) => void) | null;
} {
  const posts: unknown[] = [];
  let handler: ((msg: unknown) => void) | null = null;
  const webview = {
    cspSource: 'vscode-resource:',
    asWebviewUri: (uri: { fsPath: string }) => ({
      toString: () => `webview://${uri.fsPath}`,
    }),
    options: {},
    html: '',
    postMessage: vi.fn((m: unknown) => {
      posts.push(m);
      return Promise.resolve(true);
    }),
    onDidReceiveMessage: (cb: (msg: unknown) => void) => {
      handler = cb;
      return { dispose: () => undefined };
    },
  } as unknown as vscode.Webview;
  return {
    webview,
    posts,
    get handler() {
      return handler;
    },
  } as unknown as {
    webview: vscode.Webview;
    posts: unknown[];
    handler: ((msg: unknown) => void) | null;
  };
}

function resolveView(
  provider: StoryboardPanelViewProvider,
  webview: vscode.Webview,
): {
  dispose: () => void;
  messageHandler: ((msg: unknown) => void) | null;
} {
  let mh: ((msg: unknown) => void) | null = null;
  const view = {
    webview: {
      ...webview,
      onDidReceiveMessage: (cb: (msg: unknown) => void) => {
        mh = cb;
        return { dispose: () => undefined };
      },
    },
    onDidDispose: () => ({ dispose: () => undefined }),
  } as unknown as vscode.WebviewView;
  provider.resolveWebviewView(
    view,
    {} as vscode.WebviewViewResolveContext,
    {} as vscode.CancellationToken,
  );
  return {
    dispose: () => undefined,
    get messageHandler() {
      return mh;
    },
  } as unknown as {
    dispose: () => void;
    messageHandler: ((msg: unknown) => void) | null;
  };
}

describe('StoryboardPanelViewProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('posts scenes message after ready, ordered by timestamp ascending', () => {
    const sessionManager = makeSessionManager();
    const features: DebriefFeature[] = [
      storyboardFeature('sb-1', 'Alpha'),
      sceneFeature('sc-c', 'sb-1', '2026-04-20T14:35:00.000Z'),
      sceneFeature('sc-a', 'sb-1', '2026-04-20T14:05:00.000Z'),
      sceneFeature('sc-b', 'sb-1', '2026-04-20T14:20:00.000Z'),
    ];
    const provider = new StoryboardPanelViewProvider(extensionUri, sessionManager);
    provider.setMapPanelResolver(() => makeMapPanelStub(features));
    const { webview, posts } = makeWebview();
    const { messageHandler } = resolveView(provider, webview);
    messageHandler?.({ type: 'ready' });

    const scenesMsg = posts.find(
      (p): p is { type: 'scenes'; scenes: Array<{ sceneId: string }>; activeStoryboardName: string } =>
        (p as { type?: string }).type === 'scenes',
    );
    expect(scenesMsg).toBeDefined();
    expect(scenesMsg!.activeStoryboardName).toBe('Alpha');
    expect(scenesMsg!.scenes.map((s) => s.sceneId)).toEqual(['sc-a', 'sc-b', 'sc-c']);
  });

  it('emits an empty scene list when no Storyboard exists', () => {
    const sessionManager = makeSessionManager();
    const provider = new StoryboardPanelViewProvider(extensionUri, sessionManager);
    provider.setMapPanelResolver(() => makeMapPanelStub([]));
    const { webview, posts } = makeWebview();
    const { messageHandler } = resolveView(provider, webview);
    messageHandler?.({ type: 'ready' });
    const scenesMsg = posts.find(
      (p): p is {
        type: 'scenes';
        scenes: Array<{ sceneId: string }>;
        activeStoryboardName: string | null;
      } => (p as { type?: string }).type === 'scenes',
    );
    expect(scenesMsg).toBeDefined();
    expect(scenesMsg!.scenes).toHaveLength(0);
    expect(scenesMsg!.activeStoryboardName).toBeNull();
  });

  it('capture-clicked forwards to debrief.captureScene via executeCommand', () => {
    const sessionManager = makeSessionManager();
    const provider = new StoryboardPanelViewProvider(extensionUri, sessionManager);
    provider.setMapPanelResolver(() => makeMapPanelStub([]));
    const { webview } = makeWebview();
    const { messageHandler } = resolveView(provider, webview);
    messageHandler?.({ type: 'ready' });
    (vscode.commands.executeCommand as ReturnType<typeof vi.fn>).mockClear();
    messageHandler?.({ type: 'capture-clicked' });
    expect(vscode.commands.executeCommand).toHaveBeenCalledWith('debrief.captureScene');
  });

  it('scene-row-clicked is a no-op in #216 and does not execute any command', () => {
    const sessionManager = makeSessionManager();
    const provider = new StoryboardPanelViewProvider(extensionUri, sessionManager);
    provider.setMapPanelResolver(() => makeMapPanelStub([]));
    const { webview } = makeWebview();
    const { messageHandler } = resolveView(provider, webview);
    messageHandler?.({ type: 'ready' });
    (vscode.commands.executeCommand as ReturnType<typeof vi.fn>).mockClear();
    messageHandler?.({ type: 'scene-row-clicked', sceneId: 'sc-1' });
    expect(vscode.commands.executeCommand).not.toHaveBeenCalled();
  });

  it('setCaptureInFlight posts the captureInFlight message', async () => {
    const sessionManager = makeSessionManager();
    const provider = new StoryboardPanelViewProvider(extensionUri, sessionManager);
    provider.setMapPanelResolver(() => makeMapPanelStub([]));
    const { webview, posts } = makeWebview();
    const { messageHandler } = resolveView(provider, webview);
    messageHandler?.({ type: 'ready' });
    provider.setCaptureInFlight(true);
    provider.setCaptureInFlight(false);
    const flightMsgs = posts.filter(
      (p): p is { type: 'captureInFlight'; inFlight: boolean } =>
        (p as { type?: string }).type === 'captureInFlight',
    );
    expect(flightMsgs).toEqual([
      { type: 'captureInFlight', inFlight: true },
      { type: 'captureInFlight', inFlight: false },
    ]);
  });

  it('thumbnailHref is a webview-resolved URI, not a raw filesystem path', () => {
    const sessionManager = makeSessionManager();
    const features: DebriefFeature[] = [
      storyboardFeature('sb-1', 'Alpha'),
      sceneFeature('sc-a', 'sb-1', '2026-04-20T14:05:00.000Z'),
    ];
    const provider = new StoryboardPanelViewProvider(extensionUri, sessionManager);
    provider.setMapPanelResolver(() => makeMapPanelStub(features));
    const { webview, posts } = makeWebview();
    const { messageHandler } = resolveView(provider, webview);
    messageHandler?.({ type: 'ready' });
    const scenesMsg = posts.find(
      (p): p is { type: 'scenes'; scenes: Array<{ thumbnailHref: string }> } =>
        (p as { type?: string }).type === 'scenes',
    );
    expect(scenesMsg!.scenes[0]!.thumbnailHref).toBe(
      'webview:///store/test/scene-thumbnails/scene-sc-a.png',
    );
    expect(scenesMsg!.scenes[0]!.thumbnailHref).not.toMatch(/^\//);
  });

  it('buffers extension messages until the webview sends ready', () => {
    const sessionManager = makeSessionManager();
    const provider = new StoryboardPanelViewProvider(extensionUri, sessionManager);
    provider.setMapPanelResolver(() => makeMapPanelStub([]));
    const { webview, posts } = makeWebview();
    const { messageHandler } = resolveView(provider, webview);
    provider.setCaptureInFlight(true);
    expect(posts).toHaveLength(0);
    messageHandler?.({ type: 'ready' });
    const flightMsgs = posts.filter(
      (p) => (p as { type?: string }).type === 'captureInFlight',
    );
    expect(flightMsgs).toHaveLength(1);
  });

  it('log messages from the webview are handled without crashing', () => {
    const sessionManager = makeSessionManager();
    const provider = new StoryboardPanelViewProvider(extensionUri, sessionManager);
    provider.setMapPanelResolver(() => makeMapPanelStub([]));
    const { webview } = makeWebview();
    const { messageHandler } = resolveView(provider, webview);
    messageHandler?.({ type: 'ready' });
    expect(() =>
      messageHandler?.({ type: 'log', level: 'warn', message: 'hello' }),
    ).not.toThrow();
  });
});
