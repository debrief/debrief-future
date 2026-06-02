/**
 * T003 / T009 — unit tests for the pure trail-display helpers (#280).
 *
 * Contract A (`displayCoords`): full mode returns the whole track at any
 * time; trail mode grows with `nowMs`; pre-start → `[]`; post-end → full;
 * nearest-sample boundary; monotonic growth.
 *
 * Contract B (`classifyTemporalTrack`): a `LineString` with a parallel,
 * parseable `timestamps` array (length ≥ 2) qualifies; everything else
 * (missing / mismatched-length / unparseable timestamps, non-LineString,
 * single-vertex) does not.
 *
 * The trail expectations are intentionally derived from `@debrief/utils`'s
 * `sliceTrackToTime` (FR-008 parity with the main app) — they are not a
 * re-invented slicing rule.
 */

import { describe, it, expect } from 'vitest';
import { sliceTrackToTime } from '@debrief/utils';
import { classifyTemporalTrack, displayCoords } from '../trackDisplay';

// Reference track: A,B,C,D,E at epochs 0,10,20,30,40.
const A: [number, number] = [-5, 48];
const B: [number, number] = [-4, 49];
const C: [number, number] = [-3, 50];
const D: [number, number] = [-2, 51];
const E: [number, number] = [-1, 52];
const COORDS: [number, number][] = [A, B, C, D, E];
const EPOCHS = [0, 10, 20, 30, 40];

describe('displayCoords — Full mode (FR-002 / SC-002)', () => {
  it('returns the whole track at any time when not trail', () => {
    expect(displayCoords(COORDS, EPOCHS, false, 0)).toEqual(COORDS);
    expect(displayCoords(COORDS, EPOCHS, false, 20)).toEqual(COORDS);
    expect(displayCoords(COORDS, EPOCHS, false, 40)).toEqual(COORDS);
    expect(displayCoords(COORDS, EPOCHS, false, 1000)).toEqual(COORDS);
  });

  it('returns the same coordinates reference (no copy) in Full mode', () => {
    expect(displayCoords(COORDS, EPOCHS, false, 5)).toBe(COORDS);
  });
});

describe('displayCoords — Trail mode (FR-001 / SC-001)', () => {
  it('shows nothing before the track start', () => {
    expect(displayCoords(COORDS, EPOCHS, true, -5)).toEqual([]);
  });

  it('shows only the first vertex at the very start (US1 scenario 1)', () => {
    expect(displayCoords(COORDS, EPOCHS, true, 0)).toEqual([A]);
  });

  it('grows to the nearest sample as time advances', () => {
    expect(displayCoords(COORDS, EPOCHS, true, 20)).toEqual([A, B, C]);
  });

  it('uses a nearest-sample boundary (t=22, nearer C → [A,B,C])', () => {
    expect(displayCoords(COORDS, EPOCHS, true, 22)).toEqual([A, B, C]);
  });

  it('shows the full track at the last recorded time (US1 scenario 3)', () => {
    expect(displayCoords(COORDS, EPOCHS, true, 40)).toEqual(COORDS);
  });

  it('shows the full track after the last recorded time', () => {
    expect(displayCoords(COORDS, EPOCHS, true, 1000)).toEqual(COORDS);
  });

  it('matches @debrief/utils.sliceTrackToTime exactly (FR-008 parity)', () => {
    for (const t of [-5, 0, 5, 10, 15, 20, 25, 30, 35, 40, 100]) {
      expect(displayCoords(COORDS, EPOCHS, true, t)).toEqual(
        sliceTrackToTime(COORDS, EPOCHS, t),
      );
    }
  });

  it('grows monotonically with time (SC-001)', () => {
    let prev = 0;
    for (let t = -5; t <= 45; t += 1) {
      const len = displayCoords(COORDS, EPOCHS, true, t).length;
      expect(len).toBeGreaterThanOrEqual(prev);
      prev = len;
    }
    expect(prev).toBe(COORDS.length);
  });
});

