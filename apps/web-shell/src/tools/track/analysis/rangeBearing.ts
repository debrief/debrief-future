/**
 * Range-Bearing tool — TypeScript implementation.
 * Calculates range and bearing time-series between two tracks.
 * Returns a GeoJSON Feature carrying a DatasetEnvelope in __dataset
 * so the calcService can auto-open it in the Results panel.
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

function calculateBearing(
  lon1: number, lat1: number, lon2: number, lat2: number,
): number {
  const lat1R = (lat1 * Math.PI) / 180;
  const lat2R = (lat2 * Math.PI) / 180;
  const dLonR = ((lon2 - lon1) * Math.PI) / 180;
  const x = Math.sin(dLonR) * Math.cos(lat2R);
  const y =
    Math.cos(lat1R) * Math.sin(lat2R) -
    Math.sin(lat1R) * Math.cos(lat2R) * Math.cos(dLonR);
  return (((Math.atan2(x, y) * 180) / Math.PI) + 360) % 360;
}

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export const toolDefinition: MCPToolDefinition = {
  name: 'range-bearing',
  description:
    'Calculate range and bearing time-series between two tracks. ' +
    'Produces a dataset chart in the Results panel.',
  inputSchema: {
    type: 'object',
    properties: {
      features: { type: 'array', items: { type: 'object' } },
    },
  },
  annotations: {
    'debrief:selectionRequirements': [{ kind: 'TRACK', min: 2, max: 2 }],
    'debrief:category': 'track/analysis',
    'debrief:version': '1.0.0',
    'debrief:outputKind': 'dataset/range_bearing_series',
  },
};

/** Access legacy wire-format properties (times, name, platform_name) on a TrackFeature. */
function getLegacyProps(track: TrackFeature): typeof track.properties & { name?: string; platform_name?: string; times?: number[] } {
  return track.properties as typeof track.properties & { name?: string; platform_name?: string; times?: number[] };
}

export function execute(
  features: TrackFeature[],
  _params: Record<string, unknown>,
): GeoJSONFeature[] {
  const tracks = features.filter(
    f => f.properties.kind === 'TRACK' && f.geometry.type === 'LineString',
  );
  if (tracks.length < 2) throw new Error('Requires at least 2 track features');

  const [track1, track2] = tracks;
  const coords1 = track1.geometry.coordinates as number[][];
  const coords2 = track2.geometry.coordinates as number[][];
  // Access legacy wire-format 'times' and 'name' properties
  const legacyProps1 = getLegacyProps(track1);
  const legacyProps2 = getLegacyProps(track2);
  const times1 = legacyProps1.times;
  const times2 = legacyProps2.times;
  const name1 = String(legacyProps1.name ?? legacyProps1.platform_name ?? track1.id ?? 'Track 1');
  const name2 = String(legacyProps2.name ?? legacyProps2.platform_name ?? track2.id ?? 'Track 2');

  // Build time-series by zipping coordinates by index
  const len = Math.min(coords1.length, coords2.length);
  const rangePoints: Record<string, unknown>[] = [];
  const bearingPoints: Record<string, unknown>[] = [];

  for (let i = 0; i < len; i++) {
    const time = times1?.[i] ?? times2?.[i] ?? i * 1000;
    const isoTime = new Date(time).toISOString();

    const rangeNm = haversineDistanceNm(
      coords1[i][0], coords1[i][1], coords2[i][0], coords2[i][1],
    );
    const bearingDeg = calculateBearing(
      coords1[i][0], coords1[i][1], coords2[i][0], coords2[i][1],
    );

    rangePoints.push({ time: isoTime, value: Math.round(rangeNm * 100) / 100 });
    bearingPoints.push({ time: isoTime, value: Math.round(bearingDeg * 10) / 10 });
  }

  const seriesName = `${name1} \u2192 ${name2}`;

  // DatasetEnvelope for range chart (uses series format for rangeBearingSeries mapping)
  const rangeDataset = {
    type: 'range_bearing_series',
    title: `Range: ${name1} \u2192 ${name2}`,
    metadata: {
      xAxis: { label: 'Time', type: 'temporal' },
      yAxis: { label: 'Range', type: 'quantitative', units: 'nm' },
    },
    series: [{ name: seriesName, data: rangePoints }],
  };

  // DatasetEnvelope for bearing chart
  const bearingDataset = {
    type: 'range_bearing_series',
    title: `Bearing: ${name1} \u2192 ${name2}`,
    metadata: {
      xAxis: { label: 'Time', type: 'temporal' },
      yAxis: { label: 'Bearing', type: 'quantitative', units: '\u00b0' },
    },
    series: [{ name: seriesName, data: bearingPoints }],
  };

  // Return as a Feature carrying the datasets in __datasets
  return [{
    type: 'Feature',
    id: `rb-${generateUUID()}`,
    geometry: { type: 'Point', coordinates: [0, 0] },
    properties: {
      kind: toolDefinition.annotations['debrief:outputKind'],
      name: `Range & Bearing: ${name1} \u2192 ${name2}`,
      from_feature: name1,
      to_feature: name2,
      '__datasets': [rangeDataset, bearingDataset],
    },
  }];
}
