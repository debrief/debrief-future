import { describe, it, expect } from 'vitest';
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
    // eslint-disable-next-line no-restricted-syntax
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
    style: {
      line: { color: '#0066cc', weight: 2 },
      point: { shape: 'circle', radius: 4, fill_color: '#0066cc', color: '#0066cc' },
    },
    default_position_style: {
      show_symbol: false,
      symbol: 'circle',
      show_label: false,
    },
  },
};

const mockReferenceLocation: ReferenceLocation = {
  type: 'Feature',
  id: 'ref-001',
  geometry: {
    type: 'Point',
    // eslint-disable-next-line no-restricted-syntax
    coordinates: [-3.0, 52.0] as unknown as number[],
  },
  properties: {
    kind: 'POINT',
    name: 'Waypoint Alpha',
    location_type: 'WAYPOINT',
    description: 'Navigation waypoint',
    valid_from: '2024-01-15T00:00:00Z',
    valid_until: '2024-01-15T23:59:59Z',
    style: { shape: 'circle', radius: 6, fill_color: '#0066cc', color: '#0066cc' },
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
        properties: {
          ...mockTrackFeature.properties,
          style: {
            line: { color: '#ff0000', weight: 2 },
            point: { shape: 'circle', radius: 4, fill_color: '#ff0000', color: '#ff0000' },
          },
        },
      };
      expect(getFeatureColor(coloredFeature)).toBe('#ff0000');
    });

    it('returns blue for ownship tracks', () => {
      expect(getFeatureColor(mockTrackFeature)).toBe('#0066cc');
    });

    it('returns red for contact tracks without explicit style', () => {
      // Create contact track without style to test type-based default color
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { style: _omitted, ...propsWithoutStyle } = mockTrackFeature.properties;
      const contactTrack: TrackFeature = {
        ...mockTrackFeature,
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        properties: {
          ...propsWithoutStyle,
          track_type: 'CONTACT',
        } as TrackFeature['properties'],
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
