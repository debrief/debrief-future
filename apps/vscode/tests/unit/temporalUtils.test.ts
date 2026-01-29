/**
 * Unit tests for temporal track utility functions.
 */

import { describe, it, expect } from 'vitest';
import {
  findNearestPointIndex,
  sliceTrackToTime,
} from '../../src/webview/web/temporalUtils';

describe('findNearestPointIndex', () => {
  it('returns -1 for empty array', () => {
    expect(findNearestPointIndex([], 1000)).toBe(-1);
  });

  it('returns 0 for single-element array', () => {
    expect(findNearestPointIndex([500], 1000)).toBe(0);
    expect(findNearestPointIndex([500], 100)).toBe(0);
    expect(findNearestPointIndex([500], 500)).toBe(0);
  });

  it('returns exact match index', () => {
    const ts = [100, 200, 300, 400, 500];
    expect(findNearestPointIndex(ts, 300)).toBe(2);
    expect(findNearestPointIndex(ts, 100)).toBe(0);
    expect(findNearestPointIndex(ts, 500)).toBe(4);
  });

  it('returns nearest index when between elements', () => {
    const ts = [100, 200, 300, 400, 500];
    // 250 is equidistant from 200 (idx 1) and 300 (idx 2) — prefer later
    expect(findNearestPointIndex(ts, 250)).toBe(2);
    // 210 is closer to 200 (idx 1) than 300 (idx 2)
    expect(findNearestPointIndex(ts, 210)).toBe(1);
    // 290 is closer to 300 (idx 2)
    expect(findNearestPointIndex(ts, 290)).toBe(2);
  });

  it('clamps to first element when before range', () => {
    const ts = [100, 200, 300];
    expect(findNearestPointIndex(ts, 50)).toBe(0);
    expect(findNearestPointIndex(ts, -100)).toBe(0);
  });

  it('clamps to last element when after range', () => {
    const ts = [100, 200, 300];
    expect(findNearestPointIndex(ts, 400)).toBe(2);
    expect(findNearestPointIndex(ts, 99999)).toBe(2);
  });

  it('handles two-element array', () => {
    const ts = [100, 200];
    expect(findNearestPointIndex(ts, 100)).toBe(0);
    expect(findNearestPointIndex(ts, 200)).toBe(1);
    expect(findNearestPointIndex(ts, 140)).toBe(0);
    expect(findNearestPointIndex(ts, 160)).toBe(1);
  });
});

describe('sliceTrackToTime', () => {
  const coords: [number, number][] = [
    [-1.0, 50.0],
    [-1.1, 50.1],
    [-1.2, 50.2],
    [-1.3, 50.3],
    [-1.4, 50.4],
  ];
  const times = [100, 200, 300, 400, 500];

  it('returns empty for empty coordinates', () => {
    expect(sliceTrackToTime([], times, 300)).toEqual([]);
  });

  it('returns empty for empty timestamps', () => {
    expect(sliceTrackToTime(coords, [], 300)).toEqual([]);
  });

  it('returns empty when target is before track start', () => {
    expect(sliceTrackToTime(coords, times, 50)).toEqual([]);
  });

  it('returns first point when target equals start', () => {
    const result = sliceTrackToTime(coords, times, 100);
    expect(result).toEqual([[-1.0, 50.0]]);
  });

  it('slices to mid-track point', () => {
    const result = sliceTrackToTime(coords, times, 300);
    expect(result).toEqual([
      [-1.0, 50.0],
      [-1.1, 50.1],
      [-1.2, 50.2],
    ]);
  });

  it('returns all points when target equals end', () => {
    const result = sliceTrackToTime(coords, times, 500);
    expect(result).toEqual(coords);
  });

  it('returns all points when target is after end', () => {
    const result = sliceTrackToTime(coords, times, 9999);
    expect(result).toEqual(coords);
  });

  it('snaps to nearest point when between timestamps', () => {
    // 250 snaps to index 2 (time 300), so slice 0..2 inclusive
    const result = sliceTrackToTime(coords, times, 250);
    expect(result).toEqual([
      [-1.0, 50.0],
      [-1.1, 50.1],
      [-1.2, 50.2],
    ]);
  });
});
