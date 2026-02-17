/**
 * Web-shell tool service (T043).
 *
 * Provides access to TypeScript-implemented analysis tools for the web-shell.
 * All tools run entirely in the browser (no Python backend required).
 *
 * ## ADDING A NEW TOOL
 *
 * When you create a new TypeScript tool, you MUST register it here for it to
 * appear in the web-shell. The web-shell has no MCP server — it bundles tool
 * implementations directly. Steps:
 *
 * 1. Import `toolDefinition` and `execute` from the tool module
 * 2. Add a `[toolDefinition.name, { definition, execute }]` entry to `toolRegistry`
 * 3. If the tool's GeoJSONFeature type differs, cast execute with `as any`
 *
 * See also: `shared/tools/TEMPLATE.md` § Registration for the full checklist.
 *
 * ## Layers Toolbar Integration (T044)
 *
 * The Layers Toolbar component (from @debrief/components) can consume this service
 * by calling `listTools()` to populate the tool list and `executeTool()` to run
 * a selected tool. The integration pattern is:
 *
 * ```typescript
 * import { listTools, executeTool } from '../services/toolService';
 *
 * // In the Layers Toolbar component:
 * const tools = listTools();
 * // Map MCPToolDefinition[] to ToolsPanelItem[] for the component
 * const panelItems = tools.map(t => ({
 *   id: t.name,
 *   name: t.description,
 *   description: t.description,
 *   applicable: checkToolApplicability(t, currentSelection),
 * }));
 *
 * // On tool execution:
 * const response = executeTool(toolId, selectedFeatures, params);
 * // Process response.content to update map layers
 * ```
 *
 * The Layers Toolbar already exists in shared/components. To wire it up,
 * the web-shell App component would:
 * 1. Import `listTools` and `executeTool` from this module
 * 2. Pass `listTools()` results to the Layers Toolbar as its tool inventory
 * 3. On tool invocation, call `executeTool()` and render the resulting
 *    GeoJSON features onto the map as a new layer
 * 4. Use the response annotations (debrief:resultType, debrief:label) to
 *    label and style the result layer appropriately
 */

import type {
  MCPToolDefinition,
  MCPToolResponse,
  MCPContentItem,
  DebriefAnnotations,
} from '../../../vscode/src/types/tool';

import {
  toolDefinition as setTrackColorDef,
  execute as executeSetTrackColor,
} from '../../../vscode/src/tools/track/styling/setTrackColor';

import {
  toolDefinition as applySymbolStyleDef,
  execute as executeApplySymbolStyle,
} from '../../../vscode/src/tools/track/styling/applySymbolStyle';

import {
  toolDefinition as labelIntervalDef,
  execute as executeLabelInterval,
} from '../../../vscode/src/tools/track/styling/labelInterval';

import {
  toolDefinition as symbolIntervalDef,
  execute as executeSymbolInterval,
} from '../../../vscode/src/tools/track/styling/symbolInterval';

import {
  toolDefinition as moveShapeDef,
  execute as executeMoveShape,
} from '../tools/shape/manipulation/moveShape';

import {
  toolDefinition as generateReferencePointsDef,
  execute as executeGenerateReferencePoints,
} from '../../../vscode/src/tools/reference/generation/generateReferencePoints';

import {
  toolDefinition as generateCoursesSpeedsDef,
  execute as executeGenerateCourseSpeeds,
} from '../../../vscode/src/tools/track/manipulation/generateCoursesSpeeds';

import {
  toolDefinition as bufferZoneGeneratorDef,
  execute as executeBufferZoneGenerator,
} from '../tools/sensor/detection/bufferZoneGenerator';

import {
  toolDefinition as trackStatsDef,
  execute as executeTrackStats,
} from '../tools/track/analysis/trackStats';

import {
  toolDefinition as rangeBearingDef,
  execute as executeRangeBearing,
} from '../tools/track/analysis/rangeBearing';

import {
  toolDefinition as areaSummaryDef,
  execute as executeAreaSummary,
} from '../tools/region/analysis/areaSummary';

import {
  toolDefinition as pointInZoneClassifierDef,
  execute as executePointInZoneClassifier,
} from '../../../vscode/src/tools/reference/classification/pointInZoneClassifier';

// Re-export types for consumers
export type { MCPToolDefinition, MCPToolResponse, MCPContentItem, DebriefAnnotations };

/**
 * GeoJSON Feature interface for tool execute functions.
 */
