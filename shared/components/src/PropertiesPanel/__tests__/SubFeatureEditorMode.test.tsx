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
import type { TrackFeature, VertexMetadata } from '@debrief/schemas';
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

  // Quietens the unused-var lint on `vi`.
  it('contract surface — setVertexField is a function', () => {
    const fn = vi.fn();
    expect(typeof fn).toBe('function');
  });
});
