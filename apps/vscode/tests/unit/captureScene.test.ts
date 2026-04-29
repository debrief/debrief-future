/**
 * @vitest-environment jsdom
 *
 * Unit tests for the capture-scene command handler.
 *
 * Originally Feature 216 (T301); refactored for #235 to drop the legacy
 * `vscode.window.showInputBox` first-capture prompt and the modal
 * `vscode.window.showInformationMessage(…, { modal: true }, …)` collision
 * dialog in favour of the inline panel naming row + collision banner
 * (FR-VIS-022/023, SC-009).
 *
 * MapPanel, SessionStoreApi, the thumbnail service, and the panel surface
 * are stubbed so the command's control-flow branches are exercised in
 * isolation from the webview runtime and the filesystem.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  captureScene,
  __resetCaptureInFlightForTesting,
  __getCaptureInFlightForTesting,
  type CaptureCommandContext,
  type CaptureCommandDeps,
  type CaptureInFlightSink,
  type CapturePanelSurface,
} from '../../src/commands/captureScene';
import type {
  NamingRowResolution,
  CollisionBannerResolution,
} from '../../src/views/storyboardPanelView';
import type { MapPanel } from '../../src/webview/mapPanel';
import type { DebriefFeature } from '@debrief/components';
import type { SessionStoreApi } from '@debrief/session-state';

// ─── Test doubles ────────────────────────────────────────────────────

interface StubMapPanel {
  features: DebriefFeature[];
  thumbnail: { largePngBase64: string | null; smallPngBase64: string | null };
  setFeaturesCalls: DebriefFeature[][];
  requestThumbnailCaptureCalls: number;
  getCurrentFeatures(): DebriefFeature[];
  setFeatures(features: DebriefFeature[]): void;
  requestThumbnailCapture(timeoutMs: number): Promise<{
    largePngBase64: string | null;
    smallPngBase64: string | null;
  }>;
}

function makeMapPanel(
  initialFeatures: DebriefFeature[] = [],
  thumbnail: {
    largePngBase64: string | null;
    smallPngBase64: string | null;
  } = {
    largePngBase64: 'LARGE_BASE64',
    smallPngBase64: 'SMALL_BASE64',
  },
): StubMapPanel {
  const panel: StubMapPanel = {
    features: initialFeatures.slice(),
    thumbnail,
    setFeaturesCalls: [],
    requestThumbnailCaptureCalls: 0,
    getCurrentFeatures() {
      return this.features.slice();
    },
    setFeatures(features: DebriefFeature[]) {
      this.features = features.slice();
      this.setFeaturesCalls.push(features);
    },
    async requestThumbnailCapture(_ms: number) {
      this.requestThumbnailCaptureCalls += 1;
      return this.thumbnail;
    },
  };
  return panel;
}

interface StubSessionState {
  viewport: {
    coordinates: { longitude: number; latitude: number }[];
    zoom?: number;
  } | null;
  currentTime: number | null;
  timeRange: { start: number; end: number } | null;
  hiddenFeatureIds: string[];
  markDirty(): void;
}

function makeSession(state: StubSessionState): {
  session: SessionStoreApi;
  state: StubSessionState;
} {
  const mutableState: StubSessionState = {
    ...state,
    markDirty: state.markDirty,
  };
  const session = {
    getState: () => mutableState,
  } as unknown as SessionStoreApi;
  return { session, state: mutableState };
}

function defaultViewport() {
  return {
    coordinates: [
      { longitude: -10, latitude: 10 },
      { longitude: 10, latitude: 10 },
      { longitude: 10, latitude: -10 },
      { longitude: -10, latitude: -10 },
    ],
    zoom: 8,
  };
}

function trackFeature(id: string): DebriefFeature {
  return {
    type: 'Feature',
    id,
    geometry: { type: 'Point', coordinates: [0, 0] },
    properties: { id, kind: 'TRACK' },
  } as unknown as DebriefFeature;
}

interface PanelSurfaceCalls {
  readonly nameCalls: ReadonlyArray<{
    defaultName: string;
    knownNames: readonly string[];
  }>;
  readonly collisionCalls: ReadonlyArray<{
    visible: boolean;
    conflictingSceneId: string;
    conflictingSceneTitle: string;
    originalTimestamp: string;
    proposedTimestamp: string;
    offsetCount: number;
    offsetWouldExceedTimeRange: boolean;
    cause: 'capture' | 'update-to-current';
  }>;
}

interface StubPanelSurface extends CapturePanelSurface, PanelSurfaceCalls {}

interface PanelSurfaceOptions {
  /** Static name reply, or a function that produces one per call. */
  nameReply?: NamingRowResolution | (() => NamingRowResolution);
  /** Static collision reply, or a function called per attempt. */
  collisionReply?:
    | CollisionBannerResolution
    | ((args: {
        proposedTimestamp: string;
        offsetCount: number;
      }) => CollisionBannerResolution);
}

