/**
 * @vitest-environment jsdom
 *
 * Reproduction tests for the bug reported in PR #606 ("clicks don't
 * navigate; after capture every click goes to the first scene's time").
 *
 * Field hypothesis: the user opens a saved plot whose features.geojson
 * already contains a Storyboard + Scenes, but `onPlotOpened` runs before
 * those features hydrate into MapPanel.getCurrentFeatures(). The
 * playback service captures an empty state. Features then load, but
 * `onPlotFeaturesChanged` is never wired (or never fires) for that plot,
 * so state stays empty. When the user clicks a scene row, `goToScene`
 * silently no-ops at the `sceneOrder.indexOf(...) < 0` guard.
 *
 * These tests pin both the "first-click after stale onPlotOpened" path
 * and the "click second scene after seeding" path so regressions in
 * either are caught.
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
import type { SessionStoreApi } from '@debrief/session-state';

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
      schema_version: 1,
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

function scene(
  id: string,
  storyboardId: string,
  timestampIso: string,
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
      visible_feature_ids: [],
      feature_set_hash: 'deadbeef'.repeat(8),
      thumbnail_asset_ref: `scene-${id}.png`,
      transition_duration_ms: 500,
      schema_version: 1,
    },
  } as unknown as SceneFeature;
}

interface Harness {
  service: StoryboardPlaybackService;
  flyToViewportSpy: ReturnType<typeof vi.fn>;
  setCurrentTimeSpy: ReturnType<typeof vi.fn>;
  /** Replace the features buffer WITHOUT firing onFeaturesChanged. */
  setFeaturesSilently(next: DebriefFeature[]): void;
  /** Replace the features buffer AND fire onFeaturesChanged. */
  setFeaturesAndNotify(next: DebriefFeature[]): void;
  /** Fire onFlyToComplete for the most recent token (clears transitionId). */
  completeMostRecentFlyTo(): void;
}

function makeHarness(initialFeatures: DebriefFeature[] = []): Harness {
  const documentUri = 'stac://test/plot.json';
  let features = initialFeatures;
  let flyToTokenCounter = 0;

  const flyToViewportSpy = vi.fn(
    (_viewport: Viewport, _durationMs: number): number => {
      flyToTokenCounter += 1;
      return flyToTokenCounter;
    },
  );
  const setSceneRectanglesSpy = vi.fn();
  const setScrubbableRangeSpy = vi.fn();
  const setFeaturesSpy = vi.fn((next: readonly DebriefFeature[]) => {
    features = [...next];
  });
  const applySnapshotSpy = vi.fn();
  const setCurrentTimeSpy = vi.fn();

  const onFlyToCompleteEmitter = new vscode.EventEmitter<number>();
  const onSceneRectangleClickEmitter = new vscode.EventEmitter<string>();
  const onFeaturesChangedEmitter = new vscode.EventEmitter<DebriefFeature[]>();
  const onActiveSessionChangeEmitter = new vscode.EventEmitter<
    SessionStoreApi | null
  >();

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
        timeRange: { start: 0, end: 10e12 },
        currentTime: 0,
        setCurrentTime: setCurrentTimeSpy,
      } as unknown as ReturnType<SessionStoreApi['getState']>),
  };
  const sessionManager: PlaybackSessionManager = {
    getActiveDocumentUri: () => documentUri,
    getSession: (_uri: string) => sessionStore as SessionStoreApi,
    getActiveSession: () => sessionStore as SessionStoreApi,
    onActiveSessionChange: onActiveSessionChangeEmitter.event,
  };

  const panelView: PlaybackPanelView = { applySnapshot: applySnapshotSpy };
  const timeRangeView: PlaybackTimeRangeView = {
    setScrubbableRange: setScrubbableRangeSpy,
  };

  const visibilityEmitter = new vscode.EventEmitter<boolean>();
  const visibilityPort: VisibilityPort = {
    onDidChangeVisibility: visibilityEmitter.event,
  };

  const modalPromptPort: ModalPromptPort = {
    showInformationMessage: vi.fn() as unknown as ModalPromptPort['showInformationMessage'],
  };

  const service = new StoryboardPlaybackService({
    sessionManager,
    mapPanel,
    panelView,
    timeRangeView,
    modalPromptPort,
    visibilityPort,
    showErrorMessage: vi.fn(),
    setContext: vi.fn(),
    now: () => Date.now(),
  });

  return {
    service,
    flyToViewportSpy,
    setCurrentTimeSpy,
    setFeaturesSilently: (next): void => {
      features = next;
    },
    setFeaturesAndNotify: (next): void => {
      features = next;
      onFeaturesChangedEmitter.fire(next.slice());
    },
    completeMostRecentFlyTo: (): void => {
      onFlyToCompleteEmitter.fire(flyToTokenCounter);
    },
  };
}

