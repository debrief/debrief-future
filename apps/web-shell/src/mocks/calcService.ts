/**
 * Mock calc service for web-shell.
 * Implements track-length and bounding-box tools using JavaScript calculations,
 * plus styling tools from the real toolService (set-track-color, apply-symbol-style,
 * label-interval, symbol-interval).
 */

import type { Feature, LineString, Position, Polygon } from 'geojson';
import type { ToolsPanelItem } from '@debrief/components';
import { extractParameters } from '@debrief/components';
import { listTools, executeTool } from '../services/toolService';

/** Feature with properties containing an id */
interface IdentifiableFeature extends Feature {
  properties: {
    id?: string;
    name?: string;
    kind?: string;
    [key: string]: unknown;
  };
}

/** Tool execution result */
export interface ToolResult {
  success: boolean;
  message: string;
  /** Optional result layer (e.g., bounding box polygon) */
  resultLayer?: Feature;
  /** Optional multiple result layers (e.g., buffer zone polygons) */
  resultLayers?: Feature[];
  /** Optional tunable parameters recorded for provenance */
  parameters?: Record<string, ToolParameterMeta>;
}

/**
 * Calculate distance between two points using Haversine formula.
 * Returns distance in meters.
 */
function haversineDistance(p1: Position, p2: Position): number {
  const R = 6371000; // Earth's radius in meters
  const lat1 = (p1[1] * Math.PI) / 180;
  const lat2 = (p2[1] * Math.PI) / 180;
  const deltaLat = ((p2[1] - p1[1]) * Math.PI) / 180;
  const deltaLon = ((p2[0] - p1[0]) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Calculate total length of a LineString in meters.
 */
function calculateTrackLength(coords: Position[]): number {
  let length = 0;
  for (let i = 1; i < coords.length; i++) {
    length += haversineDistance(coords[i - 1], coords[i]);
  }
  return length;
}

/**
 * Calculate bounding box from features.
 * Returns [minLon, minLat, maxLon, maxLat].
 */
function calculateBoundingBox(features: Feature[]): [number, number, number, number] {
  let minLon = Infinity;
  let minLat = Infinity;
  let maxLon = -Infinity;
  let maxLat = -Infinity;

  function processCoords(coords: Position | Position[] | Position[][] | Position[][][]): void {
    if (typeof coords[0] === 'number') {
      const [lon, lat] = coords as Position;
      minLon = Math.min(minLon, lon);
      maxLon = Math.max(maxLon, lon);
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
    } else {
      (coords as Array<Position | Position[] | Position[][]>).forEach(processCoords);
    }
  }

  for (const feature of features) {
    if (feature.geometry && 'coordinates' in feature.geometry) {
      processCoords(feature.geometry.coordinates);
    }
  }

  return [minLon, minLat, maxLon, maxLat];
}

/**
 * Create a polygon feature from a bounding box.
 */
function bboxToPolygon(bbox: [number, number, number, number]): Feature<Polygon> {
  const [minLon, minLat, maxLon, maxLat] = bbox;
  return {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [minLon, minLat],
          [maxLon, minLat],
          [maxLon, maxLat],
          [minLon, maxLat],
          [minLon, minLat],
        ],
      ],
    },
    properties: {
      id: `bbox-result-${Date.now()}`,
      kind: 'RECTANGLE',
      label: 'Bounding Box Result',
      style: {
        fill: true,
        fill_color: '#4CAF50',
        fill_opacity: 0.1,
        stroke: true,
        color: '#4CAF50',
        weight: 2,
        opacity: 0.8,
        dash_array: '5, 5',
      },
    },
  };
}

/** Tunable parameter metadata returned alongside tool results */
export interface ToolParameterMeta {
  value: unknown;
  default: boolean;
  tunable: boolean;
}

/** Tool definition */
interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  /** Minimum number of tracks required */
  minTracks?: number;
  /** Maximum number of tracks (undefined = no limit) */
  maxTracks?: number;
  /** Minimum number of features required (any type) */
  minFeatures?: number;
  /** Annotation kinds required (at least one feature must match) */
  annotationKinds?: Set<string>;
}