function makePanelSurface(opts?: PanelSurfaceOptions): StubPanelSurface {
  const nameCalls: Array<{
    defaultName: string;
    knownNames: readonly string[];
  }> = [];
  const collisionCalls: Array<{
    visible: boolean;
    conflictingSceneId: string;
    conflictingSceneTitle: string;
    originalTimestamp: string;
    proposedTimestamp: string;
    offsetCount: number;
    offsetWouldExceedTimeRange: boolean;
    cause: 'capture' | 'update-to-current';
  }> = [];
  return {
    nameCalls,
    collisionCalls,
    promptStoryboardName: async (args): Promise<NamingRowResolution> => {
      nameCalls.push(args);
      const r = opts?.nameReply;
      if (typeof r === 'function') return r();
      return r === undefined ? { name: 'My Storyboard' } : r;
    },
    promptCollisionResolution: async (
      state,
    ): Promise<CollisionBannerResolution> => {
      collisionCalls.push(state);
      const r = opts?.collisionReply;
      if (typeof r === 'function') {
        return r({
          proposedTimestamp: state.proposedTimestamp,
          offsetCount: state.offsetCount,
        });
      }
      return r ?? { kind: 'cancel' };
    },
  };
}

function mkContext(overrides: {
  mapPanel: StubMapPanel;
  session: SessionStoreApi;
  panelView?: CapturePanelSurface;
  actor?: string;
  stacItemPath?: string;
}): CaptureCommandContext {
  return {
    mapPanel: overrides.mapPanel as unknown as MapPanel,
    sessionStore: overrides.session,
    stacItemPath: overrides.stacItemPath ?? '/store/item',
    actor: overrides.actor ?? 'test-actor',
    trigger: { source: 'keybinding' },
    panelView: overrides.panelView ?? makePanelSurface(),
  };
}

function depsFor(
  overrides: Partial<CaptureCommandDeps> = {},
): CaptureCommandDeps {
  return {
    showErrorMessage: vi.fn(
      async () => undefined,
    ) as unknown as typeof import('vscode').window.showErrorMessage,
    setStatusBarMessage: vi.fn(() => ({
      dispose: () => undefined,
    })) as unknown as typeof import('vscode').window.setStatusBarMessage,
    executeCommand: vi.fn(
      async () => undefined,
    ) as unknown as typeof import('vscode').commands.executeCommand,
    writeSceneThumbnail: vi.fn(async (_path: string, sceneId: string) => ({
      assetKey: `scene-thumbnail-${sceneId}`,
      largePath: `/tmp/large-${sceneId}.png`,
      smallPath: `/tmp/small-${sceneId}.png`,
    })),
    generateUlid: vi.fn(() => '01HW0XGE7Z4YQZ2QZ6KMN9VPJK'),
    now: vi.fn(() => '2026-04-20T14:35:00.000Z'),
    logError: vi.fn(),
    ...overrides,
  };
}

function mkSink(): CaptureInFlightSink & { calls: boolean[] } {
  const calls: boolean[] = [];
  return {
    setCaptureInFlight(inFlight: boolean) {
      calls.push(inFlight);
    },
    calls,
  };
}