interface GeoJSONFeature {
  type: 'Feature';
  id?: string;
  geometry: { type: string; coordinates: unknown };
  properties: Record<string, unknown>;
}

/**
 * Internal registry entry mapping a tool definition to its execute function.
 * The params type uses `any` because each tool has its own specific parameter
 * interface; validation occurs inside the tool implementation.
 */
interface ToolRegistryEntry {
  definition: MCPToolDefinition;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  execute: (features: GeoJSONFeature[], params: any) => GeoJSONFeature[];
}

/**
 * Registry of TypeScript-implemented tools available in the web-shell.
 * Each entry maps a tool ID (name) to its definition and execute function.
 */
const toolRegistry: Map<string, ToolRegistryEntry> = new Map([
  [
    setTrackColorDef.name,
    {
      definition: setTrackColorDef,
      execute: executeSetTrackColor,
    },
  ],
  [
    applySymbolStyleDef.name,
    {
      definition: applySymbolStyleDef,
      execute: executeApplySymbolStyle,
    },
  ],
  [
    labelIntervalDef.name,
    {
      definition: labelIntervalDef,
      execute: executeLabelInterval,
    },
  ],
  [
    symbolIntervalDef.name,
    {
      definition: symbolIntervalDef,
      execute: executeSymbolInterval,
    },
  ],
  [
    moveShapeDef.name,
    {
      definition: moveShapeDef,
      execute: executeMoveShape,
    },
  ],
  [
    generateReferencePointsDef.name,
    {
      definition: generateReferencePointsDef,
      execute: executeGenerateReferencePoints,
    },
  ],
  [
    generateCoursesSpeedsDef.name,
    {
      definition: generateCoursesSpeedsDef,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      execute: executeGenerateCourseSpeeds as any,
    },
  ],
  [
    bufferZoneGeneratorDef.name,
    {
      definition: bufferZoneGeneratorDef,
      execute: executeBufferZoneGenerator,
    },
  ],
  [
    trackStatsDef.name,
    {
      definition: trackStatsDef,
      execute: executeTrackStats,
    },
  ],
  [
    rangeBearingDef.name,
    {
      definition: rangeBearingDef,
      execute: executeRangeBearing,
    },
  ],
  [
    areaSummaryDef.name,
    {
      definition: areaSummaryDef,
      execute: executeAreaSummary,
    },
  ],
  [
    pointInZoneClassifierDef.name,
    {
      definition: pointInZoneClassifierDef,
      execute: executePointInZoneClassifier,
    },
  ],
]);

/**
 * Returns all TypeScript-implemented tool definitions available in the web-shell.
 */
export function listTools(): MCPToolDefinition[] {
  return Array.from(toolRegistry.values()).map((entry) => entry.definition);
}

/**
 * Execute a tool by ID with the given features and parameters.
 *
 * @param toolId - The tool identifier (e.g., 'set-track-color')
 * @param features - GeoJSON features to pass to the tool
 * @param params - Tool-specific parameters
 * @returns MCPToolResponse envelope matching the MCP structure used by the Python backend
 * @throws Error if the tool ID is not found in the registry
 */
export function executeTool(
  toolId: string,
  features: GeoJSONFeature[],
  params: Record<string, unknown>,
): MCPToolResponse {
  const entry = toolRegistry.get(toolId);
  if (!entry) {
    throw new Error(`Unknown tool: ${toolId}. Available tools: ${Array.from(toolRegistry.keys()).join(', ')}`);
  }

  const startTime = performance.now();
  const modifiedFeatures = entry.execute(features, params);
  const durationMs = Math.round(performance.now() - startTime);

  // Extract source feature IDs for provenance
  const sourceFeatureIds = features
    .map((f) => (f.id as string) ?? (f.properties?.id as string) ?? '')
    .filter(Boolean);

  // Build the FeatureCollection for the resource content
  const featureCollection = {
    type: 'FeatureCollection' as const,
    features: modifiedFeatures,
  };

  const annotations: DebriefAnnotations = {
    'debrief:resultType': entry.definition.annotations['debrief:outputKind'],
    'debrief:sourceFeatures': sourceFeatureIds,
    'debrief:label': `${entry.definition.description} result`,
  };

  const contentItem: MCPContentItem = {
    type: 'resource',
    resource: {
      uri: `debrief://tool-result/${toolId}/${Date.now()}`,
      mimeType: 'application/geo+json',
      text: JSON.stringify(featureCollection),
    },
    annotations,
  };

  return {
    content: [contentItem],
    duration_ms: durationMs,
  };
}
