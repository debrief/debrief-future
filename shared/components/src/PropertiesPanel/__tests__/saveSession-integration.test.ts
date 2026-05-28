/**
 * Integration tests for the staged-edits save path (Spec 192, Phase 2, T024).
 *
 * Closes the silent-provenance failure mode identified in `/speckit.review`:
 * the integrated invariant from `contracts/save-integration.md` is asserted
 * end-to-end in this file. Six scenarios:
 *
 *   1. Success: feature-level edits flush → appendProvenance called once
 *      per affected feature → clearAll() invoked → isDirty() false.
 *   2. Vertex-level edits flush as sparse VertexMetadata entries (append
 *      new / merge existing / prune empty / omit array when empty).
 *   3. Reverted fields flush as absent slots with op:'revert' in provenance.
 *   4. Writer rejection (non-readonly error): NO provenance, NO clearAll(),
 *      isDirty() stays true.
 *   5. ReadOnlyFilesystemError rejection: writer's catch handler dispatches
 *      setReadOnly(true, …) — the helper observes the failure and does NOT
 *      clear the buffer.
 *   6. Node EACCES rejection: same as 5 with the permission-derived reason.
 *
 * Article VII.1: this test is authored BEFORE the helper's implementation
 * lands. It would have failed against the bare `useStagedEdits` surface
 * alone, because the buffer-clear + provenance-append contract is the new
 * code-path under test.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type {
  DebriefFeature,
  TrackFeature,
  TrackProperties,
  VertexMetadata,
} from '@debrief/schemas';
import { useStagedEdits, type UseStagedEditsApi } from '../../ActivityPanel/useStagedEdits';
import {
  saveStagedEdits,
  type SaveStagedEditsResult,
  type SaveWriter,
  type AppendProvenanceFn,
} from '../saveStagedEdits';
import {
  PROPERTIES_PANEL_TOOL_SENTINEL,
  type PropertiesProvenanceEntry,
} from '../provenanceTypes';

// ─── Fixture builders ────────────────────────────────────────────────

function buildTrack(
  id: string,
  overrides: Partial<TrackProperties> = {},
  vertexMetadata?: VertexMetadata[],
): TrackFeature {
  const props: TrackProperties = {
    kind: 'TRACK',
    platform_id: 'PLT-001',
    track_type: 'OWNSHIP',
    start_time: '2024-01-15T08:00:00Z',
    end_time: '2024-01-15T12:00:00Z',
    positions: [
      { time: '2024-01-15T08:00:00Z' },
      { time: '2024-01-15T08:05:00Z' },
      { time: '2024-01-15T08:10:00Z' },
      { time: '2024-01-15T08:15:00Z' },
      { time: '2024-01-15T08:20:00Z' },
    ],
    style: {} as TrackProperties['style'],
    default_position_style: {} as TrackProperties['default_position_style'],
    ...overrides,
  } as TrackProperties;
  if (vertexMetadata) {
    props.vertex_metadata = vertexMetadata;
  }
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
        [-4.7, 50.15],
        [-4.6, 50.2],
      ] as unknown as number[],
    },
    properties: props,
  } as TrackFeature;
}

// ReadOnlyFilesystemError stand-in — matches the structural check in
// `services/session-state/src/persistence/save.ts` (`err.name ===
// 'ReadOnlyFilesystemError'`).
class ReadOnlyFilesystemError extends Error {
  override readonly name = 'ReadOnlyFilesystemError' as const;
  constructor(message: string) {
    super(message);
  }
}

// Node EACCES stand-in — Node's `fs.writeFileSync` throws an Error with
// `.code = 'EACCES'`. We mimic that here.
function eaccesError(message: string): NodeJS.ErrnoException {
  const err: NodeJS.ErrnoException = Object.assign(new Error(message), {
    code: 'EACCES',
  });
  return err;
}

// ─── Test harness ────────────────────────────────────────────────────

interface Harness {
  staging: UseStagedEditsApi;
  writer: ReturnType<typeof vi.fn<Parameters<SaveWriter>, ReturnType<SaveWriter>>>;
  appendProvenance: ReturnType<
    typeof vi.fn<Parameters<AppendProvenanceFn>, void | Promise<void>>
  >;
  run: (features: DebriefFeature[]) => Promise<SaveStagedEditsResult>;
}

function makeHarness(writerResult: SaveStagedEditsResult): Harness {
  const { result } = renderHook(() => useStagedEdits());
  const writer = vi.fn<Parameters<SaveWriter>, ReturnType<SaveWriter>>(
    async () => writerResult,
  );
  const appendProvenance = vi.fn<
    Parameters<AppendProvenanceFn>,
    void | Promise<void>
  >();
  return {
    get staging() {
      return result.current;
    },
    writer,
    appendProvenance,
    run: async (features) => {
      let res: SaveStagedEditsResult = { success: false };
      await act(async () => {
        res = await saveStagedEdits({
          features,
          staging: result.current,
          writer,
          appendProvenance,
          packageVersion: '1.0.0',
          generateActivityId: () => '01HZX-FIXED-FIXTURE-ID',
          now: () => '2026-05-19T00:00:00Z',
        });
      });
      return res;
    },
  };
}

describe('save-session integration with staged edits', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Scenario 1 ──────────────────────────────────────────────────
  it('flushes feature-level edits + provenance + clears buffer on success', async () => {
    const track = buildTrack('track-A');
    const features: DebriefFeature[] = [track];
    const h = makeHarness({ success: true });

    act(() => {
      h.staging.setFeatureField('track-A', 'vessel_role', 'intercept', undefined);
      h.staging.setFeatureField('track-A', 'tags', ['acceptance'], undefined);
    });

    expect(h.staging.isDirty()).toBe(true);

    const result = await h.run(features);
    expect(result.success).toBe(true);

    // Writer called once with the merged features
    expect(h.writer).toHaveBeenCalledTimes(1);
    const writerCall = h.writer.mock.calls[0]!;
    const writtenFeatures = writerCall[0];
    expect(writtenFeatures).toHaveLength(1);
    expect(writtenFeatures[0]!.id).toBe('track-A');
    const writtenProps = (writtenFeatures[0] as TrackFeature).properties;
    expect(writtenProps.vessel_role).toBe('intercept');
    expect(writtenProps.tags).toEqual(['acceptance']);

    // appendProvenance called once for track-A with the expected shape
    expect(h.appendProvenance).toHaveBeenCalledTimes(1);
    const [provFeatureId, provEntry] = h.appendProvenance.mock.calls[0]!;
    expect(provFeatureId).toBe('track-A');
    expect(provEntry).toMatchObject({
      tool: PROPERTIES_PANEL_TOOL_SENTINEL,
      method: 'properties-panel@1.0.0',
      source: 'user',
    });
    expect(provEntry.method).toMatch(/^properties-panel@/);

    // The `inputs[]` carries the (path, op) discriminator for the contract
    // assertion. Order-insensitive.
    const inputs = (provEntry as unknown as { inputs?: unknown }).inputs;
    expect(Array.isArray(inputs)).toBe(true);
    expect(inputs).toEqual(
      expect.arrayContaining([
        { path: 'vessel_role', op: 'set' },
        { path: 'tags', op: 'set' },
      ]),
    );

    // The `fields` list (LinkML-compatible flat strings) carries the same info.
    expect(provEntry.fields).toEqual(
      expect.arrayContaining(['vessel_role', 'tags']),
    );

    // Buffer cleared
    expect(h.staging.isDirty()).toBe(false);
  });

  // ─── Scenario 2 ──────────────────────────────────────────────────
  it('flushes vertex-level edits as sparse VertexMetadata entries', async () => {
    // Existing entry on positions/0; new entry on positions/2; existing
    // entry on positions/4 that gets pruned (cleared to empty).
    const existingVm: VertexMetadata[] = [
      { path: 'positions/0', label: 'depart' },
      { path: 'positions/4', label: 'arrive', tags: ['waypoint'] },
    ];
    const track = buildTrack('track-A', {}, existingVm);
    const features: DebriefFeature[] = [track];
    const h = makeHarness({ success: true });

    act(() => {
      // Merge into existing entry (positions/0)
      h.staging.setVertexField('track-A', 'positions/0', 'note', 'left harbour', undefined);
      // Append a new entry (positions/2)
      h.staging.setVertexField('track-A', 'positions/2', 'label', 'turn-east', undefined);
      // Clear all slots on positions/4 (label + tags) so the entry prunes
      h.staging.setVertexField('track-A', 'positions/4', 'label', '', 'arrive');
      h.staging.setVertexField('track-A', 'positions/4', 'tags', [], ['waypoint']);
    });

    expect(h.staging.isDirty()).toBe(true);
    await h.run(features);

    expect(h.writer).toHaveBeenCalledTimes(1);
    const writtenProps = (h.writer.mock.calls[0]![0][0] as TrackFeature)
      .properties;
    const vm = writtenProps.vertex_metadata;
    expect(Array.isArray(vm)).toBe(true);
    // Should have two entries: positions/0 (merged) + positions/2 (new).
    // positions/4 should be pruned.
    const paths = (vm ?? []).map((e) => e.path).sort();
    expect(paths).toEqual(['positions/0', 'positions/2']);
    const pos0 = (vm ?? []).find((e) => e.path === 'positions/0');
    expect(pos0).toMatchObject({
      path: 'positions/0',
      label: 'depart',
      note: 'left harbour',
    });
    const pos2 = (vm ?? []).find((e) => e.path === 'positions/2');
    expect(pos2).toMatchObject({ path: 'positions/2', label: 'turn-east' });

    expect(h.appendProvenance).toHaveBeenCalledTimes(1);
    const provEntry = h.appendProvenance.mock.calls[0]![1];
    const inputs = (provEntry as unknown as { inputs: Array<{ path: string; op: string }> }).inputs;
    expect(inputs).toEqual(
      expect.arrayContaining([
        { path: 'vertex_metadata[positions/0]/note', op: 'set' },
        { path: 'vertex_metadata[positions/2]/label', op: 'set' },
      ]),
    );

    expect(h.staging.isDirty()).toBe(false);
  });

  it('omits vertex_metadata entirely when the buffer empties the array', async () => {
    // The only existing entry gets cleared → vertex_metadata should be
    // absent from the saved feature (sparse-storage rule).
    const existingVm: VertexMetadata[] = [
      { path: 'positions/0', label: 'depart' },
    ];
    const track = buildTrack('track-A', {}, existingVm);
    const h = makeHarness({ success: true });

    act(() => {
      h.staging.setVertexField('track-A', 'positions/0', 'label', '', 'depart');
    });

    await h.run([track]);
    const writtenProps = (h.writer.mock.calls[0]![0][0] as TrackFeature)
      .properties;
    // Sparse rule: no empty array left behind.
    expect(writtenProps.vertex_metadata).toBeUndefined();
  });

  // ─── Scenario 3 ──────────────────────────────────────────────────
  it('flushes reverted fields as absent slots, with op:revert in provenance', async () => {
    const track = buildTrack('track-A', { vessel_role: 'EW-collector' });
    const h = makeHarness({ success: true });

    act(() => {
      h.staging.revertField('track-A', 'vessel_role');
    });

    expect(h.staging.isDirty()).toBe(true);
    await h.run([track]);

    const writtenProps = (h.writer.mock.calls[0]![0][0] as TrackFeature)
      .properties;
    // Slot absent on the saved feature
    expect('vessel_role' in writtenProps).toBe(false);

    expect(h.appendProvenance).toHaveBeenCalledTimes(1);
    const provEntry = h.appendProvenance.mock.calls[0]![1];
    const inputs = (provEntry as unknown as { inputs: Array<{ path: string; op: string }> }).inputs;
    expect(inputs).toContainEqual({ path: 'vessel_role', op: 'revert' });
    // The flat `fields[]` carries the `:revert` suffix so consumers reading
    // the LinkML-shaped entry can recover the op axis.
    expect(provEntry.fields).toContain('vessel_role:revert');

    expect(h.staging.isDirty()).toBe(false);
  });

  // ─── Scenario 4 ──────────────────────────────────────────────────
  it('on writer rejection: no provenance, no buffer clear, dirty stays true', async () => {
    const track = buildTrack('track-A');
    const h = makeHarness({ success: false, error: 'boom' });

    act(() => {
      h.staging.setFeatureField('track-A', 'vessel_role', 'intercept', undefined);
    });

    const result = await h.run([track]);
    expect(result.success).toBe(false);
    expect(result.error).toBe('boom');

    // Writer was called once
    expect(h.writer).toHaveBeenCalledTimes(1);
    // No provenance written
    expect(h.appendProvenance).not.toHaveBeenCalled();
    // Buffer preserved
    expect(h.staging.isDirty()).toBe(true);
  });

  // ─── Scenario 5 ──────────────────────────────────────────────────
  it('on ReadOnlyFilesystemError: buffer preserved, no provenance', async () => {
    // The writer's catch handler in
    // `services/session-state/src/persistence/save.ts` is responsible for
    // dispatching `setReadOnly(true, reason)` against the plot slice — we
    // don't re-assert that here (it's covered by the slice tests at
    // `services/session-state/src/store/slices/__tests__/plot.readOnly.test.ts`).
    // What we DO assert: the helper observes the failure and preserves
    // the buffer + skips provenance, identical to scenario 4.
    const track = buildTrack('track-A');
    const roError = new ReadOnlyFilesystemError(
      '/var/lib/plot.json — storage location is read-only',
    );
    const h = makeHarness({ success: false, error: roError.message });

    act(() => {
      h.staging.setFeatureField('track-A', 'vessel_role', 'intercept', undefined);
    });

    const result = await h.run([track]);
    expect(result.success).toBe(false);
    expect(result.error).toContain('read-only');

    expect(h.appendProvenance).not.toHaveBeenCalled();
    expect(h.staging.isDirty()).toBe(true);
  });

  // ─── Scenario 6 ──────────────────────────────────────────────────
  it('on Node EACCES: buffer preserved, no provenance, permission-derived reason', async () => {
    const track = buildTrack('track-A');
    const eacces = eaccesError(
      "EACCES: permission denied, open '/var/lib/plot.json'",
    );
    const h = makeHarness({ success: false, error: eacces.message });

    act(() => {
      h.staging.setFeatureField('track-A', 'vessel_role', 'intercept', undefined);
    });

    const result = await h.run([track]);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/EACCES/);

    expect(h.appendProvenance).not.toHaveBeenCalled();
    expect(h.staging.isDirty()).toBe(true);
  });

  // ─── Edge case ───────────────────────────────────────────────────
  it('no-op save with an empty buffer succeeds without calling the writer', async () => {
    const track = buildTrack('track-A');
    const h = makeHarness({ success: true });
    const result = await h.run([track]);
    expect(result.success).toBe(true);
    expect(h.writer).not.toHaveBeenCalled();
    expect(h.appendProvenance).not.toHaveBeenCalled();
  });

  it('writes one provenance entry per affected feature when multiple features change', async () => {
    const trackA = buildTrack('track-A');
    const trackB = buildTrack('track-B');
    const features: DebriefFeature[] = [trackA, trackB];
    const h = makeHarness({ success: true });

    act(() => {
      h.staging.setFeatureField('track-A', 'vessel_role', 'intercept', undefined);
      h.staging.setFeatureField('track-B', 'vessel_role', 'support', undefined);
    });

    await h.run(features);

    expect(h.appendProvenance).toHaveBeenCalledTimes(2);
    const featureIds = h.appendProvenance.mock.calls
      .map((c) => c[0])
      .sort();
    expect(featureIds).toEqual(['track-A', 'track-B']);
  });
});

// Reference the type so the suppression-of-unused-imports doesn't fire on
// the contract-named entry symbol — we import it for its `tool` literal
// narrowing and want the IDE to surface it.
const _entryRef: PropertiesProvenanceEntry | undefined = undefined;
void _entryRef;
