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

describe('extractTemporalData', () => {
  it('returns null for feature without geometry', () => {
    expect(extractTemporalData({ geometry: null, properties: {} } as any)).toBeNull();
  });

  it('returns null for non-LineString geometry', () => {
    expect(extractTemporalData({
      id: '1',
      geometry: { type: 'Point', coordinates: [0, 0] },
      properties: { times: [1000] },
    } as any)).toBeNull();
  });

  it('returns null when times array is missing', () => {
    expect(extractTemporalData({
      id: '1',
      geometry: { type: 'LineString', coordinates: [[-4, 50]] },
      properties: { name: 'test' },
    } as any)).toBeNull();
  });

  it('throws when times length does not match coordinates', () => {
    expect(() => extractTemporalData({
      id: 'mismatched',
      geometry: { type: 'LineString', coordinates: [[-4, 50], [-4.1, 50.1]] },
      properties: { times: [1000] },
    } as any)).toThrow('mismatched arrays');
  });

  it('extracts valid temporal data', () => {
    const result = extractTemporalData({
      id: 'track-1',
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [[-4, 50], [-4.1, 50.1], [-4.2, 50.2]],
      },
      properties: {
        kind: 'TRACK',
        name: 'OWNSHIP',
        times: [1000, 2000, 3000],
      },
    } as any);

    expect(result).toEqual({
      trackId: 'track-1',
      coordinates: [[-4, 50], [-4.1, 50.1], [-4.2, 50.2]],
      timestamps: [1000, 2000, 3000],
      timeExtent: [1000, 3000],
    });
  });

  it('throws on non-numeric times (ISO strings)', () => {
    expect(() => extractTemporalData({
      id: 'string-times',
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [[-4, 50], [-4.1, 50.1], [-4.2, 50.2]],
      },
      properties: {
        kind: 'TRACK',
        times: ['2024-01-14T08:00:00Z', '2024-01-14T09:00:00Z', '2024-01-14T10:00:00Z'],
      },
    } as any)).toThrow('non-numeric times');
  });
});
