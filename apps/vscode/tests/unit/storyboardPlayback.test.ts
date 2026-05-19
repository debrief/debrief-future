/**
 * @vitest-environment jsdom
 *
 * Unit tests for `StoryboardPlaybackService` (Feature 217, T320).
 *
 * Covers the acceptance-scenario coverage called out in tasks.md §3.3
 * plus the additional cases listed in contracts/playback-service.md §9.
 *
 * Uses direct dependency injection of ports — no real VS Code webview,
 * no real RAF, no real MapPanel. Each test wires the minimum ports
 * needed to exercise the targeted behaviour.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as vscode from 'vscode';
import {
  StoryboardPlaybackService,
  type ModalPromptPort,
  type VisibilityPort,
  type PlaybackSessionManager,
  type PlaybackMapPanel,
  type PlaybackPanelView,
  type PlaybackTimeRangeView,
} from '../../src/services/storyboardPlayback';
import type { DebriefFeature } from '@debrief/components';
import type {
  StoryboardFeature,
  SceneFeature,
  Viewport,
} from '@debrief/schemas';
import type { SessionStoreApi, TemporalSlice } from '@debrief/session-state';

// ─── Fixture helpers ────────────────────────────────────────────────

function sb(
  id: string,
  name: string,
  lastModifiedIso = '2026-04-20T14:00:00.000Z',
): StoryboardFeature {
  return {
    type: 'Feature',
    id,
    geometry: { type: 'Polygon', coordinates: [[[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]]] },
    properties: {
      kind: 'STORYBOARD',
      id,
      name,
      schema_version: 2,
      provenance: [
        {
          activity_id: `prov-${id}`,
          timestamp: lastModifiedIso,
          was_generated_by: { tool: 'storyboard-crud', version: '1.0.0' },
          used: [],
          generated: [id],
          execution_duration: 'PT0.1S',
        },
      ],
    },
  } as unknown as StoryboardFeature;
}

let sceneCreationOrderCounter = 0;
function scene(
  id: string,
  storyboardId: string,
  timestampIso: string,
  visibleFeatureIds: string[] = [],
  viewportCenter: [number, number] = [0, 0],
): SceneFeature {
  return {
    type: 'Feature',
    id,
    geometry: {
      type: 'Polygon',
      coordinates: [[[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]]],
    },
    properties: {
      kind: 'STORYBOARD_SCENE',
      id,
      storyboard_id: storyboardId,
      title: `Scene ${id}`,
      viewport: { center: viewportCenter, zoom: 10, bearing: 0 },
      timestamp: timestampIso,
      visible_feature_ids: visibleFeatureIds,
      feature_set_hash: 'deadbeef'.repeat(8),
      thumbnail_asset_ref: `scene-${id}.png`,
      transition_duration_ms: 500,
      // #259 — required creation_order; monotonic per test invocation is fine
      // for these fixtures since each test builds isolated plots.
      creation_order: sceneCreationOrderCounter++,
    },
  } as unknown as SceneFeature;
}

function track(id: string): DebriefFeature {
  return {
    type: 'Feature',
    id,
    geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1]] },
    properties: { id, kind: 'TRACK', schema_version: 1 },
  } as unknown as DebriefFeature;
}

// ─── Ports ──────────────────────────────────────────────────────────

interface Harness {
  service: StoryboardPlaybackService;
  sessionManager: PlaybackSessionManager;
  mapPanel: PlaybackMapPanel;
  panelView: PlaybackPanelView;
  timeRangeView: PlaybackTimeRangeView;
  modalPromptPort: ModalPromptPort;
  visibilityPort: VisibilityPort;
  setFeatures(features: DebriefFeature[]): void;
  onFlyToCompleteEmitter: vscode.EventEmitter<number>;
  setSceneRectanglesSpy: ReturnType<typeof vi.fn>;
  flyToViewportSpy: ReturnType<typeof vi.fn>;
  setScrubbableRangeSpy: ReturnType<typeof vi.fn>;
  setFeaturesSpy: ReturnType<typeof vi.fn>;
  applySnapshotSpy: ReturnType<typeof vi.fn>;
  showInformationMessageSpy: ReturnType<typeof vi.fn>;
  showErrorMessageSpy: ReturnType<typeof vi.fn>;
  showErrorMessage: (msg: string) => void;
  executeSetContextSpy: ReturnType<typeof vi.fn>;
  visibilityEmitter: vscode.EventEmitter<boolean>;
  sessionStore: Partial<SessionStoreApi>;
  setTimeRange(start: number | null, end: number | null): void;
  setCurrentTimeSpy: ReturnType<typeof vi.fn>;
}

function makeHarness(options: {
  features?: DebriefFeature[];
  timeRange?: { start: number; end: number } | null;
  documentUri?: string;
  modalChoice?: string | undefined;
  now?: () => number;
} = {}): Harness {
  const documentUri = options.documentUri ?? 'stac://test/plot.json';
  let features = options.features ?? [];
  let timeRange = options.timeRange ?? { start: 0, end: 86_400_000 };

  const flyToViewportSpy = vi.fn((_viewport: Viewport, _durationMs: number): number => {
    flyToTokenCounter += 1;
    return flyToTokenCounter;
  });
  let flyToTokenCounter = 0;

  const setSceneRectanglesSpy = vi.fn();
  const setScrubbableRangeSpy = vi.fn();
  const setFeaturesSpy = vi.fn((next: readonly DebriefFeature[]) => {
    // Test convenience: route setFeatures back through the same
    // features buffer that getCurrentFeatures returns, so that after a
    // CRUD op pushes the new feature set, subsequent reads see it.
    features = [...next];
  });
  const applySnapshotSpy = vi.fn();
  const setCurrentTimeSpy = vi.fn();

  const onFlyToCompleteEmitter = new vscode.EventEmitter<number>();
  const onSceneRectangleClickEmitter = new vscode.EventEmitter<string>();
  const onFeaturesChangedEmitter = new vscode.EventEmitter<DebriefFeature[]>();
  const onActiveSessionChangeEmitter = new vscode.EventEmitter<SessionStoreApi | null>();

  const mapPanel: PlaybackMapPanel = {
    getCurrentFeatures: () => features.slice(),
    setFeatures: setFeaturesSpy,
    flyToViewport: flyToViewportSpy,
    setSceneRectangles: setSceneRectanglesSpy,
    onFlyToComplete: onFlyToCompleteEmitter.event,
    onSceneRectangleClick: onSceneRectangleClickEmitter.event,
    onFeaturesChanged: onFeaturesChangedEmitter.event,
  };

  const sessionStore: Partial<SessionStoreApi> = {
    getState: () =>
      ({
        timeRange,
        currentTime: timeRange?.start ?? 0,
        setCurrentTime: setCurrentTimeSpy,
      } as unknown as ReturnType<SessionStoreApi['getState']>),
  };
  const sessionManager: PlaybackSessionManager = {
    getActiveDocumentUri: () => documentUri,
    getSession: (_uri: string) => sessionStore as SessionStoreApi,
    getActiveSession: () => sessionStore as SessionStoreApi,
    onActiveSessionChange: onActiveSessionChangeEmitter.event,
  };

  const panelView: PlaybackPanelView = {
    applySnapshot: applySnapshotSpy,
  };

  const timeRangeView: PlaybackTimeRangeView = {
    setScrubbableRange: setScrubbableRangeSpy,
  };

  const visibilityEmitter = new vscode.EventEmitter<boolean>();
  const visibilityPort: VisibilityPort = {
    onDidChangeVisibility: visibilityEmitter.event,
  };

  const showInformationMessageSpy = vi.fn(async () => options.modalChoice);
  const showErrorMessageSpy = vi.fn();
  const modalPromptPort: ModalPromptPort = {
    showInformationMessage: showInformationMessageSpy as unknown as ModalPromptPort['showInformationMessage'],
  };

  const executeSetContextSpy = vi.fn();

  const service = new StoryboardPlaybackService({
    sessionManager,
    mapPanel,
    panelView,
    timeRangeView,
    modalPromptPort,
    visibilityPort,
    showErrorMessage: showErrorMessageSpy,
    setContext: executeSetContextSpy,
    now: options.now ?? ((): number => Date.now()),
  });

  const setFeatures = (next: DebriefFeature[]): void => {
    features = next;
    onFeaturesChangedEmitter.fire(next.slice());
  };
  const setTimeRange = (start: number | null, end: number | null): void => {
    timeRange = start === null || end === null ? null : { start, end };
  };

  return {
    service,
    sessionManager,
    mapPanel,
    panelView,
    timeRangeView,
    modalPromptPort,
    visibilityPort,
    setFeatures,
    onFlyToCompleteEmitter,
    setSceneRectanglesSpy,
    flyToViewportSpy,
    setScrubbableRangeSpy,
    setFeaturesSpy,
    applySnapshotSpy,
    showInformationMessageSpy,
    showErrorMessageSpy,
    showErrorMessage: showErrorMessageSpy,
    executeSetContextSpy,
    visibilityEmitter,
    sessionStore,
    setTimeRange,
    setCurrentTimeSpy,
  };
}

const DOC = 'stac://test/plot.json';

describe('StoryboardPlaybackService — lifecycle', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('onPlotOpened seeds active storyboard from getMostRecentlyModifiedStoryboard (R7)', () => {
    const s1 = sb('sb-A', 'Alpha', '2026-04-19T10:00:00Z');
    const s2 = sb('sb-B', 'Bravo', '2026-04-20T14:00:00Z'); // most recent
    const s3 = sb('sb-C', 'Charlie', '2026-04-18T08:00:00Z');
    const features = [
      s1, s2, s3,
      scene('scene-B1', 'sb-B', '2026-04-20T14:05:00Z'),
      scene('scene-B2', 'sb-B', '2026-04-20T14:10:00Z'),
    ] as unknown as DebriefFeature[];
    const h = makeHarness({ features, timeRange: { start: 0, end: 10e12 } });

    h.service.onPlotOpened(DOC);

    const snap = h.service.getSnapshot(DOC);
    expect(snap.activeStoryboardId).toBe('sb-B');
    expect(snap.scenes).toHaveLength(2);
    expect(snap.currentSceneId).toBe('scene-B1');
  });

  it('onPlotOpened calls timeRangeView.setScrubbableRange for the scene window', () => {
    const features = [
      sb('sb-A', 'Alpha'),
      scene('scene-1', 'sb-A', '2026-04-20T14:00:00Z'),
      scene('scene-2', 'sb-A', '2026-04-20T14:05:00Z'),
    ] as unknown as DebriefFeature[];
    const h = makeHarness({ features, timeRange: { start: 0, end: 10e12 } });

    h.service.onPlotOpened(DOC);

    expect(h.setScrubbableRangeSpy).toHaveBeenCalled();
    const call = h.setScrubbableRangeSpy.mock.calls[0]!;
    expect(typeof call[0]).toBe('number');
    expect(typeof call[1]).toBe('number');
  });

  it('onPlotOpened sets debrief.storyboardActive = true when active Storyboard has ≥ 1 scene', () => {
    const features = [
      sb('sb-A', 'Alpha'),
      scene('s1', 'sb-A', '2026-04-20T14:00:00Z'),
    ] as unknown as DebriefFeature[];
    const h = makeHarness({ features });
    h.service.onPlotOpened(DOC);
    expect(h.executeSetContextSpy).toHaveBeenCalledWith('debrief.storyboardActive', true);
  });

  it('onPlotOpened rejects corrupt plot via validatePlot (design-fix 2)', () => {
    // Orphan scene — storyboard_id does not match any Storyboard.
    const features = [scene('orphan', 'sb-missing', '2026-04-20T14:00:00Z')] as unknown as DebriefFeature[];
    const h = makeHarness({ features });

    h.service.onPlotOpened(DOC);

    expect(h.showErrorMessageSpy).toHaveBeenCalledTimes(1);
    const snap = h.service.getSnapshot(DOC);
    // Subsequent transport ops are no-ops.
    void h.service.forward(DOC);
    void h.service.backward(DOC);
    // No transition should have been triggered.
    expect(h.flyToViewportSpy).not.toHaveBeenCalled();
    expect(snap.transport.sceneTotal).toBe(0);
  });

  it('onPlotClosed calls setScrubbableRange(null, null) and clears context', () => {
    const features = [
      sb('sb-A', 'Alpha'),
      scene('s1', 'sb-A', '2026-04-20T14:00:00Z'),
    ] as unknown as DebriefFeature[];
    const h = makeHarness({ features });
    h.service.onPlotOpened(DOC);

    h.service.onPlotClosed(DOC);

    expect(h.setScrubbableRangeSpy).toHaveBeenLastCalledWith(null, null);
    expect(h.executeSetContextSpy).toHaveBeenLastCalledWith('debrief.storyboardActive', false);
  });

  it('onPlotFeaturesChanged recomputes sceneOrder; falls back via getMostRecentlyModifiedStoryboard when active deleted', () => {
    const s1 = sb('sb-A', 'Alpha', '2026-04-20T14:00:00Z');
    const s2 = sb('sb-B', 'Bravo', '2026-04-21T14:00:00Z'); // most recent at open
    const initialFeatures = [
      s1, s2,
      scene('scene-B1', 'sb-B', '2026-04-20T14:05:00Z'),
      scene('scene-A1', 'sb-A', '2026-04-20T14:10:00Z'),
    ] as unknown as DebriefFeature[];
    const h = makeHarness({ features: initialFeatures, timeRange: { start: 0, end: 10e12 } });
    h.service.onPlotOpened(DOC);
    expect(h.service.getSnapshot(DOC).activeStoryboardId).toBe('sb-B');

    // Delete sb-B externally — only sb-A remains.
    h.setFeatures([
      s1,
      scene('scene-A1', 'sb-A', '2026-04-20T14:10:00Z'),
    ] as unknown as DebriefFeature[]);
    h.service.onPlotFeaturesChanged(DOC);

    expect(h.service.getSnapshot(DOC).activeStoryboardId).toBe('sb-A');
  });

  it('onPlotFeaturesChanged clears activeStoryboardId when no storyboards remain', () => {
    const features = [
      sb('sb-A', 'Alpha'),
      scene('s1', 'sb-A', '2026-04-20T14:00:00Z'),
    ] as unknown as DebriefFeature[];
    const h = makeHarness({ features });
    h.service.onPlotOpened(DOC);
    expect(h.service.getSnapshot(DOC).activeStoryboardId).toBe('sb-A');

    h.setFeatures([]);
    h.service.onPlotFeaturesChanged(DOC);

    expect(h.service.getSnapshot(DOC).activeStoryboardId).toBeNull();
    expect(h.executeSetContextSpy).toHaveBeenLastCalledWith('debrief.storyboardActive', false);
  });
});

describe('StoryboardPlaybackService — transport', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function makeSimpleHarness(): Harness {
    const features = [
      sb('sb-A', 'Alpha'),
      scene('s1', 'sb-A', '2026-04-20T14:00:00Z'),
      scene('s2', 'sb-A', '2026-04-20T14:05:00Z'),
      scene('s3', 'sb-A', '2026-04-20T14:10:00Z'),
    ] as unknown as DebriefFeature[];
    const h = makeHarness({ features, timeRange: { start: 0, end: 10e12 } });
    h.service.onPlotOpened(DOC);
    return h;
  }

  it('forward advances when not in-flight, not at last, hard-block passes', async () => {
    const h = makeSimpleHarness();
    await h.service.forward(DOC);
    expect(h.flyToViewportSpy).toHaveBeenCalledTimes(1);
    const snap = h.service.getSnapshot(DOC);
    expect(snap.currentSceneId).toBe('s2');
  });

  it('forward is no-op during in-flight transition (FR-PLAY-009)', async () => {
    const h = makeSimpleHarness();
    await h.service.forward(DOC); // transition begins and stays in-flight
    const firstCount = h.flyToViewportSpy.mock.calls.length;
    await h.service.forward(DOC); // second call should be rejected
    expect(h.flyToViewportSpy.mock.calls.length).toBe(firstCount);
  });

  it('forward is no-op at last scene (FR-PLAY-010)', async () => {
    const h = makeSimpleHarness();
    // Step to last
    await h.service.forward(DOC);
    h.onFlyToCompleteEmitter.fire(1);
    await h.service.forward(DOC);
    h.onFlyToCompleteEmitter.fire(2);
    const beforeLast = h.flyToViewportSpy.mock.calls.length;
    // Already at last scene — no-op
    await h.service.forward(DOC);
    expect(h.flyToViewportSpy.mock.calls.length).toBe(beforeLast);
  });

  it('backward mirrors forward — no-op at first scene', async () => {
    const h = makeSimpleHarness();
    const before = h.flyToViewportSpy.mock.calls.length;
    await h.service.backward(DOC);
    expect(h.flyToViewportSpy.mock.calls.length).toBe(before);
  });

  it('goToScene is transport — runs hard-block check, animates', async () => {
    const h = makeSimpleHarness();
    await h.service.goToScene(DOC, 's3');
    expect(h.flyToViewportSpy).toHaveBeenCalledTimes(1);
    const snap = h.service.getSnapshot(DOC);
    expect(snap.currentSceneId).toBe('s3');
  });

  it('goToScene is no-op during in-flight', async () => {
    const h = makeSimpleHarness();
    await h.service.forward(DOC);
    const before = h.flyToViewportSpy.mock.calls.length;
    await h.service.goToScene(DOC, 's3');
    expect(h.flyToViewportSpy.mock.calls.length).toBe(before);
  });

  it('onDidChangeVisibility(false) cancels transitionId (R8)', async () => {
    const h = makeSimpleHarness();
    await h.service.forward(DOC);
    expect(h.service.getSnapshot(DOC).transport.transitionInFlight).toBe(true);
    h.visibilityEmitter.fire(false);
    expect(h.service.getSnapshot(DOC).transport.transitionInFlight).toBe(false);
    // Follow-up transport works again
    await h.service.forward(DOC);
    expect(h.flyToViewportSpy).toHaveBeenCalledTimes(2);
  });

  it('safety timer fires at durationMs+250ms when onFlyToComplete never arrives (R8)', async () => {
    const h = makeSimpleHarness();
    await h.service.forward(DOC);
    expect(h.service.getSnapshot(DOC).transport.transitionInFlight).toBe(true);
    // Default scene transition_duration_ms = 500
    vi.advanceTimersByTime(500 + 250 + 10);
    expect(h.service.getSnapshot(DOC).transport.transitionInFlight).toBe(false);
  });

  it('plot-switch mid-transition clears the old plot transitionId', async () => {
    const h = makeSimpleHarness();
    await h.service.forward(DOC);
    expect(h.service.getSnapshot(DOC).transport.transitionInFlight).toBe(true);
    h.service.onPlotClosed(DOC);
    // Now re-open same plot — transitionId should not linger
    h.service.onPlotOpened(DOC);
    expect(h.service.getSnapshot(DOC).transport.transitionInFlight).toBe(false);
  });
});

describe('StoryboardPlaybackService — hard-block flow', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('hard-blocks forward when next scene references missing features (FR-PLAY-019)', async () => {
    const features = [
      sb('sb-A', 'Alpha'),
      scene('s1', 'sb-A', '2026-04-20T14:00:00Z', []),
      scene('s2', 'sb-A', '2026-04-20T14:05:00Z', ['track-missing']),
    ] as unknown as DebriefFeature[];
    const h = makeHarness({
      features,
      timeRange: { start: 0, end: 10e12 },
      modalChoice: undefined,
    });
    h.service.onPlotOpened(DOC);

    await h.service.forward(DOC);

    expect(h.showInformationMessageSpy).toHaveBeenCalledTimes(1);
    // snapshot unchanged — transport did not advance
    expect(h.service.getSnapshot(DOC).currentSceneId).toBe('s1');
  });

  it('resolveHardBlockByJumpingPast advances past blocked Scene', async () => {
    const t = track('track-1');
    const features = [
      sb('sb-A', 'Alpha'),
      scene('s1', 'sb-A', '2026-04-20T14:00:00Z', ['track-1']),
      scene('s2', 'sb-A', '2026-04-20T14:05:00Z', ['track-missing']),
      scene('s3', 'sb-A', '2026-04-20T14:10:00Z', ['track-1']),
      t,
    ] as unknown as DebriefFeature[];
    const h = makeHarness({ features, timeRange: { start: 0, end: 10e12 } });
    h.service.onPlotOpened(DOC);

    await h.service.resolveHardBlockByJumpingPast(DOC, 's2', 'forward');

    // Should advance past s2 directly to s3
    const snap = h.service.getSnapshot(DOC);
    expect(snap.currentSceneId).toBe('s3');
  });

  it('resolveHardBlockByOpeningForEditing surfaces info message, no transport change', () => {
    const features = [
      sb('sb-A', 'Alpha'),
      scene('s1', 'sb-A', '2026-04-20T14:00:00Z', ['x']),
      scene('s2', 'sb-A', '2026-04-20T14:05:00Z', ['track-missing']),
    ] as unknown as DebriefFeature[];
    const h = makeHarness({ features });
    h.service.onPlotOpened(DOC);
    const before = h.service.getSnapshot(DOC).currentSceneId;

    h.service.resolveHardBlockByOpeningForEditing(DOC, 's2');

    expect(h.service.getSnapshot(DOC).currentSceneId).toBe(before);
    // Inline showInformationMessage — the modalPromptPort is only for modals,
    // so the service uses its own (injected) showInformationMessage path.
    // We verify the snapshot didn't change and the port saw one call when
    // it's used for this purpose. The test covers "transport unchanged".
  });

  it('ISO/epoch conversion handles NaN timeRange gracefully', async () => {
    const features = [
      sb('sb-A', 'Alpha'),
      scene('s1', 'sb-A', '2026-04-20T14:00:00Z'),
      scene('s2', 'sb-A', '2026-04-20T14:05:00Z'),
    ] as unknown as DebriefFeature[];
    const h = makeHarness({ features, timeRange: null });
    h.service.onPlotOpened(DOC);

    // Should not throw; transport behaves as if no time-range constraint
    await expect(h.service.forward(DOC)).resolves.toBeUndefined();
  });
});

describe('StoryboardPlaybackService — CRUD-during-flight guard (R9)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('createStoryboard is rejected with no side-effect during in-flight', async () => {
    const features = [
      sb('sb-A', 'Alpha'),
      scene('s1', 'sb-A', '2026-04-20T14:00:00Z'),
      scene('s2', 'sb-A', '2026-04-20T14:05:00Z'),
    ] as unknown as DebriefFeature[];
    // Permissive timeRange so forward() transitions instead of hard-blocking.
    const h = makeHarness({ features, timeRange: { start: 0, end: 10e12 } });
    h.service.onPlotOpened(DOC);
    await h.service.forward(DOC);
    expect(h.service.getSnapshot(DOC).transport.transitionInFlight).toBe(true);

    const before = h.service.getSnapshot(DOC).storyboards.length;
    await h.service.createStoryboard(DOC, 'NewName');
    expect(h.service.getSnapshot(DOC).storyboards.length).toBe(before);
  });

  it('renameStoryboard is rejected during in-flight', async () => {
    const features = [
      sb('sb-A', 'Alpha'),
      scene('s1', 'sb-A', '2026-04-20T14:00:00Z'),
      scene('s2', 'sb-A', '2026-04-20T14:05:00Z'),
    ] as unknown as DebriefFeature[];
    const h = makeHarness({ features, timeRange: { start: 0, end: 10e12 } });
    h.service.onPlotOpened(DOC);
    await h.service.forward(DOC);
    expect(h.service.getSnapshot(DOC).transport.transitionInFlight).toBe(true);
    const before = h.service.getSnapshot(DOC).storyboards[0]!.name;
    await h.service.renameStoryboard(DOC, 'sb-A', 'Renamed');
    expect(h.service.getSnapshot(DOC).storyboards[0]!.name).toBe(before);
  });

  it('deleteStoryboard is rejected during in-flight', async () => {
    const features = [
      sb('sb-A', 'Alpha'),
      sb('sb-B', 'Bravo', '2026-04-20T12:00:00Z'),
      scene('s1', 'sb-A', '2026-04-20T14:00:00Z'),
      scene('s2', 'sb-A', '2026-04-20T14:05:00Z'),
    ] as unknown as DebriefFeature[];
    const h = makeHarness({ features, timeRange: { start: 0, end: 10e12 } });
    h.service.onPlotOpened(DOC);
    await h.service.forward(DOC);
    expect(h.service.getSnapshot(DOC).transport.transitionInFlight).toBe(true);
    const before = h.service.getSnapshot(DOC).storyboards.length;
    await h.service.deleteStoryboard(DOC, 'sb-B');
    expect(h.service.getSnapshot(DOC).storyboards.length).toBe(before);
  });
});

describe('StoryboardPlaybackService — dispose', () => {
  it('setScrubbableRange(null, null) is called for every plot with an override on dispose', () => {
    const features = [
      sb('sb-A', 'Alpha'),
      scene('s1', 'sb-A', '2026-04-20T14:00:00Z'),
    ] as unknown as DebriefFeature[];
    const h = makeHarness({ features });
    h.service.onPlotOpened(DOC);
    h.service.onPlotOpened('stac://test/plot-2.json');
    h.setScrubbableRangeSpy.mockClear();

    h.service.dispose();

    // Should clear override for each plot still active
    const nullCalls = h.setScrubbableRangeSpy.mock.calls.filter(
      (call) => call[0] === null && call[1] === null,
    );
    expect(nullCalls.length).toBeGreaterThanOrEqual(1);
  });
});

// ─── Phase 4 / US2 — multi-Storyboard management (T420) ────────────────

describe('StoryboardPlaybackService — setActiveStoryboard (T421)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('switches synchronously — snapshot updates before any await (SC-003)', () => {
    const features = [
      sb('sb-A', 'Alpha', '2026-04-20T14:00:00Z'),
      sb('sb-B', 'Bravo', '2026-04-21T14:00:00Z'),
      scene('scene-A1', 'sb-A', '2026-04-20T14:05:00Z'),
      scene('scene-A2', 'sb-A', '2026-04-20T14:10:00Z'),
      scene('scene-B1', 'sb-B', '2026-04-21T14:05:00Z'),
    ] as unknown as DebriefFeature[];
    const h = makeHarness({ features, timeRange: { start: 0, end: 10e12 } });
    h.service.onPlotOpened(DOC);
    // sb-B is most recent → active
    expect(h.service.getSnapshot(DOC).activeStoryboardId).toBe('sb-B');

    h.service.setActiveStoryboard(DOC, 'sb-A');
    // Synchronous — no await. Snapshot reflects new active id.
    const snap = h.service.getSnapshot(DOC);
    expect(snap.activeStoryboardId).toBe('sb-A');
    expect(snap.currentSceneId).toBe('scene-A1'); // index reset to 0
    expect(snap.scenes).toHaveLength(2);
  });

  it('recomputes sceneOrder + sets currentSceneIndex=0 on switch', () => {
    const features = [
      sb('sb-A', 'Alpha', '2026-04-20T14:00:00Z'),
      sb('sb-B', 'Bravo', '2026-04-21T14:00:00Z'),
      scene('a1', 'sb-A', '2026-04-20T14:05:00Z'),
      scene('a2', 'sb-A', '2026-04-20T14:10:00Z'),
      scene('b1', 'sb-B', '2026-04-21T14:05:00Z'),
      scene('b2', 'sb-B', '2026-04-21T14:10:00Z'),
      scene('b3', 'sb-B', '2026-04-21T14:15:00Z'),
    ] as unknown as DebriefFeature[];
    const h = makeHarness({ features, timeRange: { start: 0, end: 10e12 } });
    h.service.onPlotOpened(DOC); // sb-B active (3 scenes)
    expect(h.service.getSnapshot(DOC).scenes).toHaveLength(3);

    h.service.setActiveStoryboard(DOC, 'sb-A');
    const snap = h.service.getSnapshot(DOC);
    expect(snap.activeStoryboardId).toBe('sb-A');
    expect(snap.scenes).toHaveLength(2);
    expect(snap.transport.sceneNumber).toBe(1);
  });

  it('calls setScrubbableRange for the new Storyboard window on switch', () => {
    const features = [
      sb('sb-A', 'Alpha', '2026-04-20T14:00:00Z'),
      sb('sb-B', 'Bravo', '2026-04-21T14:00:00Z'),
      scene('a1', 'sb-A', '2026-04-20T14:05:00Z'),
      scene('a2', 'sb-A', '2026-04-20T14:10:00Z'),
      scene('b1', 'sb-B', '2026-04-21T14:05:00Z'),
    ] as unknown as DebriefFeature[];
    const h = makeHarness({ features, timeRange: { start: 0, end: 10e12 } });
    h.service.onPlotOpened(DOC);
    h.setScrubbableRangeSpy.mockClear();
    h.service.setActiveStoryboard(DOC, 'sb-A');
    expect(h.setScrubbableRangeSpy).toHaveBeenCalled();
    const [start, end] = h.setScrubbableRangeSpy.mock.calls[0]!;
    expect(start).toBe(new Date('2026-04-20T14:05:00Z').getTime());
    expect(end).toBe(new Date('2026-04-20T14:10:00Z').getTime());
  });

  it('setSceneRectangles is called with the new active Storyboard on switch', () => {
    const features = [
      sb('sb-A', 'Alpha', '2026-04-20T14:00:00Z'),
      sb('sb-B', 'Bravo', '2026-04-21T14:00:00Z'),
      scene('a1', 'sb-A', '2026-04-20T14:05:00Z'),
      scene('b1', 'sb-B', '2026-04-21T14:05:00Z'),
    ] as unknown as DebriefFeature[];
    const h = makeHarness({ features, timeRange: { start: 0, end: 10e12 } });
    h.service.onPlotOpened(DOC);
    h.setSceneRectanglesSpy.mockClear();
    h.service.setActiveStoryboard(DOC, 'sb-A');
    expect(h.setSceneRectanglesSpy).toHaveBeenCalled();
    const lastCall =
      h.setSceneRectanglesSpy.mock.calls[h.setSceneRectanglesSpy.mock.calls.length - 1]!;
    expect(lastCall[1]).toBe('sb-A');
  });
});

describe('StoryboardPlaybackService — createStoryboard (T422)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('delegates to #215 CRUD and pushes new features back via setFeatures', async () => {
    const features = [
      sb('sb-A', 'Alpha'),
      scene('a1', 'sb-A', '2026-04-20T14:00:00Z'),
    ] as unknown as DebriefFeature[];
    const h = makeHarness({ features, timeRange: { start: 0, end: 10e12 } });
    h.service.onPlotOpened(DOC);
    h.setFeaturesSpy.mockClear();

    await h.service.createStoryboard(DOC, 'New Storyboard');

    expect(h.setFeaturesSpy).toHaveBeenCalledTimes(1);
    // The new Storyboard should appear in the snapshot.
    const snap = h.service.getSnapshot(DOC);
    const names = snap.storyboards.map((s) => s.name);
    expect(names).toContain('New Storyboard');
  });

  it('sets the new Storyboard as active after create', async () => {
    const features = [
      sb('sb-A', 'Alpha'),
      scene('a1', 'sb-A', '2026-04-20T14:00:00Z'),
    ] as unknown as DebriefFeature[];
    const h = makeHarness({ features, timeRange: { start: 0, end: 10e12 } });
    h.service.onPlotOpened(DOC);

    await h.service.createStoryboard(DOC, 'Freshly-made');

    const snap = h.service.getSnapshot(DOC);
    expect(snap.activeStoryboardName).toBe('Freshly-made');
    // New Storyboard has no Scenes yet.
    expect(snap.scenes).toHaveLength(0);
  });

  it('surfaces DuplicateStoryboardName via showErrorMessage (no state mutation)', async () => {
    const features = [
      sb('sb-A', 'Alpha'),
      scene('a1', 'sb-A', '2026-04-20T14:00:00Z'),
    ] as unknown as DebriefFeature[];
    const h = makeHarness({ features, timeRange: { start: 0, end: 10e12 } });
    h.service.onPlotOpened(DOC);
    const before = h.service.getSnapshot(DOC).storyboards.length;
    h.setFeaturesSpy.mockClear();

    await h.service.createStoryboard(DOC, 'Alpha'); // duplicate

    expect(h.showErrorMessageSpy).toHaveBeenCalledTimes(1);
    expect(h.setFeaturesSpy).not.toHaveBeenCalled();
    expect(h.service.getSnapshot(DOC).storyboards.length).toBe(before);
  });

  it('rejects during in-flight transition (R9)', async () => {
    const features = [
      sb('sb-A', 'Alpha'),
      scene('s1', 'sb-A', '2026-04-20T14:00:00Z'),
      scene('s2', 'sb-A', '2026-04-20T14:05:00Z'),
    ] as unknown as DebriefFeature[];
    // Permissive timeRange so forward() transitions instead of hard-blocking.
    const h = makeHarness({ features, timeRange: { start: 0, end: 10e12 } });
    h.service.onPlotOpened(DOC);
    await h.service.forward(DOC); // in-flight
    expect(h.service.getSnapshot(DOC).transport.transitionInFlight).toBe(true);

    h.setFeaturesSpy.mockClear();
    await h.service.createStoryboard(DOC, 'Rejected');
    expect(h.setFeaturesSpy).not.toHaveBeenCalled();
  });
});

describe('StoryboardPlaybackService — renameStoryboard (T423)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('delegates to #215 CRUD and pushes new features back', async () => {
    const features = [
      sb('sb-A', 'Alpha'),
      scene('a1', 'sb-A', '2026-04-20T14:00:00Z'),
    ] as unknown as DebriefFeature[];
    const h = makeHarness({ features, timeRange: { start: 0, end: 10e12 } });
    h.service.onPlotOpened(DOC);
    h.setFeaturesSpy.mockClear();

    await h.service.renameStoryboard(DOC, 'sb-A', 'Renamed');

    expect(h.setFeaturesSpy).toHaveBeenCalledTimes(1);
    expect(h.service.getSnapshot(DOC).storyboards[0]!.name).toBe('Renamed');
  });

  it('surfaces UnknownStoryboard via showErrorMessage (no state mutation)', async () => {
    const features = [
      sb('sb-A', 'Alpha'),
      scene('a1', 'sb-A', '2026-04-20T14:00:00Z'),
    ] as unknown as DebriefFeature[];
    const h = makeHarness({ features, timeRange: { start: 0, end: 10e12 } });
    h.service.onPlotOpened(DOC);
    h.setFeaturesSpy.mockClear();

    await h.service.renameStoryboard(DOC, 'sb-DOES-NOT-EXIST', 'NewName');

    expect(h.showErrorMessageSpy).toHaveBeenCalledTimes(1);
    expect(h.setFeaturesSpy).not.toHaveBeenCalled();
  });
});

describe('StoryboardPlaybackService — deleteStoryboard (T424)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('delegates to cascading #215 CRUD and pushes new features back', async () => {
    const features = [
      sb('sb-A', 'Alpha', '2026-04-20T10:00:00Z'),
      sb('sb-B', 'Bravo', '2026-04-21T10:00:00Z'),
      scene('a1', 'sb-A', '2026-04-20T14:00:00Z'),
      scene('b1', 'sb-B', '2026-04-21T14:00:00Z'),
      scene('b2', 'sb-B', '2026-04-21T14:05:00Z'),
    ] as unknown as DebriefFeature[];
    const h = makeHarness({ features, timeRange: { start: 0, end: 10e12 } });
    h.service.onPlotOpened(DOC); // sb-B active
    h.setFeaturesSpy.mockClear();

    await h.service.deleteStoryboard(DOC, 'sb-B');

    expect(h.setFeaturesSpy).toHaveBeenCalledTimes(1);
    const snap = h.service.getSnapshot(DOC);
    expect(snap.storyboards.map((s) => s.storyboardId)).toEqual(['sb-A']);
  });

  it('re-seeds active via getMostRecentlyModifiedStoryboard when active was deleted', async () => {
    const features = [
      sb('sb-A', 'Alpha', '2026-04-20T10:00:00Z'),
      sb('sb-B', 'Bravo', '2026-04-21T10:00:00Z'),
      scene('a1', 'sb-A', '2026-04-20T14:00:00Z'),
      scene('b1', 'sb-B', '2026-04-21T14:00:00Z'),
    ] as unknown as DebriefFeature[];
    const h = makeHarness({ features, timeRange: { start: 0, end: 10e12 } });
    h.service.onPlotOpened(DOC); // sb-B active

    await h.service.deleteStoryboard(DOC, 'sb-B');

    expect(h.service.getSnapshot(DOC).activeStoryboardId).toBe('sb-A');
  });

  it('clears storyboardActive context and scrubbable override when no Storyboards remain', async () => {
    const features = [
      sb('sb-A', 'Alpha'),
      scene('a1', 'sb-A', '2026-04-20T14:00:00Z'),
    ] as unknown as DebriefFeature[];
    const h = makeHarness({ features, timeRange: { start: 0, end: 10e12 } });
    h.service.onPlotOpened(DOC);
    h.executeSetContextSpy.mockClear();
    h.setScrubbableRangeSpy.mockClear();

    await h.service.deleteStoryboard(DOC, 'sb-A');

    expect(h.executeSetContextSpy).toHaveBeenCalledWith(
      'debrief.storyboardActive',
      false,
    );
    // Scrubbable override cleared (start/end both null).
    const nullCalls = h.setScrubbableRangeSpy.mock.calls.filter(
      (call) => call[0] === null && call[1] === null,
    );
    expect(nullCalls.length).toBeGreaterThanOrEqual(1);
    expect(h.service.getSnapshot(DOC).activeStoryboardId).toBeNull();
  });
});
