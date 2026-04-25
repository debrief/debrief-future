/**
 * Move Shape tool implementation.
 * Translates annotation shapes by compass bearing and distance using great-circle math.
 */

import type { DebriefFeature } from '@debrief/schemas';
import { isAnnotationFeature } from '@debrief/schemas';
import type { MCPToolDefinition } from '../../../types/tool';

export interface MoveShapeParams {
  direction?: number;
  distance_km?: number;
}

export const toolDefinition: MCPToolDefinition = {
  name: 'move-shape',
  description:
    'Translates annotation shapes by a given compass bearing and distance. Shifts all coordinates using great-circle math.',
  inputSchema: {
    type: 'object',
    properties: {
      features: { type: 'array', items: { type: 'object' } },
      params: {
        type: 'object',
        properties: {
          direction: {
            type: 'number',
            description: 'Compass bearing in degrees (0=North, 90=East)',
            default: 90,
          },
          distance_km: {
            type: 'number',
            description: 'Translation distance in kilometres',
            default: 5,
          },
        },
      },
    },
  },
  annotations: {
    'debrief:selectionRequirements': [
      { kind: 'CIRCLE', min: 1 },
      { kind: 'RECTANGLE', min: 1 },
      { kind: 'LINE', min: 1 },
      { kind: 'TEXT', min: 1 },
      { kind: 'VECTOR', min: 1 },
    ],
    'debrief:category': 'shape/manipulation',
    'debrief:version': '1.0.0',
    'debrief:outputKind': 'mutation/shape/translated',
    'debrief:uiCategory': 'calc',
  },
};

const EARTH_RADIUS_KM = 6371.0;
const ANNOTATION_KINDS = new Set(['CIRCLE', 'RECTANGLE', 'LINE', 'TEXT', 'VECTOR']);

/**
 * Compute destination point using Vincenty destination formula (spherical).
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

function translateCoordinate(
  coord: number[],
  bearingDeg: number,
  distanceKm: number,
): number[] {
  const [newLat, newLon] = translatePoint(coord[1]!, coord[0]!, bearingDeg, distanceKm);
  return [newLon, newLat];
}

function translateCoordsList(
  coords: number[][],
  bearingDeg: number,
  distanceKm: number,
): number[][] {
  return coords.map((c) => translateCoordinate(c, bearingDeg, distanceKm));
}

export function execute(features: DebriefFeature[], params: MoveShapeParams): DebriefFeature[] {
  const direction = ((params.direction ?? 90) % 360 + 360) % 360;
  const distanceKm = params.distance_km ?? 5;

  if (distanceKm < 0) {
    throw new Error('distance_km must be >= 0');
  }

  // Zero distance is a no-op
  if (distanceKm === 0) {
    return features.filter((f) => isAnnotationFeature(f) && ANNOTATION_KINDS.has(f.properties.kind));
  }

  const modified: DebriefFeature[] = [];

  for (const feature of features) {
    if (!isAnnotationFeature(feature)) {
      continue;
    }

    const kind = feature.properties.kind;

    if (!ANNOTATION_KINDS.has(kind)) {
      continue;
    }

    const geometry = feature.geometry as { type: string; coordinates: unknown } | undefined;
    if (!geometry) {
      continue;
    }
    const coords = geometry.coordinates;

    if (kind === 'CIRCLE' || kind === 'RECTANGLE') {
      // Polygon: translate all rings
      const polyCoords = coords as number[][][];
      geometry.coordinates = polyCoords.map((ring) =>
        translateCoordsList(ring, direction, distanceKm),
      );
      if (kind === 'CIRCLE') {
        const circleProps = feature.properties as { center?: number[] };
        if (circleProps.center !== undefined && circleProps.center !== null) {
          circleProps.center = translateCoordinate(circleProps.center, direction, distanceKm);
        }
      }
    } else if (kind === 'LINE') {
      geometry.coordinates = translateCoordsList(coords as number[][], direction, distanceKm);
    } else if (kind === 'TEXT') {
      geometry.coordinates = translateCoordinate(coords as number[], direction, distanceKm);
    } else if (kind === 'VECTOR') {
      geometry.coordinates = translateCoordsList(coords as number[][], direction, distanceKm);
      const vectorProps = feature.properties as { origin?: number[] };
      if (vectorProps.origin !== undefined && vectorProps.origin !== null) {
        vectorProps.origin = translateCoordinate(vectorProps.origin, direction, distanceKm);
      }
    }

    modified.push(feature);
  }

  if (modified.length === 0) {
    throw new Error('No annotation features found in input');
  }

  return modified;
}