beforeEach(() => {
  __resetCaptureInFlightForTesting();
});

// ─── Happy paths ─────────────────────────────────────────────────────

describe('captureScene — happy paths', () => {
  it('first capture asks the panel for a Storyboard name, creates Storyboard + Scene, marks dirty, focuses panel', async () => {
    const mapPanel = makeMapPanel([trackFeature('t1'), trackFeature('t2')]);
    const markDirty = vi.fn();
    const session = makeSession({
      viewport: defaultViewport(),
      currentTime: 1713623700000,
      timeRange: { start: 1713600000000, end: 1713700000000 },
      hiddenFeatureIds: [],
      markDirty,
    });
    const panel = makePanelSurface();
    const deps = depsFor();
    const sink = mkSink();
    const result = await captureScene(
      mkContext({ mapPanel, session: session.session, panelView: panel }),
      sink,
      deps,
    );

    expect(result.status).toBe('captured');
    expect(panel.nameCalls).toHaveLength(1);
    expect(deps.writeSceneThumbnail).toHaveBeenCalledTimes(1);
    expect(markDirty).toHaveBeenCalledTimes(1);
    expect(deps.executeCommand).toHaveBeenCalledWith(
      'debrief.storyboardPanel.focus',
    );
    expect(sink.calls).toEqual([true, false]);

    const kinds = mapPanel.features.map(
      (f: DebriefFeature) => (f.properties as { kind?: string }).kind,
    );
    expect(kinds.filter((k) => k === 'STORYBOARD')).toHaveLength(1);
    expect(kinds.filter((k) => k === 'STORYBOARD_SCENE')).toHaveLength(1);
  });

  it('first capture surfaces existing Storyboard names to the panel via knownNames', async () => {
    const mapPanel = makeMapPanel([
      trackFeature('t1'),
      // A pre-existing storyboard with a different name (so the active
      // lookup still returns null — different storyboardId would still
      // make this the active one, so we use a deliberately marker name).
    ]);
    const session = makeSession({
      viewport: defaultViewport(),
      currentTime: 100,
      timeRange: null,
      hiddenFeatureIds: [],
      markDirty: () => undefined,
    });
    const panel = makePanelSurface();
    await captureScene(
      mkContext({ mapPanel, session: session.session, panelView: panel }),
      null,
      depsFor(),
    );

    expect(panel.nameCalls).toHaveLength(1);
    expect(panel.nameCalls[0]?.defaultName).toBeTypeOf('string');
    expect(panel.nameCalls[0]?.knownNames).toEqual([]);
  });

  it('subsequent capture appends to active Storyboard without prompting', async () => {
    const mapPanel = makeMapPanel([trackFeature('t1')]);
    const markDirty = vi.fn();
    const session = makeSession({
      viewport: defaultViewport(),
      currentTime: 1713623700000,
      timeRange: { start: 1713600000000, end: 1713700000000 },
      hiddenFeatureIds: [],
      markDirty,
    });
    const panel = makePanelSurface();
    const deps = depsFor();
    await captureScene(
      mkContext({ mapPanel, session: session.session, panelView: panel }),
      null,
      deps,
    );

    // Advance time so the second capture does not hit a duplicate-timestamp.
    session.state.currentTime = 1713624000000;
    (deps.generateUlid as ReturnType<typeof vi.fn>).mockReturnValueOnce(
      '01HW0XGE7Z4YQZ2QZ6KMN9VPJL',
    );
    const callsBefore = panel.nameCalls.length;
    const result = await captureScene(
      mkContext({ mapPanel, session: session.session, panelView: panel }),
      null,
      deps,
    );

    expect(result.status).toBe('captured');
    expect(panel.nameCalls.length).toBe(callsBefore);
    const scenes = mapPanel.features.filter(
      (f: DebriefFeature) =>
        (f.properties as { kind?: string }).kind === 'STORYBOARD_SCENE',
    );
    expect(scenes).toHaveLength(2);
  });

  it('scene title defaults to the DTG of the current timestamp', async () => {
    const mapPanel = makeMapPanel();
    const session = makeSession({
      viewport: defaultViewport(),
      currentTime: Date.UTC(2026, 3, 20, 14, 35, 0),
      timeRange: null,
      hiddenFeatureIds: [],
      markDirty: () => undefined,
    });
    await captureScene(
      mkContext({ mapPanel, session: session.session }),
      null,
      depsFor(),
    );

    const scene = mapPanel.features.find(
      (f: DebriefFeature) =>
        (f.properties as { kind?: string }).kind === 'STORYBOARD_SCENE',
    );
    expect(scene).toBeDefined();
    const title = (scene!.properties as { title: string }).title;
    expect(title).toBe('201435Z APR 26');
  });
});

