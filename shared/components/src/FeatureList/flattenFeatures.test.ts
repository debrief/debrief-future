import { describe, it, expect } from 'vitest';
import { flattenFeatures, hasChildSelected } from './flattenFeatures';
import type { TrackFeature, MultiPointFeature, MultiPolygonFeature, ReferenceLocation } from '@debrief/schemas';

// ─── Test Fixtures ───────────────────────────────────────────────────

const trackWithPositions = {
  type: 'Feature',
  id: 'track-001',
  geometry: {
    type: 'LineString',
    coordinates: [[-5, 50], [-4, 51]] as unknown as number[],
  },
  properties: {
    kind: 'TRACK',
    platform_id: 'PLT-001',
    platform_name: 'HMS Example',
    track_type: 'OWNSHIP',
    start_time: '2024-01-15T08:00:00Z',
    end_time: '2024-01-15T12:00:00Z',
    positions: [
      { time: '2024-01-15T08:00:00Z', course: 90, speed: 12.5 },
      { time: '2024-01-15T09:00:00Z', course: 95, speed: 13.0 },
      { time: '2024-01-15T10:00:00Z' },
    ],
  },
} as unknown as TrackFeature;

const trackWithOverrides = {
  type: 'Feature',
  id: 'track-002',
  geometry: {
    type: 'LineString',
    coordinates: [[-5, 50], [-4, 51]] as unknown as number[],
  },
  properties: {
    kind: 'TRACK',
    platform_id: 'PLT-002',
    platform_name: 'Contact Alpha',
    track_type: 'CONTACT',
    start_time: '2024-01-15T08:00:00Z',
    end_time: '2024-01-15T10:00:00Z',
    positions: [
      { time: '2024-01-15T08:00:00Z', course: 180, speed: 10 },
      { time: '2024-01-15T09:00:00Z', course: 185, speed: 11 },
    ],
    position_style_overrides: [
      { label: 'Start Marker' },
      { label: 'End Marker' },
    ],
  },
} as unknown as TrackFeature;

const emptyTrack = {
  type: 'Feature',
  id: 'track-empty',
  geometry: {
    type: 'LineString',
    coordinates: [[-5, 50], [-4, 51]] as unknown as number[],
  },
  properties: {
    kind: 'TRACK',
    platform_id: 'PLT-003',
    platform_name: 'Empty Track',
    track_type: 'CONTACT',
    start_time: '2024-01-15T08:00:00Z',
    end_time: '2024-01-15T12:00:00Z',
    positions: [],
  },
} as unknown as TrackFeature;

const compoundTrack = {
  type: 'Feature',
  id: 'track-compound',
  geometry: {
    type: 'LineString',
    coordinates: [[-5, 50], [-4, 51]] as unknown as number[],
  },
  properties: {
    kind: 'TRACK',
    platform_id: 'PLT-004',
    platform_name: 'Compound Track',
    track_type: 'SOLUTION',
    start_time: '2024-01-15T08:00:00Z',
    end_time: '2024-01-15T12:00:00Z',
    positions: [],
    segments: [
      {
        segment_type: 'TMA_SEGMENT',
        name: 'leg-alpha',
        start_time: '2024-01-15T08:00:00Z',
        end_time: '2024-01-15T10:00:00Z',
        positions: [
          { time: '2024-01-15T08:00:00Z', course: 45, speed: 8 },
          { time: '2024-01-15T09:00:00Z', course: 50, speed: 9 },
        ],
      },
      {
        segment_type: 'TMA_SEGMENT',
        name: 'leg-bravo',
        start_time: '2024-01-15T10:00:00Z',
        end_time: '2024-01-15T12:00:00Z',
        positions: [
          { time: '2024-01-15T10:00:00Z', course: 120, speed: 7 },
        ],
      },
    ],
  },
} as unknown as TrackFeature;

const mockMultiPoint = {
  type: 'Feature',
  id: 'mp-001',
  geometry: {
    type: 'MultiPoint',
    coordinates: [[-5.1234, 50.5678], [-4.9876, 51.2345], [-3.5555, 52.4444]],
  },
  properties: {
    kind: 'MULTI_POINT',
    label: 'Bearing Fan',
    style: { shape: 'circle', radius: 5, fill: true, fillColor: '#ff0000', fillOpacity: 0.5, color: '#ff0000', weight: 1, opacity: 1 },
  },
} as unknown as MultiPointFeature;

