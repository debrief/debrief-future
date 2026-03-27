import { describe, it, expect } from 'vitest';
import {
  findNearestPointIndex,
  sliceTrackToTime,
  extractTemporalData,
} from '../temporal-utils';

describe('findNearestPointIndex', () => {
  it('returns -1 for empty array', () => {
    expect(findNearestPointIndex([], 1000)).toBe(-1);
  });

  it('returns 0 for single element', () => {
    expect(findNearestPointIndex([1000], 500)).toBe(0);
    expect(findNearestPointIndex([1000], 1500)).toBe(0);
  });

  it('returns exact match index', () => {
    expect(findNearestPointIndex([1000, 2000, 3000], 2000)).toBe(1);
  });

  it('returns nearest index when between timestamps', () => {
    const ts = [1000, 2000, 3000, 4000, 5000];
    // 2400 is closer to 2000 (index 1)
    expect(findNearestPointIndex(ts, 2400)).toBe(1);
    // 2600 is closer to 3000 (index 2)
    expect(findNearestPointIndex(ts, 2600)).toBe(2);
    // 2500 equidistant - returns higher index (low)
    expect(findNearestPointIndex(ts, 2500)).toBe(2);
  });

  it('returns 0 when target is before all timestamps', () => {
    expect(findNearestPointIndex([1000, 2000, 3000], 500)).toBe(0);
  });

  it('returns last index when target is after all timestamps', () => {
    expect(findNearestPointIndex([1000, 2000, 3000], 5000)).toBe(2);
  });

  it('handles large arrays efficiently', () => {
    const ts = Array.from({ length: 10000 }, (_, i) => i * 1000);
    expect(findNearestPointIndex(ts, 5000500)).toBe(5001);
  });
});

describe('sliceTrackToTime', () => {
  const coords: [number, number][] = [[-4, 50], [-4.1, 50.1], [-4.2, 50.2], [-4.3, 50.3]];
  const times = [1000, 2000, 3000, 4000];

  it('returns empty for empty input', () => {
    expect(sliceTrackToTime([], [], 1000)).toEqual([]);
  });

  it('returns empty when target time is before track start', () => {
    expect(sliceTrackToTime(coords, times, 500)).toEqual([]);
  });

  it('returns first point when target matches start', () => {
    expect(sliceTrackToTime(coords, times, 1000)).toEqual([[-4, 50]]);
  });

  it('returns all points when target is at or after end', () => {
    expect(sliceTrackToTime(coords, times, 4000)).toEqual(coords);
    expect(sliceTrackToTime(coords, times, 5000)).toEqual(coords);
  });

  it('returns partial track for mid-range time', () => {
    // 2400 nearest to index 1 (time 2000)
    expect(sliceTrackToTime(coords, times, 2400)).toEqual([[-4, 50], [-4.1, 50.1]]);
  });
});

/** Minimal feature shape accepted by extractTemporalData for testing */
interface TestFeatureInput {
  id?: string;
  type?: string;
  geometry: { type: string; coordinates: number[][] } | null;
  properties: Record<string, unknown> | null;
}

describe('extractTemporalData', () => {
  it('returns null for feature without geometry', () => {
    // eslint-disable-next-line no-restricted-syntax
    expect(extractTemporalData({ geometry: null, properties: {} } as unknown as Parameters<typeof extractTemporalData>[0])).toBeNull();
  });

  it('returns null for non-LineString geometry', () => {
    const feature: TestFeatureInput = {
      id: '1',
      geometry: { type: 'Point', coordinates: [[0, 0]] },
      properties: { positions: [{ time: '2024-01-14T08:00:00Z' }] },
    };
    // eslint-disable-next-line no-restricted-syntax
    expect(extractTemporalData(feature as unknown as Parameters<typeof extractTemporalData>[0])).toBeNull();
  });

  it('returns null for track without positions', () => {
    const feature: TestFeatureInput = {
      id: '1',
      geometry: { type: 'LineString', coordinates: [[-4, 50]] },
      properties: { kind: 'TRACK', positions: [] },
    };
    // eslint-disable-next-line no-restricted-syntax
    expect(extractTemporalData(feature as unknown as Parameters<typeof extractTemporalData>[0])).toBeNull();
  });

  it('returns null for non-track feature', () => {
    const feature: TestFeatureInput = {
      id: '1',
      geometry: { type: 'LineString', coordinates: [[-4, 50]] },
      properties: { kind: 'LINE', label: 'test' },
    };
    // eslint-disable-next-line no-restricted-syntax
    expect(extractTemporalData(feature as unknown as Parameters<typeof extractTemporalData>[0])).toBeNull();
  });

  it('throws when positions length does not match coordinates', () => {
    const feature: TestFeatureInput = {
      id: 'mismatched',
      geometry: { type: 'LineString', coordinates: [[-4, 50], [-4.1, 50.1]] },
      properties: { kind: 'TRACK', positions: [{ time: '2024-01-14T08:00:00Z' }] },
    };
    // eslint-disable-next-line no-restricted-syntax
    expect(() => extractTemporalData(feature as unknown as Parameters<typeof extractTemporalData>[0])).toThrow('mismatched arrays');
  });

  it('extracts valid temporal data from positions array', () => {
    const feature: TestFeatureInput = {
      id: 'track-1',
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [[-4, 50], [-4.1, 50.1], [-4.2, 50.2]],
      },
      properties: {
        kind: 'TRACK',
        name: 'OWNSHIP',
        positions: [
          { time: '2024-01-14T08:00:00Z' },
          { time: '2024-01-14T09:00:00Z' },
          { time: '2024-01-14T10:00:00Z' },
        ],
      },
    };
    // eslint-disable-next-line no-restricted-syntax
    const result = extractTemporalData(feature as unknown as Parameters<typeof extractTemporalData>[0]);

    expect(result).not.toBeNull();
    expect(result!.trackId).toBe('track-1');
    expect(result!.coordinates).toEqual([[-4, 50], [-4.1, 50.1], [-4.2, 50.2]]);
    expect(result!.timestamps).toEqual([
      Date.parse('2024-01-14T08:00:00Z'),
      Date.parse('2024-01-14T09:00:00Z'),
      Date.parse('2024-01-14T10:00:00Z'),
    ]);
    expect(result!.timeExtent).toEqual([
      Date.parse('2024-01-14T08:00:00Z'),
      Date.parse('2024-01-14T10:00:00Z'),
    ]);
  });

  it('throws on invalid time string in positions', () => {
    const feature: TestFeatureInput = {
      id: 'bad-time',
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [[-4, 50], [-4.1, 50.1]],
      },
      properties: {
        kind: 'TRACK',
        positions: [
          { time: '2024-01-14T08:00:00Z' },
          { time: 'not-a-date' },
        ],
      },
    };
    // eslint-disable-next-line no-restricted-syntax
    expect(() => extractTemporalData(feature as unknown as Parameters<typeof extractTemporalData>[0])).toThrow('invalid time');
  });
});