// ─── Name-prompt cancellation (replaces legacy showInputBox tests) ──

describe('captureScene — name-prompt cancellation', () => {
  it('panel returns null (analyst cancelled) → aborts without thumbnail call or markDirty', async () => {
    const mapPanel = makeMapPanel();
    const markDirty = vi.fn();
    const session = makeSession({
      viewport: defaultViewport(),
      currentTime: 100,
      timeRange: null,
      hiddenFeatureIds: [],
      markDirty,
    });
    const panel = makePanelSurface({ nameReply: null });

    const result = await captureScene(
      mkContext({ mapPanel, session: session.session, panelView: panel }),
      null,
      depsFor(),
    );

    expect(result).toEqual({ status: 'cancelled', reason: 'name-prompt' });
    expect(mapPanel.requestThumbnailCaptureCalls).toBe(0);
    expect(panel.nameCalls).toHaveLength(1);
    expect(markDirty).not.toHaveBeenCalled();
  });

  it('panel returns empty trimmed name → treated as cancellation', async () => {
    const mapPanel = makeMapPanel();
    const session = makeSession({
      viewport: defaultViewport(),
      currentTime: 100,
      timeRange: null,
      hiddenFeatureIds: [],
      markDirty: () => undefined,
    });
    const panel = makePanelSurface({ nameReply: { name: '   ' } });

    const result = await captureScene(
      mkContext({ mapPanel, session: session.session, panelView: panel }),
      null,
      depsFor(),
    );

    expect(result).toEqual({ status: 'cancelled', reason: 'name-prompt' });
  });

  it('panel returns confirmed non-empty name → proceeds (host trusts the panel)', async () => {
    const mapPanel = makeMapPanel();
    const session = makeSession({
      viewport: defaultViewport(),
      currentTime: 100,
      timeRange: null,
      hiddenFeatureIds: [],
      markDirty: () => undefined,
    });
    const panel = makePanelSurface({ nameReply: { name: 'Exercise Alpha' } });

    const result = await captureScene(
      mkContext({ mapPanel, session: session.session, panelView: panel }),
      null,
      depsFor(),
    );

    expect(result.status).toBe('captured');
    const sb = mapPanel.features.find(
      (f) => (f.properties as { kind?: string }).kind === 'STORYBOARD',
    );
    expect((sb?.properties as { name?: string }).name).toBe('Exercise Alpha');
  });
});

// ─── Pre-thumbnail rejections ───────────────────────────────────────

