/**
 * @vitest-environment jsdom
 *
 * Tests for the web-shell active-Storyboard persistence helpers (#237).
 *
 * Exercises the wiring contract used by `StoryboardPanelMount`:
 *   - mount-time read returns 'absent' / 'valid' / 'stale' verdicts
 *   - change-time write upserts the SystemState feature through the
 *     `setFeatureCollection` callback (the web-shell's plot-edit pipeline)
 *
 * These helpers wrap the @debrief/components shared helpers, so the deeper
 * V-1 / V-3 / V-4 / V-5 invariants are already covered there. This file
 * focuses on the StoryboardPanelMount integration contract.
 */

import { describe, it, expect, vi } from 'vitest';
import type { Feature, FeatureCollection } from 'geojson';
import {
  persistActiveStoryboardId,
  readPersistedActiveStoryboardId,
} from '../activeStoryboardPersistence';

// Inlined to keep this test free of leaflet / react-dom transitive imports
// from the @debrief/components root. The constants are also asserted by
// `shared/components/src/storyboard/__tests__/activeStoryboardSelection.test.ts`.
const ACTIVE_STORYBOARD_FEATURE_ID = 'state.activestoryboard';
const ACTIVE_STORYBOARD_STATE_TYPE = 'active_storyboard';

const STORYBOARD_A = '01JSTORYBOARDAAAA000000000A';
const STORYBOARD_B = '01JSTORYBOARDBBBB000000000B';
const STORYBOARD_C = '01JSTORYBOARDCCCC000000000C';

function makeStoryboard(id: string, name: string): Feature {
  return {
    type: 'Feature',
    id,
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 1],
          [0, 0],
        ],
      ],
    },
    properties: {
      kind: 'STORYBOARD',
      id,
      name,
      schema_version: 1,
      tags: [],
      provenance: [
        {
          activity_id: `${id}-1`,
          timestamp: '2026-04-20T09:00:00Z',
          agent: 'alice',
          was_generated_by: {
            tool: 'storyboard-crud',
            tool_version: '1.0.0',
            parameters: [{ value: 'create' }],
          },
          used: [],
          generated: [id],
          execution_duration: 'PT0S',
        },
      ],
    },
  };
}

function makeActiveSelection(id: string): Feature {
  return {
    type: 'Feature',
    id: ACTIVE_STORYBOARD_FEATURE_ID,
    geometry: { type: 'Point', coordinates: [] },
    properties: {
      kind: 'SYSTEM',
      state_type: ACTIVE_STORYBOARD_STATE_TYPE,
      active_storyboard_id: id,
    },
  };
}

function makeFC(...features: Feature[]): FeatureCollection {
  return { type: 'FeatureCollection', features };
}

describe('readPersistedActiveStoryboardId', () => {
  it("returns 'absent' on a plot with no SystemState entry", () => {
    const fc = makeFC(
      makeStoryboard(STORYBOARD_A, 'A'),
      makeStoryboard(STORYBOARD_B, 'B'),
    );
    expect(readPersistedActiveStoryboardId(fc)).toEqual({
      kind: 'absent',
      id: null,
    });
  });

  it("returns 'valid' with the recorded ID when the storyboard is present", () => {
    const fc = makeFC(
      makeStoryboard(STORYBOARD_A, 'A'),
      makeStoryboard(STORYBOARD_B, 'B'),
      makeActiveSelection(STORYBOARD_B),
    );
    expect(readPersistedActiveStoryboardId(fc)).toEqual({
      kind: 'valid',
      id: STORYBOARD_B,
    });
  });

  it("returns 'stale' (and id: null) when the recorded ID is not in the plot", () => {
    const fc = makeFC(
      makeStoryboard(STORYBOARD_A, 'A'),
      makeStoryboard(STORYBOARD_B, 'B'),
      makeActiveSelection('STORYBOARD-DELETED'),
    );
    expect(readPersistedActiveStoryboardId(fc)).toEqual({
      kind: 'stale',
      id: null,
    });
  });

  it("returns 'stale' when there are no Storyboards remaining (US2#3 edge case)", () => {
    const fc = makeFC(makeActiveSelection(STORYBOARD_A));
    expect(readPersistedActiveStoryboardId(fc)).toEqual({
      kind: 'stale',
      id: null,
    });
  });
});

describe('persistActiveStoryboardId', () => {
  it('upserts the SystemState feature through the edit pipeline', () => {
    const fc = makeFC(
      makeStoryboard(STORYBOARD_A, 'A'),
      makeStoryboard(STORYBOARD_B, 'B'),
    );
    const setFC = vi.fn();
    persistActiveStoryboardId(fc, STORYBOARD_B, setFC);

    expect(setFC).toHaveBeenCalledTimes(1);
    const written: FeatureCollection = setFC.mock.calls[0]![0];
    const matches = written.features.filter(
      (f) =>
        (f.properties as { state_type?: unknown } | null)?.state_type ===
        ACTIVE_STORYBOARD_STATE_TYPE,
    );
    expect(matches).toHaveLength(1);
    expect(
      (matches[0]!.properties as { active_storyboard_id?: string })
        .active_storyboard_id,
    ).toBe(STORYBOARD_B);
  });

  it('replaces the existing SystemState feature in place (V-3, no duplication)', () => {
    const fc = makeFC(
      makeStoryboard(STORYBOARD_A, 'A'),
      makeStoryboard(STORYBOARD_B, 'B'),
      makeActiveSelection(STORYBOARD_A),
    );
    const setFC = vi.fn();
    persistActiveStoryboardId(fc, STORYBOARD_C, setFC);

    const written: FeatureCollection = setFC.mock.calls[0]![0];
    const matches = written.features.filter(
      (f) =>
        (f.properties as { state_type?: unknown } | null)?.state_type ===
        ACTIVE_STORYBOARD_STATE_TYPE,
    );
    expect(matches).toHaveLength(1);
    expect(
      (matches[0]!.properties as { active_storyboard_id?: string })
        .active_storyboard_id,
    ).toBe(STORYBOARD_C);
  });

  it('removes the SystemState feature when null is passed (V-4)', () => {
    const fc = makeFC(
      makeStoryboard(STORYBOARD_A, 'A'),
      makeActiveSelection(STORYBOARD_A),
    );
    const setFC = vi.fn();
    persistActiveStoryboardId(fc, null, setFC);

    const written: FeatureCollection = setFC.mock.calls[0]![0];
    const matches = written.features.filter(
      (f) =>
        (f.properties as { state_type?: unknown } | null)?.state_type ===
        ACTIVE_STORYBOARD_STATE_TYPE,
    );
    expect(matches).toHaveLength(0);
  });

  it('does not mutate the input FeatureCollection', () => {
    const fc = makeFC(
      makeStoryboard(STORYBOARD_A, 'A'),
      makeStoryboard(STORYBOARD_B, 'B'),
    );
    const beforeJson = JSON.stringify(fc);
    persistActiveStoryboardId(fc, STORYBOARD_B, vi.fn());
    expect(JSON.stringify(fc)).toBe(beforeJson);
  });

  it('round-trip: write then read returns the same ID', () => {
    let fc: FeatureCollection = makeFC(
      makeStoryboard(STORYBOARD_A, 'A'),
      makeStoryboard(STORYBOARD_B, 'B'),
    );
    persistActiveStoryboardId(fc, STORYBOARD_A, (next) => {
      fc = next;
    });
    expect(readPersistedActiveStoryboardId(fc)).toEqual({
      kind: 'valid',
      id: STORYBOARD_A,
    });
  });
});
