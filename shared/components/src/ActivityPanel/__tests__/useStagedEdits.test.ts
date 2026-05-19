/**
 * Unit tests for useStagedEdits (Spec 192 — Phase 2, T013).
 *
 * Covers all 16 cases from contracts/staged-edits-store.md plus the additions
 * implied by the spec (sparse-omission, provenance-path shape, selection-
 * independence assertion).
 *
 * Article VII.1: tests authored before the implementation in useStagedEdits.ts.
 */

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type {
  TrackFeature,
  PolyAnnotation,
  TrackProperties,
  PolyAnnotationProperties,
  VertexMetadata,
} from '@debrief/schemas';
import { useStagedEdits } from '../useStagedEdits';
import type { FeatureForEdit } from '../useStagedEdits';

// ─── Fixture builders ────────────────────────────────────────────────

function buildTrack(
  id: string,
  overrides: Partial<TrackProperties> = {}
): TrackFeature {
  return {
    type: 'Feature',
    id,
    geometry: {
      type: 'LineString',
      // eslint-disable-next-line no-restricted-syntax
      coordinates: [
        [-5, 50],
        [-4.9, 50.05],
        [-4.8, 50.1],
      ] as unknown as number[],
    },
    properties: {
      kind: 'TRACK',
      platform_id: 'PLT-001',
      track_type: 'OWNSHIP',
      start_time: '2024-01-15T08:00:00Z',
      end_time: '2024-01-15T12:00:00Z',
      positions: [
        { time: '2024-01-15T08:00:00Z' },
        { time: '2024-01-15T08:05:00Z' },
        { time: '2024-01-15T08:10:00Z' },
      ],
      style: {} as TrackProperties['style'],
      default_position_style: {} as TrackProperties['default_position_style'],
      ...overrides,
    } as TrackProperties,
  } as TrackFeature;
}

function buildPoly(
  id: string,
  overrides: Partial<PolyAnnotationProperties> = {},
  vertexMetadata?: VertexMetadata[]
): PolyAnnotation {
  const props: PolyAnnotationProperties = {
    kind: 'POLY',
    vertex_count: 4,
    style: {} as PolyAnnotationProperties['style'],
    ...overrides,
  } as PolyAnnotationProperties;
  if (vertexMetadata) {
    props.vertex_metadata = vertexMetadata;
  }
  return {
    type: 'Feature',
    id,
    geometry: {
      type: 'Polygon',
      // eslint-disable-next-line no-restricted-syntax
      coordinates: [
        [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 1],
          [0, 0],
        ],
      ] as unknown as number[],
    },
    properties: props,
  } as PolyAnnotation;
}

// ─── Tests ────────────────────────────────────────────────────────────

