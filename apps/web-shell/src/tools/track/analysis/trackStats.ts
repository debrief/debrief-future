/**
 * Track Statistics tool — TypeScript implementation.
 * Calculates statistics for a single track: point count, duration,
 * total distance, and average speed.
 */

import type { MCPToolDefinition } from '../../../services/toolService';
import type { TrackFeature } from '@debrief/schemas';
import type { GeoJSONFeature } from '@debrief/utils';

const EARTH_RADIUS_NM = 3440.065;

function haversineDistanceNm(
  lon1: number, lat1: number, lon2: number, lat2: number,
): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_NM * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export const toolDefinition: MCPToolDefinition = {
  name: 'track-stats',
  description:
    'Calculate statistics for a track: point count, duration, total distance, and average speed.',
  inputSchema: {
    type: 'object',
    properties: {
      features: { type: 'array', items: { type: 'object' } },
      params: {
        type: 'object',
        properties: {
          distance_unit: {
            type: 'string',
            enum: ['nm', 'km', 'mi'],
            default: 'nm',
            description: 'Unit for distance measurements',
          },
        },
      },
    },
  },
  annotations: {
    'debrief:selectionRequirements': [{ kind: 'TRACK', min: 1, max: 1 }],
    'debrief:category': 'track/analysis',
    'debrief:version': '1.0.0',
    'debrief:outputKind': 'track/statistics',
  },
};

type DistanceUnit = 'nm' | 'km' | 'mi';

// Conversion factors from nautical miles
const NM_TO_KM = 1.852;
const NM_TO_MI = 1.15078;

function convertDistance(distanceNm: number, unit: DistanceUnit): number {
  if (unit === 'km') return distanceNm * NM_TO_KM;
  if (unit === 'mi') return distanceNm * NM_TO_MI;
  return distanceNm;
}

function convertSpeed(speedKts: number, unit: DistanceUnit): number {
  if (unit === 'km') return speedKts * NM_TO_KM;
  if (unit === 'mi') return speedKts * NM_TO_MI;
  return speedKts;
}

function distanceKey(unit: DistanceUnit): string {
  return `distance_${unit}`;
}

function speedKey(unit: DistanceUnit): string {
  const labels: Record<DistanceUnit, string> = { nm: 'kts', km: 'kmh', mi: 'mph' };
  return `average_speed_${labels[unit]}`;
}

export function execute(
  features: TrackFeature[],
  params: Record<string, unknown>,
): GeoJSONFeature[] {
  const distanceUnit = ((params?.distance_unit as string) || 'nm') as DistanceUnit;
  if (!['nm', 'km', 'mi'].includes(distanceUnit)) {
    throw new Error(`distance_unit must be one of: nm, km, mi (got '${distanceUnit}')`);
  }

  const track = features.find(
    f => f.properties.kind === 'TRACK' && f.geometry.type === 'LineString',
  );
  if (!track) throw new Error('No track feature found');

  const coords = track.geometry.coordinates as number[][];
  if (coords.length === 0) throw new Error('Track has no coordinates');

  const pointCount = coords.length;

  // Total distance in nautical miles
  let totalDistanceNm = 0;
  for (let i = 1; i < coords.length; i++) {
    totalDistanceNm += haversineDistanceNm(
      coords[i - 1][0], coords[i - 1][1],
      coords[i][0], coords[i][1],
    );
  }

  // Duration from properties.times (epoch ms array, legacy wire format)
  const props = track.properties as unknown as Record<string, unknown>;
  let durationHours = 0;
  const times = props.times as number[] | undefined;
  if (times && times.length >= 2) {
    durationHours = (times[times.length - 1] - times[0]) / (1000 * 60 * 60);
  }

  const avgSpeedKts = durationHours > 0 ? totalDistanceNm / durationHours : 0;

  // Convert to requested unit
  const distance = convertDistance(totalDistanceNm, distanceUnit);
  const speed = convertSpeed(avgSpeedKts, distanceUnit);

  // Centroid for result feature placement
  const centroidLon = coords.reduce((s, c) => s + c[0], 0) / coords.length;
  const centroidLat = coords.reduce((s, c) => s + c[1], 0) / coords.length;

  const trackName = ((props.name ?? props.platform_name ?? track.id ?? 'Unknown') as string);

  return [{
    type: 'Feature',
    id: `stats-${generateUUID()}`,
    geometry: { type: 'Point', coordinates: [centroidLon, centroidLat] },
    properties: {
      kind: toolDefinition.annotations['debrief:outputKind'],
      name: `Statistics: ${trackName}`,
      source_track: String(track.id ?? ''),
      source_name: trackName,
      statistics: {
        point_count: pointCount,
        duration_hours: Math.round(durationHours * 100) / 100,
        [distanceKey(distanceUnit)]: Math.round(distance * 100) / 100,
        [speedKey(distanceUnit)]: Math.round(speed * 100) / 100,
      },
    },
  }];
}
