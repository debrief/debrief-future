/**
 * Sample DebriefFeature collections for LayersToolbar stories and tests.
 */

import type { TrackFeature, ReferenceLocation, TrackStyle, PointProperties } from '@debrief/schemas';
import type { DebriefFeature } from '../../utils/types';

const trackTypes = ['OWNSHIP', 'CONTACT', 'REFERENCE', 'SOLUTION'] as const;
const trackColors = ['#1565c0', '#c62828', '#7b1fa2', '#2e7d32'];
const platforms = [
  'HMS Victory', 'USS Constitution', 'Contact Alpha', 'Contact Bravo',
  'HMS Dreadnought', 'USS Enterprise', 'Contact Charlie', 'Contact Delta',
  'HMS Illustrious', 'USS Nimitz',
];

function defaultPointStyle(color: string): PointProperties {
  return { shape: 'circle', radius: 4, fill: true, fill_color: color, color };
}

function defaultTrackStyle(color: string): TrackStyle {
  return { line: { color }, point: defaultPointStyle(color) };
}

/**
 * Generate sample track features.
 */
export function generateTracks(count: number): TrackFeature[] {
  const baseTime = new Date('2024-06-15T08:00:00Z').getTime();
  return Array.from({ length: count }, (_, i) => ({
    type: 'Feature' as const,
    id: `track-${i.toString().padStart(3, '0')}`,
    geometry: {
      type: 'LineString' as const,
      coordinates: [[-5 + i * 0.1, 50], [-4 + i * 0.1, 51]] as unknown as number[],
    },
    properties: {
      kind: 'TRACK' as const,
      platform_id: `PLT-${i.toString().padStart(3, '0')}`,
      platform_name: `${platforms[i % platforms.length]} ${Math.floor(i / platforms.length) || ''}`.trim(),
      track_type: trackTypes[i % 4] ?? 'CONTACT',
      start_time: new Date(baseTime + i * 3600000).toISOString(),
      end_time: new Date(baseTime + (i + 12) * 3600000).toISOString(),
      positions: [],
      style: defaultTrackStyle(trackColors[i % 4] ?? '#1565c0'),
      default_position_style: {
        show_symbol: false,
        symbol: 'circle' as const,
        show_label: false,
      },
    },
  }));
}

/**
 * Generate sample reference locations.
 */
export function generateLocations(count: number): ReferenceLocation[] {
  const names = [
    'Alpha Point', 'Bravo Marker', 'Charlie Station',
    'Delta Buoy', 'Echo Reference', 'Foxtrot Position',
  ];

  return Array.from({ length: count }, (_, i) => ({
    type: 'Feature' as const,
    id: `ref-${i.toString().padStart(3, '0')}`,
    geometry: {
      type: 'Point' as const,
      coordinates: [-3 + i * 0.1, 52 + i * 0.05] as unknown as number[],
    },
    properties: {
      kind: 'POINT' as const,
      name: `${names[i % names.length]} ${Math.floor(i / names.length) || ''}`.trim(),
      location_type: (i % 2 === 0 ? 'WAYPOINT' : 'REFERENCE') as 'WAYPOINT' | 'REFERENCE',
      style: defaultPointStyle(i % 2 === 0 ? '#e65100' : '#7b1fa2'),
      valid_from: '2024-06-15T00:00:00Z',
      valid_until: '2024-06-15T23:59:59Z',
    },
  }));
}

/** 30 mixed features for standard stories */
export const sampleFeatures: DebriefFeature[] = [
  ...generateTracks(20),
  ...generateLocations(10),
];

/** 5 tracks for minimal stories */
export const fewFeatures: DebriefFeature[] = [
  ...generateTracks(3),
  ...generateLocations(2),
];
