import { describe, it, expect } from 'vitest';
import { calculateBounds, expandBounds, isPointInBounds } from '../bounds';
import { calculateTimeExtent, parseTime, formatTime, formatDuration } from '../time';
import { getFeatureLabel, getFeatureIcon, getFeatureColor, getFeatureDescription } from '../labels';
import { isTrackFeature, isReferenceLocation } from '../types';
import type { DebriefFeatureCollection } from '../types';
import type { TrackFeature, ReferenceLocation } from '@debrief/schemas';

// Test fixtures
const mockTrackFeature: TrackFeature = {
  type: 'Feature',
  id: 'track-001',
  geometry: {
    type: 'LineString',
    coordinates: [
      [-5.0, 50.0],
      [-4.5, 50.5],
      [-4.0, 51.0],
    ] as unknown as number[],
  },
  properties: {
    kind: 'TRACK',
    platform_id: 'PLT-001',
    platform_name: 'HMS Example',
    track_type: 'OWNSHIP',
    start_time: '2024-01-15T08:00:00Z',
    end_time: '2024-01-15T12:00:00Z',
    positions: [],
  },
};

const mockReferenceLocation: ReferenceLocation = {
  type: 'Feature',
  id: 'ref-001',
  geometry: {
    type: 'Point',
    coordinates: [-3.0, 52.0] as unknown as number[],
  },
  properties: {
    kind: 'POINT',
    name: 'Waypoint Alpha',
    location_type: 'WAYPOINT',
    description: 'Navigation waypoint',
    valid_from: '2024-01-15T00:00:00Z',
    valid_until: '2024-01-15T23:59:59Z',
  },
};

const mockFeatureCollection: DebriefFeatureCollection = {
  type: 'FeatureCollection',
  features: [mockTrackFeature, mockReferenceLocation],
};

describe('types', () => {
  describe('isTrackFeature', () => {
    it('returns true for track features', () => {
      expect(isTrackFeature(mockTrackFeature)).toBe(true);
    });

    it('returns false for reference locations', () => {
      expect(isTrackFeature(mockReferenceLocation)).toBe(false);
    });
  });

  describe('isReferenceLocation', () => {
    it('returns true for reference locations', () => {
      expect(isReferenceLocation(mockReferenceLocation)).toBe(true);
    });

    it('returns false for track features', () => {
      expect(isReferenceLocation(mockTrackFeature)).toBe(false);
    });
  });
});

describe('bounds', () => {
  describe('calculateBounds', () => {
    it('calculates bounds for a feature collection', () => {
      const bounds = calculateBounds(mockFeatureCollection);
      expect(bounds).not.toBeNull();
      expect(bounds![0]).toBe(-5.0); // minLon
      expect(bounds![1]).toBe(50.0); // minLat
      expect(bounds![2]).toBe(-3.0); // maxLon
      expect(bounds![3]).toBe(52.0); // maxLat
    });

    it('calculates bounds for an array of features', () => {
      const bounds = calculateBounds([mockTrackFeature]);
      expect(bounds).toEqual([-5.0, 50.0, -4.0, 51.0]);
    });

    it('returns null for empty collection', () => {
      const bounds = calculateBounds({ type: 'FeatureCollection', features: [] });
      expect(bounds).toBeNull();
    });

    it('uses feature bbox if available', () => {
      const featureWithBbox: TrackFeature = {
        ...mockTrackFeature,
        bbox: [-10, 40, 0, 60],
      };
      const bounds = calculateBounds([featureWithBbox]);
      expect(bounds).toEqual([-10, 40, 0, 60]);
    });
  });

  describe('expandBounds', () => {
    it('expands bounds by percentage', () => {
      const bounds = expandBounds([-5, 50, -3, 52], 0.1);
      expect(bounds[0]).toBeLessThan(-5);
      expect(bounds[1]).toBeLessThan(50);
      expect(bounds[2]).toBeGreaterThan(-3);
      expect(bounds[3]).toBeGreaterThan(52);
    });
  });

  describe('isPointInBounds', () => {
    it('returns true for point inside bounds', () => {
      expect(isPointInBounds(-4, 51, [-5, 50, -3, 52])).toBe(true);
    });

    it('returns false for point outside bounds', () => {
      expect(isPointInBounds(-6, 51, [-5, 50, -3, 52])).toBe(false);
    });

    it('returns true for point on boundary', () => {
      expect(isPointInBounds(-5, 50, [-5, 50, -3, 52])).toBe(true);
    });
  });
});

