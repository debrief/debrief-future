import { describe, it, expect, vi } from 'vitest';
import { flattenFeatures, hasChildSelected, getRootFeatureId } from './flattenFeatures';
import type { TrackFeature, MultiPointFeature, MultiPolygonFeature, ReferenceLocation } from '@debrief/schemas';

// ─── Test Fixtures ───────────────────────────────────────────────────

const trackWithPositions = {
  type: 'Feature',
  id: 'track-001',
  geometry: {
    type: 'LineString',
    // eslint-disable-next-line no-restricted-syntax
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
// eslint-disable-next-line no-restricted-syntax
} as unknown as TrackFeature;

const trackWithOverrides = {
  type: 'Feature',
  id: 'track-002',
  geometry: {
    type: 'LineString',
    // eslint-disable-next-line no-restricted-syntax
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
// eslint-disable-next-line no-restricted-syntax
} as unknown as TrackFeature;

const emptyTrack = {
  type: 'Feature',
  id: 'track-empty',
  geometry: {
    type: 'LineString',
    // eslint-disable-next-line no-restricted-syntax
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
// eslint-disable-next-line no-restricted-syntax
} as unknown as TrackFeature;

const compoundTrack = {
  type: 'Feature',
  id: 'track-compound',
  geometry: {
    type: 'LineString',
    // eslint-disable-next-line no-restricted-syntax
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
// eslint-disable-next-line no-restricted-syntax
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
// eslint-disable-next-line no-restricted-syntax
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
// eslint-disable-next-line no-restricted-syntax
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
// eslint-disable-next-line no-restricted-syntax
} as unknown as MultiPolygonFeature;

const mockRefLocation = {
  type: 'Feature',
  id: 'ref-001',
  geometry: {
    type: 'Point',
    // eslint-disable-next-line no-restricted-syntax
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
// eslint-disable-next-line no-restricted-syntax
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
      expect(posItems[0]!.sublabel).toContain('090\u00B0');
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
    it('expands compound track to show Track Segments group (Case B)', () => {
      const expanded = new Set(['track-compound']);
      const items = flattenFeatures([compoundTrack], expanded);

      // Case B: no sensors, >1 segment → single Track Segments group row
      expect(items).toHaveLength(2);
      expect(items[1]!.type).toBe('group');
      expect(items[1]!.id).toBe('track-compound/segments');
      expect(items[1]!.label).toBe('Track Segments (2)');
      expect(items[1]!.depth).toBe(1);
      expect(items[1]!.isExpandable).toBe(true);
    });

    it('expands Track Segments group to show segment rows at depth 2', () => {
      const expanded = new Set(['track-compound', 'track-compound/segments']);
      const items = flattenFeatures([compoundTrack], expanded);

      expect(items).toHaveLength(4);
      expect(items[1]!.type).toBe('group'); // Track Segments group
      expect(items[2]!.type).toBe('segment');
      expect(items[2]!.id).toBe('track-compound/segments/leg-alpha');
      expect(items[2]!.label).toBe('leg-alpha');
      expect(items[2]!.depth).toBe(2);
      expect(items[2]!.isExpandable).toBe(true);

      expect(items[3]!.type).toBe('segment');
      expect(items[3]!.id).toBe('track-compound/segments/leg-bravo');
      expect(items[3]!.depth).toBe(2);
    });

    it('expands segment to show nested positions (depth 3 under group)', () => {
      const expanded = new Set(['track-compound', 'track-compound/segments', 'track-compound/segments/leg-alpha']);
      const items = flattenFeatures([compoundTrack], expanded);

      expect(items).toHaveLength(6);

      expect(items[1]!.type).toBe('group'); // Track Segments group
      expect(items[2]!.type).toBe('segment');
      expect(items[2]!.id).toBe('track-compound/segments/leg-alpha');

      expect(items[3]!.type).toBe('position');
      expect(items[3]!.id).toBe('track-compound/segments/leg-alpha/positions/0');
      expect(items[3]!.depth).toBe(3);
      expect(items[3]!.parentId).toBe('track-compound/segments/leg-alpha');

      expect(items[4]!.type).toBe('position');
      expect(items[4]!.id).toBe('track-compound/segments/leg-alpha/positions/1');
      expect(items[4]!.depth).toBe(3);

      expect(items[5]!.type).toBe('segment');
      expect(items[5]!.id).toBe('track-compound/segments/leg-bravo');
    });

    it('segment sublabel shows segment_type when different from name', () => {
      const expanded = new Set(['track-compound', 'track-compound/segments']);
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
        // eslint-disable-next-line no-restricted-syntax
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
      // eslint-disable-next-line no-restricted-syntax
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

// ─── Sensor Fixtures ────────────────────────────────────────────────

/** Case C: simple track with sensors (no segments) */
const trackWithSensors = {
  type: 'Feature',
  id: 'track-sensor',
  geometry: {
    type: 'LineString',
    // eslint-disable-next-line no-restricted-syntax
    coordinates: [[-5, 50], [-4, 51]] as unknown as number[],
  },
  properties: {
    kind: 'TRACK',
    platform_id: 'PLT-S1',
    platform_name: 'Sensor Ship',
    track_type: 'OWNSHIP',
    start_time: '2024-01-15T08:00:00Z',
    end_time: '2024-01-15T12:00:00Z',
    positions: [
      { time: '2024-01-15T08:00:00Z', course: 90, speed: 12.5 },
      { time: '2024-01-15T09:00:00Z', course: 95, speed: 13.0 },
    ],
    sensors: [
      {
        name: 'TOWED_ARRAY',
        contacts: [
          { time: '2024-01-15T08:00:00Z', bearing: 45 },
          { time: '2024-01-15T08:05:00Z', bearing: 47.3 },
          { time: '2024-01-15T08:10:00Z', bearing: 50 },
        ],
      },
      {
        name: 'HULL_ARRAY',
        contacts: [
          { time: '2024-01-15T08:00:00Z', bearing: 225 },
        ],
      },
    ],
  },
// eslint-disable-next-line no-restricted-syntax
} as unknown as TrackFeature;

/** Track with empty sensors array — should behave as Case A */
const trackWithEmptySensors = {
  type: 'Feature',
  id: 'track-empty-sensors',
  geometry: {
    type: 'LineString',
    // eslint-disable-next-line no-restricted-syntax
    coordinates: [[-5, 50], [-4, 51]] as unknown as number[],
  },
  properties: {
    kind: 'TRACK',
    platform_id: 'PLT-ES',
    platform_name: 'Empty Sensors Track',
    track_type: 'CONTACT',
    start_time: '2024-01-15T08:00:00Z',
    end_time: '2024-01-15T12:00:00Z',
    positions: [
      { time: '2024-01-15T08:00:00Z', course: 180, speed: 10 },
    ],
    sensors: [],
  },
// eslint-disable-next-line no-restricted-syntax
} as unknown as TrackFeature;

/** Case D: compound track with sensors */
const compoundTrackWithSensors = {
  type: 'Feature',
  id: 'track-compound-sensor',
  geometry: {
    type: 'LineString',
    // eslint-disable-next-line no-restricted-syntax
    coordinates: [[-5, 50], [-4, 51]] as unknown as number[],
  },
  properties: {
    kind: 'TRACK',
    platform_id: 'PLT-CS',
    platform_name: 'Compound Sensor Track',
    track_type: 'SOLUTION',
    start_time: '2024-01-15T08:00:00Z',
    end_time: '2024-01-15T12:00:00Z',
    positions: [],
    segments: [
      {
        segment_type: 'TMA_SEGMENT',
        name: 'leg-one',
        start_time: '2024-01-15T08:00:00Z',
        end_time: '2024-01-15T10:00:00Z',
        positions: [
          { time: '2024-01-15T08:00:00Z', course: 45, speed: 8 },
        ],
      },
      {
        segment_type: 'TMA_SEGMENT',
        name: 'leg-two',
        start_time: '2024-01-15T10:00:00Z',
        end_time: '2024-01-15T12:00:00Z',
        positions: [
          { time: '2024-01-15T10:00:00Z', course: 120, speed: 7 },
        ],
      },
    ],
    sensors: [
      {
        name: 'BOW_ARRAY',
        contacts: [
          { time: '2024-01-15T08:00:00Z', bearing: 90 },
        ],
      },
    ],
  },
// eslint-disable-next-line no-restricted-syntax
} as unknown as TrackFeature;

/** Sensor with zero contacts */
const trackWithZeroContactSensor = {
  type: 'Feature',
  id: 'track-zero-contacts',
  geometry: {
    type: 'LineString',
    // eslint-disable-next-line no-restricted-syntax
    coordinates: [[-5, 50], [-4, 51]] as unknown as number[],
  },
  properties: {
    kind: 'TRACK',
    platform_id: 'PLT-ZC',
    platform_name: 'Zero Contact Track',
    track_type: 'OWNSHIP',
    start_time: '2024-01-15T08:00:00Z',
    end_time: '2024-01-15T12:00:00Z',
    positions: [
      { time: '2024-01-15T08:00:00Z', course: 0, speed: 5 },
    ],
    sensors: [
      { name: 'EMPTY_SENSOR', contacts: [] },
    ],
  },
// eslint-disable-next-line no-restricted-syntax
} as unknown as TrackFeature;

/** Track with ambiguous bearing contact */
const trackWithAmbiguousBearing = {
  type: 'Feature',
  id: 'track-ambiguous',
  geometry: {
    type: 'LineString',
    // eslint-disable-next-line no-restricted-syntax
    coordinates: [[-5, 50], [-4, 51]] as unknown as number[],
  },
  properties: {
    kind: 'TRACK',
    platform_id: 'PLT-AB',
    platform_name: 'Ambiguous Bearing Track',
    track_type: 'OWNSHIP',
    start_time: '2024-01-15T08:00:00Z',
    end_time: '2024-01-15T12:00:00Z',
    positions: [
      { time: '2024-01-15T08:00:00Z', course: 0, speed: 5 },
    ],
    sensors: [
      {
        name: 'AMB_SENSOR',
        contacts: [
          { time: '2024-01-15T08:00:00Z', bearing: 45, ambiguous_bearing: 225 },
          { time: '2024-01-15T08:05:00Z', bearing: 359 },
        ],
      },
    ],
  },
// eslint-disable-next-line no-restricted-syntax
} as unknown as TrackFeature;

// ─── Sensor Tests ───────────────────────────────────────────────────

describe('flattenFeatures — sensor-aware rendering', () => {
  describe('Case A: simple track, no sensors', () => {
    it('renders positions as direct children (unchanged except course padding)', () => {
      const expanded = new Set(['track-001']);
      const items = flattenFeatures([trackWithPositions], expanded);

      expect(items).toHaveLength(4);
      expect(items[1]!.type).toBe('position');
      expect(items[1]!.depth).toBe(1);
      expect(items[1]!.parentId).toBe('track-001');
      // No group rows
      expect(items.filter(i => i.type === 'group')).toHaveLength(0);
    });

    it('track with empty sensors: [] falls through to Case A', () => {
      const expanded = new Set(['track-empty-sensors']);
      const items = flattenFeatures([trackWithEmptySensors], expanded);

      expect(items).toHaveLength(2); // feature + 1 position
      expect(items[1]!.type).toBe('position');
      expect(items[1]!.depth).toBe(1);
      expect(items.filter(i => i.type === 'group')).toHaveLength(0);
      expect(items.filter(i => i.type === 'sensor')).toHaveLength(0);
    });
  });

  describe('Case B: compound track, no sensors', () => {
    it('gets Track Segments (N) wrapper at depth 1', () => {
      const expanded = new Set(['track-compound']);
      const items = flattenFeatures([compoundTrack], expanded);

      expect(items).toHaveLength(2); // feature + Track Segments group
      expect(items[1]!.type).toBe('group');
      expect(items[1]!.id).toBe('track-compound/segments');
      expect(items[1]!.label).toBe('Track Segments (2)');
      expect(items[1]!.depth).toBe(1);
      expect(items[1]!.isExpandable).toBe(true);
    });
  });

  describe('Case C: track with sensors, no/single segment', () => {
    it('gets Positions (N) + Sensors (N) groups at depth 1', () => {
      const expanded = new Set(['track-sensor']);
      const items = flattenFeatures([trackWithSensors], expanded);

      expect(items).toHaveLength(3); // feature + 2 groups
      expect(items[1]!.type).toBe('group');
      expect(items[1]!.id).toBe('track-sensor/positions');
      expect(items[1]!.label).toBe('Positions (2)');
      expect(items[1]!.depth).toBe(1);

      expect(items[2]!.type).toBe('group');
      expect(items[2]!.id).toBe('track-sensor/sensors');
      expect(items[2]!.label).toBe('Sensors (2)');
      expect(items[2]!.depth).toBe(1);
    });

    it('expanding Positions group shows positions at depth 2', () => {
      const expanded = new Set(['track-sensor', 'track-sensor/positions']);
      const items = flattenFeatures([trackWithSensors], expanded);

      const positions = items.filter(i => i.type === 'position');
      expect(positions).toHaveLength(2);
      expect(positions[0]!.depth).toBe(2);
    });
  });

  describe('Case D: compound track with sensors', () => {
    it('gets Track Segments (N) + Sensors (N) groups', () => {
      const expanded = new Set(['track-compound-sensor']);
      const items = flattenFeatures([compoundTrackWithSensors], expanded);

      expect(items).toHaveLength(3); // feature + 2 groups
      expect(items[1]!.type).toBe('group');
      expect(items[1]!.label).toBe('Track Segments (2)');

      expect(items[2]!.type).toBe('group');
      expect(items[2]!.label).toBe('Sensors (1)');
    });
  });

  describe('sensor rows', () => {
    it('uses sensor name as label and "N contacts" as sublabel', () => {
      const expanded = new Set(['track-sensor', 'track-sensor/sensors']);
      const items = flattenFeatures([trackWithSensors], expanded);

      const sensorItems = items.filter(i => i.type === 'sensor');
      expect(sensorItems).toHaveLength(2);
      expect(sensorItems[0]!.label).toBe('TOWED_ARRAY');
      expect(sensorItems[0]!.sublabel).toBe('3 contacts');
      expect(sensorItems[1]!.label).toBe('HULL_ARRAY');
      expect(sensorItems[1]!.sublabel).toBe('1 contact');
    });

    it('IDs are stable under SensorData[] reordering (keyed by name)', () => {
      const expanded = new Set(['track-sensor', 'track-sensor/sensors']);
      const items = flattenFeatures([trackWithSensors], expanded);

      const sensorItems = items.filter(i => i.type === 'sensor');
      expect(sensorItems[0]!.id).toBe('track-sensor/sensors/TOWED_ARRAY');
      expect(sensorItems[1]!.id).toBe('track-sensor/sensors/HULL_ARRAY');
    });
  });

  describe('contact rows', () => {
    it('shows zero-padded bearing sublabel (e.g. 045\u00B0)', () => {
      const expanded = new Set([
        'track-sensor',
        'track-sensor/sensors',
        'track-sensor/sensors/TOWED_ARRAY',
      ]);
      const items = flattenFeatures([trackWithSensors], expanded);

      const contacts = items.filter(i => i.type === 'contact');
      expect(contacts).toHaveLength(3);
      expect(contacts[0]!.sublabel).toBe('045\u00B0');
      expect(contacts[1]!.sublabel).toBe('047\u00B0');
      expect(contacts[2]!.sublabel).toBe('050\u00B0');
    });

    it('renders in input order (no sort applied)', () => {
      const expanded = new Set([
        'track-sensor',
        'track-sensor/sensors',
        'track-sensor/sensors/TOWED_ARRAY',
      ]);
      const items = flattenFeatures([trackWithSensors], expanded);

      const contacts = items.filter(i => i.type === 'contact');
      expect(contacts[0]!.index).toBe(0);
      expect(contacts[1]!.index).toBe(1);
      expect(contacts[2]!.index).toBe(2);
    });
  });

  describe('ambiguous bearing', () => {
    it('renders as single contact row with "045\u00B0 / 225\u00B0" sublabel', () => {
      const expanded = new Set([
        'track-ambiguous',
        'track-ambiguous/sensors',
        'track-ambiguous/sensors/AMB_SENSOR',
      ]);
      const items = flattenFeatures([trackWithAmbiguousBearing], expanded);

      const contacts = items.filter(i => i.type === 'contact');
      expect(contacts).toHaveLength(2); // one ambiguous + one normal
      expect(contacts[0]!.sublabel).toBe('045\u00B0 / 225\u00B0');
      expect(contacts[1]!.sublabel).toBe('359\u00B0');
    });
  });

  describe('zero-contact sensor', () => {
    it('shows "0 contacts" sublabel and "No contacts" placeholder on expand', () => {
      const expanded = new Set([
        'track-zero-contacts',
        'track-zero-contacts/sensors',
        'track-zero-contacts/sensors/EMPTY_SENSOR',
      ]);
      const items = flattenFeatures([trackWithZeroContactSensor], expanded);

      const sensorItems = items.filter(i => i.type === 'sensor');
      expect(sensorItems[0]!.sublabel).toBe('0 contacts');

      const contacts = items.filter(i => i.type === 'contact');
      expect(contacts).toHaveLength(1);
      expect(contacts[0]!.label).toBe('No contacts');
    });
  });

  describe('group row labels', () => {
    it('include count in parentheses', () => {
      const expanded = new Set(['track-sensor']);
      const items = flattenFeatures([trackWithSensors], expanded);

      const groups = items.filter(i => i.type === 'group');
      expect(groups[0]!.label).toBe('Positions (2)');
      expect(groups[1]!.label).toBe('Sensors (2)');
    });
  });

  describe('hasChildSelected with sensors', () => {
    it('contact selected → parent sensor reports hasChildSelected', () => {
      const selected = new Set(['track-sensor/sensors/TOWED_ARRAY/contacts/0']);
      expect(hasChildSelected('track-sensor/sensors/TOWED_ARRAY', selected)).toBe(true);
    });

    it('contact selected → parent Sensors group reports hasChildSelected', () => {
      const selected = new Set(['track-sensor/sensors/TOWED_ARRAY/contacts/0']);
      expect(hasChildSelected('track-sensor/sensors', selected)).toBe(true);
    });

    it('contact selected → parent track reports hasChildSelected', () => {
      const selected = new Set(['track-sensor/sensors/TOWED_ARRAY/contacts/0']);
      expect(hasChildSelected('track-sensor', selected)).toBe(true);
    });

    it('Sensors group selected → parent track reports hasChildSelected', () => {
      const selected = new Set(['track-sensor/sensors']);
      expect(hasChildSelected('track-sensor', selected)).toBe(true);
    });
  });

  describe('performance with sensors', () => {
    it('handles track with 10,000 sensor contacts efficiently', () => {
      const contacts = Array.from({ length: 10000 }, (_, i) => ({
        time: new Date(Date.now() + i * 1000).toISOString(),
        bearing: i % 360,
      }));
      const largeSensorTrack = {
        type: 'Feature',
        id: 'track-large-sensor',
        // eslint-disable-next-line no-restricted-syntax
        geometry: { type: 'LineString', coordinates: [[-5, 50], [-4, 51]] as unknown as number[] },
        properties: {
          kind: 'TRACK',
          platform_id: 'PLT-LS',
          platform_name: 'Large Sensor Track',
          track_type: 'OWNSHIP',
          start_time: contacts[0]!.time,
          end_time: contacts[contacts.length - 1]!.time,
          positions: [{ time: contacts[0]!.time, course: 90, speed: 10 }],
          sensors: [{ name: 'MASSIVE', contacts }],
        },
      // eslint-disable-next-line no-restricted-syntax
      } as unknown as TrackFeature;

      const expanded = new Set([
        'track-large-sensor',
        'track-large-sensor/sensors',
        'track-large-sensor/sensors/MASSIVE',
      ]);

      const start = performance.now();
      const items = flattenFeatures([largeSensorTrack], expanded);
      const elapsed = performance.now() - start;

      // feature + Positions group + Sensors group + 1 sensor + 10000 contacts = 10004
      expect(items).toHaveLength(10004);
      expect(elapsed).toBeLessThan(200);
    });
  });
});

// ─── Storyboard grouping (Spec #258 / US4) ─────────────────────────

describe('flattenFeatures — storyboard grouping (#258)', () => {
  function makeStoryboard(id: string, name: string): unknown {
    return {
      type: 'Feature',
      id,
      geometry: {
        type: 'Polygon',
        coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
      },
      properties: {
        kind: 'STORYBOARD',
        id,
        name,
        schema_version: 1,
      },
    };
  }

  function makeScene(id: string, storyboardId: string, timestamp: string, title?: string): unknown {
    return {
      type: 'Feature',
      id,
      geometry: {
        type: 'Polygon',
        coordinates: [[[0, 0], [0.1, 0], [0.1, 0.1], [0, 0.1], [0, 0]]],
      },
      properties: {
        kind: 'STORYBOARD_SCENE',
        id,
        storyboard_id: storyboardId,
        title: title ?? id,
        viewport: { center: [0, 0], zoom: 10, bearing: 0 },
        timestamp,
        visible_feature_ids: [],
        feature_set_hash: '0'.repeat(64),
        thumbnail_asset_ref: `thumbs/${id}.png`,
        transition_duration_ms: 500,
      },
    };
  }

  it('one Storyboard + 3 Scenes — produces 1 parent row when collapsed (T051)', () => {
    const sb = makeStoryboard('sb-1', 'My Scenario');
    const features = [
      sb as never,
      makeScene('s1', 'sb-1', '2026-04-20T10:00:00Z') as never,
      makeScene('s2', 'sb-1', '2026-04-20T10:01:00Z') as never,
      makeScene('s3', 'sb-1', '2026-04-20T10:02:00Z') as never,
    ];
    const items = flattenFeatures(features, new Set<string>());
    expect(items).toHaveLength(1);
    expect(items[0]!.type).toBe('storyboard');
    expect(items[0]!.childCount).toBe(3);
    expect(items[0]!.isExpandable).toBe(true);
  });

  it('expanded storyboard produces parent + 3 indented children (T051)', () => {
    const features = [
      makeStoryboard('sb-1', 'My Scenario') as never,
      makeScene('s2', 'sb-1', '2026-04-20T10:01:00Z') as never,
      makeScene('s1', 'sb-1', '2026-04-20T10:00:00Z') as never,
      makeScene('s3', 'sb-1', '2026-04-20T10:02:00Z') as never,
    ];
    const items = flattenFeatures(features, new Set(['sb-1']));
    expect(items).toHaveLength(4);
    expect(items[0]!.type).toBe('storyboard');
    expect(items[0]!.childCount).toBe(3);
    // Children ordered by timestamp ascending.
    expect(items[1]!.id).toBe('s1');
    expect(items[2]!.id).toBe('s2');
    expect(items[3]!.id).toBe('s3');
    // Children carry depth: 1 and parentId pointing at the storyboard.
    for (let i = 1; i <= 3; i++) {
      expect(items[i]!.depth).toBe(1);
      expect(items[i]!.parentId).toBe('sb-1');
    }
  });

  it('empty storyboard produces a parent row with childCount=0 and isExpandable=false (T052 / FR-013)', () => {
    const items = flattenFeatures(
      [makeStoryboard('sb-empty', 'Lonely Storyboard') as never],
      new Set<string>(),
    );
    expect(items).toHaveLength(1);
    expect(items[0]!.type).toBe('storyboard');
    expect(items[0]!.childCount).toBe(0);
    expect(items[0]!.isExpandable).toBe(false);
  });

  it('two storyboards each with their own scenes — children routed under correct parents (T053)', () => {
    const features = [
      makeStoryboard('sb-A', 'Alpha') as never,
      makeStoryboard('sb-B', 'Bravo') as never,
      makeScene('a1', 'sb-A', '2026-04-20T10:00:00Z') as never,
      makeScene('b1', 'sb-B', '2026-04-20T10:00:00Z') as never,
      makeScene('a2', 'sb-A', '2026-04-20T10:01:00Z') as never,
    ];
    const items = flattenFeatures(features, new Set(['sb-A', 'sb-B']));
    // 2 parents + 2 a-children + 1 b-child = 5 rows
    expect(items).toHaveLength(5);
    const sbA = items[0]!;
    expect(sbA.id).toBe('sb-A');
    expect(sbA.childCount).toBe(2);
    expect(items[1]!.parentId).toBe('sb-A');
    expect(items[2]!.parentId).toBe('sb-A');
    const sbB = items[3]!;
    expect(sbB.id).toBe('sb-B');
    expect(sbB.childCount).toBe(1);
    expect(items[4]!.parentId).toBe('sb-B');
  });

  it('orphan scene with non-existent storyboard_id emits top-level row with a warning (T054 / Article I.3)', () => {
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      const features = [makeScene('orphan-1', 'sb-MISSING', '2026-04-20T10:00:00Z') as never];
      const items = flattenFeatures(features, new Set<string>());
      expect(items).toHaveLength(1);
      // Top-level row, not buried under a non-existent parent.
      expect(items[0]!.depth).toBe(0);
      expect(items[0]!.parentId).toBe(null);
      expect(consoleWarn).toHaveBeenCalledTimes(1);
      expect(consoleWarn.mock.calls[0]?.[0]).toContain('orphan');
    } finally {
      consoleWarn.mockRestore();
    }
  });

  it('scenes never appear at the top level when their storyboard parent is present', () => {
    const features = [
      makeStoryboard('sb-1', 'Foo') as never,
      makeScene('s1', 'sb-1', '2026-04-20T10:00:00Z') as never,
    ];
    // Collapsed — only the parent row is emitted; the scene is not also
    // emitted as a sibling top-level row.
    const items = flattenFeatures(features, new Set<string>());
    expect(items).toHaveLength(1);
    expect(items[0]!.id).toBe('sb-1');
  });
});

// ─── getRootFeatureId Tests ─────────────────────────────────────────

describe('getRootFeatureId', () => {
  it('simple feature ID returns itself', () => {
    expect(getRootFeatureId('track-001')).toBe('track-001');
  });

  it('sensor path returns root', () => {
    expect(getRootFeatureId('track-001/sensors/TOWED_ARRAY')).toBe('track-001');
  });

  it('contact path returns root', () => {
    expect(getRootFeatureId('track-001/sensors/TOWED_ARRAY/contacts/3')).toBe('track-001');
  });
});
