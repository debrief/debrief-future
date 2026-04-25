/**
 * Enlarge Shape tool implementation.
 * Scales annotation shapes by a multiplicative factor relative to an origin point.
 *
 * Spec: shared/tools/shape/manipulation/enlarge-shape.1.0.md
 */

import type { DebriefFeature } from '@debrief/schemas';
import { isAnnotationFeature } from '@debrief/schemas';
import type { MCPToolDefinition } from '../../../types/tool';

export interface EnlargeShapeParams {
  scale_factor?: number;
  origin?: number[] | null;
}

export const toolDefinition: MCPToolDefinition = {
  name: 'enlarge-shape',
  description:
    'Scales annotation shapes by a multiplicative factor relative to an origin point. Uses linear interpolation of geographic coordinate differences.',
  inputSchema: {
    type: 'object',
    properties: {
      features: { type: 'array', items: { type: 'object' } },
      params: {
        type: 'object',
        properties: {
          scale_factor: {
            type: 'number',
            description: 'Multiplicative scaling factor (>1 enlarges, <1 shrinks, 1 is no-op)',
            default: 3.0,
          },
          origin: {
            type: 'array',
            description: 'Scaling origin as [longitude, latitude]. Default: geometric centroid.',
            items: { type: 'number' },
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
    'debrief:outputKind': 'mutation/shape/scaled',
    'debrief:uiCategory': 'calc',
  },
};

const ANNOTATION_KINDS = new Set(['CIRCLE', 'RECTANGLE', 'LINE', 'TEXT', 'VECTOR']);

/**
 * Compute arithmetic mean of vertices as the geometric centroid.
 */
function computeCentroid(geometry: { type: string; coordinates: unknown }): number[] {
  const geoType = geometry.type;
  const coords = geometry.coordinates;

  if (geoType === 'Point') {
    return [...(coords as number[])];
  }

  let vertices: number[][];

  if (geoType === 'Polygon') {
    const ring = (coords as number[][][])[0]!;
    // Exclude closing vertex if first == last
    if (
      ring.length > 1 &&
      ring[0]![0] === ring[ring.length - 1]![0] &&
      ring[0]![1] === ring[ring.length - 1]![1]
    ) {
      vertices = ring.slice(0, -1);
    } else {
      vertices = ring;
    }
  } else if (geoType === 'LineString') {
    vertices = coords as number[][];
  } else {
    vertices = coords as number[][];
  }

  const n = vertices.length;
  if (n === 0) {
    return [0, 0];
  }

  let sumLon = 0;
  let sumLat = 0;
  for (const v of vertices) {
    sumLon += v[0]!;
    sumLat += v[1]!;
  }

  return [sumLon / n, sumLat / n];
}

/**
 * Scale a single [lon, lat] coordinate relative to an origin.
 */
function scaleCoordinate(
  coord: number[],
  origin: number[],
  scaleFactor: number,
): number[] {
  let newLon = origin[0]! + (coord[0]! - origin[0]!) * scaleFactor;
  let newLat = origin[1]! + (coord[1]! - origin[1]!) * scaleFactor;

  // Clamp latitude to [-90, 90]
  newLat = Math.max(-90, Math.min(90, newLat));

  // Normalise longitude to [-180, 180]
  newLon = ((newLon + 180) % 360) - 180;

  return [newLon, newLat];
}

function scaleCoordsList(
  coords: number[][],
  origin: number[],
  scaleFactor: number,
): number[][] {
  return coords.map((c) => scaleCoordinate(c, origin, scaleFactor));
}

export function execute(
  features: DebriefFeature[],
  params: EnlargeShapeParams,
): DebriefFeature[] {
  const scaleFactor = params.scale_factor ?? 3.0;
  const origin = params.origin ?? null;

  if (scaleFactor < 0) {
    throw new Error('scale_factor must be >= 0');
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

    // Determine scaling origin
    const scalingOrigin = origin ?? computeCentroid(geometry);

    // Scale factor of 1.0 is a no-op
    if (scaleFactor === 1.0) {
      modified.push(feature);
      continue;
    }

    const coords = geometry.coordinates;

    if (kind === 'CIRCLE' || kind === 'RECTANGLE') {
      // Polygon: scale all rings
      const polyCoords = coords as number[][][];
      geometry.coordinates = polyCoords.map((ring) =>
        scaleCoordsList(ring, scalingOrigin, scaleFactor),
      );
      if (kind === 'CIRCLE') {
        const circleProps = feature.properties as { center?: number[] };
        if (circleProps.center !== undefined) {
          circleProps.center = scaleCoordinate(circleProps.center, scalingOrigin, scaleFactor);
        }
      }
    } else if (kind === 'LINE') {
      geometry.coordinates = scaleCoordsList(coords as number[][], scalingOrigin, scaleFactor);
    } else if (kind === 'TEXT') {
      geometry.coordinates = scaleCoordinate(coords as number[], scalingOrigin, scaleFactor);
    } else if (kind === 'VECTOR') {
      geometry.coordinates = scaleCoordsList(coords as number[][], scalingOrigin, scaleFactor);
      const vectorProps = feature.properties as { origin?: number[] };
      if (vectorProps.origin !== undefined) {
        vectorProps.origin = scaleCoordinate(vectorProps.origin, scalingOrigin, scaleFactor);
      }
    }

    modified.push(feature);
  }

  if (modified.length === 0) {
    throw new Error('No annotation features found in input');
  }

  return modified;
}
