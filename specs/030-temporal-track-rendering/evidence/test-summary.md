# Test Summary: Temporal Track Rendering

**Date**: 2026-01-28
**Runner**: Vitest 1.6.1

## Results

```
 ✓ src/MapView/__tests__/temporal-utils.test.ts (17 tests) 7ms

 Test Files  1 passed (1)
      Tests  17 passed (17)
```

## Test Breakdown

### findNearestPointIndex (7 tests)
- returns -1 for empty array
- returns 0 for single element
- returns exact match index
- returns nearest index when between timestamps
- returns 0 when target is before all timestamps
- returns last index when target is after all timestamps
- handles large arrays efficiently (10,000 elements)

### sliceTrackToTime (5 tests)
- returns empty for empty input
- returns empty when target time is before track start
- returns first point when target matches start
- returns all points when target is at or after end
- returns partial track for mid-range time

### extractTemporalData (5 tests)
- returns null for feature without geometry
- returns null for non-LineString geometry
- returns null when times array is missing
- returns null when times length does not match coordinates
- extracts valid temporal data