const DOC = 'stac://test/plot.json';

describe('PR #606 regression: late-feature-hydration click', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('clicking a scene after onPlotOpened ran with empty features still navigates (lazy seed)', async () => {
    // Simulate: plot opened before features.geojson hydrated.
    const h = makeHarness([]);
    h.service.onPlotOpened(DOC);

    // Features arrive AFTER onPlotOpened — but onFeaturesChanged
    // doesn't fire (event-wiring race in extension.ts). MapPanel still
    // returns the features via getCurrentFeatures().
    const features = [
      sb('sb-A', 'Alpha'),
      scene('s1', 'sb-A', '2026-04-20T14:00:00Z', [1, 1]),
      scene('s2', 'sb-A', '2026-04-20T14:05:00Z', [2, 2]),
      scene('s3', 'sb-A', '2026-04-20T14:10:00Z', [3, 3]),
    ] as unknown as DebriefFeature[];
    h.setFeaturesSilently(features);

    // User clicks scene s3 → should fly to s3's viewport.
    await h.service.goToScene(DOC, 's3');

    expect(h.flyToViewportSpy).toHaveBeenCalledTimes(1);
    const [viewport] = h.flyToViewportSpy.mock.calls[0]!;
    expect(viewport).toEqual({ center: [3, 3], zoom: 10, bearing: 0 });
  });

  it('after capture-triggered seeding, clicking scene N flies to scene N (not scene 0)', async () => {
    // Simulate: plot opened with no features, then a capture happened
    // (which fires setFeatures + onFeaturesChanged, seeding state).
    const h = makeHarness([]);
    h.service.onPlotOpened(DOC);

    const features = [
      sb('sb-A', 'Alpha'),
      scene('s1', 'sb-A', '2026-04-20T14:00:00Z', [10, 10]),
      scene('s2', 'sb-A', '2026-04-20T14:05:00Z', [20, 20]),
      scene('s3', 'sb-A', '2026-04-20T14:10:00Z', [30, 30]),
      scene('s4', 'sb-A', '2026-04-20T14:15:00Z', [40, 40]),
    ] as unknown as DebriefFeature[];
    h.setFeaturesAndNotify(features); // fires onPlotFeaturesChanged path

    // First click: s3. Should fly to [30, 30].
    await h.service.goToScene(DOC, 's3');
    h.completeMostRecentFlyTo(); // clear in-flight before next click

    expect(h.flyToViewportSpy).toHaveBeenCalledTimes(1);
    const firstViewport = h.flyToViewportSpy.mock.calls[0]![0] as Viewport;
    expect(firstViewport).toEqual({ center: [30, 30], zoom: 10, bearing: 0 });

    // Second click: s4. Should fly to [40, 40] — NOT [10, 10] (the
    // user's report: "every click navigates to the first scene's time").
    await h.service.goToScene(DOC, 's4');
    expect(h.flyToViewportSpy).toHaveBeenCalledTimes(2);
    const secondViewport = h.flyToViewportSpy.mock.calls[1]![0] as Viewport;
    expect(secondViewport).toEqual({ center: [40, 40], zoom: 10, bearing: 0 });

    // Defensive: setCurrentTime should have been called with each
    // scene's distinct timestamp, never collapsing to s1's timestamp.
    const timeCalls = h.setCurrentTimeSpy.mock.calls.map((c) => c[0] as number);
    expect(timeCalls.length).toBe(2);
    const s3Epoch = new Date('2026-04-20T14:10:00Z').getTime();
    const s4Epoch = new Date('2026-04-20T14:15:00Z').getTime();
    const s1Epoch = new Date('2026-04-20T14:00:00Z').getTime();
    expect(timeCalls).toEqual([s3Epoch, s4Epoch]);
    expect(timeCalls).not.toContain(s1Epoch);
  });

  it('onPlotFeaturesChanged (simulating capture) does NOT trigger flyToViewport (symptom 3)', () => {
    // Simulate: plot opened with no features.
    const h = makeHarness([]);
    h.service.onPlotOpened(DOC);

    // User has panned the map (current viewport is wherever they panned to).
    // Then they capture a new scene — captureScene calls
    // mapPanel.setFeatures(...) which fires onFeaturesChanged →
    // playbackService.onPlotFeaturesChanged.
    const features = [
      sb('sb-A', 'Alpha'),
      scene('s1', 'sb-A', '2026-04-20T14:00:00Z', [10, 10]),
    ] as unknown as DebriefFeature[];
    h.setFeaturesAndNotify(features);

    // The service must NOT fly the map as a side effect of seeding —
    // the user's pan/zoom state must survive a capture-driven seed.
    expect(h.flyToViewportSpy).not.toHaveBeenCalled();
    expect(h.setCurrentTimeSpy).not.toHaveBeenCalled();
  });
});

