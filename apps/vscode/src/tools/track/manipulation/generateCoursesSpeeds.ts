/**
 * Generate Courses and Speeds tool implementation.
 *
 * Derives course (bearing) and speed (knots) from consecutive track positions
 * using Haversine distance and great-circle bearing formulas.
 */

import type { TrackFeature } from '@debrief/schemas';
import type { MCPToolDefinition } from '../../../types/tool';

const EARTH_RADIUS_NM = 3440.065;

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

function toDegrees(rad: number): number {
  return (rad * 180) / Math.PI;
}

function haversineDistance(lon1: number, lat1: number, lon2: number, lat2: number): number {
  const lon1r = toRadians(lon1);
  const lat1r = toRadians(lat1);
  const lon2r = toRadians(lon2);
  const lat2r = toRadians(lat2);
  const dlon = lon2r - lon1r;
  const dlat = lat2r - lat1r;
  const a =
    Math.sin(dlat / 2) ** 2 + Math.cos(lat1r) * Math.cos(lat2r) * Math.sin(dlon / 2) ** 2;
  const c = 2 * Math.asin(Math.sqrt(a));
  return c * EARTH_RADIUS_NM;
}

function initialBearing(lon1: number, lat1: number, lon2: number, lat2: number): number {
  const lon1r = toRadians(lon1);
  const lat1r = toRadians(lat1);
  const lon2r = toRadians(lon2);
  const lat2r = toRadians(lat2);
  const dlon = lon2r - lon1r;
  const x = Math.sin(dlon) * Math.cos(lat2r);
  const y = Math.cos(lat1r) * Math.sin(lat2r) - Math.sin(lat1r) * Math.cos(lat2r) * Math.cos(dlon);
  const bearingDeg = toDegrees(Math.atan2(x, y));
  return ((bearingDeg % 360) + 360) % 360;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export const toolDefinition: MCPToolDefinition = {
  name: 'generate-courses-speeds',
  description:
    'Derives course (bearing in degrees) and speed (knots) from consecutive track positions ' +
    'using Haversine distance and great-circle bearing formulas. Writes values into each ' +
    "position's course and speed fields, overriding any existing values.",
  inputSchema: {
    type: 'object',
    properties: {
      features: {
        type: 'array',
        items: { type: 'object' },
        description: 'GeoJSON track features to process',
      },
    },
  },
  annotations: {
    'debrief:selectionRequirements': [{ kind: 'TRACK', min: 1 }],
    'debrief:category': 'track/manipulation',
    'debrief:version': '1.0.0',
    'debrief:outputKind': 'mutation/track/courses_speeds',
    'debrief:uiCategory': 'calc',
  },
};

interface Position {
  time: string;
  course?: number;
  speed?: number;
  [key: string]: unknown;
}

export function execute(features: TrackFeature[]): TrackFeature[] {
  const modified: TrackFeature[] = [];

  for (const feature of features) {
    const props = feature.properties ?? {};
    if (props.kind !== 'TRACK') {
      continue;
    }

    const coords = feature.geometry.coordinates as number[][];
    const positions = (props.positions as Position[]) ?? [];
    const n = positions.length;

    // Single-position track: return unchanged
    if (n <= 1) {
      modified.push(feature);
      continue;
    }

    // Phase 1: compute course and speed for each consecutive pair
    for (let i = 0; i < n - 1; i++) {
      const c1 = coords[i]!;
      const c2 = coords[i + 1]!;
      const lon1 = c1[0]!;
      const lat1 = c1[1]!;
      const lon2 = c2[0]!;
      const lat2 = c2[1]!;
      const pos = positions[i]!;
      const posNext = positions[i + 1]!;

      const distanceNm = haversineDistance(lon1, lat1, lon2, lat2);
      const bearing = initialBearing(lon1, lat1, lon2, lat2);

      const time1 = new Date(pos.time).getTime() / 1000;
      const time2 = new Date(posNext.time).getTime() / 1000;
      const elapsedSeconds = time2 - time1;

      if (distanceNm === 0) {
        pos.course = 0;
        pos.speed = 0;
      } else if (elapsedSeconds <= 0) {
        pos.course = round2(bearing);
        pos.speed = 0;
      } else {
        const elapsedHours = elapsedSeconds / 3600;
        pos.course = round2(bearing);
        pos.speed = round2(distanceNm / elapsedHours);
      }
    }

    // Phase 2: last position carries forward
    const last = positions[n - 1]!;
    const prev = positions[n - 2]!;
    last.course = prev.course;
    last.speed = prev.speed;

    modified.push(feature);
  }

  if (modified.length === 0) {
    throw new Error('No track features found in input');
  }

  return modified;
}
