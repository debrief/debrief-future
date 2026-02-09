/**
 * Log entry construction from ToolResult data.
 * Feature: 071-log-recording-service
 *
 * Pure functions — no side effects, no I/O.
 */

import type {
  LogEntry,
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

/**
 * Build a WasGeneratedBy from available data.
 */
function buildWasGeneratedBy(
  toolId: string,
  expanded: ExpandedToolResultFields | undefined
): WasGeneratedBy {
  return {
    tool: toolId,
    toolVersion: expanded?.toolVersion ?? '0.0.0',
    parameters: expanded?.parameters ?? {},
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
  activityId?: string
): LogEntry {
  const resolvedActivityId = activityId ?? generateActivityId();
  const toolId = toolResult.toolId ?? 'unknown-tool';

  return {
    activityId: resolvedActivityId,
    timestamp: new Date().toISOString(),
    wasGeneratedBy: buildWasGeneratedBy(toolId, expanded),
    used: resolveUsedFeatureIds(toolResult, expanded),
    generated: resolveGeneratedOutputs(toolResult, expanded),
    executionDuration: msToIsoDuration(toolResult.durationMs),
    generatedResultId: expanded?.createdAssets?.[0]?.resultId ?? null,
    tune: null, // Always null in Phase 1
  };
}
