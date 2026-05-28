/**
 * Feature 261 — VS Code SystemState bridge (T057/T070).
 *
 * Proves the host load/save translation without a VS Code host:
 *   - an FC with no state.* features hydrates to defaults (no error)
 *   - an FC with state.* features hydrates the store correctly
 *   - saving a populated store yields the three state.* features and writes
 *     no sidecar
 *   - active_storyboard is preserved as pass-through on save
 *   - a populated store round-trips through applyStateToFeatures -> hydrate
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { createSessionStore, type SessionStoreApi } from '@debrief/session-state';
import {
  applyStateToFeatures,
  hydrateStoreFromFeatures,
  SystemStateLoadError,
  type FeatureLike,
} from '../../src/services/systemStateBridge';

const track = (id: string): FeatureLike => ({
  type: 'Feature',
  id,
  geometry: { type: 'LineString', coordinates: [] },
  properties: { kind: 'TRACK', name: id },
});

const viewport = {
  coordinates: [
    { longitude: -3.5, latitude: 51.5 },
    { longitude: 2.5, latitude: 51.5 },
    { longitude: 2.5, latitude: 50.0 },
    { longitude: -3.5, latitude: 50.0 },
  ],
  zoom: 8,
};

describe('systemStateBridge', () => {
  let store: SessionStoreApi;
  beforeEach(() => {
    store = createSessionStore();
  });

  it('hydrates to defaults when the FC has no SystemState features (FR-008)', () => {
    hydrateStoreFromFeatures(store.getState(), [track('t1')]);
    expect(store.getState().viewport).toBeNull();
    expect(store.getState().timeRange).toBeNull();
    expect(store.getState().selection.featureIds).toEqual([]);
    expect(store.getState().hiddenFeatureIds).toEqual([]);
    expect(store.getState().dirty).toBe(false);
  });

  it('saving a populated store yields the three state.* features and no sidecar', () => {
    const s = store.getState();
    s.setViewport(viewport);
    s.setRotation(15);
    s.setTimeRange({ start: Date.parse('2024-01-01T00:00:00Z'), end: Date.parse('2024-01-07T00:00:00Z') });
    s.setCurrentTime(Date.parse('2024-01-03T00:00:00Z'));
    s.setSelection(['t1'], 't1');
    s.setHiddenFeatures(['t2']);

    const out = applyStateToFeatures([track('t1'), track('t2')], store.getState());
    const ids = out.map((f) => String(f.id));
    expect(ids).toContain('state.spatial');
    expect(ids).toContain('state.temporal');
    expect(ids).toContain('state.selection');
    // No sidecar concept exists in the output — it is a single FeatureCollection.
    const hidden = out.find((f) => f.id === 't2');
    expect((hidden?.properties as Record<string, unknown>).visible).toBe(false);
    const visible = out.find((f) => f.id === 't1');
    expect((visible?.properties as Record<string, unknown>).visible).toBeUndefined();
  });

  it('preserves an existing active_storyboard feature on save (pass-through)', () => {
    const activeSb: FeatureLike = {
      type: 'Feature',
      id: 'state.activestoryboard',
      geometry: { type: 'Point', coordinates: [] },
      properties: { kind: 'SYSTEM', state_type: 'active_storyboard', active_storyboard_id: 'sb-1' },
    };
    store.getState().setViewport(viewport);
    const out = applyStateToFeatures([track('t1'), activeSb], store.getState());
    const sb = out.find((f) => f.id === 'state.activestoryboard');
    expect((sb?.properties as Record<string, unknown>).active_storyboard_id).toBe('sb-1');
  });

  it('round-trips store -> FC -> store for view-state + visibility', () => {
    const a = store.getState();
    a.setViewport(viewport);
    a.setRotation(15);
    a.setTimeRange({ start: Date.parse('2024-01-01T00:00:00Z'), end: Date.parse('2024-01-07T00:00:00Z') });
    a.setSelection(['t1'], 't1');
    a.setHiddenFeatures(['t2']);
    const fc = applyStateToFeatures([track('t1'), track('t2')], store.getState());

    const store2 = createSessionStore();
    hydrateStoreFromFeatures(store2.getState(), fc);
    const b = store2.getState();
    expect(b.viewport).toEqual(viewport);
    expect(b.rotation).toBe(15);
    expect(b.timeRange).toEqual({
      start: Date.parse('2024-01-01T00:00:00Z'),
      end: Date.parse('2024-01-07T00:00:00Z'),
    });
    expect(b.selection.featureIds).toEqual(['t1']);
    expect(b.hiddenFeatureIds).toEqual(['t2']);
  });

  it('throws SystemStateLoadError on a malformed SystemState feature (strict-on-import)', () => {
    const bad: FeatureLike = {
      type: 'Feature',
      id: 'state.spatial',
      geometry: { type: 'Point', coordinates: [] },
      properties: { kind: 'SYSTEM', state_type: 'spatial' }, // missing viewport
    };
    expect(() => hydrateStoreFromFeatures(store.getState(), [bad])).toThrow(SystemStateLoadError);
  });
});
