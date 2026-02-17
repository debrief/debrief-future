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
 * 3. If the tool's GeoJSONFeature type differs, cast execute with `as unknown as ToolExecuteFn`
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
 * Tool execute function type. Params are typed as Record<string, unknown>
 * because each tool has its own specific parameter interface; validation
 * occurs inside the tool implementation.
 */
type ToolExecuteFn = (features: GeoJSONFeature[], params: Record<string, unknown>) => GeoJSONFeature[];

/**
 * Internal registry entry mapping a tool definition to its execute function.
 */
interface ToolRegistryEntry {
  definition: MCPToolDefinition;
  execute: ToolExecuteFn;
}

/**
 * Cast a typed execute function to ToolExecuteFn.
 * Each tool validates its own params internally, so casting to the generic
 * signature is safe — the registry passes through params without inspection.
 */
function asToolFn(fn: (features: GeoJSONFeature[], params: Record<string, unknown>) => GeoJSONFeature[]): ToolExecuteFn;
function asToolFn<P>(fn: (features: GeoJSONFeature[], params: P) => GeoJSONFeature[]): ToolExecuteFn {
  return fn as unknown as ToolExecuteFn;
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
      execute: asToolFn(executeSetTrackColor),
    },
  ],
  [
    applySymbolStyleDef.name,
    {
      definition: applySymbolStyleDef,
      execute: asToolFn(executeApplySymbolStyle),
    },
  ],
  [
    labelIntervalDef.name,
    {
      definition: labelIntervalDef,
      execute: asToolFn(executeLabelInterval),
    },
  ],
  [
    symbolIntervalDef.name,
    {
      definition: symbolIntervalDef,
      execute: asToolFn(executeSymbolInterval),
    },
  ],
  [
    moveShapeDef.name,
    {
      definition: moveShapeDef,
      execute: asToolFn(executeMoveShape),
    },
  ],
  [
    generateReferencePointsDef.name,
    {
      definition: generateReferencePointsDef,
      execute: asToolFn(executeGenerateReferencePoints),
    },
  ],
  [
    generateCoursesSpeedsDef.name,
    {
      definition: generateCoursesSpeedsDef,
      // generate-courses-speeds ignores params; wrapper drops the second argument
      execute: (features: GeoJSONFeature[], _params: Record<string, unknown>) => executeGenerateCourseSpeeds(features),
    },
  ],
  [
    bufferZoneGeneratorDef.name,
    {
      definition: bufferZoneGeneratorDef,
      execute: asToolFn(executeBufferZoneGenerator),
    },
  ],
  [
    trackStatsDef.name,
    {
      definition: trackStatsDef,
      execute: asToolFn(executeTrackStats),
    },
  ],
  [
    rangeBearingDef.name,
    {
      definition: rangeBearingDef,
      execute: asToolFn(executeRangeBearing),
    },
  ],
  [
    areaSummaryDef.name,
    {
      definition: areaSummaryDef,
      execute: asToolFn(executeAreaSummary),
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