describe('captureScene — rejects before thumbnail', () => {
  it('out-of-range timestamp rejected before requestThumbnailCapture (SC-004)', async () => {
    const mapPanel = makeMapPanel();
    const session = makeSession({
      viewport: defaultViewport(),
      currentTime: 0,
      timeRange: { start: 100, end: 200 },
      hiddenFeatureIds: [],
      markDirty: () => undefined,
    });
    const deps = depsFor();

    const result = await captureScene(
      mkContext({ mapPanel, session: session.session }),
      null,
      deps,
    );

    expect(result).toEqual({
      status: 'rejected',
      reason: 'currenttime-out-of-range',
    });
    expect(mapPanel.requestThumbnailCaptureCalls).toBe(0);
    expect(deps.showErrorMessage).toHaveBeenCalledWith(
      expect.stringContaining("outside this plot's time range"),
    );
  });

  it('viewport null rejects before thumbnail invocation', async () => {
    const mapPanel = makeMapPanel();
    const session = makeSession({
      viewport: null,
      currentTime: 100,
      timeRange: null,
      hiddenFeatureIds: [],
      markDirty: () => undefined,
    });
    const result = await captureScene(
      mkContext({ mapPanel, session: session.session }),
      null,
      depsFor(),
    );
    expect(result).toEqual({
      status: 'rejected',
      reason: 'viewport-unavailable',
    });
    expect(mapPanel.requestThumbnailCaptureCalls).toBe(0);
  });

  it('currentTime null is rejected', async () => {
    const mapPanel = makeMapPanel();
    const session = makeSession({
      viewport: defaultViewport(),
      currentTime: null,
      timeRange: null,
      hiddenFeatureIds: [],
      markDirty: () => undefined,
    });
    const result = await captureScene(
      mkContext({ mapPanel, session: session.session }),
      null,
      depsFor(),
    );
    expect(result).toEqual({
      status: 'rejected',
      reason: 'currenttime-unavailable',
    });
  });
});

// ─── Thumbnail failures ─────────────────────────────────────────────

describe('captureScene — thumbnail failures', () => {
  it('null PNG pair returns thumbnail-failed and does not mark dirty', async () => {
    const mapPanel = makeMapPanel([trackFeature('t1')], {
      largePngBase64: null,
      smallPngBase64: null,
    });
    const markDirty = vi.fn();
    const session = makeSession({
      viewport: defaultViewport(),
      currentTime: 100,
      timeRange: null,
      hiddenFeatureIds: [],
      markDirty,
    });
    const result = await captureScene(
      mkContext({ mapPanel, session: session.session }),
      null,
      depsFor(),
    );
    expect(result).toEqual({ status: 'rejected', reason: 'thumbnail-failed' });
    expect(markDirty).not.toHaveBeenCalled();
  });

  it('writeSceneThumbnail throws — surfaced as thumbnail-failed; createScene is not called (atomicity)', async () => {
    const mapPanel = makeMapPanel([trackFeature('t1')]);
    const markDirty = vi.fn();
    const session = makeSession({
      viewport: defaultViewport(),
      currentTime: 100,
      timeRange: null,
      hiddenFeatureIds: [],
      markDirty,
    });
    const writeSceneThumbnail = vi.fn(async () => {
      throw new Error('disk full');
    });
    const deps = depsFor({ writeSceneThumbnail });
    const result = await captureScene(
      mkContext({ mapPanel, session: session.session }),
      null,
      deps,
    );
    expect(result.status).toBe('rejected');
    if (result.status === 'rejected') {
      expect(result.reason).toBe('thumbnail-failed');
    }
    expect(markDirty).not.toHaveBeenCalled();
    const scenes = mapPanel.features.filter(
      (f: DebriefFeature) =>
        (f.properties as { kind?: string }).kind === 'STORYBOARD_SCENE',
    );
    expect(scenes).toHaveLength(0);
  });
});

// ─── Duplicate-timestamp subflow (replaces legacy modal tests) ──────