describe('useStagedEdits', () => {
  describe('setFeatureField', () => {
    it('stores value', () => {
      const { result } = renderHook(() => useStagedEdits());

      act(() => {
        result.current.setFeatureField('f1', 'display_name', 'Frigate A', undefined);
      });

      expect(result.current.state.byFeature['f1']).toEqual({
        display_name: 'Frigate A',
      });
      expect(result.current.isDirty()).toBe(true);
    });

    it('with value === current prunes the entry', () => {
      const { result } = renderHook(() => useStagedEdits());

      // First, set a value (creates the entry)
      act(() => {
        result.current.setFeatureField('f1', 'display_name', 'Frigate A', undefined);
      });
      expect(result.current.state.byFeature['f1']?.display_name).toBe('Frigate A');

      // Then set the same value as current → pruned
      act(() => {
        result.current.setFeatureField('f1', 'display_name', 'Frigate A', 'Frigate A');
      });

      expect(result.current.state.byFeature['f1']).toBeUndefined();
      expect(result.current.isDirty()).toBe(false);
    });

    it('prunes empty feature partials after the last slot is pruned', () => {
      const { result } = renderHook(() => useStagedEdits());

      act(() => {
        result.current.setFeatureField('f1', 'display_name', 'Frigate A', undefined);
        result.current.setFeatureField('f1', 'nationality', 'GB', undefined);
      });
      expect(Object.keys(result.current.state.byFeature['f1'] ?? {})).toHaveLength(2);

      // Prune both slots (next === current)
      act(() => {
        result.current.setFeatureField('f1', 'display_name', 'Frigate A', 'Frigate A');
      });
      // Still has one slot
      expect(result.current.state.byFeature['f1']).toEqual({ nationality: 'GB' });

      act(() => {
        result.current.setFeatureField('f1', 'nationality', 'GB', 'GB');
      });
      // Feature entry removed entirely (sparse storage)
      expect(result.current.state.byFeature['f1']).toBeUndefined();
    });
  });

  describe('setVertexField', () => {
    it('stores per-(featureId, path)', () => {
      const { result } = renderHook(() => useStagedEdits());

      act(() => {
        result.current.setVertexField('poly1', 'rings/0/vertices/2', 'label', 'NE corner', undefined);
        result.current.setVertexField('poly1', 'rings/0/vertices/2', 'note', 'long note', undefined);
        result.current.setVertexField('poly1', 'rings/0/vertices/3', 'label', 'SE corner', undefined);
      });

      expect(result.current.state.byVertex['poly1']?.['rings/0/vertices/2']).toEqual({
        label: 'NE corner',
        note: 'long note',
      });
      expect(result.current.state.byVertex['poly1']?.['rings/0/vertices/3']).toEqual({
        label: 'SE corner',
      });
    });

    it('prunes vertex partial when next === current and entry empties', () => {
      const { result } = renderHook(() => useStagedEdits());

      act(() => {
        result.current.setVertexField('poly1', 'rings/0/vertices/2', 'label', 'NE corner', undefined);
      });
      expect(result.current.state.byVertex['poly1']?.['rings/0/vertices/2']).toEqual({
        label: 'NE corner',
      });

      act(() => {
        result.current.setVertexField(
          'poly1',
          'rings/0/vertices/2',
          'label',
          'NE corner',
          'NE corner'
        );
      });

      // Path entry pruned; per-feature record also pruned because no paths remain
      expect(result.current.state.byVertex['poly1']).toBeUndefined();
    });
  });

  describe('isDirty', () => {
    it('is true after any setter', () => {
      const { result } = renderHook(() => useStagedEdits());

      expect(result.current.isDirty()).toBe(false);

      act(() => {
        result.current.setFeatureField('f1', 'display_name', 'X', undefined);
      });
      expect(result.current.isDirty()).toBe(true);
    });

    it('is false after pruning back to empty', () => {
      const { result } = renderHook(() => useStagedEdits());

      act(() => {
        result.current.setFeatureField('f1', 'display_name', 'X', undefined);
      });
      expect(result.current.isDirty()).toBe(true);

      act(() => {
        result.current.setFeatureField('f1', 'display_name', 'X', 'X');
      });
      expect(result.current.isDirty()).toBe(false);
    });

    it('is true after revertField alone', () => {
      const { result } = renderHook(() => useStagedEdits());

      act(() => {
        result.current.revertField('f1', 'nationality');
      });

      expect(result.current.isDirty()).toBe(true);
    });
  });

  describe('revertField', () => {
    it('adds slot to revertedFields and prunes any prior staged override', () => {
      const { result } = renderHook(() => useStagedEdits());

      // Stage an override first
      act(() => {
        result.current.setFeatureField('f1', 'nationality', 'GB', undefined);
      });
      expect(result.current.state.byFeature['f1']?.nationality).toBe('GB');

      // Now revert
      act(() => {
        result.current.revertField('f1', 'nationality');
      });

      // The staged override is pruned
      expect(result.current.state.byFeature['f1']?.nationality).toBeUndefined();
      // And the slot is in revertedFields
      expect(result.current.state.revertedFields['f1']?.has('nationality')).toBe(true);
    });

    it('marks a slot reverted even when no prior override exists', () => {
      const { result } = renderHook(() => useStagedEdits());

      act(() => {
        result.current.revertField('f1', 'display_name');
      });

      expect(result.current.state.revertedFields['f1']?.has('display_name')).toBe(true);
      expect(result.current.state.byFeature['f1']).toBeUndefined();
    });
  });

  describe('unrevertField', () => {
    it('removes slot from revertedFields', () => {
      const { result } = renderHook(() => useStagedEdits());

      act(() => {
        result.current.revertField('f1', 'display_name');
        result.current.revertField('f1', 'nationality');
      });
      expect(result.current.state.revertedFields['f1']?.size).toBe(2);

      act(() => {
        result.current.unrevertField('f1', 'display_name');
      });
      expect(result.current.state.revertedFields['f1']?.has('display_name')).toBe(false);
      expect(result.current.state.revertedFields['f1']?.has('nationality')).toBe(true);

      // Removing the last reverted slot drops the per-feature Set entirely.
      act(() => {
        result.current.unrevertField('f1', 'nationality');
      });
      expect(result.current.state.revertedFields['f1']).toBeUndefined();
    });
  });

  describe('selection-independence', () => {
    it('selection change does NOT touch the buffer (US-3 AS-3 invariant)', () => {
      // The hook exposes NO selection-related API. We assert this by:
      //   1. populating the buffer,
      //   2. NOT calling anything (i.e. simulate a parent-driven selection
      //      change that does not pass through the hook),
      //   3. observing the buffer is preserved.
      const { result, rerender } = renderHook(() => useStagedEdits());

      act(() => {
        result.current.setFeatureField('f1', 'display_name', 'Frigate A', undefined);
        result.current.setVertexField(
          'poly1',
          'rings/0/vertices/2',
          'label',
          'NE corner',
          undefined
        );
      });

      // Simulate the parent re-rendering after a selection change (no hook
      // call): the buffer must survive.
      rerender();

      expect(result.current.state.byFeature['f1']?.display_name).toBe('Frigate A');
      expect(result.current.state.byVertex['poly1']?.['rings/0/vertices/2']?.label).toBe(
        'NE corner'
      );
      expect(result.current.isDirty()).toBe(true);
    });
  });

  describe('applyEditsToFeatures', () => {
    it('merges feature-level edits (shallow merge into feature.properties)', () => {
      const { result } = renderHook(() => useStagedEdits());
      const track = buildTrack('t1', { nationality: 'US' });

      act(() => {
        result.current.setFeatureField('t1', 'display_name', 'Frigate A', undefined);
        result.current.setFeatureField('t1', 'nationality', 'GB', 'US');
      });

      const { nextFeatures, editedPaths } = result.current.applyEditsToFeatures([
        track,
      ] as FeatureForEdit[]);

      const nextTrack = nextFeatures[0] as TrackFeature;
      expect(nextTrack.properties.display_name).toBe('Frigate A');
      expect(nextTrack.properties.nationality).toBe('GB');
      // Untouched slots preserved
      expect(nextTrack.properties.platform_id).toBe('PLT-001');

      // editedPaths includes both slots, op 'set'
      const paths = new Set(editedPaths.map((p) => `${p.op}:${p.path}`));
      expect(paths.has('set:display_name')).toBe(true);
      expect(paths.has('set:nationality')).toBe(true);
    });

    it('DROPS reverted slots from saved feature.properties (sparse — slot absent, not null)', () => {
      const { result } = renderHook(() => useStagedEdits());
      const track = buildTrack('t1', { nationality: 'US' });

      act(() => {
        result.current.revertField('t1', 'nationality');
      });

      const { nextFeatures, editedPaths } = result.current.applyEditsToFeatures([
        track,
      ] as FeatureForEdit[]);

      const nextProps = (nextFeatures[0] as TrackFeature).properties as TrackProperties;
      // Slot must be ABSENT (sparse). Not `null`. Not `undefined`-as-defined-property.
      expect('nationality' in nextProps).toBe(false);

      // Provenance carries op 'revert'
      const reverts = editedPaths.filter((p) => p.op === 'revert');
      expect(reverts).toEqual([{ path: 'nationality', op: 'revert' }]);
    });

    it('appends a new VertexMetadata entry by path', () => {
      const { result } = renderHook(() => useStagedEdits());
      const poly = buildPoly('p1');

      act(() => {
        result.current.setVertexField(
          'p1',
          'rings/0/vertices/2',
          'label',
          'NE corner',
          undefined
        );
        result.current.setVertexField(
          'p1',
          'rings/0/vertices/2',
          'note',
          'mind the rocks',
          undefined
        );
      });

      const { nextFeatures } = result.current.applyEditsToFeatures([poly] as FeatureForEdit[]);
      const vm = (nextFeatures[0] as PolyAnnotation).properties.vertex_metadata ?? [];

      expect(vm).toHaveLength(1);
      expect(vm[0]).toEqual({
        path: 'rings/0/vertices/2',
        label: 'NE corner',
        note: 'mind the rocks',
      });
    });

    it('merges into an existing VertexMetadata entry by path (field-by-field)', () => {
      const { result } = renderHook(() => useStagedEdits());
      const poly = buildPoly('p1', {}, [
        { path: 'rings/0/vertices/2', label: 'NE corner', tags: ['lookout'] },
      ]);

      act(() => {
        result.current.setVertexField(
          'p1',
          'rings/0/vertices/2',
          'note',
          'mind the rocks',
          undefined
        );
        result.current.setVertexField(
          'p1',
          'rings/0/vertices/2',
          'label',
          'NE rock',
          'NE corner'
        );
      });

      const { nextFeatures } = result.current.applyEditsToFeatures([poly] as FeatureForEdit[]);
      const vm = (nextFeatures[0] as PolyAnnotation).properties.vertex_metadata ?? [];

      expect(vm).toHaveLength(1);
      expect(vm[0]).toEqual({
        path: 'rings/0/vertices/2',
        label: 'NE rock',
        note: 'mind the rocks',
        tags: ['lookout'], // untouched slot preserved
      });
    });

    it('prunes entries that become empty (label/tags/note all absent)', () => {
      // Start with an existing entry that has only `label`. Stage an edit
      // that clears `label` (next='', current='NE corner'). After flush,
      // the entry has no populated fields and must be dropped.
      const { result } = renderHook(() => useStagedEdits());
      const poly = buildPoly('p1', {}, [
        { path: 'rings/0/vertices/2', label: 'NE corner' },
        { path: 'rings/0/vertices/3', label: 'SE corner' },
      ]);

      act(() => {
        // setting label to empty string is a "clear" (we treat empty
        // string and undefined identically for flush-prune purposes)
        result.current.setVertexField(
          'p1',
          'rings/0/vertices/2',
          'label',
          undefined,
          'NE corner'
        );
      });

      const { nextFeatures } = result.current.applyEditsToFeatures([poly] as FeatureForEdit[]);
      const vm = (nextFeatures[0] as PolyAnnotation).properties.vertex_metadata ?? [];

      // The first entry was emptied → pruned. The second is preserved.
      expect(vm).toHaveLength(1);
      expect(vm[0]?.path).toBe('rings/0/vertices/3');
    });

    it('omits vertex_metadata entirely when the array empties', () => {
      const { result } = renderHook(() => useStagedEdits());
      const poly = buildPoly('p1', {}, [
        { path: 'rings/0/vertices/2', label: 'NE corner' },
      ]);

      act(() => {
        result.current.setVertexField(
          'p1',
          'rings/0/vertices/2',
          'label',
          undefined,
          'NE corner'
        );
      });

      const { nextFeatures } = result.current.applyEditsToFeatures([poly] as FeatureForEdit[]);
      const props = (nextFeatures[0] as PolyAnnotation).properties;
      expect('vertex_metadata' in props).toBe(false);
    });

    it('returns correct editedPaths for provenance — feature, revert, vertex', () => {
      const { result } = renderHook(() => useStagedEdits());
      const track = buildTrack('t1', { nationality: 'US' });
      const poly = buildPoly('p1');

      act(() => {
        result.current.setFeatureField('t1', 'display_name', 'Frigate A', undefined);
        result.current.revertField('t1', 'nationality');
        result.current.setVertexField(
          'p1',
          'rings/0/vertices/2',
          'label',
          'NE corner',
          undefined
        );
        result.current.setVertexField(
          'p1',
          'rings/0/vertices/2',
          'note',
          'mind the rocks',
          undefined
        );
      });

      const { editedPaths } = result.current.applyEditsToFeatures([
        track,
        poly,
      ] as FeatureForEdit[]);

      const asTokens = editedPaths
        .map((p) => `${p.op}:${p.path}`)
        .sort();

      expect(asTokens).toEqual(
        [
          'set:display_name',
          'revert:nationality',
          'set:vertex_metadata[rings/0/vertices/2]/label',
          'set:vertex_metadata[rings/0/vertices/2]/note',
        ].sort()
      );
    });

    it('is pure — does not mutate the input features array or the state', () => {
      const { result } = renderHook(() => useStagedEdits());
      const track = buildTrack('t1');

      act(() => {
        result.current.setFeatureField('t1', 'display_name', 'Frigate A', undefined);
      });

      const stateBefore = result.current.state;
      const inputFeatures = [track] as FeatureForEdit[];
      const inputCopy = JSON.parse(JSON.stringify(inputFeatures)) as FeatureForEdit[];

      result.current.applyEditsToFeatures(inputFeatures);

      // State unchanged (buffer preserved across flush — clearAll() is the
      // caller's job after the writer confirms success).
      expect(result.current.state).toBe(stateBefore);
      // Input array not mutated
      expect(inputFeatures).toEqual(inputCopy);
    });
  });

  describe('clearAll', () => {
    it('wipes the buffer', () => {
      const { result } = renderHook(() => useStagedEdits());

      act(() => {
        result.current.setFeatureField('f1', 'display_name', 'X', undefined);
        result.current.setVertexField('p1', 'rings/0/vertices/2', 'label', 'L', undefined);
        result.current.revertField('f1', 'nationality');
      });
      expect(result.current.isDirty()).toBe(true);

      act(() => {
        result.current.clearAll();
      });

      expect(result.current.state.byFeature).toEqual({});
      expect(result.current.state.byVertex).toEqual({});
      expect(result.current.state.revertedFields).toEqual({});
      expect(result.current.state.plot).toBeUndefined();
      expect(result.current.isDirty()).toBe(false);
    });
  });
});