describe('classifyTemporalTrack (Contract B — FR-007 / FR-009)', () => {
  const isoTimes = EPOCHS.map((e) => new Date(e).toISOString());
  const positionsFrom = (times: string[]): Array<{ time: string }> =>
    times.map((time) => ({ time }));

  // A canonical Debrief track feature: timing in `properties.positions`,
  // line colour in `properties.style.line.color`. `classifyTemporalTrack`
  // is typed against `DebriefFeature`; the tests build that shape and cast
  // through `unknown` at the single call boundary.
  type Props = Record<string, unknown>;
  const makeFeature = (
    geometry: unknown,
    properties: Props,
    id: unknown = 'feat-1',
  ): Parameters<typeof classifyTemporalTrack>[0] =>
    ({ type: 'Feature', id, geometry, properties } as unknown as Parameters<
      typeof classifyTemporalTrack
    >[0]);

  const trackProps = (extra: Props): Props => ({ kind: 'TRACK', ...extra });

  it('qualifies a TRACK LineString with parallel, parseable positions', () => {
    const track = classifyTemporalTrack(
      makeFeature(
        { type: 'LineString', coordinates: COORDS },
        trackProps({
          platform_id: 'alpha',
          platform_name: 'Alpha',
          style: { line: { color: '#abcdef' } },
          positions: positionsFrom(isoTimes),
        }),
        'alpha-feat',
      ),
    );
    expect(track).not.toBeNull();
    expect(track!.id).toBe('alpha-feat');
    expect(track!.coords).toEqual(COORDS);
    expect(track!.epochsMs).toEqual(EPOCHS);
    expect(track!.colour).toBe('#abcdef');
    expect(track!.name).toBe('Alpha');
  });

  it('prefers display_name over platform_name', () => {
    const track = classifyTemporalTrack(
      makeFeature(
        { type: 'LineString', coordinates: COORDS },
        trackProps({
          platform_id: 'p',
          platform_name: 'Platform',
          display_name: 'Override',
          positions: positionsFrom(isoTimes),
        }),
      ),
    );
    expect(track!.name).toBe('Override');
  });

  it('falls back to platform_id and a default colour when style/name omitted', () => {
    const track = classifyTemporalTrack(
      makeFeature(
        { type: 'LineString', coordinates: COORDS },
        trackProps({ platform_id: 'pid-1', positions: positionsFrom(isoTimes) }),
        null,
      ),
    );
    expect(track).not.toBeNull();
    expect(track!.id).toBe('pid-1');
    expect(track!.colour).toBe('#1f77b4');
    expect(track!.name).toBe('');
  });

  it('rejects a non-TRACK feature (kind discriminator)', () => {
    expect(
      classifyTemporalTrack(
        makeFeature(
          { type: 'LineString', coordinates: COORDS },
          { kind: 'POINT', positions: positionsFrom(isoTimes) },
        ),
      ),
    ).toBeNull();
  });

  it('rejects a TRACK with no positions (FR-007)', () => {
    expect(
      classifyTemporalTrack(
        makeFeature({ type: 'LineString', coordinates: COORDS }, trackProps({ platform_id: 'x' })),
      ),
    ).toBeNull();
  });

  it('rejects a TRACK whose positions length differs from coords (FR-007)', () => {
    expect(
      classifyTemporalTrack(
        makeFeature(
          { type: 'LineString', coordinates: COORDS },
          trackProps({ positions: positionsFrom(isoTimes.slice(0, 3)) }),
        ),
      ),
    ).toBeNull();
  });

  it('rejects a TRACK with an unparseable position time (FR-007)', () => {
    const bad = [...isoTimes];
    bad[2] = 'not-a-date';
    expect(
      classifyTemporalTrack(
        makeFeature(
          { type: 'LineString', coordinates: COORDS },
          trackProps({ positions: positionsFrom(bad) }),
        ),
      ),
    ).toBeNull();
  });

  it('rejects a single-vertex TRACK (≥2 points required)', () => {
    expect(
      classifyTemporalTrack(
        makeFeature(
          { type: 'LineString', coordinates: [A] },
          trackProps({ positions: positionsFrom([isoTimes[0]!]) }),
        ),
      ),
    ).toBeNull();
  });

  it('rejects a compound MultiLineString TRACK (only simple LineStrings slice)', () => {
    expect(
      classifyTemporalTrack(
        makeFeature(
          { type: 'MultiLineString', coordinates: [COORDS] },
          trackProps({ positions: positionsFrom(isoTimes) }),
        ),
      ),
    ).toBeNull();
  });

  it('rejects a Point (FR-009 — reference marker)', () => {
    expect(
      classifyTemporalTrack(
        makeFeature({ type: 'Point', coordinates: A }, { kind: 'POINT' }),
      ),
    ).toBeNull();
  });
});

describe('mode predicate — full / absent / unrecognised all map to "not trail" (FR-002/FR-003)', () => {
  // The renderer derives `isTrail = display_mode === 'trail'`; this test
  // documents that every other value is Full. We exercise it through
  // displayCoords by passing the resulting boolean.
  const isTrail = (mode: string | undefined): boolean => mode === 'trail';

  it('only the literal "trail" is trail', () => {
    expect(isTrail('trail')).toBe(true);
    expect(isTrail('full')).toBe(false);
    expect(isTrail(undefined)).toBe(false);
    expect(isTrail('bogus')).toBe(false);
  });

  it('a Full/absent/unrecognised mode shows the whole track', () => {
    for (const mode of ['full', undefined, 'bogus']) {
      expect(displayCoords(COORDS, EPOCHS, isTrail(mode), 0)).toEqual(COORDS);
      expect(displayCoords(COORDS, EPOCHS, isTrail(mode), 40)).toEqual(COORDS);
    }
  });
});