const emptyMultiPoint = {
  type: 'Feature',
  id: 'mp-empty',
  geometry: {
    type: 'MultiPoint',
    coordinates: [],
  },
  properties: {
    kind: 'MULTI_POINT',
    label: 'Empty MultiPoint',
    style: { shape: 'circle', radius: 5, fill: true, fillColor: '#ff0000', fillOpacity: 0.5, color: '#ff0000', weight: 1, opacity: 1 },
  },
} as unknown as MultiPointFeature;

const mockMultiPolygon = {
  type: 'Feature',
  id: 'mpg-001',
  geometry: {
    type: 'MultiPolygon',
    coordinates: [
      [[[-5, 50], [-4, 50], [-4.5, 51], [-5, 50]]],
      [[[-3, 52], [-2, 52], [-2, 53], [-3, 53], [-3, 52]]],
    ],
  },
  properties: {
    kind: 'MULTI_POLYGON',
    label: 'Zone Boundaries',
    style: { fill: true, fillColor: '#00ff00', fillOpacity: 0.3, color: '#00ff00', weight: 2, opacity: 0.8 },
  },
} as unknown as MultiPolygonFeature;

const mockRefLocation = {
  type: 'Feature',
  id: 'ref-001',
  geometry: {
    type: 'Point',
    coordinates: [-3, 52] as unknown as number[],
  },
  properties: {
    kind: 'POINT',
    name: 'Waypoint Alpha',
    location_type: 'WAYPOINT',
    valid_from: '2024-01-15T00:00:00Z',
    valid_until: '2024-01-15T23:59:59Z',
    style: { shape: 'circle', radius: 5, fill: true, fillColor: '#333', fillOpacity: 1, color: '#333', weight: 1, opacity: 1 },
  },
} as unknown as ReferenceLocation;

// ─── Tests ───────────────────────────────────────────────────────────

