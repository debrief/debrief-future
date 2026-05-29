/**
 * spec 267 — `hydrateStoreFromFeatures` returns the playhead clamps (US1).
 *
 * Uses a structural `ViewStateStore` stub (no Zustand) — the bridge only calls
 * the slice *setters*, so the stub captures the values they receive and returns
 * the diagnostics array the host would render.
 */
import { describe, it, expect } from 'vitest';
import { hydrateStoreFromFeatures, type ViewStateStore, type FeatureLike } from '../store-bridge.js';

/** A capturing structural stub of the view-state setters the bridge invokes. */
function makeStoreStub(): { store: ViewStateStore; captured: { currentTime: number | null } } {
  const captured: { currentTime: number | null } = { currentTime: null };
  const noop = (): void => undefined;
  const store = {
    // Slice fields (unused on the hydrate path, present for the structural type).
    currentTime: null,
    timeRange: null,
    timeFilter: null,
    stepSize: null,
    playbackRate: 1,
    displayMode: 'full',
    viewport: null,
    rotation: 0,
    selection: { featureIds: [], primary: null },
    hiddenFeatureIds: [],
    // Actions the bridge calls.
    setTimeRange: noop,
    setCurrentTime: (t: number) => {
      captured.currentTime = t;
    },
    setTimeFilter: noop,
    setStepSize: noop,
    setPlaybackRate: noop,
    setDisplayMode: noop,
    setViewport: noop,
    setRotation: noop,
    setSelection: noop,
    setHiddenFeatures: noop,
  } as unknown as ViewStateStore;
  return { store, captured };
}

const temporal = (current_time: string): FeatureLike => ({
  type: 'Feature',
  id: 'state.temporal',
  geometry: { type: 'Point', coordinates: [] },
  properties: {
    kind: 'SYSTEM',
    state_type: 'temporal',
    start_time: '2024-01-01T00:00:00Z',
    end_time: '2024-01-07T00:00:00Z',
    current_time,
  },
});

describe('hydrateStoreFromFeatures — tolerant playhead clamp (spec 267)', () => {
  it('returns one PlayheadClampDiagnostic and clamps the store currentTime to the edge', () => {
    const { store, captured } = makeStoreStub();
    const clamps = hydrateStoreFromFeatures(store, [temporal('2024-02-01T00:00:00Z')]);

    expect(clamps).toHaveLength(1);
    expect(clamps[0]).toMatchObject({
      kind: 'playhead-clamped',
      feature_id: 'state.temporal',
      edge: 'end',
      originalCurrentTime: '2024-02-01T00:00:00Z',
      clampedCurrentTime: '2024-01-07T00:00:00Z',
    });
    // The store's playhead was set to the window edge (epoch ms).
    expect(captured.currentTime).toBe(Date.parse('2024-01-07T00:00:00Z'));
  });

  it('returns [] for an in-window (clean) plot and honours the saved playhead', () => {
    const { store, captured } = makeStoreStub();
    const clamps = hydrateStoreFromFeatures(store, [temporal('2024-01-03T00:00:00Z')]);

    expect(clamps).toEqual([]);
    expect(captured.currentTime).toBe(Date.parse('2024-01-03T00:00:00Z'));
  });

  it('returns [] for a plot with no SystemState features', () => {
    const { store } = makeStoreStub();
    const track: FeatureLike = {
      type: 'Feature',
      id: 't1',
      geometry: { type: 'LineString', coordinates: [] },
      properties: { kind: 'TRACK' },
    };
    expect(hydrateStoreFromFeatures(store, [track])).toEqual([]);
  });
});
