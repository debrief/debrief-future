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
 * 3. If the tool's feature type differs, cast execute with `as unknown as ToolExecuteFn`
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
} from '@debrief/utils';

import type { IngressFeature, LogEntry } from '@debrief/schemas';

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


// ---------------------------------------------------------------------------
// Provenance helpers — mirrors Python's debrief_calc/provenance.py (#102)
// ---------------------------------------------------------------------------

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function durationMsToIso8601(durationMs: number): string {
  const seconds = durationMs / 1000;
  if (seconds === Math.floor(seconds)) return `PT${seconds}S`;
  const formatted = seconds.toFixed(6).replace(/0+$/, '').replace(/\.$/, '');
  return `PT${formatted}S`;
}

// LogEntry uses snake_case field names and stores parameters as ParameterValue[].
function createLogEntry(
  toolName: string,
  toolVersion: string,
  sourceFeatureIds: string[],
  params: Record<string, unknown>,
  durationMs: number,
): LogEntry {
  // T024: schema WasGeneratedBy.parameters is ParameterValue[] (array), not Record.
  // Serialize parameter values to strings to match wire format.
  const typedParams = Object.entries(params).map(([, val]) => ({
    value: typeof val === 'string' ? val : JSON.stringify(val),
  }));

  return {
    activity_id: generateUUID(),
    timestamp: new Date().toISOString(),
    was_generated_by: {
      tool: toolName,
      tool_version: toolVersion,
      parameters: typedParams,
    },
    used: sourceFeatureIds,
    generated: [],
    execution_duration: durationMsToIso8601(durationMs),
    generated_result_id: undefined,
    tune: undefined,
  };
}

function attachLogEntry(feature: IngressFeature, logEntry: LogEntry): void {
  if (!feature.properties) feature.properties = {};
  const existing = feature.properties.provenance;
  if (existing === undefined || existing === null) {
    feature.properties.provenance = [logEntry];
  } else if (Array.isArray(existing)) {
    existing.push(logEntry);
  } else {
    // Legacy single-object format — wrap then append
    feature.properties.provenance = [existing, logEntry];
  }
}

// ---------------------------------------------------------------------------
// Output validation — mirrors Python's debrief_calc/validation.py (#106)
// ---------------------------------------------------------------------------

interface ValidationError {
  featureIndex: number;
  error: string;
}

