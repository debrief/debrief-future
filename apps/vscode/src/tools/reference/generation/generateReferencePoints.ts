/**
 * Generate Reference Points tool implementation.
 *
 * Creates a grid or scatter pattern of GeoJSON MultiPoint reference points
 * within a bounding box. First step of the E03 buffer zone analysis chain.
 */

import type { DebriefFeature } from '@debrief/schemas';
import type { MCPToolDefinition } from '../../../types/tool';

// LCG PRNG constants (Numerical Recipes) — identical in Python and TypeScript
const LCG_MULTIPLIER = 1664525;
const LCG_INCREMENT = 1013904223;
const LCG_MODULUS = 2 ** 32; // 4294967296

export interface GenerateReferencePointsParams {
  pattern: 'grid' | 'scatter';
  count?: number;
  seed?: number;
}

interface PointMetadataEntry {
  index: number;
  name: string;
}

/** Preset count values shown in the ParameterCollector UI. */
const COUNT_PRESETS = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000];

export const toolDefinition: MCPToolDefinition = {
  name: 'generate-reference-points',
  description:
    'Generates a grid or scatter pattern of reference points within a selected polygon.',
  inputSchema: {
    type: 'object',
    properties: {
      features: { type: 'array', items: { type: 'object' } },
      params: {
        type: 'object',
        properties: {
          pattern: {
            type: 'string',
            enum: ['grid', 'scatter'],
            description:
              "Generation pattern: 'grid' for evenly spaced rows/columns, 'scatter' for random distribution",
            'x-debrief-param-type': 'ReferencePointPattern',
          },
          count: {
            type: 'integer',
            enum: COUNT_PRESETS,
            minimum: 1,
            default: 20,
            description: 'Number of reference points to generate',
          },
          seed: {
            type: 'integer',
            description:
              'Random seed for reproducible scatter generation (scatter pattern only)',
          },
        },
      },
    },
  },
  annotations: {
    'debrief:selectionRequirements': [
      { kind: 'RECTANGLE', min: 1, max: 1 },
      { kind: 'POLY', min: 1, max: 1 },
      { kind: 'CIRCLE', min: 1, max: 1 },
    ],
    'debrief:category': 'reference/generation',
    'debrief:version': '1.0.0',
    'debrief:outputKind': 'addition/reference/generated_points',
    'debrief:uiCategory': 'calc',
  },
};

function lcgNext(state: number): number {
  return ((LCG_MULTIPLIER * state + LCG_INCREMENT) % LCG_MODULUS) >>> 0;
}

function normaliseLon(lon: number): number {
  if (lon > 180) {
    return lon - 360;
  }
  if (lon < -180) {
    return lon + 360;
  }
  return lon;
}

function extractBoundsFromPolygon(
  feature: DebriefFeature,
): [number, number, number, number] {
  const geo = feature.geometry as { type: string; coordinates: unknown } | undefined;
  const coords = (geo?.coordinates as number[][][] | undefined)?.[0];
  if (!coords || coords.length === 0) {
    throw new Error('Polygon feature has no coordinates');
  }
  const lons: number[] = coords.map((c) => c[0]!);
  const lats: number[] = coords.map((c) => c[1]!);
  return [Math.min(...lons), Math.min(...lats), Math.max(...lons), Math.max(...lats)];
}

function validateBounds(
  bounds: [number, number, number, number],
): [number, number, number, number] {
  const [west, south, east, north] = bounds;
  if (south >= north) {
    throw new Error(`South (${south}) must be less than north (${north})`);
  }
  if (west === east || south === north) {
    throw new Error('Bounding box must have positive area');
  }
  return [west, south, east, north];
}

function validatePositiveInt(value: number, name: string): number {
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${name.charAt(0).toUpperCase() + name.slice(1)} must be a positive integer`);
  }
  return value;
}

function buildMultiPointFeature(
  featureId: string,
  coordinates: number[][],
  metadata: PointMetadataEntry[],
  name: string,
): DebriefFeature {
  // Build via variable with type annotation to avoid object-literal assertion (ADR-011)
  const feature: { type: 'Feature'; id: string; geometry: { type: string; coordinates: number[][] }; properties: Record<string, unknown> } = {
    type: 'Feature',
    id: featureId,
    geometry: {
      type: 'MultiPoint',
      coordinates,
    },
    properties: {
      kind: 'POINT',
      locationType: 'REFERENCE',
      name,
      style: {
        shape: 'square',
        color: '#666666',
        radius: 5,
      },
      pointMetadata: metadata,
    },
  };
  // eslint-disable-next-line no-restricted-syntax
  return feature as unknown as DebriefFeature;
}

/**
 * Compute grid dimensions (rows, cols) from a target count.
 * Produces a near-square grid with rows * cols >= count.
 */
function gridDimensions(count: number): [number, number] {
  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);
  return [rows, cols];
}

function generateGrid(
  west: number,
  south: number,
  east: number,
  north: number,
  count: number,
): DebriefFeature {
  const [rows, cols] = gridDimensions(count);
  const effectiveEast = west > east ? east + 360 : east;

  const coordinates: number[][] = [];
  const metadata: PointMetadataEntry[] = [];

  for (let r = 0; r < rows; r++) {
    const lat =
      rows === 1
        ? (south + north) / 2
        : south + (r * (north - south)) / (rows - 1);

    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      if (idx >= count) {
        break;
      }

      let lon =
        cols === 1
          ? (west + effectiveEast) / 2
          : west + (c * (effectiveEast - west)) / (cols - 1);
      lon = normaliseLon(lon);

      coordinates.push([lon, lat]);
      metadata.push({ index: idx, name: `Ref ${idx + 1}` });
    }
  }

  return buildMultiPointFeature(
    'ref-grid',
    coordinates,
    metadata,
    `Reference Points (grid ${count})`,
  );
}

function generateScatter(
  west: number,
  south: number,
  east: number,
  north: number,
  count: number,
  seed: number | undefined,
): DebriefFeature {
  const effectiveEast = west > east ? east + 360 : east;

  let state = seed !== undefined ? seed : (Date.now() % LCG_MODULUS) >>> 0;

  const coordinates: number[][] = [];
  const metadata: PointMetadataEntry[] = [];

  for (let i = 0; i < count; i++) {
    state = lcgNext(state);
    const lonFrac = state / LCG_MODULUS;
    state = lcgNext(state);
    const latFrac = state / LCG_MODULUS;

    let lon = west + lonFrac * (effectiveEast - west);
    const lat = south + latFrac * (north - south);
    lon = normaliseLon(lon);

    coordinates.push([lon, lat]);
    metadata.push({ index: i, name: `Ref ${i + 1}` });
  }

  return buildMultiPointFeature(
    'ref-scatter',
    coordinates,
    metadata,
    `Reference Points (scatter ${count})`,
  );
}

export function execute(
  features: DebriefFeature[],
  params: GenerateReferencePointsParams,
): DebriefFeature[] {
  if (features === undefined || features === null || features.length === 0) {
    throw new Error('Requires exactly one polygon feature');
  }

  const { pattern } = params;

  if (pattern !== 'grid' && pattern !== 'scatter') {
    throw new Error("Pattern must be 'grid' or 'scatter'");
  }

  const count = Number(params.count ?? 20);
  validatePositiveInt(count, 'count');

  const bounds = extractBoundsFromPolygon(features[0]!);
  const [west, south, east, north] = validateBounds(bounds);

  if (pattern === 'grid') {
    return [generateGrid(west, south, east, north, count)];
  } else {
    return [generateScatter(west, south, east, north, count, params.seed)];
  }
}