/** Annotation kinds supported by the move-shape tool */
const MOVE_SHAPE_KINDS = new Set(['CIRCLE', 'RECTANGLE', 'LINE', 'TEXT', 'VECTOR']);

const TOOLS: ToolDefinition[] = [
  {
    id: 'track-length',
    name: 'Track Length',
    description: 'Calculate total length of selected tracks',
    minTracks: 1,
  },
  {
    id: 'bounding-box',
    name: 'Bounding Box',
    description: 'Calculate bounding box of selected features',
    minFeatures: 1,
  },
  {
    id: 'move-shape',
    name: 'Move Shape',
    description: 'Translate annotation shapes by distance and bearing',
    minFeatures: 1,
    annotationKinds: MOVE_SHAPE_KINDS,
  },
];

/**
 * Check if a feature is a track (LineString with times).
 */
function isTrack(feature: Feature): boolean {
  return (
    feature.geometry?.type === 'LineString' &&
    feature.properties !== null &&
    Array.isArray((feature.properties as Record<string, unknown>).times)
  );
}

/**
 * Get tool applicability based on selection.
 */
function getToolApplicability(
  tool: ToolDefinition,
  features: IdentifiableFeature[]
): { applicable: boolean; explanation?: string } {
  const tracks = features.filter(isTrack);

  if (tool.minTracks !== undefined) {
    if (tracks.length < tool.minTracks) {
      return {
        applicable: false,
        explanation: `Requires at least ${tool.minTracks} track${tool.minTracks > 1 ? 's' : ''} (${tracks.length} selected)`,
      };
    }
    if (tool.maxTracks !== undefined && tracks.length > tool.maxTracks) {
      return {
        applicable: false,
        explanation: `Requires at most ${tool.maxTracks} track${tool.maxTracks > 1 ? 's' : ''} (${tracks.length} selected)`,
      };
    }
  }

  if (tool.minFeatures !== undefined && features.length < tool.minFeatures) {
    return {
      applicable: false,
      explanation: `Requires at least ${tool.minFeatures} feature${tool.minFeatures > 1 ? 's' : ''} (${features.length} selected)`,
    };
  }

  // Annotation kind check
  if (tool.annotationKinds) {
    const hasMatchingAnnotation = features.some(
      (f) => f.properties?.kind && tool.annotationKinds!.has(f.properties.kind)
    );
    if (!hasMatchingAnnotation) {
      return {
        applicable: false,
        explanation: 'Requires an annotation shape (Circle, Rectangle, Line, Text, or Vector)',
      };
    }
  }

  return { applicable: true };
}

/**
 * Mock calc service interface.
 */
export interface MockCalcService {
  /** Get tools with applicability based on selection */
  getTools(selectedFeatures: Feature[]): ToolsPanelItem[];

  /** Run a tool on selected features with optional collected parameters */
  runTool(toolId: string, selectedFeatures: Feature[], params?: Record<string, unknown>): ToolResult;
}

/**
 * Convert kebab-case to Title Case for display.
 */
function formatToolName(name: string): string {
  return name
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** IDs of styling tools from toolService */
const stylingToolIds = new Set(listTools().map(t => t.name));

/**
 * Translate a [lon, lat] point by a given distance (nm) and bearing (degrees).
 * Uses the Vincenty destination formula with Earth radius 6371 km.
 */
function translatePoint(lon: number, lat: number, distanceNm: number, bearingDeg: number): [number, number] {
  const R = 6371; // Earth radius in km
  const distKm = distanceNm * 1.852;
  const d = distKm / R;
  const brng = (bearingDeg * Math.PI) / 180;
  const lat1 = (lat * Math.PI) / 180;
  const lon1 = (lon * Math.PI) / 180;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(brng)
  );
  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(brng) * Math.sin(d) * Math.cos(lat1),
      Math.cos(d) - Math.sin(lat1) * Math.sin(lat2)
    );

  const lon2Deg = ((lon2 * 180) / Math.PI + 540) % 360 - 180;
  const lat2Deg = (lat2 * 180) / Math.PI;
  return [lon2Deg, lat2Deg];
}

