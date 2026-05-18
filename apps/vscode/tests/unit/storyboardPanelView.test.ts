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

function makeSessionManager(activeDocumentUri: string | null = null): SessionManager {
  const disposables: (() => void)[] = [];
  return {
    onActiveSessionChange: (listener: () => void) => {
      disposables.push(listener);
      return { dispose: () => undefined };
    },
    getActiveSession: () => null,
    getActiveDocumentUri: () => activeDocumentUri,
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
      schema_version: 2,
    },
  } as unknown as DebriefFeature;
}

let _sceneFeatureCounter = 0;
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
      creation_order: _sceneFeatureCounter++,
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

  it('scene-row-clicked dispatches debrief.storyboard.clickScene (#217 — behaviour changed from #216 no-op)', () => {
    const sessionManager = makeSessionManager();
    const provider = new StoryboardPanelViewProvider(extensionUri, sessionManager);
    provider.setMapPanelResolver(() => makeMapPanelStub([]));
    const { webview } = makeWebview();
    const { messageHandler } = resolveView(provider, webview);
    messageHandler?.({ type: 'ready' });
    (vscode.commands.executeCommand as ReturnType<typeof vi.fn>).mockClear();
    messageHandler?.({ type: 'scene-row-clicked', sceneId: 'sc-1' });
    expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
      'debrief.storyboard.clickScene',
      'sc-1',
    );
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

// ─── Edit-suite dispatcher (Feature 218 — T067) ─────────────────────────

describe('StoryboardPanelViewProvider — edit dispatcher', () => {
  const DOC = 'file:///tmp/plot.geojson';

  function makeEditServiceMock() {
    return {
      activate: vi.fn(() => ({ dispose: vi.fn() })),
      dispose: vi.fn(),
      setPanelSink: vi.fn(),
      setLogService: vi.fn(),
      setMapPanel: vi.fn(),
      setSessionManager: vi.fn(),
      setThumbnailService: vi.fn(),
      renameScene: vi.fn().mockResolvedValue({ kind: 'ok' }),
      describeScene: vi.fn().mockResolvedValue({ kind: 'ok' }),
      deleteScene: vi.fn().mockResolvedValue({ kind: 'ok' }),
      undoDeleteScene: vi.fn().mockResolvedValue({ kind: 'ok' }),
      renameStoryboard: vi.fn().mockResolvedValue({ kind: 'ok' }),
      describeStoryboard: vi.fn().mockResolvedValue({ kind: 'ok' }),
      openSceneForMissingDataEdit: vi.fn().mockResolvedValue(undefined),
    };
  }

  function setupDispatcher() {
    const sessionManager = makeSessionManager(DOC);
    const provider = new StoryboardPanelViewProvider(extensionUri, sessionManager);
    provider.setMapPanelResolver(() => makeMapPanelStub([]));
    const svcMock = makeEditServiceMock();
    // setEditService signature accepts StoryboardEditService; we pass a
    // structural mock — cast once at the boundary.
    provider.setEditService(svcMock as unknown as Parameters<typeof provider.setEditService>[0]);
    const { webview } = makeWebview();
    const { messageHandler } = resolveView(provider, webview);
    messageHandler?.({ type: 'ready' });
    return { messageHandler, svcMock };
  }

  it('scene-title-rename-committed → editService.renameScene', async () => {
    const { messageHandler, svcMock } = setupDispatcher();
    messageHandler?.({
      type: 'scene-title-rename-committed',
      sceneId: 's-1',
      newTitle: 'New Title',
    });
    await new Promise((r) => setImmediate(r));
    expect(svcMock.renameScene).toHaveBeenCalledWith(
      expect.objectContaining({ documentUri: DOC, sceneId: 's-1', newTitle: 'New Title' }),
    );
  });

  it('scene-description-edit-submitted → editService.describeScene', async () => {
    const { messageHandler, svcMock } = setupDispatcher();
    messageHandler?.({
      type: 'scene-description-edit-submitted',
      sceneId: 's-1',
      description: '# Notes',
    });
    await new Promise((r) => setImmediate(r));
    expect(svcMock.describeScene).toHaveBeenCalledWith(
      expect.objectContaining({ documentUri: DOC, sceneId: 's-1', description: '# Notes' }),
    );
  });

  it('scene-delete-requested → editService.deleteScene', async () => {
    const { messageHandler, svcMock } = setupDispatcher();
    messageHandler?.({ type: 'scene-delete-requested', sceneId: 's-1' });
    await new Promise((r) => setImmediate(r));
    expect(svcMock.deleteScene).toHaveBeenCalledWith(
      expect.objectContaining({ documentUri: DOC, sceneId: 's-1' }),
    );
  });

  it('scene-undo-delete-clicked → editService.undoDeleteScene', async () => {
    const { messageHandler, svcMock } = setupDispatcher();
    messageHandler?.({ type: 'scene-undo-delete-clicked', sceneId: 's-1' });
    await new Promise((r) => setImmediate(r));
    expect(svcMock.undoDeleteScene).toHaveBeenCalledWith(
      expect.objectContaining({ documentUri: DOC, sceneId: 's-1' }),
    );
  });

  it('storyboard-name-rename-committed → editService.renameStoryboard', async () => {
    const { messageHandler, svcMock } = setupDispatcher();
    messageHandler?.({
      type: 'storyboard-name-rename-committed',
      storyboardId: 'sb-1',
      newName: 'Renamed',
    });
    await new Promise((r) => setImmediate(r));
    expect(svcMock.renameStoryboard).toHaveBeenCalledWith(
      expect.objectContaining({ documentUri: DOC, storyboardId: 'sb-1', newName: 'Renamed' }),
    );
  });

  it('storyboard-description-edit-submitted → editService.describeStoryboard', async () => {
    const { messageHandler, svcMock } = setupDispatcher();
    messageHandler?.({
      type: 'storyboard-description-edit-submitted',
      storyboardId: 'sb-1',
      description: 'Notes',
    });
    await new Promise((r) => setImmediate(r));
    expect(svcMock.describeStoryboard).toHaveBeenCalledWith(
      expect.objectContaining({ documentUri: DOC, storyboardId: 'sb-1', description: 'Notes' }),
    );
  });

  it('scene-update-to-current-clicked → executes debrief.storyboard.updateSceneToCurrent command', async () => {
    const execSpy = vi
      .spyOn(vscode.commands, 'executeCommand')
      .mockResolvedValue(undefined as never);
    const { messageHandler } = setupDispatcher();
    execSpy.mockClear();
    messageHandler?.({ type: 'scene-update-to-current-clicked', sceneId: 's-1' });
    expect(execSpy).toHaveBeenCalledWith('debrief.storyboard.updateSceneToCurrent', {
      sceneId: 's-1',
    });
    execSpy.mockRestore();
  });

  it('scene-duplicate-clicked → executes debrief.storyboard.duplicateScene command', async () => {
    const execSpy = vi
      .spyOn(vscode.commands, 'executeCommand')
      .mockResolvedValue(undefined as never);
    const { messageHandler } = setupDispatcher();
    execSpy.mockClear();
    messageHandler?.({ type: 'scene-duplicate-clicked', sceneId: 's-1' });
    expect(execSpy).toHaveBeenCalledWith('debrief.storyboard.duplicateScene', {
      sceneId: 's-1',
    });
    execSpy.mockRestore();
  });

  it('scene-copy-to-other-clicked → executes debrief.storyboard.copySceneToOtherStoryboard', async () => {
    const execSpy = vi
      .spyOn(vscode.commands, 'executeCommand')
      .mockResolvedValue(undefined as never);
    const { messageHandler } = setupDispatcher();
    execSpy.mockClear();
    messageHandler?.({ type: 'scene-copy-to-other-clicked', sceneId: 's-1' });
    expect(execSpy).toHaveBeenCalledWith(
      'debrief.storyboard.copySceneToOtherStoryboard',
      { sceneId: 's-1' },
    );
    execSpy.mockRestore();
  });

  it('scene-refresh-thumbnail-clicked → executes refreshSceneThumbnail command', async () => {
    const execSpy = vi
      .spyOn(vscode.commands, 'executeCommand')
      .mockResolvedValue(undefined as never);
    const { messageHandler } = setupDispatcher();
    execSpy.mockClear();
    messageHandler?.({ type: 'scene-refresh-thumbnail-clicked', sceneId: 's-1' });
    expect(execSpy).toHaveBeenCalledWith('debrief.storyboard.refreshSceneThumbnail', {
      sceneId: 's-1',
    });
    execSpy.mockRestore();
  });

  it('storyboard-refresh-all-stale-clicked → executes refreshAllStaleThumbnails command', async () => {
    const execSpy = vi
      .spyOn(vscode.commands, 'executeCommand')
      .mockResolvedValue(undefined as never);
    const { messageHandler } = setupDispatcher();
    execSpy.mockClear();
    messageHandler?.({
      type: 'storyboard-refresh-all-stale-clicked',
      storyboardId: 'sb-1',
    });
    expect(execSpy).toHaveBeenCalledWith(
      'debrief.storyboard.refreshAllStaleThumbnails',
      { storyboardId: 'sb-1' },
    );
    execSpy.mockRestore();
  });

  it('setEditService installs the panel as the service sink (panel.post flows back to webview)', () => {
    const sessionManager = makeSessionManager(DOC);
    const provider = new StoryboardPanelViewProvider(extensionUri, sessionManager);
    provider.setMapPanelResolver(() => makeMapPanelStub([]));
    const svcMock = makeEditServiceMock();
    provider.setEditService(svcMock as unknown as Parameters<typeof provider.setEditService>[0]);
    expect(svcMock.setPanelSink).toHaveBeenCalledTimes(1);
    const sinkArg = svcMock.setPanelSink.mock.calls[0]![0] as { postMessage: (m: unknown) => void };
    expect(typeof sinkArg.postMessage).toBe('function');
  });
});
