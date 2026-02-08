/**
 * Mock calc service for web-shell.
 * Implements track-length and bounding-box tools using JavaScript calculations,
 * plus styling tools from the real toolService (set-track-color, apply-symbol-style,
 * label-interval, symbol-interval).
 */

import type { Feature, LineString, Position, Polygon } from 'geojson';
import type { ToolsPanelItem } from '@debrief/components';
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
}

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

  return { applicable: true };
}

/**
 * Mock calc service interface.
 */
export interface MockCalcService {
  /** Get tools with applicability based on selection */
  getTools(selectedFeatures: Feature[]): ToolsPanelItem[];

  /** Run a tool on selected features */
  runTool(toolId: string, selectedFeatures: Feature[]): ToolResult;
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

/**
 * Check if any selected features are tracks (by kind property).
 */
function hasTrackFeatures(features: Feature[]): boolean {
  return features.some(f =>
    (f.properties as Record<string, unknown> | null)?.kind === 'TRACK'
  );
}

/** IDs of styling tools from toolService */
const stylingToolIds = new Set(listTools().map(t => t.name));

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

      // Styling tools from toolService
      const hasTracks = hasTrackFeatures(selectedFeatures);
      const stylingTools: ToolsPanelItem[] = listTools().map(def => ({
        id: def.name,
        name: formatToolName(def.name),
        description: def.description,
        applicable: hasTracks,
        explanation: hasTracks ? undefined : 'Requires at least 1 track selected',
      }));

      return [...builtinTools, ...stylingTools];
    },

    runTool(toolId: string, selectedFeatures: Feature[]): ToolResult {
      // Delegate styling tools to toolService
      if (stylingToolIds.has(toolId)) {
        try {
          // Provide sensible default params for tools that require them
          const defaultParams: Record<string, Record<string, unknown>> = {
            'set-track-color': { color: '#ff0000' },
            'apply-symbol-style': { symbol: 'circle' },
          };
          const params = defaultParams[toolId] ?? {};
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const response = executeTool(toolId, selectedFeatures as any, params);
          const item = response.content[0];
          const label = item?.annotations?.['debrief:label'] ?? `${toolId} applied`;
          return { success: true, message: String(label) };
        } catch (err) {
          return { success: false, message: String(err) };
        }
      }

      // Built-in tools
      const tool = TOOLS.find(t => t.id === toolId);
      if (!tool) {
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

        default:
          return { success: false, message: `Tool not implemented: ${toolId}` };
      }
    },
  };
}

/** Singleton instance */
export const calcService = createMockCalcService();