/**
 * Move annotation features by distance and bearing.
 * Returns new features with translated coordinates.
 */
export function moveShapeFeatures(
  features: Feature[],
  distanceNm: number,
  directionDeg: number
): Feature[] {
  const results: Feature[] = [];
  for (const f of features) {
    const kind = (f.properties as Record<string, unknown> | null)?.kind;
    if (!kind || !MOVE_SHAPE_KINDS.has(kind as string)) continue;

    const moved = JSON.parse(JSON.stringify(f)) as Feature;
    const geom = moved.geometry;
    if (!geom || !('coordinates' in geom)) continue;

    // Recursively translate all coordinates
    function translateCoords(coords: unknown): unknown {
      if (!Array.isArray(coords)) return coords;
      if (typeof coords[0] === 'number') {
        // It's a single [lon, lat, ?alt] position
        const [newLon, newLat] = translatePoint(
          coords[0] as number,
          coords[1] as number,
          distanceNm,
          directionDeg
        );
        return coords.length > 2 ? [newLon, newLat, coords[2]] : [newLon, newLat];
      }
      return coords.map(translateCoords);
    }

    (geom as { coordinates: unknown }).coordinates = translateCoords(
      (geom as { coordinates: unknown }).coordinates
    );

    // Update center property if present (CIRCLE, etc.)
    const props = moved.properties as Record<string, unknown> | null;
    if (props?.center && Array.isArray(props.center)) {
      const [cLon, cLat] = props.center as [number, number];
      const [newLon, newLat] = translatePoint(cLon, cLat, distanceNm, directionDeg);
      props.center = [newLon, newLat];
    }
    // Update origin property if present (VECTOR)
    if (props?.origin && Array.isArray(props.origin)) {
      const [oLon, oLat] = props.origin as [number, number];
      const [newLon, newLat] = translatePoint(oLon, oLat, distanceNm, directionDeg);
      props.origin = [newLon, newLat];
    }

    results.push(moved);
  }
  return results;
}

/**
 * Create a mock calc service instance.
 */