describe('flattenFeatures', () => {
  describe('basic behaviour', () => {
    it('returns empty array for no features', () => {
      expect(flattenFeatures([], new Set())).toEqual([]);
    });

    it('returns feature rows for unexpanded features', () => {
      const items = flattenFeatures([trackWithPositions, mockRefLocation], new Set());
      expect(items).toHaveLength(2);
      expect(items[0]!.type).toBe('feature');
      expect(items[0]!.id).toBe('track-001');
      expect(items[0]!.depth).toBe(0);
      expect(items[0]!.isExpandable).toBe(true);
      expect(items[1]!.type).toBe('feature');
      expect(items[1]!.id).toBe('ref-001');
      expect(items[1]!.isExpandable).toBe(false);
    });

    it('sets feature reference on feature rows', () => {
      const items = flattenFeatures([trackWithPositions], new Set());
      expect(items[0]!.feature).toBe(trackWithPositions);
    });

    it('non-expandable features (POINT) have isExpandable=false', () => {
      const items = flattenFeatures([mockRefLocation], new Set());
      expect(items[0]!.isExpandable).toBe(false);
    });
  });

  describe('track expansion', () => {
    it('expands track to show position children', () => {
      const expanded = new Set(['track-001']);
      const items = flattenFeatures([trackWithPositions], expanded);

      expect(items).toHaveLength(4);
      expect(items[0]!.type).toBe('feature');
      expect(items[0]!.id).toBe('track-001');

      expect(items[1]!.type).toBe('position');
      expect(items[1]!.depth).toBe(1);
      expect(items[1]!.parentId).toBe('track-001');
      expect(items[1]!.id).toBe('track-001/positions/0');
      expect(items[1]!.index).toBe(0);

      expect(items[2]!.type).toBe('position');
      expect(items[2]!.id).toBe('track-001/positions/1');
      expect(items[2]!.index).toBe(1);

      expect(items[3]!.type).toBe('position');
      expect(items[3]!.id).toBe('track-001/positions/2');
      expect(items[3]!.index).toBe(2);
    });

    it('position labels use timestamps', () => {
      const expanded = new Set(['track-001']);
      const items = flattenFeatures([trackWithPositions], expanded);

      const posItems = items.filter(i => i.type === 'position');
      for (const p of posItems) {
        expect(p.label).not.toMatch(/^Position \d+$/);
      }
    });

    it('position labels use override label when PositionStyleOverride exists', () => {
      const expanded = new Set(['track-002']);
      const items = flattenFeatures([trackWithOverrides], expanded);

      const posItems = items.filter(i => i.type === 'position');
      expect(posItems[0]!.label).toBe('Start Marker');
      expect(posItems[1]!.label).toBe('End Marker');
    });

    it('position sublabel shows course/speed when available', () => {
      const expanded = new Set(['track-001']);
      const items = flattenFeatures([trackWithPositions], expanded);

      const posItems = items.filter(i => i.type === 'position');
      expect(posItems[0]!.sublabel).toContain('90\u00B0');
      expect(posItems[0]!.sublabel).toContain('12.5kts');
      expect(posItems[2]!.sublabel).toBeNull();
    });

    it('empty track shows placeholder row', () => {
      const expanded = new Set(['track-empty']);
      const items = flattenFeatures([emptyTrack], expanded);

      expect(items).toHaveLength(2);
      expect(items[1]!.label).toBe('No child items');
      expect(items[1]!.depth).toBe(1);
      expect(items[1]!.isExpandable).toBe(false);
    });

    it('child items have isExpandable=false', () => {
      const expanded = new Set(['track-001']);
      const items = flattenFeatures([trackWithPositions], expanded);

      const children = items.filter(i => i.depth > 0);
      for (const child of children) {
        expect(child.isExpandable).toBe(false);
      }
    });

    it('child items have feature=null', () => {
      const expanded = new Set(['track-001']);
      const items = flattenFeatures([trackWithPositions], expanded);

      const children = items.filter(i => i.depth > 0);
      for (const child of children) {
        expect(child.feature).toBeNull();
      }
    });
  });

  describe('multi-point expansion', () => {
    it('expands multi-point to show point children', () => {
      const expanded = new Set(['mp-001']);
      const items = flattenFeatures([mockMultiPoint], expanded);

      expect(items).toHaveLength(4);
      expect(items[1]!.type).toBe('point');
      expect(items[1]!.id).toBe('mp-001/points/0');
      expect(items[1]!.label).toBe('Point 1');
      expect(items[1]!.depth).toBe(1);

      expect(items[2]!.id).toBe('mp-001/points/1');
      expect(items[2]!.label).toBe('Point 2');

      expect(items[3]!.id).toBe('mp-001/points/2');
      expect(items[3]!.label).toBe('Point 3');
    });

    it('point sublabels show coordinates', () => {
      const expanded = new Set(['mp-001']);
      const items = flattenFeatures([mockMultiPoint], expanded);

      const pointItems = items.filter(i => i.type === 'point');
      expect(pointItems[0]!.sublabel).toBe('[-5.1234, 50.5678]');
      expect(pointItems[1]!.sublabel).toBe('[-4.9876, 51.2345]');
    });

    it('empty multi-point is not expandable (no placeholder needed)', () => {
      const expanded = new Set(['mp-empty']);
      const items = flattenFeatures([emptyMultiPoint], expanded);

      expect(items).toHaveLength(1);
      expect(items[0]!.isExpandable).toBe(false);
    });
  });

  describe('multi-polygon expansion', () => {
    it('expands multi-polygon to show polygon children', () => {
      const expanded = new Set(['mpg-001']);
      const items = flattenFeatures([mockMultiPolygon], expanded);

      expect(items).toHaveLength(3);
      expect(items[1]!.type).toBe('polygon');
      expect(items[1]!.id).toBe('mpg-001/polygons/0');
      expect(items[1]!.label).toBe('Polygon 1');
      expect(items[1]!.depth).toBe(1);

      expect(items[2]!.id).toBe('mpg-001/polygons/1');
      expect(items[2]!.label).toBe('Polygon 2');
    });

    it('polygon sublabels show vertex count', () => {
      const expanded = new Set(['mpg-001']);
      const items = flattenFeatures([mockMultiPolygon], expanded);

      const polyItems = items.filter(i => i.type === 'polygon');
      expect(polyItems[0]!.sublabel).toBe('4 vertices');
      expect(polyItems[1]!.sublabel).toBe('5 vertices');
    });
  });

  describe('compound track (segments)', () => {
    it('expands compound track to show segments', () => {
      const expanded = new Set(['track-compound']);
      const items = flattenFeatures([compoundTrack], expanded);

      expect(items).toHaveLength(3);
      expect(items[1]!.type).toBe('segment');
      expect(items[1]!.id).toBe('track-compound/segments/leg-alpha');
      expect(items[1]!.label).toBe('leg-alpha');
      expect(items[1]!.depth).toBe(1);
      expect(items[1]!.isExpandable).toBe(true);

      expect(items[2]!.type).toBe('segment');
      expect(items[2]!.id).toBe('track-compound/segments/leg-bravo');
      expect(items[2]!.label).toBe('leg-bravo');
      expect(items[2]!.isExpandable).toBe(true);
    });

    it('expands segment to show nested positions (depth 2)', () => {
      const expanded = new Set(['track-compound', 'track-compound/segments/leg-alpha']);
      const items = flattenFeatures([compoundTrack], expanded);

      expect(items).toHaveLength(5);

      expect(items[1]!.type).toBe('segment');
      expect(items[1]!.id).toBe('track-compound/segments/leg-alpha');

      expect(items[2]!.type).toBe('position');
      expect(items[2]!.id).toBe('track-compound/segments/leg-alpha/positions/0');
      expect(items[2]!.depth).toBe(2);
      expect(items[2]!.parentId).toBe('track-compound/segments/leg-alpha');

      expect(items[3]!.type).toBe('position');
      expect(items[3]!.id).toBe('track-compound/segments/leg-alpha/positions/1');
      expect(items[3]!.depth).toBe(2);

      expect(items[4]!.type).toBe('segment');
      expect(items[4]!.id).toBe('track-compound/segments/leg-bravo');
    });

    it('segment sublabel shows segment_type when different from name', () => {
      const expanded = new Set(['track-compound']);
      const items = flattenFeatures([compoundTrack], expanded);

      const segItems = items.filter(i => i.type === 'segment');
      expect(segItems[0]!.sublabel).toBe('TMA_SEGMENT');
    });
  });

  describe('multiple features mixed', () => {
    it('handles mix of expanded and unexpanded features', () => {
      const features = [trackWithPositions, mockRefLocation, mockMultiPoint];
      const expanded = new Set(['track-001']);

      const items = flattenFeatures(features, expanded);
      expect(items).toHaveLength(6);
      expect(items[0]!.id).toBe('track-001');
      expect(items[1]!.id).toBe('track-001/positions/0');
      expect(items[2]!.id).toBe('track-001/positions/1');
      expect(items[3]!.id).toBe('track-001/positions/2');
      expect(items[4]!.id).toBe('ref-001');
      expect(items[5]!.id).toBe('mp-001');
    });

    it('handles multiple features expanded simultaneously', () => {
      const features = [trackWithPositions, mockMultiPoint];
      const expanded = new Set(['track-001', 'mp-001']);

      const items = flattenFeatures(features, expanded);
      expect(items).toHaveLength(8);
    });
  });

  describe('performance', () => {
    it('handles large track (1000+ positions) efficiently', () => {
      const positions = Array.from({ length: 1500 }, (_, i) => ({
        time: new Date(Date.now() + i * 60000).toISOString(),
        course: i % 360,
        speed: 10 + (i % 10),
      }));
      const largeTrack = {
        type: 'Feature',
        id: 'track-large',
        geometry: { type: 'LineString', coordinates: [[-5, 50], [-4, 51]] as unknown as number[] },
        properties: {
          kind: 'TRACK',
          platform_id: 'PLT-LRG',
          platform_name: 'Large Track',
          track_type: 'OWNSHIP',
          start_time: positions[0]!.time,
          end_time: positions[positions.length - 1]!.time,
          positions,
        },
      } as unknown as TrackFeature;

      const start = performance.now();
      const items = flattenFeatures([largeTrack], new Set(['track-large']));
      const elapsed = performance.now() - start;

      expect(items).toHaveLength(1501);
      expect(elapsed).toBeLessThan(100);
    });
  });
});

describe('hasChildSelected', () => {
  it('returns true when a child path is selected', () => {
    const selected = new Set(['track-001/positions/4']);
    expect(hasChildSelected('track-001', selected)).toBe(true);
  });

  it('returns true for deeply nested child path', () => {
    const selected = new Set(['track-001/segments/leg-alpha/positions/3']);
    expect(hasChildSelected('track-001', selected)).toBe(true);
  });

  it('returns false when only the parent is selected', () => {
    const selected = new Set(['track-001']);
    expect(hasChildSelected('track-001', selected)).toBe(false);
  });

  it('returns false when no related paths are selected', () => {
    const selected = new Set(['track-002/positions/0']);
    expect(hasChildSelected('track-001', selected)).toBe(false);
  });

  it('returns false for empty selection', () => {
    expect(hasChildSelected('track-001', new Set())).toBe(false);
  });

  it('does not false-positive on similar prefixes', () => {
    const selected = new Set(['track-0012/positions/0']);
    expect(hasChildSelected('track-001', selected)).toBe(false);
  });

  it('checks segment-level child correctly', () => {
    const selected = new Set(['track-001/segments/leg-alpha/positions/0']);
    expect(hasChildSelected('track-001/segments/leg-alpha', selected)).toBe(true);
  });
});
