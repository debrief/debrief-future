/**
 * Area Summary tool — TypeScript implementation.
 *
 * Summarises the geographic extent and area of either an explicit bounding
 * box (`params.bounds`) or the coordinates of the selected features.
 * Aligned with the Python `area_summary` tool (#107).
 */

import type { DebriefFeature } from '@debrief/schemas';
import { OutputKindEnum } from '@debrief/schemas';
import type { MCPToolDefinition } from '@debrief/utils';
import type { RawGeoJSONFeature as GeoJSONFeature } from '@debrief/schemas';

type Position = number[];

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export const toolDefinition: MCPToolDefinition = {
  name: 'area-summary',
  description:
    'Summarise the geographic extent of selected features, ' +
    'producing a bounding-box polygon with area statistics.',
  inputSchema: {
    type: 'object',
    properties: {
      features: { type: 'array', items: { type: 'object' } },
      params: {
        type: 'object',
        properties: {
          include_centroid: {
            type: 'boolean',
            default: true,
            description: 'Include centroid point in output',
          },
          bounds: {
            type: 'array',
            items: { type: 'number' },
            minItems: 4,
            maxItems: 4,
            description: 'Explicit bounding box [minx, miny, maxx, maxy]. ' +
              'When provided, takes precedence over feature-coordinate extraction.',
          },
        },
      },
    },
  },
  annotations: {
    'debrief:selectionRequirements': [
      { kind: 'TRACK', min: 1 },
      { kind: 'POINT', min: 1 },
      { kind: 'RECTANGLE', min: 1 },
      { kind: 'CIRCLE', min: 1 },
      { kind: 'ZONE', min: 1 },
      { kind: 'POLY', min: 1 },
    ],
    'debrief:category': 'region/analysis',
    'debrief:version': '1.0.0',
    'debrief:outputKind': OutputKindEnum.regionSOLIDUSstatistics,
  },
};

/** Recursively extract all [lon, lat] positions from any GeoJSON coordinates. */
function flattenCoords(coords: unknown): Position[] {
  if (!Array.isArray(coords)) return [];
  if (typeof coords[0] === 'number') return [coords as Position];
  return coords.flatMap(flattenCoords);
}

/** Validate a 4-element numeric bounding box, returning it normalised or null. */
function parseBoundsParam(raw: unknown): [number, number, number, number] | null {
  if (!Array.isArray(raw) || raw.length !== 4) return null;
  const nums = raw.map(Number);
  if (nums.some((n) => !Number.isFinite(n))) return null;
  return [nums[0], nums[1], nums[2], nums[3]];
}

/** Extract a bounding box from feature coordinates, or null when none have valid coords. */
function boundsFromFeatures(
  features: DebriefFeature[],
): [number, number, number, number] | null {
  let minLon = Infinity, minLat = Infinity;
  let maxLon = -Infinity, maxLat = -Infinity;

  for (const f of features) {
    if (!f.geometry || !('coordinates' in f.geometry)) continue;
    for (const [lon, lat] of flattenCoords(f.geometry.coordinates)) {
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }
  }

  if (!isFinite(minLon)) return null;
  return [minLon, minLat, maxLon, maxLat];
}

export function execute(
  features: DebriefFeature[],
  params: Record<string, unknown>,
): GeoJSONFeature[] {
  const includeCentroid = params?.include_centroid !== false;

  // Try explicit bounds first (mirrors Python REGION-context behaviour),
  // then fall back to feature-coordinate extraction. Returns [] if neither
  // yields a valid bbox — aligning with the Python implementation (#107).
  const bounds = parseBoundsParam(params?.bounds) ?? boundsFromFeatures(features);
  if (!bounds) return [];

  const [minLon, minLat, maxLon, maxLat] = bounds;

  // Area calculation with latitude correction
  const avgLat = (minLat + maxLat) / 2;
  const widthDeg = maxLon - minLon;
  const heightDeg = maxLat - minLat;
  const widthNm = widthDeg * 60 * Math.cos((avgLat * Math.PI) / 180);
  const heightNm = heightDeg * 60;
  const areaSqNm = widthNm * heightNm;

  const statistics: Record<string, unknown> = {
    area_sq_nm: Math.round(areaSqNm * 100) / 100,
    width_nm: Math.round(widthNm * 100) / 100,
    height_nm: Math.round(heightNm * 100) / 100,
  };

  if (includeCentroid) {
    statistics.centroid = [
      Math.round((minLon + maxLon) / 2 * 10000) / 10000,
      Math.round((minLat + maxLat) / 2 * 10000) / 10000,
    ];
  }

  // Build a DatasetEnvelope for tabular display (#177)
  const tableDataset = {
    type: 'region_statistics',
    title: 'Area Summary',
    displayHint: 'table' as const,
    metadata: {
      xAxis: { label: 'Metric', type: 'nominal' as const },
      yAxis: { label: 'Value', type: 'quantitative' as const },
    },
    data: Object.entries(statistics)
      .filter(([, v]) => typeof v === 'number')
      .map(([key, val]) => ({
        metric: key.replace(/_/g, ' '),
        value: val,
      })),
  };

  return [{
    type: 'Feature',
    id: `area-${generateUUID()}`,
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [minLon, minLat],
        [maxLon, minLat],
        [maxLon, maxLat],
        [minLon, maxLat],
        [minLon, minLat],
      ]],
    },
    properties: {
      kind: toolDefinition.annotations['debrief:outputKind'],
      name: `Area Summary`,
      label: `Area Summary`,
      statistics,
      bounds: [minLon, minLat, maxLon, maxLat],
      '__datasets': [tableDataset],
      style: {
        fill: true,
        fill_color: '#FF9800',
        fill_opacity: 0.1,
        stroke: true,
        color: '#FF9800',
        weight: 2,
        opacity: 0.8,
        dash_array: '5, 5',
      },
    },
  }];
}
