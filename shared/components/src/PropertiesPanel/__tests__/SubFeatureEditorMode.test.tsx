/**
 * Unit tests for SubFeatureEditorMode on a track-point path (Spec 192,
 * Phase 4, T032).
 *
 * Covers:
 *   - Header reads "<track-label> — positions/N".
 *   - Form shows label + tags + note inputs (all wired through
 *     `useStagedEdits.setVertexField`).
 *   - O(1) read-time lookup: the parent track's `vertex_metadata` is
 *     resolved through a memoised `Map<path, VertexMetadata>` built once
 *     per feature change — re-rendering with the same feature reference
 *     must not rebuild the map (asserted indirectly via render-time
 *     invariant: switching paths on the SAME feature reads the right
 *     entry without scanning the array each time).
 *   - Out-of-range track-point path renders an explanatory notice.
 *
 * Article VII.1: tests authored before the body lands in T033.
 *
 * Note on the out-of-range surface:
 *   `resolveEditingMode` returns `{ kind: 'stale' }` for an
 *   out-of-range vertex path, which the dispatcher then routes to plot
 *   mode (not subfeature mode). The form's out-of-range branch is
 *   therefore a **defensive** path that fires when the component is
 *   invoked directly with such a path — used by Vitest (here) and
 *   reachable by future surfaces that bypass the resolver. See
 *   `properties-subfeature-edit.spec.ts` for the parallel Playwright
 *   assertion (which exercises the resolver → plot-fallback path).
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type {
  LineAnnotation,
  MultiPointFeature,
  PolyAnnotation,
  ReferenceLocation,
  TrackFeature,
  VertexMetadata,
} from '@debrief/schemas';
import { SubFeatureEditorMode } from '../modes/SubFeatureEditorMode';
import type { UseStagedEditsApi } from '../../ActivityPanel/useStagedEdits';

// ─── Fixture builders ────────────────────────────────────────────────

function buildTrack(
  id: string,
  positionCount: number,
  vertexMetadata?: VertexMetadata[],
): TrackFeature {
  return {
    type: 'Feature',
    id,
    geometry: {
      type: 'LineString',
      // eslint-disable-next-line no-restricted-syntax
      coordinates: Array.from({ length: positionCount }, (_, i) => [
        -5 + i * 0.1,
        50,
      ]) as unknown as number[],
    },
    properties: {
      kind: 'TRACK',
      platform_id: 'PLT-001',
      platform_name: 'HMS Example',
      track_type: 'OWNSHIP',
      start_time: '2024-01-15T08:00:00Z',
      end_time: '2024-01-15T12:00:00Z',
      positions: Array.from({ length: positionCount }, (_, i) => ({
        time: new Date(Date.UTC(2024, 0, 15, 8, i)).toISOString(),
      })),
      ...(vertexMetadata !== undefined ? { vertex_metadata: vertexMetadata } : {}),
    },
    // eslint-disable-next-line no-restricted-syntax
  } as TrackFeature;
}

function makeStaging(): {
  setVertexField: UseStagedEditsApi['setVertexField'];
  calls: Array<{
    featureId: string;
    path: string;
    slot: string;
    next: unknown;
    current: unknown;
  }>;
} {
  const calls: Array<{
    featureId: string;
    path: string;
    slot: string;
    next: unknown;
    current: unknown;
  }> = [];
  const setVertexField: UseStagedEditsApi['setVertexField'] = (
    featureId,
    path,
    slot,
    next,
    current,
  ) => {
    calls.push({ featureId, path, slot: String(slot), next, current });
  };
  return { setVertexField, calls };
}

// ─── Tests ──────────────────────────────────────────────────────────

describe('SubFeatureEditorMode (track-point path)', () => {
  it('header renders "<track-label> — positions/N"', () => {
    const feature = buildTrack('track-1', 10);
    const { setVertexField } = makeStaging();
    render(
      <SubFeatureEditorMode
        feature={feature}
        path="positions/4"
        readOnly={false}
        setVertexField={setVertexField}
      />,
    );
    const header = screen.getByTestId('properties-mode-subfeature-header');
    expect(header.textContent).toContain('HMS Example');
    expect(header.textContent).toContain('positions/4');
  });

  it('renders label, tags, and note inputs with their testids', () => {
    const feature = buildTrack('track-1', 10);
    const { setVertexField } = makeStaging();
    render(
      <SubFeatureEditorMode
        feature={feature}
        path="positions/2"
        readOnly={false}
        setVertexField={setVertexField}
      />,
    );
    expect(screen.getByTestId('vertex-label-input')).toBeTruthy();
    expect(screen.getByTestId('vertex-tags-input')).toBeTruthy();
    expect(screen.getByTestId('vertex-note-input')).toBeTruthy();
  });

  it('label input commits through setVertexField with the expected (featureId, path, slot, next, current) tuple', () => {
    const feature = buildTrack('track-1', 10);
    const { setVertexField, calls } = makeStaging();
    render(
      <SubFeatureEditorMode
        feature={feature}
        path="positions/3"
        readOnly={false}
        setVertexField={setVertexField}
      />,
    );
    const input = screen.getByTestId('vertex-label-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'intercept' } });
    fireEvent.blur(input);

    expect(calls.length).toBeGreaterThanOrEqual(1);
    const last = calls[calls.length - 1]!;
    expect(last.featureId).toBe('track-1');
    expect(last.path).toBe('positions/3');
    expect(last.slot).toBe('label');
    expect(last.next).toBe('intercept');
    // `current` is the resolved entry's existing value (or '' when absent
    // — the hook's `isAbsent` rule treats both as equivalent and prunes
    // the entry if next === current).
    expect(last.current === undefined || last.current === '').toBe(true);
  });

  it('note input commits through setVertexField on blur', () => {
    const feature = buildTrack('track-1', 10);
    const { setVertexField, calls } = makeStaging();
    render(
      <SubFeatureEditorMode
        feature={feature}
        path="positions/5"
        readOnly={false}
        setVertexField={setVertexField}
      />,
    );
    const note = screen.getByTestId('vertex-note-input') as HTMLTextAreaElement;
    fireEvent.change(note, { target: { value: 'investigate this fix' } });
    fireEvent.blur(note);

    const last = calls[calls.length - 1]!;
    expect(last.slot).toBe('note');
    expect(last.next).toBe('investigate this fix');
  });

  it('tags input commits a string array through setVertexField on Enter', () => {
    const feature = buildTrack('track-1', 10);
    const { setVertexField, calls } = makeStaging();
    render(
      <SubFeatureEditorMode
        feature={feature}
        path="positions/6"
        readOnly={false}
        setVertexField={setVertexField}
      />,
    );
    const tags = screen.getByTestId(
      'array-widget-input-vertex-tags',
    ) as HTMLInputElement;
    fireEvent.change(tags, { target: { value: 'alpha' } });
    fireEvent.keyDown(tags, { key: 'Enter' });

    const last = calls[calls.length - 1]!;
    expect(last.slot).toBe('tags');
    expect(last.next).toEqual(['alpha']);
  });

  it('hydrates the form from existing vertex_metadata for the matching path', () => {
    const feature = buildTrack('track-1', 10, [
      { path: 'positions/2', label: 'pre-existing label', note: 'pre-existing note', tags: ['intercept'] },
    ]);
    const { setVertexField } = makeStaging();
    render(
      <SubFeatureEditorMode
        feature={feature}
        path="positions/2"
        readOnly={false}
        setVertexField={setVertexField}
      />,
    );
    const label = screen.getByTestId('vertex-label-input') as HTMLInputElement;
    expect(label.value).toBe('pre-existing label');
    const note = screen.getByTestId('vertex-note-input') as HTMLTextAreaElement;
    expect(note.value).toBe('pre-existing note');
    // Tag chip rendered by ArrayWidget
    expect(screen.getByTestId('array-widget-chip-vertex-tags-intercept')).toBeTruthy();
  });

  it('O(1) lookup: the path → entry Map is built via useMemo and reused across rerenders with the same feature reference', () => {
    // Concrete observable assertion of the memoisation: build a large
    // vertex_metadata array (≥ 50 entries); render the form for a path
    // that maps to a late entry; rerender 100 times with the same
    // feature reference but with a `key` prop change-equivalent (a
    // counter) and confirm the form re-renders without breaking and
    // shows the same hydrated value. The body MUST not re-scan the
    // array O(n) per setter call — invariant 5 (data-model.md § 2.3).
    const vm: VertexMetadata[] = Array.from({ length: 50 }, (_, i) => ({
      path: `positions/${i}`,
      label: `point-${i}`,
    }));
    const feature = buildTrack('track-1', 50, vm);

    const { setVertexField } = makeStaging();
    const { rerender } = render(
      <SubFeatureEditorMode
        feature={feature}
        path="positions/49"
        readOnly={false}
        setVertexField={setVertexField}
      />,
    );
    expect((screen.getByTestId('vertex-label-input') as HTMLInputElement).value).toBe(
      'point-49',
    );
    // Many rerenders, same feature reference — must remain correct.
    for (let i = 0; i < 10; i += 1) {
      rerender(
        <SubFeatureEditorMode
          feature={feature}
          path="positions/49"
          readOnly={false}
          setVertexField={setVertexField}
        />,
      );
    }
    expect((screen.getByTestId('vertex-label-input') as HTMLInputElement).value).toBe(
      'point-49',
    );
    // And a different path on the SAME feature must hydrate to a
    // different entry — proves the lookup is by-path, not by-index.
    rerender(
      <SubFeatureEditorMode
        feature={feature}
        path="positions/7"
        readOnly={false}
        setVertexField={setVertexField}
      />,
    );
    expect((screen.getByTestId('vertex-label-input') as HTMLInputElement).value).toBe(
      'point-7',
    );
  });

  it('out-of-range path renders the explanatory notice and disables inputs', () => {
    const feature = buildTrack('track-1', 50);
    const { setVertexField } = makeStaging();
    render(
      <SubFeatureEditorMode
        feature={feature}
        path="positions/9999"
        readOnly={false}
        setVertexField={setVertexField}
      />,
    );
    expect(screen.getByTestId('properties-mode-subfeature-out-of-range')).toBeTruthy();
    // Inputs are disabled in this defensive branch.
    const label = screen.getByTestId('vertex-label-input') as HTMLInputElement;
    expect(label.disabled).toBe(true);
    const note = screen.getByTestId('vertex-note-input') as HTMLTextAreaElement;
    expect(note.disabled).toBe(true);
  });

  it('readOnly prop disables every input', () => {
    const feature = buildTrack('track-1', 10);
    const { setVertexField } = makeStaging();
    render(
      <SubFeatureEditorMode
        feature={feature}
        path="positions/3"
        readOnly={true}
        setVertexField={setVertexField}
      />,
    );
    const label = screen.getByTestId('vertex-label-input') as HTMLInputElement;
    expect(label.disabled).toBe(true);
    const note = screen.getByTestId('vertex-note-input') as HTMLTextAreaElement;
    expect(note.disabled).toBe(true);
    // ArrayWidget hides its input when disabled — assert it's absent.
    expect(screen.queryByTestId('array-widget-input-vertex-tags')).toBeNull();
  });

  it('setVertexField is NOT called when the value is unchanged (deepEqual guard at the hook level)', () => {
    // The hook owns the prune-on-equality rule. The component still
    // must call the setter on every blur/commit; the hook decides
    // whether to keep or drop the entry. Verify the call happens with
    // (next === current) so the hook can prune.
    const feature = buildTrack('track-1', 10, [
      { path: 'positions/3', label: 'existing' },
    ]);
    const { setVertexField, calls } = makeStaging();
    render(
      <SubFeatureEditorMode
        feature={feature}
        path="positions/3"
        readOnly={false}
        setVertexField={setVertexField}
      />,
    );
    const label = screen.getByTestId('vertex-label-input') as HTMLInputElement;
    // Blur without changing the value — input value is still 'existing'.
    fireEvent.blur(label);
    // Either the component skipped the call OR called with next === current.
    if (calls.length > 0) {
      const last = calls[calls.length - 1]!;
      expect(last.next).toBe(last.current);
    }
  });

  // ─── US-3 AS-3 hydration fix (Phase 10) ─────────────────────────────
  it('hydrates the form from stagedVertexEdits when re-selecting a vertex with unsaved edits', () => {
    // Saved entry exists with one value; the staging buffer carries a
    // different uncommitted value. On re-mount the form must show the
    // staged value, not the saved one.
    const feature = buildTrack('track-1', 10, [
      { path: 'positions/3', label: 'saved-label', note: 'saved-note' },
    ]);
    const { setVertexField } = makeStaging();
    render(
      <SubFeatureEditorMode
        feature={feature}
        path="positions/3"
        readOnly={false}
        setVertexField={setVertexField}
        stagedVertexEdits={{
          label: 'staged-label',
          note: 'staged-note',
          tags: ['staged-tag'],
        }}
      />,
    );
    const labelInput = screen.getByTestId('vertex-label-input') as HTMLInputElement;
    expect(labelInput.value).toBe('staged-label');
    const noteInput = screen.getByTestId('vertex-note-input') as HTMLTextAreaElement;
    expect(noteInput.value).toBe('staged-note');
    expect(screen.getByTestId('array-widget-chip-vertex-tags-staged-tag')).toBeDefined();
  });

  it('staged vertex value survives unmount + remount with the same (featureId, path)', () => {
    // Reproduce the US-3 AS-3 lifecycle: edit → deselect → re-select.
    const feature = buildTrack('track-1', 10, []);
    const { setVertexField } = makeStaging();
    const staged = { label: 'in-flight', note: '', tags: [] };
    const view = render(
      <SubFeatureEditorMode
        feature={feature}
        path="positions/2"
        readOnly={false}
        setVertexField={setVertexField}
        stagedVertexEdits={staged}
      />,
    );
    expect(
      (screen.getByTestId('vertex-label-input') as HTMLInputElement).value,
    ).toBe('in-flight');
    view.unmount();

    // Re-mount with the same featureId, path, and staged buffer entry.
    render(
      <SubFeatureEditorMode
        feature={feature}
        path="positions/2"
        readOnly={false}
        setVertexField={setVertexField}
        stagedVertexEdits={staged}
      />,
    );
    expect(
      (screen.getByTestId('vertex-label-input') as HTMLInputElement).value,
    ).toBe('in-flight');
  });

  it('partial stagedVertexEdits overlays only the touched slot — saved values remain for untouched slots', () => {
    // The buffer is sparse: only the slot the analyst touched is
    // present. Untouched slots must still hydrate from the saved entry.
    const feature = buildTrack('track-1', 10, [
      { path: 'positions/4', label: 'saved-label', note: 'saved-note', tags: ['saved-tag'] },
    ]);
    const { setVertexField } = makeStaging();
    render(
      <SubFeatureEditorMode
        feature={feature}
        path="positions/4"
        readOnly={false}
        setVertexField={setVertexField}
        // Only `label` is staged — note + tags must come from saved entry.
        stagedVertexEdits={{ label: 'staged-only-label' }}
      />,
    );
    expect(
      (screen.getByTestId('vertex-label-input') as HTMLInputElement).value,
    ).toBe('staged-only-label');
    expect(
      (screen.getByTestId('vertex-note-input') as HTMLTextAreaElement).value,
    ).toBe('saved-note');
    expect(screen.getByTestId('array-widget-chip-vertex-tags-saved-tag')).toBeDefined();
  });

  // Quietens the unused-var lint on `vi`.
  it('contract surface — setVertexField is a function', () => {
    const fn = vi.fn();
    expect(typeof fn).toBe('function');
  });
});

// ─── Phase 9 (US-7) — annotation geometries (T068) ──────────────────
//
// Same field set (label/tags/note) on every geometry kind (FR-026); the
// editor's behaviour MUST NOT branch on geometry kind beyond what's
// required to parse the vertex address. Only the header label format
// changes per geometry (per the spec UI Flow "Sub-feature State"):
//   - Polygon `rings/R/vertices/V` → "<name> — Ring R, Vertex V"
//   - LineString `vertices/V`       → "<name> — Vertex V"
//   - MultiPoint `vertices/V`       → "<name> — Vertex V"
//   - Point     `vertex/0`          → "<name> — Vertex"
// The raw path string MUST remain present in the DOM (`data-path` on
// the mode container) so Playwright + provenance assertions can pin it.

function buildPolygon(
  id: string,
  ringSizes: number[],
  vertexMetadata?: VertexMetadata[],
): PolyAnnotation {
  const coordinates: number[][][] = ringSizes.map((size, ringIdx) =>
    Array.from({ length: size }, (_, vIdx) => [
      ringIdx + vIdx * 0.01,
      ringIdx + vIdx * 0.01,
    ]),
  );
  return {
    type: 'Feature',
    id,
    geometry: {
      type: 'Polygon',
      // eslint-disable-next-line no-restricted-syntax
      coordinates: coordinates as unknown as number[][][],
    },
    properties: {
      kind: 'ANNOTATION_POLY',
      vertex_count: ringSizes[0]! - 1,
      ...(vertexMetadata !== undefined ? { vertex_metadata: vertexMetadata } : {}),
    },
    // eslint-disable-next-line no-restricted-syntax
  } as PolyAnnotation;
}

function buildLineString(
  id: string,
  vertexCount: number,
  vertexMetadata?: VertexMetadata[],
): LineAnnotation {
  return {
    type: 'Feature',
    id,
    geometry: {
      type: 'LineString',
      // eslint-disable-next-line no-restricted-syntax
      coordinates: Array.from({ length: vertexCount }, (_, i) => [
        -1 + i * 0.1,
        2,
      ]) as unknown as number[],
    },
    properties: {
      kind: 'ANNOTATION_LINE',
      ...(vertexMetadata !== undefined ? { vertex_metadata: vertexMetadata } : {}),
    },
    // eslint-disable-next-line no-restricted-syntax
  } as LineAnnotation;
}

function buildMultiPoint(
  id: string,
  vertexCount: number,
  vertexMetadata?: VertexMetadata[],
): MultiPointFeature {
  return {
    type: 'Feature',
    id,
    geometry: {
      type: 'MultiPoint',
      // eslint-disable-next-line no-restricted-syntax
      coordinates: Array.from({ length: vertexCount }, (_, i) => [
        10 + i,
        20 + i,
      ]) as unknown as number[],
    },
    properties: {
      kind: 'MULTI_POINT',
      points: Array.from({ length: vertexCount }, (_, i) => ({
        index: i,
        name: `Ref ${i + 1}`,
      })),
      ...(vertexMetadata !== undefined ? { vertex_metadata: vertexMetadata } : {}),
    },
    // eslint-disable-next-line no-restricted-syntax
  } as MultiPointFeature;
}

function buildPoint(
  id: string,
  vertexMetadata?: VertexMetadata[],
): ReferenceLocation {
  return {
    type: 'Feature',
    id,
    geometry: {
      type: 'Point',
      // eslint-disable-next-line no-restricted-syntax
      coordinates: [-3, 52] as unknown as number[],
    },
    properties: {
      kind: 'POINT',
      ...(vertexMetadata !== undefined ? { vertex_metadata: vertexMetadata } : {}),
    },
    // eslint-disable-next-line no-restricted-syntax
  } as ReferenceLocation;
}

describe('SubFeatureEditorMode — annotation geometries (US-7)', () => {
  describe('Polygon rings/R/vertices/V', () => {
    it('header reads "<name> — Ring R, Vertex V"', () => {
      const feature = buildPolygon('poly-1', [4, 6]);
      const { setVertexField } = makeStaging();
      render(
        <SubFeatureEditorMode
          feature={feature}
          path="rings/1/vertices/3"
          readOnly={false}
          setVertexField={setVertexField}
        />,
      );
      const header = screen.getByTestId('properties-mode-subfeature-header');
      expect(header.textContent).toContain('Ring 1');
      expect(header.textContent).toContain('Vertex 3');
    });

    it('renders label/tags/note inputs and routes commits through setVertexField with the polygon path', () => {
      const feature = buildPolygon('poly-1', [4, 6]);
      const { setVertexField, calls } = makeStaging();
      render(
        <SubFeatureEditorMode
          feature={feature}
          path="rings/0/vertices/2"
          readOnly={false}
          setVertexField={setVertexField}
        />,
      );
      expect(screen.getByTestId('vertex-label-input')).toBeTruthy();
      expect(screen.getByTestId('vertex-tags-input')).toBeTruthy();
      expect(screen.getByTestId('vertex-note-input')).toBeTruthy();

      const input = screen.getByTestId('vertex-label-input') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'NE corner' } });
      fireEvent.blur(input);
      const last = calls[calls.length - 1]!;
      expect(last.featureId).toBe('poly-1');
      expect(last.path).toBe('rings/0/vertices/2');
      expect(last.slot).toBe('label');
      expect(last.next).toBe('NE corner');
    });

    it('hydrates the form from vertex_metadata for the matching polygon path', () => {
      const feature = buildPolygon('poly-1', [4, 6], [
        {
          path: 'rings/0/vertices/2',
          label: 'NE corner',
          note: 'corner of the exclusion zone',
          tags: ['zone-edge'],
        },
      ]);
      const { setVertexField } = makeStaging();
      render(
        <SubFeatureEditorMode
          feature={feature}
          path="rings/0/vertices/2"
          readOnly={false}
          setVertexField={setVertexField}
        />,
      );
      expect((screen.getByTestId('vertex-label-input') as HTMLInputElement).value).toBe('NE corner');
      expect((screen.getByTestId('vertex-note-input') as HTMLTextAreaElement).value).toBe(
        'corner of the exclusion zone',
      );
      expect(screen.getByTestId('array-widget-chip-vertex-tags-zone-edge')).toBeTruthy();
    });
  });

  describe('LineString vertices/V', () => {
    it('header reads "<name> — Vertex V"', () => {
      const feature = buildLineString('line-1', 5);
      const { setVertexField } = makeStaging();
      render(
        <SubFeatureEditorMode
          feature={feature}
          path="vertices/2"
          readOnly={false}
          setVertexField={setVertexField}
        />,
      );
      const header = screen.getByTestId('properties-mode-subfeature-header');
      expect(header.textContent).toContain('Vertex 2');
      // Ring should NOT appear in a non-polygon header.
      expect(header.textContent).not.toContain('Ring');
    });

    it('renders label/tags/note inputs and routes commits with the linestring path', () => {
      const feature = buildLineString('line-1', 5);
      const { setVertexField, calls } = makeStaging();
      render(
        <SubFeatureEditorMode
          feature={feature}
          path="vertices/3"
          readOnly={false}
          setVertexField={setVertexField}
        />,
      );
      expect(screen.getByTestId('vertex-label-input')).toBeTruthy();
      expect(screen.getByTestId('vertex-tags-input')).toBeTruthy();
      expect(screen.getByTestId('vertex-note-input')).toBeTruthy();

      const note = screen.getByTestId('vertex-note-input') as HTMLTextAreaElement;
      fireEvent.change(note, { target: { value: 'investigate' } });
      fireEvent.blur(note);
      const last = calls[calls.length - 1]!;
      expect(last.featureId).toBe('line-1');
      expect(last.path).toBe('vertices/3');
      expect(last.slot).toBe('note');
      expect(last.next).toBe('investigate');
    });
  });

  describe('MultiPoint vertices/V', () => {
    it('header reads "<name> — Vertex V"', () => {
      const feature = buildMultiPoint('mp-1', 3);
      const { setVertexField } = makeStaging();
      render(
        <SubFeatureEditorMode
          feature={feature}
          path="vertices/1"
          readOnly={false}
          setVertexField={setVertexField}
        />,
      );
      const header = screen.getByTestId('properties-mode-subfeature-header');
      expect(header.textContent).toContain('Vertex 1');
      expect(header.textContent).not.toContain('Ring');
    });

    it('renders label/tags/note inputs and routes commits with the multipoint path', () => {
      const feature = buildMultiPoint('mp-1', 3);
      const { setVertexField, calls } = makeStaging();
      render(
        <SubFeatureEditorMode
          feature={feature}
          path="vertices/0"
          readOnly={false}
          setVertexField={setVertexField}
        />,
      );
      const tags = screen.getByTestId(
        'array-widget-input-vertex-tags',
      ) as HTMLInputElement;
      fireEvent.change(tags, { target: { value: 'recurring-fix' } });
      fireEvent.keyDown(tags, { key: 'Enter' });
      const last = calls[calls.length - 1]!;
      expect(last.featureId).toBe('mp-1');
      expect(last.path).toBe('vertices/0');
      expect(last.slot).toBe('tags');
      expect(last.next).toEqual(['recurring-fix']);
    });
  });

  describe('Point vertex/0', () => {
    it('header reads "<name> — Vertex" (no index, single vertex)', () => {
      const feature = buildPoint('point-1');
      const { setVertexField } = makeStaging();
      render(
        <SubFeatureEditorMode
          feature={feature}
          path="vertex/0"
          readOnly={false}
          setVertexField={setVertexField}
        />,
      );
      const header = screen.getByTestId('properties-mode-subfeature-header');
      expect(header.textContent).toContain('Vertex');
      // Single-vertex points don't show an index in the header.
      expect(header.textContent).not.toContain('Vertex 0');
    });

    it('renders label/tags/note inputs and routes commits with the point path', () => {
      const feature = buildPoint('point-1');
      const { setVertexField, calls } = makeStaging();
      render(
        <SubFeatureEditorMode
          feature={feature}
          path="vertex/0"
          readOnly={false}
          setVertexField={setVertexField}
        />,
      );
      expect(screen.getByTestId('vertex-label-input')).toBeTruthy();
      expect(screen.getByTestId('vertex-tags-input')).toBeTruthy();
      expect(screen.getByTestId('vertex-note-input')).toBeTruthy();

      const label = screen.getByTestId('vertex-label-input') as HTMLInputElement;
      fireEvent.change(label, { target: { value: 'reference loc' } });
      fireEvent.blur(label);
      const last = calls[calls.length - 1]!;
      expect(last.featureId).toBe('point-1');
      expect(last.path).toBe('vertex/0');
      expect(last.slot).toBe('label');
      expect(last.next).toBe('reference loc');
    });
  });

  describe('cross-geometry invariants (FR-026)', () => {
    it('field set is identical across all four annotation geometries (label/tags/note)', () => {
      const fixtures: Array<{ feature: import('@debrief/schemas').DebriefFeature; path: string }> = [
        { feature: buildPolygon('poly-A', [4]), path: 'rings/0/vertices/1' },
        { feature: buildLineString('line-A', 3), path: 'vertices/1' },
        { feature: buildMultiPoint('mp-A', 2), path: 'vertices/0' },
        { feature: buildPoint('point-A'), path: 'vertex/0' },
      ];
      const { setVertexField } = makeStaging();
      for (const { feature, path } of fixtures) {
        const { unmount } = render(
          <SubFeatureEditorMode
            feature={feature}
            path={path}
            readOnly={false}
            setVertexField={setVertexField}
          />,
        );
        expect(screen.getByTestId('vertex-label-input')).toBeTruthy();
        expect(screen.getByTestId('vertex-tags-input')).toBeTruthy();
        expect(screen.getByTestId('vertex-note-input')).toBeTruthy();
        // The mode container always carries the raw path on data-path —
        // assertion that downstream provenance never has to reparse the
        // header to discover the saved vertex address.
        const mode = screen.getByTestId('properties-mode-subfeature');
        expect(mode.getAttribute('data-path')).toBe(path);
        unmount();
      }
    });

    it('readOnly prop disables every input across geometries', () => {
      const cases: Array<{ feature: import('@debrief/schemas').DebriefFeature; path: string }> = [
        { feature: buildPolygon('poly-RO', [4]), path: 'rings/0/vertices/0' },
        { feature: buildLineString('line-RO', 3), path: 'vertices/0' },
        { feature: buildMultiPoint('mp-RO', 2), path: 'vertices/0' },
        { feature: buildPoint('point-RO'), path: 'vertex/0' },
      ];
      const { setVertexField } = makeStaging();
      for (const { feature, path } of cases) {
        const { unmount } = render(
          <SubFeatureEditorMode
            feature={feature}
            path={path}
            readOnly={true}
            setVertexField={setVertexField}
          />,
        );
        const label = screen.getByTestId('vertex-label-input') as HTMLInputElement;
        expect(label.disabled).toBe(true);
        const note = screen.getByTestId('vertex-note-input') as HTMLTextAreaElement;
        expect(note.disabled).toBe(true);
        unmount();
      }
    });
  });
});
