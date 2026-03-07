/**
 * Mock fixture data factory for ExerciseListView (#129).
 * Generates realistic exercise items for testing and Storybook stories.
 */

import type { ExerciseListItem, RecentlyOpenedEntry, GeoJSONFeatureCollection, GeoJSONFeature } from '../types';

const VESSEL_CLASSES = [
  'Frigate', 'Destroyer', 'Submarine', 'Carrier', 'Corvette',
  'Cruiser', 'Patrol Vessel', 'Mine Sweeper', 'Tanker', 'Helicopter',
];

const TAGS = [
  'training', 'exercise', 'deployment', 'patrol', 'anti-submarine',
  'surface-warfare', 'carrier-ops', 'escort', 'logistics', 'surveillance',
];

const AUTHORS = [
  'Jane Smith', 'John Williams', 'Sarah Chen', 'David Park', 'Maria Garcia',
  'Robert Taylor', 'Emily Brown', 'Michael Johnson', 'Lisa Anderson', 'James Wilson',
];

const NATIONALITIES = ['GB', 'US', 'FR', 'DE', 'NO', 'DK', 'NL', 'IT', 'ES', 'CA'];

const EXERCISE_NAMES = [
  'Neptune', 'Trident', 'Sentinel', 'Guardian', 'Corsair',
  'Resolute', 'Vigilant', 'Tempest', 'Horizon', 'Aurora',
  'Defender', 'Interceptor', 'Majestic', 'Sovereign', 'Pathfinder',
  'Vanguard', 'Expedition', 'Discovery', 'Gallant', 'Steadfast',
];

/** Generate a random date within a range. */
function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

/** Pick N random items from an array. */
function pickRandom<T>(arr: readonly T[], n: number): T[] {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, n);
}

/** Generate a single mock ExerciseListItem. */
export function createMockExerciseItem(index: number): ExerciseListItem {
  const name = EXERCISE_NAMES[index % EXERCISE_NAMES.length] ?? 'Unknown';
  const suffix = index >= EXERCISE_NAMES.length ? ` ${Math.floor(index / EXERCISE_NAMES.length) + 1}` : '';
  const title = `Exercise ${name}${suffix}`;

  const startDate = randomDate(new Date('2023-01-01'), new Date('2024-12-31'));
  const durationHours = Math.floor(Math.random() * 720) + 1; // 1h to 30 days
  const endDate = new Date(startDate.getTime() + durationHours * 3_600_000);

  const numVessels = Math.floor(Math.random() * 4) + 1;
  const numTags = Math.floor(Math.random() * 3) + 1;
  const numNations = Math.floor(Math.random() * 3) + 1;
  const numTracks = Math.floor(Math.random() * 5) + 1;

  const centerLon = -10 + Math.random() * 30; // -10 to 20
  const centerLat = 40 + Math.random() * 20; // 40 to 60
  const bboxSize = 2 + Math.random() * 5;

  return {
    id: `exercise-${String(index).padStart(3, '0')}`,
    title,
    itemPath: `exercises/${name.toLowerCase()}${suffix.trim() ? `-${suffix.trim()}` : ''}/item.json`,
    bbox: [
      centerLon - bboxSize / 2,
      centerLat - bboxSize / 2,
      centerLon + bboxSize / 2,
      centerLat + bboxSize / 2,
    ] as [number, number, number, number],
    datetime: startDate.toISOString(),
    startDatetime: startDate.toISOString(),
    endDatetime: endDate.toISOString(),
    vesselClasses: pickRandom(VESSEL_CLASSES, numVessels),
    tags: pickRandom(TAGS, numTags),
    author: AUTHORS[index % AUTHORS.length] ?? null,
    nationalities: pickRandom(NATIONALITIES, numNations),
    trackNames: Array.from({ length: numTracks }, (_, i) => `Track ${i + 1}`),
    featureTags: [],
    collection: null,
    modified: null,
    trackDataHref: `exercises/${name.toLowerCase()}/data.geojson`,
  };
}

/** Generate N mock ExerciseListItems with stable random seed. */
export function createMockExerciseItems(count: number): ExerciseListItem[] {
  return Array.from({ length: count }, (_, i) => createMockExerciseItem(i));
}

/** Generate mock recently opened entries. */
export function createMockRecentItems(count: number = 5): RecentlyOpenedEntry[] {
  const items = createMockExerciseItems(count);
  const now = Date.now();

  return items.map((item, i) => ({
    plotId: item.id,
    title: item.title,
    storeId: 'default-store',
    lastOpened: new Date(now - (i + 1) * 3_600_000).toISOString(), // 1h, 2h, 3h, etc. ago
    uri: `debrief://store/default-store/${item.itemPath}`,
  }));
}

/** Generate a mock GeoJSON FeatureCollection with track lines. */
export function createMockTrackData(
  bbox: readonly [number, number, number, number],
  trackCount: number = 2,
): GeoJSONFeatureCollection {
  const [west, south, east, north] = bbox;
  const features: GeoJSONFeature[] = [];

  for (let t = 0; t < trackCount; t++) {
    const pointCount = 20 + Math.floor(Math.random() * 30);
    const coords: number[][] = [];

    let lon = west + Math.random() * (east - west);
    let lat = south + Math.random() * (north - south);

    for (let i = 0; i < pointCount; i++) {
      coords.push([lon, lat]);
      lon += (Math.random() - 0.5) * (east - west) * 0.1;
      lat += (Math.random() - 0.5) * (north - south) * 0.1;
      // Clamp to bbox
      lon = Math.max(west, Math.min(east, lon));
      lat = Math.max(south, Math.min(north, lat));
    }

    features.push({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: coords,
      },
      properties: {
        name: `Track ${t + 1}`,
        id: `track-${t}`,
      },
    });
  }

  return { type: 'FeatureCollection', features };
}

/** Pre-generated mock items for consistent use across tests and stories. */
export const MOCK_100_ITEMS: ExerciseListItem[] = createMockExerciseItems(100);
export const MOCK_5_ITEMS: ExerciseListItem[] = MOCK_100_ITEMS.slice(0, 5);
export const MOCK_RECENT_ITEMS: RecentlyOpenedEntry[] = createMockRecentItems(5);