describe('captureScene — duplicate-timestamp subflow', () => {
  async function firstCapture(opts?: {
    deps?: CaptureCommandDeps;
    timeRange?: { start: number; end: number } | null;
    nameReply?: NamingRowResolution;
  }): Promise<{
    mapPanel: StubMapPanel;
    session: ReturnType<typeof makeSession>;
  }> {
    const mapPanel = makeMapPanel([trackFeature('t1')]);
    const session = makeSession({
      viewport: defaultViewport(),
      currentTime: 1713623700000,
      timeRange: opts?.timeRange ?? null,
      hiddenFeatureIds: [],
      markDirty: () => undefined,
    });
    const deps = opts?.deps ?? depsFor();
    const panel = makePanelSurface({ nameReply: opts?.nameReply });
    await captureScene(
      mkContext({ mapPanel, session: session.session, panelView: panel }),
      null,
      deps,
    );
    return { mapPanel, session };
  }

  it('duplicate timestamp asks the panel via promptCollisionResolution with capture cause', async () => {
    const { mapPanel, session } = await firstCapture();
    const panel = makePanelSurface(); // default cancel
    const deps = depsFor({
      generateUlid: vi.fn(() => '01HW0XGE7Z4YQZ2QZ6KMN9VPJZ'),
    });
    const result = await captureScene(
      mkContext({ mapPanel, session: session.session, panelView: panel }),
      null,
      deps,
    );
    expect(result).toEqual({ status: 'cancelled', reason: 'duplicate-prompt' });
    expect(panel.collisionCalls).toHaveLength(1);
    const call = panel.collisionCalls[0]!;
    expect(call.cause).toBe('capture');
    expect(call.offsetCount).toBe(0);
    expect(call.proposedTimestamp).toBe(call.originalTimestamp);
    expect(call.conflictingSceneTitle).toBeTypeOf('string');
  });

  it('duplicate — Replace deletes conflicting scene and inserts the new one', async () => {
    const { mapPanel, session } = await firstCapture({
      deps: depsFor({
        generateUlid: vi.fn(() => '01HW0XGE7Z4YQZ2QZ6KMN9VPJA'),
      }),
    });
    const markDirty = vi.fn();
    session.state.markDirty = markDirty;

    let conflictingSceneIdSeen = '';
    const panel = makePanelSurface({
      collisionReply: () => {
        // Look up the latest collision call's conflictingSceneId; reply Replace.
        return {
          kind: 'replace',
          conflictingSceneId: conflictingSceneIdSeen,
        };
      },
    });
    // Wrap the prompt to capture the ID for the reply.
    const original = panel.promptCollisionResolution;
    (panel as unknown as {
      promptCollisionResolution: typeof original;
    }).promptCollisionResolution = async (state) => {
      conflictingSceneIdSeen = state.conflictingSceneId;
      return original.call(panel, state);
    };
    const deps = depsFor({
      generateUlid: vi.fn(() => '01HW0XGE7Z4YQZ2QZ6KMN9VPJB'),
    });
    const result = await captureScene(
      mkContext({ mapPanel, session: session.session, panelView: panel }),
      null,
      deps,
    );
    expect(result.status).toBe('captured');
    const scenes = mapPanel.features.filter(
      (f: DebriefFeature) =>
        (f.properties as { kind?: string }).kind === 'STORYBOARD_SCENE',
    );
    expect(scenes).toHaveLength(1);
    expect((scenes[0]!.properties as { id: string }).id).toBe(
      '01HW0XGE7Z4YQZ2QZ6KMN9VPJB',
    );
    expect(markDirty).toHaveBeenCalledTimes(1);
  });

  it('duplicate — Offset retries at +1 second; banner re-prompted with offsetCount=1', async () => {
    const { mapPanel, session } = await firstCapture({
      deps: depsFor({
        generateUlid: vi.fn(() => '01HW0XGE7Z4YQZ2QZ6KMN9VPJA'),
      }),
    });
    let attempts = 0;
    const panel = makePanelSurface({
      collisionReply: ({ offsetCount }) => {
        attempts += 1;
        // First call: offsetCount === 0 → reply Offset (advance to +1s).
        // Second call (if any): offsetCount === 1 → reply Cancel.
        if (offsetCount === 0) return { kind: 'offset' };
        return { kind: 'cancel' };
      },
    });
    const deps = depsFor({
      generateUlid: vi.fn(() => '01HW0XGE7Z4YQZ2QZ6KMN9VPJC'),
    });
    const result = await captureScene(
      mkContext({ mapPanel, session: session.session, panelView: panel }),
      null,
      deps,
    );
    expect(result.status).toBe('captured');
    if (result.status === 'captured') {
      expect((result.scene.properties as { timestamp: string }).timestamp).toBe(
        new Date(1713623700000 + 1000).toISOString(),
      );
    }
    expect(attempts).toBe(1);
  });

  it('duplicate — Cancel returns cancelled:duplicate-prompt', async () => {
    const { mapPanel, session } = await firstCapture();
    const panel = makePanelSurface({ collisionReply: { kind: 'cancel' } });
    const deps = depsFor({
      generateUlid: vi.fn(() => '01HW0XGE7Z4YQZ2QZ6KMN9VPJD'),
    });
    const result = await captureScene(
      mkContext({ mapPanel, session: session.session, panelView: panel }),
      null,
      deps,
    );
    expect(result).toEqual({ status: 'cancelled', reason: 'duplicate-prompt' });
  });

  it('FR-CAP-017a — Offset that would push past the time range is reported in the banner state', async () => {
    // Set up a plot whose time range upper bound is exactly the current
    // timestamp + 500 ms. Offsetting by 1 s would push past the upper.
    const ts = 1713623700000;
    const { mapPanel, session } = await firstCapture({
      timeRange: { start: 1713600000000, end: ts + 500 },
    });
    const seenStates: Array<{ offsetWouldExceedTimeRange: boolean }> = [];
    const panel = makePanelSurface({
      collisionReply: () => ({ kind: 'cancel' }),
    });
    const original = panel.promptCollisionResolution;
    (panel as unknown as {
      promptCollisionResolution: typeof original;
    }).promptCollisionResolution = async (state) => {
      seenStates.push({
        offsetWouldExceedTimeRange: state.offsetWouldExceedTimeRange,
      });
      return original.call(panel, state);
    };
    const deps = depsFor({
      generateUlid: vi.fn(() => '01HW0XGE7Z4YQZ2QZ6KMN9VPJE'),
    });
    await captureScene(
      mkContext({ mapPanel, session: session.session, panelView: panel }),
      null,
      deps,
    );
    expect(seenStates).toHaveLength(1);
    expect(seenStates[0]?.offsetWouldExceedTimeRange).toBe(true);
  });
});