export function createMockCalcService(): MockCalcService {
  return {
    getTools(selectedFeatures: Feature[]): ToolsPanelItem[] {
      // Built-in analysis tools
      const builtinTools = TOOLS.map(tool => {
        const { applicable, explanation } = getToolApplicability(
          tool,
          selectedFeatures as IdentifiableFeature[]
        );
        return {
          id: tool.id,
          name: tool.name,
          description: tool.description,
          applicable,
          explanation,
        };
      });

      // Registered tools from toolService (with parameter metadata for context menus)
      const registeredTools: ToolsPanelItem[] = listTools().map(def => {
        const params = extractParameters(def).filter(p => p.paramType || p.choices);
        const reqs = def.annotations['debrief:selectionRequirements'] as
          | { kind: string; min?: number }[]
          | undefined;

        // Check applicability against selectionRequirements
        let applicable = false;
        let explanation: string | undefined;
        if (!reqs || reqs.length === 0) {
          applicable = selectedFeatures.length > 0;
          explanation = applicable ? undefined : 'Requires at least 1 feature selected';
        } else {
          for (const req of reqs) {
            const count = selectedFeatures.filter(
              f => (f.properties as Record<string, unknown> | null)?.kind === req.kind
            ).length;
            if (count >= (req.min ?? 1)) {
              applicable = true;
              break;
            }
          }
          if (!applicable) {
            const kinds = reqs.map(r => r.kind).join(' or ');
            explanation = `Requires ${kinds} feature selected`;
          }
        }

        return {
          id: def.name,
          name: formatToolName(def.name),
          description: def.description,
          applicable,
          explanation,
          parameters: params.length > 0 ? params : undefined,
        };
      });

      return [...builtinTools, ...registeredTools];
    },

    runTool(toolId: string, selectedFeatures: Feature[], collectedParams?: Record<string, unknown>): ToolResult {
      // Check built-in tools first (they have richer result handling)
      const builtinTool = TOOLS.find(t => t.id === toolId);

      // Delegate non-built-in tools to toolService (styling tools, etc.)
      if (!builtinTool && stylingToolIds.has(toolId)) {
        try {
          // Use collected parameters from ParameterCollector, fall back to defaults
          const defaultParams: Record<string, Record<string, unknown>> = {
            'set-track-color': { color: '#ff0000' },
            'apply-symbol-style': { symbol: 'circle' },
          };
          const params = collectedParams ?? defaultParams[toolId] ?? {};
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const response = executeTool(toolId, selectedFeatures as any, params);
          const item = response.content[0];
          const label = item?.annotations?.['debrief:label'] ?? `${toolId} applied`;

          // For addition tools, parse result features and return as layers
          if (item?.resource?.text) {
            const fc = JSON.parse(item.resource.text);
            if (fc.features && fc.features.length > 0) {
              return {
                success: true,
                message: String(label),
                resultLayers: fc.features as Feature[],
              };
            }
          }

          return { success: true, message: String(label) };
        } catch (err) {
          return { success: false, message: String(err) };
        }
      }

      // Built-in tools
      if (!builtinTool) {
        return { success: false, message: `Unknown tool: ${toolId}` };
      }

      switch (toolId) {
        case 'track-length': {
          const tracks = selectedFeatures.filter(isTrack);
          if (tracks.length === 0) {
            return { success: false, message: 'No tracks selected' };
          }

          let totalLength = 0;
          const details: string[] = [];

          for (const track of tracks) {
            const geom = track.geometry as LineString;
            const length = calculateTrackLength(geom.coordinates);
            totalLength += length;
            const name = (track.properties as Record<string, unknown>)?.name ?? track.properties?.id ?? 'Unknown';
            details.push(`${name}: ${(length / 1000).toFixed(2)} km`);
          }

          const message =
            tracks.length === 1
              ? `Track length: ${(totalLength / 1000).toFixed(2)} km`
              : `Total length: ${(totalLength / 1000).toFixed(2)} km\n${details.join('\n')}`;

          return { success: true, message };
        }

        case 'bounding-box': {
          if (selectedFeatures.length === 0) {
            return { success: false, message: 'No features selected' };
          }

          const bbox = calculateBoundingBox(selectedFeatures);
          const polygon = bboxToPolygon(bbox);

          const width = haversineDistance([bbox[0], bbox[1]], [bbox[2], bbox[1]]);
          const height = haversineDistance([bbox[0], bbox[1]], [bbox[0], bbox[3]]);

          return {
            success: true,
            message: `Bounding box: ${(width / 1000).toFixed(2)} km × ${(height / 1000).toFixed(2)} km`,
            resultLayer: polygon,
          };
        }

        case 'move-shape': {
          const distanceNm = 5;
          const directionDeg = 45;
          const moved = moveShapeFeatures(selectedFeatures, distanceNm, directionDeg);
          if (moved.length === 0) {
            return { success: false, message: 'No annotation shapes found in selection' };
          }
          const names = moved
            .map((f) => (f.properties as Record<string, unknown> | null)?.label ?? f.id ?? 'shape')
            .join(', ');
          return {
            success: true,
            message: `Moved ${moved.length} shape(s) by ${distanceNm} nm at ${directionDeg}°: ${names}`,
            resultLayer: moved[0],
            parameters: {
              distance_nm: { value: distanceNm, default: false, tunable: true },
              direction_deg: { value: directionDeg, default: false, tunable: true },
            },
          };
        }

        default:
          return { success: false, message: `Tool not implemented: ${toolId}` };
      }
    },
  };
}

/** Singleton instance */
export const calcService = createMockCalcService();
