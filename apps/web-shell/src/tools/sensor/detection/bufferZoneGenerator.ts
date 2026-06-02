/**
 * Buffer Zone Generator tool — TypeScript implementation.
 * Generates detection likelihood buffer zones around a track using a sensor model.
 * Port of the Python implementation in debrief_calc/tools/sensor/detection/buffer_zone_generator.py.
 */

import type { RawGeoJSONFeature, TrackFeature } from '@debrief/schemas';
import type { MCPToolDefinition } from '@debrief/utils';

// ============================================================
// TYPES
// ============================================================

export interface BufferZoneParams {
  interval?: 'small' | 'medium' | 'large';
  distance_1_nm?: number;
  distance_2_nm?: number;
  distance_3_nm?: number;
}

export interface SensorModelZone {
  distance_nm: number;
  likelihood_pct: number;
  name: string;
}

export interface SensorModel {
  getDetectionZones(track: TrackFeature): SensorModelZone[];
}

// ============================================================
// CONSTANTS
// ============================================================

const EARTH_RADIUS_KM = 6371.0;
const NM_TO_KM = 1.852;
const NUM_BEARINGS = 36;
const BEARING_STEP = 360.0 / NUM_BEARINGS;

/** Zone interval presets: [distance_1_nm, distance_2_nm, distance_3_nm] */
const INTERVAL_PRESETS: Record<string, [number, number, number]> = {
  small: [1.0, 2.0, 4.0],
  medium: [2.0, 4.0, 8.0],
  large: [3.0, 6.0, 12.0],
};

// ============================================================
// DEFAULT SENSOR MODEL
// ============================================================

class DefaultSensorModel implements SensorModel {
  getDetectionZones(_track: TrackFeature): SensorModelZone[] {
    return [
      { distance_nm: 3.0, likelihood_pct: 75, name: '75%' },
      { distance_nm: 6.0, likelihood_pct: 50, name: '50%' },
      { distance_nm: 12.0, likelihood_pct: 25, name: '25%' },
    ];
  }
}

// ============================================================
// TOOL DEFINITION
// ============================================================

export const toolDefinition: MCPToolDefinition = {
  name: 'buffer-zone-generator',
  description:
    'Generate detection likelihood buffer zones around a track using a sensor model. ' +
    'Returns a single MultiPolygon feature with 3 concentric zones at increasing ' +
    'distances, each styled with its detection likelihood percentage.',
  inputSchema: {
    type: 'object',
    properties: {
      features: { type: 'array', items: { type: 'object' } },
      params: {
        type: 'object',
        properties: {
          interval: {
            type: 'string',
            enum: ['small', 'medium', 'large'],
            description:
              'Zone spacing preset: small (1/2/4 nm), medium (2/4/8 nm), large (3/6/12 nm)',
          },
          distance_1_nm: {
            type: 'number',
            description: 'Innermost buffer distance in nautical miles (overrides interval)',
          },
          distance_2_nm: {
            type: 'number',
            description: 'Middle buffer distance in nautical miles (overrides interval)',
          },
          distance_3_nm: {
            type: 'number',
            description: 'Outermost buffer distance in nautical miles (overrides interval)',
          },
        },
      },
    },
  },
  annotations: {
    'debrief:selectionRequirements': [{ kind: 'TRACK', min: 1 }],
    'debrief:category': 'sensor/detection',
    'debrief:version': '1.0.0',
    'debrief:outputKind': 'addition/feature',
  },
};

// ============================================================
// GEOMETRY HELPERS
// ============================================================

/**
 * Compute destination point using Vincenty destination formula (spherical).
 * Returns [latitude, longitude] in degrees.
 */