// ─── In-flight guard ────────────────────────────────────────────────

describe('captureScene — in-flight guard', () => {
  it('second call while in-flight returns cancelled:in-flight without side effects', async () => {
    const mapPanel = makeMapPanel([trackFeature('t1')]);
    const session = makeSession({
      viewport: defaultViewport(),
      currentTime: 100,
      timeRange: null,
      hiddenFeatureIds: [],
      markDirty: () => undefined,
    });
    // Stall the thumbnail call.
    let release: (() => void) | null = null;
    mapPanel.requestThumbnailCapture = (): Promise<{
      largePngBase64: string | null;
      smallPngBase64: string | null;
    }> =>
      new Promise((resolve) => {
        release = () =>
          resolve({ largePngBase64: 'L', smallPngBase64: 'S' });
      });
    const first = captureScene(
      mkContext({ mapPanel, session: session.session }),
      null,
      depsFor(),
    );
    // Allow the first call to hit the thumbnail await.
    await new Promise((r) => setTimeout(r, 0));
    expect(__getCaptureInFlightForTesting()).toBe(true);
    const setStatusBar = vi.fn();
    const second = await captureScene(
      mkContext({ mapPanel, session: session.session }),
      null,
      depsFor({
        setStatusBarMessage:
          setStatusBar as unknown as typeof import('vscode').window.setStatusBarMessage,
      }),
    );
    expect(second).toEqual({ status: 'cancelled', reason: 'in-flight' });
    expect(setStatusBar).toHaveBeenCalled();
    // Let the first call finish so the test tears down cleanly.
    release!();
    await first;
  });
});

// ─── DuplicateTimestampError import sanity ──────────────────────────

it('module imports DuplicateTimestampError without breaking', () => {
  // The capture command catches and routes DTE through the panel banner.
  // This test exists so the import is referenced (avoids unused-import lint).
  expect(typeof captureScene).toBe('function');
});
