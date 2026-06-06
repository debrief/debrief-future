/**
 * @vitest-environment jsdom
 *
 * Service-level tests for #237 active-Storyboard selection persistence
 * inside `StoryboardPlaybackService`.
 *
 * The fake plot-edit pipeline is the harness's `mapPanel.setFeatures` —
 * the same call site every storyboard CRUD op uses. We assert that the
 * service emits a `SystemState` Feature with `state_type: active_storyboard`
 * via `setFeatures` whenever the analyst overrides the active Storyboard
 * (US1), and that the same write also performs the open-time self-heal
 * when a stale entry is found (US2 — landed in Phase 4).
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
import {
  ACTIVE_STORYBOARD_FEATURE_ID,
  ACTIVE_STORYBOARD_STATE_TYPE,
} from '@debrief/components';
import type { DebriefFeature } from '@debrief/components';
import type { StoryboardFeature, Viewport } from '@debrief/schemas';
import type { SessionStoreApi } from '@debrief/session-state';

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

function activeSelectionFeature(id: string): DebriefFeature {
  return {
    type: 'Feature',
    id: ACTIVE_STORYBOARD_FEATURE_ID,
    geometry: { type: 'Point', coordinates: [] },
    properties: {
      kind: 'SYSTEM',
      state_type: ACTIVE_STORYBOARD_STATE_TYPE,
      active_storyboard_id: id,
    },
  } as unknown as DebriefFeature;
}

interface Harness {
  service: StoryboardPlaybackService;
  setFeaturesSpy: ReturnType<typeof vi.fn>;
  showErrorMessageSpy: ReturnType<typeof vi.fn>;
  getCurrentFeatures: () => DebriefFeature[];
}

function makeHarness(initialFeatures: DebriefFeature[] = []): Harness {
  let features: DebriefFeature[] = [...initialFeatures];
  const documentUri = 'stac://test/plot.json';

  const setFeaturesSpy = vi.fn((next: readonly DebriefFeature[]) => {
    features = [...next];
  });

  const onFlyToCompleteEmitter = new vscode.EventEmitter<number>();
  const onSceneRectangleClickEmitter = new vscode.EventEmitter<string>();
  const onFeaturesChangedEmitter = new vscode.EventEmitter<DebriefFeature[]>();
  const onActiveSessionChangeEmitter = new vscode.EventEmitter<SessionStoreApi | null>();
  const visibilityEmitter = new vscode.EventEmitter<boolean>();

  const mapPanel: PlaybackMapPanel = {
    getCurrentFeatures: () => features.slice(),
    setFeatures: setFeaturesSpy,
    flyToViewport: vi.fn((_v: Viewport, _d: number): number => 0),
    setSceneRectangles: vi.fn(),
    onFlyToComplete: onFlyToCompleteEmitter.event,
    onSceneRectangleClick: onSceneRectangleClickEmitter.event,
    onFeaturesChanged: onFeaturesChangedEmitter.event,
  };

  const sessionStore: Partial<SessionStoreApi> = {
    getState: () =>
      ({
        timeRange: { start: 0, end: 86_400_000 },
        currentTime: 0,
        setCurrentTime: vi.fn(),
      } as unknown as ReturnType<SessionStoreApi['getState']>),
  };
  const sessionManager: PlaybackSessionManager = {
    getActiveDocumentUri: () => documentUri,
    getSession: () => sessionStore as SessionStoreApi,
    getActiveSession: () => sessionStore as SessionStoreApi,
    onActiveSessionChange: onActiveSessionChangeEmitter.event,
  };

  const panelView: PlaybackPanelView = { applySnapshot: vi.fn() };
  const timeRangeView: PlaybackTimeRangeView = { setScrubbableRange: vi.fn() };
  const visibilityPort: VisibilityPort = {
    onDidChangeVisibility: visibilityEmitter.event,
  };
  const modalPromptPort: ModalPromptPort = {
    showInformationMessage: vi.fn(async () => undefined) as unknown as ModalPromptPort['showInformationMessage'],
  };
  const showErrorMessageSpy = vi.fn();

  const service = new StoryboardPlaybackService({
    sessionManager,
    mapPanel,
    panelView,
    timeRangeView,
    modalPromptPort,
    visibilityPort,
    showErrorMessage: showErrorMessageSpy,
    setContext: vi.fn(),
  });

  return {
    service,
    setFeaturesSpy,
    showErrorMessageSpy,
    getCurrentFeatures: () => features.slice(),
  };
}

const DOC = 'stac://test/plot.json';

// ─── US1: happy path ────────────────────────────────────────────────

describe('StoryboardPlaybackService — active-storyboard persistence (US1)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('preserves today behaviour when no SystemState feature is present (SC-002)', () => {
    const sbA = sb('sb-A', 'A', '2026-04-20T09:00:00.000Z');
    const sbB = sb('sb-B', 'B', '2026-04-20T14:00:00.000Z');
    const h = makeHarness([sbA as DebriefFeature, sbB as DebriefFeature]);

    h.service.onPlotOpened(DOC);

    const snap = h.service.getSnapshot(DOC);
    expect(snap.activeStoryboardId).toBe('sb-B');
    expect(h.setFeaturesSpy).not.toHaveBeenCalled();
  });

  it('honours a persisted SystemState selection when the recorded ID is present', () => {
    const sbA = sb('sb-A', 'A', '2026-04-20T09:00:00.000Z');
    const sbB = sb('sb-B', 'B', '2026-04-20T14:00:00.000Z');
    const seeded = activeSelectionFeature('sb-A');
    const h = makeHarness([
      sbA as DebriefFeature,
      sbB as DebriefFeature,
      seeded,
    ]);

    h.service.onPlotOpened(DOC);

    const snap = h.service.getSnapshot(DOC);
    // 'sb-A' wins over the most-recently-modified default 'sb-B' because
    // the persisted SystemState pin overrides the default rule.
    expect(snap.activeStoryboardId).toBe('sb-A');
    expect(h.setFeaturesSpy).not.toHaveBeenCalled();
  });

  it('writes a SystemState Feature through the edit pipeline when the analyst overrides via setActiveStoryboard', () => {
    const sbA = sb('sb-A', 'A', '2026-04-20T09:00:00.000Z');
    const sbB = sb('sb-B', 'B', '2026-04-20T14:00:00.000Z');
    const h = makeHarness([sbA as DebriefFeature, sbB as DebriefFeature]);

    h.service.onPlotOpened(DOC);
    expect(h.setFeaturesSpy).not.toHaveBeenCalled();

    h.service.setActiveStoryboard(DOC, 'sb-A');

    expect(h.setFeaturesSpy).toHaveBeenCalledTimes(1);
    const written = h.setFeaturesSpy.mock.calls[0]![0] as DebriefFeature[];
    const matches = written.filter(
      (f) =>
        (f.properties as { state_type?: unknown } | null)?.state_type ===
        ACTIVE_STORYBOARD_STATE_TYPE,
    );
    expect(matches).toHaveLength(1);
    expect(
      (matches[0]!.properties as { active_storyboard_id?: string }).active_storyboard_id,
    ).toBe('sb-A');
  });

  it('round-trip — after override + reopen the persisted ID is honoured', () => {
    const sbA = sb('sb-A', 'A', '2026-04-20T09:00:00.000Z');
    const sbB = sb('sb-B', 'B', '2026-04-20T14:00:00.000Z');
    const h = makeHarness([sbA as DebriefFeature, sbB as DebriefFeature]);

    h.service.onPlotOpened(DOC);
    h.service.setActiveStoryboard(DOC, 'sb-A');
    h.service.onPlotClosed(DOC);

    h.service.onPlotOpened(DOC);
    expect(h.service.getSnapshot(DOC).activeStoryboardId).toBe('sb-A');
  });

  it('does NOT add a top-level provenance entry on the SystemState write (FR-014)', () => {
    const sbA = sb('sb-A', 'A', '2026-04-20T09:00:00.000Z');
    const sbB = sb('sb-B', 'B', '2026-04-20T14:00:00.000Z');
    const h = makeHarness([sbA as DebriefFeature, sbB as DebriefFeature]);

    h.service.onPlotOpened(DOC);
    h.service.setActiveStoryboard(DOC, 'sb-A');

    const written = h.setFeaturesSpy.mock.calls[0]![0] as DebriefFeature[];
    const sysFeature = written.find(
      (f) =>
        (f.properties as { state_type?: unknown } | null)?.state_type ===
        ACTIVE_STORYBOARD_STATE_TYPE,
    );
    expect(sysFeature).toBeDefined();
    const props = sysFeature!.properties as { provenance?: unknown };
    // SystemState's own provenance slot must remain empty/absent for #237.
    expect(props.provenance ?? []).toEqual([]);
  });
});

// ─── US2: stale fallback + self-heal ─────────────────────────────────

describe('StoryboardPlaybackService — active-storyboard persistence (US2)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('falls back silently to default when persisted ID is not in the plot (FR-006, SC-003)', () => {
    const sbA = sb('sb-A', 'A', '2026-04-20T09:00:00.000Z');
    const sbB = sb('sb-B', 'B', '2026-04-20T14:00:00.000Z');
    const stale = activeSelectionFeature('sb-DELETED');
    const h = makeHarness([
      sbA as DebriefFeature,
      sbB as DebriefFeature,
      stale,
    ]);

    h.service.onPlotOpened(DOC);

    expect(h.service.getSnapshot(DOC).activeStoryboardId).toBe('sb-B');
    expect(h.showErrorMessageSpy).not.toHaveBeenCalled();
  });

  it('self-heals on open by writing the new default ID through the edit pipeline (FR-007)', () => {
    const sbA = sb('sb-A', 'A', '2026-04-20T09:00:00.000Z');
    const sbB = sb('sb-B', 'B', '2026-04-20T14:00:00.000Z');
    const stale = activeSelectionFeature('sb-DELETED');
    const h = makeHarness([
      sbA as DebriefFeature,
      sbB as DebriefFeature,
      stale,
    ]);

    h.service.onPlotOpened(DOC);

    expect(h.setFeaturesSpy).toHaveBeenCalledTimes(1);
    const written = h.setFeaturesSpy.mock.calls[0]![0] as DebriefFeature[];
    const matches = written.filter(
      (f) =>
        (f.properties as { state_type?: unknown } | null)?.state_type ===
        ACTIVE_STORYBOARD_STATE_TYPE,
    );
    expect(matches).toHaveLength(1);
    expect(
      (matches[0]!.properties as { active_storyboard_id?: string }).active_storyboard_id,
    ).toBe('sb-B');
  });

  it('does NOT self-heal when no persisted SystemState entry exists (first-ever open)', () => {
    const sbA = sb('sb-A', 'A', '2026-04-20T09:00:00.000Z');
    const sbB = sb('sb-B', 'B', '2026-04-20T14:00:00.000Z');
    const h = makeHarness([sbA as DebriefFeature, sbB as DebriefFeature]);

    h.service.onPlotOpened(DOC);

    expect(h.setFeaturesSpy).not.toHaveBeenCalled();
  });

  it('does NOT self-heal when the persisted ID is still valid', () => {
    const sbA = sb('sb-A', 'A', '2026-04-20T09:00:00.000Z');
    const sbB = sb('sb-B', 'B', '2026-04-20T14:00:00.000Z');
    const seeded = activeSelectionFeature('sb-A');
    const h = makeHarness([
      sbA as DebriefFeature,
      sbB as DebriefFeature,
      seeded,
    ]);

    h.service.onPlotOpened(DOC);

    expect(h.setFeaturesSpy).not.toHaveBeenCalled();
    expect(h.service.getSnapshot(DOC).activeStoryboardId).toBe('sb-A');
  });
});