function translatePoint(
  latDeg: number,
  lonDeg: number,
  bearingDeg: number,
  distanceKm: number,
): [number, number] {
  const lat1 = (latDeg * Math.PI) / 180;
  const lon1 = (lonDeg * Math.PI) / 180;
  const brng = (bearingDeg * Math.PI) / 180;
  const d = distanceKm / EARTH_RADIUS_KM;

  const sinLat1 = Math.sin(lat1);
  const cosLat1 = Math.cos(lat1);
  const sinD = Math.sin(d);
  const cosD = Math.cos(d);

  const lat2 = Math.asin(sinLat1 * cosD + cosLat1 * sinD * Math.cos(brng));
  const lon2 =
    lon1 + Math.atan2(Math.sin(brng) * sinD * cosLat1, cosD - sinLat1 * Math.sin(lat2));

  let lon2Deg = (lon2 * 180) / Math.PI;
  lon2Deg = ((lon2Deg + 180) % 360) - 180;

  return [(lat2 * 180) / Math.PI, lon2Deg];
}

/**
 * Compute the convex hull of 2D points using Andrew's monotone chain algorithm.
 * Points are [x, y] tuples. Returns hull vertices in counter-clockwise order (not closed).
 */
function convexHull(points: [number, number][]): [number, number][] {
  // Deduplicate and sort
  const seen = new Set<string>();
  const pts: [number, number][] = [];
  for (const p of points) {
    const key = `${p[0]},${p[1]}`;
    if (!seen.has(key)) {
      seen.add(key);
      pts.push(p);
    }
  }
  pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);

  if (pts.length <= 1) {
    return pts.slice();
  }

  function cross(o: [number, number], a: [number, number], b: [number, number]): number {
    return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  }

  // Lower hull
  const lower: [number, number][] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }

  // Upper hull
  const upper: [number, number][] = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }

  // Concatenate, excluding last point of each (duplicate)
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

function normaliseLongitude(lon: number): number {
  return ((lon + 180) % 360) - 180;
}

function needsAntimeridianShift(coords: number[][]): boolean {
  const lons = coords.map((c) => c[0]);
  return Math.max(...lons) - Math.min(...lons) > 180;
}

function shiftLon(lon: number): number {
  return ((lon % 360) + 360) % 360;
}

// ============================================================
// ZONE GENERATION
// ============================================================

function generateBufferPolygon(trackCoords: number[][], distanceNm: number): number[][] {
  const distanceKm = distanceNm * NM_TO_KM;
  const antimeridian = needsAntimeridianShift(trackCoords);

  // Generate offset point cloud
  const offsetPoints: [number, number][] = [];
  for (const coord of trackCoords) {
    const lon = coord[0];
    const lat = coord[1];
    for (let i = 0; i < NUM_BEARINGS; i++) {
      const bearing = i * BEARING_STEP;
      const [newLat, newLon] = translatePoint(lat, lon, bearing, distanceKm);
      const adjustedLon = antimeridian ? shiftLon(newLon) : newLon;
      offsetPoints.push([adjustedLon, newLat]);
    }
  }

  // Compute convex hull
  const hull = convexHull(offsetPoints);

  // Convert to GeoJSON coordinate format and close the ring
  const ring: number[][] = antimeridian
    ? hull.map((p) => [normaliseLongitude(p[0]), p[1]])
    : hull.map((p) => [p[0], p[1]]);

  // Close the ring (first == last)
  if (ring.length > 0 && (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1])) {
    ring.push([...ring[0]]);
  }

  return ring;
}

function findTrackFeature(features: TrackFeature[]): TrackFeature {
  if (features.length === 0) {
    throw new Error('No track features found in input');
  }
  for (const feature of features) {
    if (feature.properties.kind === 'TRACK') {
      return feature;
    }
  }
  throw new Error('No track features found in input');
}

function validateDistances(distances: number[]): number[] {
  for (const d of distances) {
    if (d <= 0) {
      throw new Error('All buffer distances must be positive');
    }
  }
  return [...distances].sort((a, b) => a - b);
}

