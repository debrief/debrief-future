/**
 * Log entry construction from ToolResult data.
 * Feature: 071-log-recording-service
 *
 * Pure functions — no side effects, no I/O.
 */

import type {
  LogEntry,
  InputFeatureState,
  ParameterValue,
  WasGeneratedBy,
  ToolResultForLog,
  ExpandedToolResultFields,
} from './types.js';

/**
 * Convert milliseconds to ISO 8601 duration string.
 * Examples: 300 -> "PT0.3S", 1500 -> "PT1.5S", 0 -> "PT0S"
 */
export function msToIsoDuration(ms: number): string {
  const seconds = ms / 1000;
  // Use fixed precision to avoid floating point artifacts
  const rounded = Math.round(seconds * 1000) / 1000;
  if (rounded === Math.floor(rounded)) {
    return `PT${rounded}S`;
  }
  return `PT${rounded}S`;
}

/**
 * Generate a UUID v4 string for activityId.
 * Uses crypto.randomUUID() when available, falls back to manual generation.
 */
export function generateActivityId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Extract the activityId from output features' existing provenance
 * (set by Python executor). Returns undefined if not found.
 */
export function extractActivityIdFromOutputFeatures(
  features: Array<Record<string, unknown>>
): string | undefined {
  for (const feature of features) {
    const props = feature.properties as Record<string, unknown> | null;
    if (!props) continue;
    const prov = props.provenance;
    if (Array.isArray(prov) && prov.length > 0) {
      const last = prov[prov.length - 1] as Record<string, unknown>;
      if (typeof last.activityId === 'string') {
        return last.activityId;
      }
    }
  }
  return undefined;
}

/** Fields extracted from Python-generated provenance on output features. */
export interface PythonProvenanceFallback {
  parameters?: Record<string, ParameterValue>;
  toolVersion?: string;
}

/**
 * Extract parameters and toolVersion from Python-generated provenance on
 * output features. The Python executor attaches provenance entries with full
 * ParameterValue objects ({value, default, tunable}) and toolVersion. When
 * expanded fields are not available (e.g. MCP response lacks annotations),
 * this provides a fallback.
 */
export function extractFromOutputFeatures(
  features: Array<Record<string, unknown>>,
  activityId: string | undefined
): PythonProvenanceFallback {
  for (const feature of features) {
    const props = feature.properties as Record<string, unknown> | null;
    if (!props) continue;
    const prov = props.provenance;
    if (!Array.isArray(prov)) continue;
    for (const entry of prov) {
      const e = entry as Record<string, unknown>;
      if (activityId && e.activityId !== activityId) continue;
      const wgb = e.wasGeneratedBy as Record<string, unknown> | undefined;
      if (!wgb) continue;

      const result: PythonProvenanceFallback = {};

      // Extract toolVersion
      if (typeof wgb.toolVersion === 'string' && wgb.toolVersion !== '0.0.0') {
        result.toolVersion = wgb.toolVersion;
      }

      // Extract parameters (verify ParameterValue shape)
      if (wgb.parameters) {
        const params = wgb.parameters as Record<string, unknown>;
        const keys = Object.keys(params);
        if (keys.length > 0) {
          const first = params[keys[0]!] as Record<string, unknown> | undefined;
          if (first && typeof first === 'object' && 'value' in first) {
            result.parameters = params as unknown as Record<string, ParameterValue>;
          }
        }
      }

      if (result.toolVersion ?? result.parameters) {
        return result;
      }
    }
  }
  return {};
}

/**
 * Extract parameters from Python-generated provenance on output features.
 * @deprecated Use extractFromOutputFeatures instead.
 */
export function extractParametersFromOutputFeatures(
  features: Array<Record<string, unknown>>,
  activityId: string | undefined
): Record<string, ParameterValue> | undefined {
  return extractFromOutputFeatures(features, activityId).parameters;
}

/**
 * Build a WasGeneratedBy from available data.
 */
function buildWasGeneratedBy(
  toolId: string,
  expanded: ExpandedToolResultFields | undefined,
  fallback?: PythonProvenanceFallback
): WasGeneratedBy {
  return {
    tool: toolId,
    toolVersion: expanded?.toolVersion ?? fallback?.toolVersion ?? '0.0.0',
    parameters: expanded?.parameters ?? fallback?.parameters ?? {},
  };
}

/**
 * Determine the list of input feature IDs ("used") from available data.
 */
function resolveUsedFeatureIds(
  toolResult: ToolResultForLog,
  expanded: ExpandedToolResultFields | undefined
): string[] {
  // Prefer sourceFeatureIds from MCP annotations
  if (toolResult.sourceFeatureIds && toolResult.sourceFeatureIds.length > 0) {
    return [...toolResult.sourceFeatureIds];
  }
  // Fall back to modifiedFeatures from expanded contract
  if (expanded?.modifiedFeatures && expanded.modifiedFeatures.length > 0) {
    return expanded.modifiedFeatures.map((mf) => mf.featureId);
  }
  return [];
}

/**
 * Determine the list of generated outputs from available data.
 */
function resolveGeneratedOutputs(
  toolResult: ToolResultForLog,
  expanded: ExpandedToolResultFields | undefined
): string[] {
  const generated: string[] = [];

  // Add created feature IDs
  if (expanded?.createdFeatures) {
    generated.push(...expanded.createdFeatures);
  } else if (toolResult.features?.features) {
    // Fall back to extracting IDs from output features
    for (const f of toolResult.features.features) {
      const feat = f as Record<string, unknown>;
      if (typeof feat.id === 'string') {
        generated.push(feat.id);
      }
    }
  }

  // Add created asset paths
  if (expanded?.createdAssets) {
    for (const asset of expanded.createdAssets) {
      generated.push(asset.path);
    }
  } else if (toolResult.artifactHref) {
    generated.push(toolResult.artifactHref);
  }

  return generated;
}

/**
 * Build a LogEntry from a ToolResult and optional expanded fields.
 *
 * @param toolResult - The core tool execution result
 * @param expanded - Optional expanded fields from Phase 0
 * @param activityId - If provided, use this activityId (for consistency with Python-generated entries)
 * @returns A PROV-aligned LogEntry
 */
export function buildLogEntry(
  toolResult: ToolResultForLog,
  expanded: ExpandedToolResultFields | undefined,
  activityId?: string,
  inputState?: InputFeatureState[]
): LogEntry {
  const resolvedActivityId = activityId ?? generateActivityId();
  const toolId = toolResult.toolId ?? 'unknown-tool';

  // When expanded fields are missing, try to extract from Python provenance
  // on the output features. The Python executor always attaches full
  // ParameterValue objects ({value, default, tunable}) and toolVersion.
  let fallback: PythonProvenanceFallback | undefined;
  if ((!expanded?.parameters || !expanded?.toolVersion) && toolResult.features?.features) {
    fallback = extractFromOutputFeatures(
      toolResult.features.features as Array<Record<string, unknown>>,
      resolvedActivityId
    );
  }

  return {
    activityId: resolvedActivityId,
    timestamp: new Date().toISOString(),
    wasGeneratedBy: buildWasGeneratedBy(toolId, expanded, fallback),
    used: resolveUsedFeatureIds(toolResult, expanded),
    generated: resolveGeneratedOutputs(toolResult, expanded),
    executionDuration: msToIsoDuration(toolResult.durationMs),
    generatedResultId: expanded?.createdAssets?.[0]?.resultId ?? null,
    tune: null,
    inputState: inputState ?? toolResult.inputState ?? null,
  };
}