describe('time', () => {
  describe('calculateTimeExtent', () => {
    it('calculates time extent for feature collection', () => {
      const extent = calculateTimeExtent(mockFeatureCollection);
      expect(extent).not.toBeNull();
      // Should use earliest start and latest end
      expect(extent![0]).toBe(Date.parse('2024-01-15T00:00:00Z'));
      expect(extent![1]).toBe(Date.parse('2024-01-15T23:59:59Z'));
    });

    it('returns null for empty collection', () => {
      const extent = calculateTimeExtent([]);
      expect(extent).toBeNull();
    });

    it('handles features without temporal data', () => {
      const noTimeFeature: ReferenceLocation = {
        ...mockReferenceLocation,
        properties: {
          ...mockReferenceLocation.properties,
          valid_from: undefined,
          valid_until: undefined,
        },
      };
      const extent = calculateTimeExtent([noTimeFeature]);
      expect(extent).toBeNull();
    });
  });

  describe('parseTime', () => {
    it('parses valid ISO8601 string', () => {
      const result = parseTime('2024-01-15T08:00:00Z');
      expect(result).toBe(Date.parse('2024-01-15T08:00:00Z'));
    });

    it('returns null for undefined', () => {
      expect(parseTime(undefined)).toBeNull();
    });

    it('returns null for invalid string', () => {
      expect(parseTime('not-a-date')).toBeNull();
    });
  });

  describe('formatTime', () => {
    const timestamp = Date.parse('2024-01-15T08:30:00Z');

    it('formats time in short format', () => {
      const result = formatTime(timestamp, 'short');
      expect(result).toMatch(/\d{1,2}:\d{2}/);
    });

    it('formats time in medium format', () => {
      const result = formatTime(timestamp, 'medium');
      expect(result.length).toBeGreaterThan(0);
    });

    it('formats time in long format', () => {
      const result = formatTime(timestamp, 'long');
      expect(result).toContain('2024');
    });
  });

  describe('formatDuration', () => {
    it('formats duration in days', () => {
      const start = Date.parse('2024-01-15T00:00:00Z');
      const end = Date.parse('2024-01-17T12:00:00Z');
      expect(formatDuration(start, end)).toBe('2d 12h');
    });

    it('formats duration in hours', () => {
      const start = Date.parse('2024-01-15T00:00:00Z');
      const end = Date.parse('2024-01-15T03:30:00Z');
      expect(formatDuration(start, end)).toBe('3h 30m');
    });

    it('formats duration in minutes', () => {
      const start = Date.parse('2024-01-15T00:00:00Z');
      const end = Date.parse('2024-01-15T00:45:00Z');
      expect(formatDuration(start, end)).toBe('45m');
    });
  });
});

describe('labels', () => {
  describe('getFeatureLabel', () => {
    it('returns platform_name for track features', () => {
      expect(getFeatureLabel(mockTrackFeature)).toBe('HMS Example');
    });

    it('returns name for reference locations', () => {
      expect(getFeatureLabel(mockReferenceLocation)).toBe('Waypoint Alpha');
    });

    it('falls back to ID if no name', () => {
      const noNameTrack: TrackFeature = {
        ...mockTrackFeature,
        properties: {
          ...mockTrackFeature.properties,
          platform_name: undefined,
          platform_id: '',
        },
      };
      expect(getFeatureLabel(noNameTrack)).toBe('track-001');
    });
  });

  describe('getFeatureIcon', () => {
    it('returns ownship icon for ownship tracks', () => {
      expect(getFeatureIcon(mockTrackFeature)).toBe('vessel-ownship');
    });

    it('returns contact icon for contact tracks', () => {
      const contactTrack: TrackFeature = {
        ...mockTrackFeature,
        properties: { ...mockTrackFeature.properties, track_type: 'CONTACT' },
      };
      expect(getFeatureIcon(contactTrack)).toBe('vessel-contact');
    });

    it('returns waypoint icon for waypoints', () => {
      expect(getFeatureIcon(mockReferenceLocation)).toBe('location-waypoint');
    });

    it('returns danger icon for danger areas', () => {
      const dangerArea: ReferenceLocation = {
        ...mockReferenceLocation,
        properties: { ...mockReferenceLocation.properties, location_type: 'DANGER_AREA' },
      };
      expect(getFeatureIcon(dangerArea)).toBe('location-danger');
    });
  });

  describe('getFeatureColor', () => {
    it('returns explicit color if set', () => {
      const coloredFeature: TrackFeature = {
        ...mockTrackFeature,
        properties: { ...mockTrackFeature.properties, color: '#ff0000' },
      };
      expect(getFeatureColor(coloredFeature)).toBe('#ff0000');
    });

    it('returns blue for ownship tracks', () => {
      expect(getFeatureColor(mockTrackFeature)).toBe('#0066cc');
    });

    it('returns red for contact tracks', () => {
      const contactTrack: TrackFeature = {
        ...mockTrackFeature,
        properties: { ...mockTrackFeature.properties, track_type: 'CONTACT' },
      };
      expect(getFeatureColor(contactTrack)).toBe('#cc0000');
    });
  });

  describe('getFeatureDescription', () => {
    it('returns track type for tracks', () => {
      expect(getFeatureDescription(mockTrackFeature)).toBe('ownship track');
    });

    it('returns description for reference locations', () => {
      expect(getFeatureDescription(mockReferenceLocation)).toBe('Navigation waypoint');
    });

    it('returns location type if no description', () => {
      const noDescLocation: ReferenceLocation = {
        ...mockReferenceLocation,
        properties: { ...mockReferenceLocation.properties, description: undefined },
      };
      expect(getFeatureDescription(noDescLocation)).toBe('waypoint');
    });
  });
});