// Per-ring styles following PolygonProperties schema (#081):
// purple (inner), red (middle), orange (outer).
const ZONE_STYLES: Record<string, unknown>[] = [
  { fill: true, fill_color: '#9C27B0', fill_opacity: 0.25, stroke: true, color: '#9C27B0', weight: 2, opacity: 1.0, dash_array: '6, 4' },
  { fill: true, fill_color: '#F44336', fill_opacity: 0.18, stroke: true, color: '#F44336', weight: 2, opacity: 1.0, dash_array: '6, 4' },
  { fill: true, fill_color: '#FF9800', fill_opacity: 0.12, stroke: true, color: '#FF9800', weight: 2, opacity: 1.0, dash_array: '6, 4' },
];

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ============================================================
// EXECUTE
// ============================================================

export function execute(
  features: TrackFeature[],
  params: BufferZoneParams,
  sensorModel?: SensorModel,
): RawGeoJSONFeature[] {
  // Find the track
  const track = findTrackFeature(features);
  const trackId = (track.id ?? 'unknown') as string;
  const trackCoords = (track.geometry?.coordinates ?? []) as number[][];

  if (trackCoords.length === 0) {
    throw new Error('Track has no coordinates');
  }

  // Get sensor model zones
  const model = sensorModel ?? new DefaultSensorModel();
  let zones = model.getDetectionZones(track);

  // Resolve interval preset into base distances
  if (params.interval !== undefined) {
    const preset = INTERVAL_PRESETS[params.interval];
    if (!preset) {
      throw new Error(
        `Unknown interval '${params.interval}', must be one of: small, medium, large`,
      );
    }
    zones = zones.map((z, i) => ({
      ...z,
      distance_nm: preset[i],
    }));
  }

  // Check for custom distance overrides (take precedence over interval)
  const d1 = params.distance_1_nm;
  const d2 = params.distance_2_nm;
  const d3 = params.distance_3_nm;

  if (d1 !== undefined || d2 !== undefined || d3 !== undefined) {
    let customDistances = [
      d1 !== undefined ? d1 : zones[0].distance_nm,
      d2 !== undefined ? d2 : zones[1].distance_nm,
      d3 !== undefined ? d3 : zones[2].distance_nm,
    ];
    customDistances = validateDistances(customDistances);

    // Rebuild zones with custom distances but preserve likelihood ordering
    const likelihoods = zones
      .map((z) => ({ pct: z.likelihood_pct, name: z.name }))
      .sort((a, b) => b.pct - a.pct);

    zones = customDistances.map((dist, i) => ({
      distance_nm: dist,
      likelihood_pct: likelihoods[i].pct,
      name: likelihoods[i].name,
    }));
  } else {
    validateDistances(zones.map((z) => z.distance_nm));
  }

  // Generate polygon rings and zone metadata
  const multiCoords: number[][][][] = [];
  const zoneDefs: Record<string, unknown>[] = [];
  zones.forEach((zone, i) => {
    const ring = generateBufferPolygon(trackCoords, zone.distance_nm);
    multiCoords.push([ring]); // each polygon: [exterior_ring]
    zoneDefs.push({
      name: zone.name,
      detection_likelihood_pct: zone.likelihood_pct,
      buffer_distance_nm: zone.distance_nm,
      style: ZONE_STYLES[i] ?? ZONE_STYLES[ZONE_STYLES.length - 1],
    });
  });

  // Build provenance label
  const zoneNames = zones.map((z) => z.name).join(', ');
  const label = `Generated 3 detection zones (${zoneNames}) for track`;

  // Build single MultiPolygon feature
  const feature: RawGeoJSONFeature = {
    type: 'Feature',
    id: `zone-${generateUUID()}`,
    geometry: {
      type: 'MultiPolygon',
      coordinates: multiCoords,
    },
    properties: {
      kind: 'ZONE',
      name: `Detection Zones (${zoneNames})`,
      style: ZONE_STYLES[0],
      zones: zoneDefs,
      'debrief:resultType': 'addition/feature',
      'debrief:sourceFeatures': [trackId],
      'debrief:label': label,
    },
  };

  return [feature];
}