function validateToolOutput(
  features: IngressFeature[],
  _expectedKind: string,
  toolName: string,
  _skipKindCheck = false,
): void {
  const errors: ValidationError[] = [];

  for (let i = 0; i < features.length; i++) {
    const feature = features[i];

    // Validate GeoJSON structure
    if (!feature || typeof feature !== 'object') {
      errors.push({ featureIndex: i, error: 'Feature must be an object' });
      continue;
    }
    if (feature.type !== 'Feature') {
      errors.push({ featureIndex: i, error: "Feature.type must be 'Feature'" });
    }
    if (!feature.properties || typeof feature.properties !== 'object') {
      errors.push({ featureIndex: i, error: 'Feature.properties is required' });
      continue;
    }

    // Check kind attribute — must be present; may differ from expectedKind
    // when the tool sets a domain-specific kind (e.g. "ZONE", "POINT")
    const kind = feature.properties.kind;
    if (kind === undefined || kind === null) {
      errors.push({ featureIndex: i, error: 'Feature.properties.kind is required' });
    }

    // Check provenance (PROV-aligned array format)
    const provenance = feature.properties.provenance;
    if (provenance === undefined || provenance === null) {
      errors.push({ featureIndex: i, error: 'Feature.properties.provenance is required' });
    } else if (!Array.isArray(provenance)) {
      errors.push({ featureIndex: i, error: 'Feature.properties.provenance must be an array' });
    } else if (provenance.length === 0) {
      errors.push({ featureIndex: i, error: 'Feature.properties.provenance must not be empty' });
    } else {
      // T024: schema LogEntry uses snake_case field names
      const latest = provenance[provenance.length - 1] as { activity_id?: unknown; timestamp?: unknown; was_generated_by?: { tool?: unknown; tool_version?: unknown } };
      if (!latest || typeof latest !== 'object') {
        errors.push({ featureIndex: i, error: 'provenance entry must be an object' });
      } else {
        if (!latest.activity_id) errors.push({ featureIndex: i, error: 'provenance entry activity_id is required' });
        if (!latest.timestamp) errors.push({ featureIndex: i, error: 'provenance entry timestamp is required' });
        const wgb = latest.was_generated_by;
        if (!wgb) {
          errors.push({ featureIndex: i, error: 'provenance entry was_generated_by is required' });
        } else {
          if (!wgb.tool) errors.push({ featureIndex: i, error: 'was_generated_by.tool is required' });
          if (!wgb.tool_version) errors.push({ featureIndex: i, error: 'was_generated_by.tool_version is required' });
        }
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `Tool '${toolName}' produced invalid output:\n` +
      errors.map(e => `  features[${e.featureIndex}]: ${e.error}`).join('\n')
    );
  }
}

// ---------------------------------------------------------------------------
// Result type helpers — per TOOL-RESULTS.md (#112)
// ---------------------------------------------------------------------------

/**
 * Determine the top-level result category for a tool based on its output kind.
 * Styling/mutation tools produce "mutation", dataset tools produce "artifact",
 * and most analysis tools produce "addition".
 */
/** Tool IDs that modify existing features in-place rather than creating new ones. */
const MUTATION_TOOL_IDS = new Set([
  'set-track-color', 'apply-symbol-style', 'label-interval',
  'symbol-interval', 'move-shape',
]);

/**
 * Returns true if the given tool modifies features in-place (mutation)
 * rather than creating new result layers (addition).
 */
export function isMutationTool(toolId: string): boolean {
  return MUTATION_TOOL_IDS.has(toolId);
}

/** Valid top-level result type prefixes per TOOL-RESULTS.md. */
const RESULT_TYPE_PREFIXES = ['mutation/', 'addition/', 'deletion/', 'artifact/'];

function determineResultCategory(toolId: string, outputKind: string): string {
  if (MUTATION_TOOL_IDS.has(toolId)) return 'mutation';

  // Dataset tools that produce non-GeoJSON artifacts
  if (outputKind.startsWith('dataset/')) return 'artifact';

  // Default: new feature creation
  return 'addition';
}

/**
 * Build the full `debrief:resultType` path. If the outputKind already
 * starts with a valid top-level category prefix (e.g. "mutation/track/styled"),
 * use it directly to avoid doubling the prefix.
 */
function buildResultType(resultCategory: string, outputKind: string): string {
  if (RESULT_TYPE_PREFIXES.some(p => outputKind.startsWith(p))) {
    return outputKind;
  }
  return `${resultCategory}/${outputKind}`;
}

/**
 * Tool execute function type. Params are typed as Record<string, unknown>
 * because each tool has its own specific parameter interface; validation
 * occurs inside the tool implementation.
 */
type ToolExecuteFn = (features: IngressFeature[], params: Record<string, unknown>) => IngressFeature[];

/**
 * Internal registry entry mapping a tool definition to its execute function.
 */
interface ToolRegistryEntry {
  definition: MCPToolDefinition;
  execute: ToolExecuteFn;
}

/**
 * Cast a typed execute function to ToolExecuteFn.
 * Each tool validates its own params internally, so widening the params type
 * to Record<string, unknown> is safe — the registry passes through params
 * without inspection, and each tool's implementation validates what it needs.
 * The feature array type varies per tool (TrackFeature[], DebriefFeature[], etc.)
 * so the cast bridges any structural differences.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function asToolFn(fn: (features: any[], params: any) => any[]): ToolExecuteFn {
  const wrapped: ToolExecuteFn = (features, params) => fn(features, params);
  return wrapped;
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
      // generate-courses-speeds ignores params; the wrapper drops the second
      // argument, and the cast bridges the structural difference between this
      // module's IngressFeature (permissive geometry union) and the tool's
      // internal feature shape (coordinates: number[][]).
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      execute: asToolFn((features: any[]) => executeGenerateCourseSpeeds(features)),
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
 * Mirrors the Python executor pipeline (debrief_calc/executor.py):
 * 1. Execute the tool handler
 * 2. Set output kind on each feature (#103)
 * 3. Create and attach W3C PROV LogEntry to each feature (#102)
 * 4. Validate output features (#106)
 * 5. Build MCP response with correct resultType prefix (#112)
 *
 * @param toolId - The tool identifier (e.g., 'set-track-color')
 * @param features - GeoJSON features to pass to the tool
 * @param params - Tool-specific parameters
 * @returns MCPToolResponse envelope matching the MCP structure used by the Python backend
 * @throws Error if the tool ID is not found in the registry
 */
export function executeTool(
  toolId: string,
  features: IngressFeature[],
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

  const outputKind = entry.definition.annotations['debrief:outputKind'];
  const toolVersion = entry.definition.annotations['debrief:version'];

  // Determine result category early — mutation tools preserve the original kind
  const resultCategory = determineResultCategory(toolId, outputKind);

  // Attach provenance only to GeoJSON Feature outputs (not artifact data)
  // Mirrors Python executor.py lines 88-96
  const isGeoJSON = modifiedFeatures.every(f => f.type === 'Feature');
  if (isGeoJSON) {
    // Create PROV-aligned LogEntry (#102)
    const logEntry = createLogEntry(
      toolId,
      toolVersion,
      sourceFeatureIds,
      params,
      durationMs,
    );

    for (const feature of modifiedFeatures) {
      if (!feature.properties) feature.properties = {};
      // Only set output kind for additive tools that create new features
      // AND only if the tool did not already assign a domain-specific kind
      // (e.g. buffer_zone_generator → "ZONE", reference_points → "POINT").
      // Mutation tools preserve the original kind (e.g. 'TRACK') so that
      // type guards like isTrackFeature() continue to work after mutation.
      if (resultCategory !== 'mutation' && !feature.properties.kind) {
        feature.properties.kind = outputKind;
      }

      // Attach W3C PROV LogEntry (#102) — mirrors Python attach_log_entry()
      attachLogEntry(feature, logEntry);
    }

    // Validate output features (#106) — mirrors Python validate_tool_output()
    // Mutation tools preserve original kind, so skip the kind equality check.
    validateToolOutput(modifiedFeatures, outputKind, toolId, resultCategory === 'mutation');
  }

  // Build the FeatureCollection for the resource content
  const featureCollection = {
    type: 'FeatureCollection' as const,
    features: modifiedFeatures,
  };

  const annotations: DebriefAnnotations = {
    'debrief:resultType': buildResultType(resultCategory, outputKind),
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
