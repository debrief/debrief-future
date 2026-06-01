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
  RecordStoryboardEditInput,
  RecordVisibilityChangeInput,
} from './types.js';
import {
  STORYBOARD_EDIT_TOOL_SENTINEL,
  VISIBILITY_CHANGE_TOOL_SENTINEL,
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
      if (typeof last.activity_id === 'string') {
        return last.activity_id;
      }
    }
  }
  return undefined;
}

/** Fields extracted from Python-generated provenance on output features. */
export interface PythonProvenanceFallback {
  parameters?: Record<string, ParameterValue>;
  tool_version?: string;
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
      if (activityId && e.activity_id !== activityId) continue;
      const wgb = e.was_generated_by as Record<string, unknown> | undefined;
      if (!wgb) continue;

      const result: PythonProvenanceFallback = {};

      // Extract toolVersion
      if (typeof wgb.tool_version === 'string' && wgb.tool_version !== '0.0.0') {
        result.tool_version = wgb.tool_version;
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

      if (result.tool_version ?? result.parameters) {
        return result;
      }
    }
  }
  return {};
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
    tool_version: expanded?.tool_version ?? fallback?.tool_version ?? '0.0.0',
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
  if (toolResult.source_feature_ids && toolResult.source_feature_ids.length > 0) {
    return [...toolResult.source_feature_ids];
  }
  // Fall back to modifiedFeatures from expanded contract
  if (expanded?.modified_features && expanded.modified_features.length > 0) {
    return expanded.modified_features.map((mf) => mf.feature_id);
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
  if (expanded?.created_features) {
    generated.push(...expanded.created_features);
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
  if (expanded?.created_assets) {
    for (const asset of expanded.created_assets) {
      generated.push(asset.path);
    }
  } else if (toolResult.artifact_href) {
    generated.push(toolResult.artifact_href);
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
  const toolId = toolResult.tool_id ?? 'unknown-tool';

  // When expanded fields are missing, try to extract from Python provenance
  // on the output features. The Python executor always attaches full
  // ParameterValue objects ({value, default, tunable}) and toolVersion.
  let fallback: PythonProvenanceFallback | undefined;
  if ((!expanded?.parameters || !expanded?.tool_version) && toolResult.features?.features) {
    fallback = extractFromOutputFeatures(
      toolResult.features.features as Array<Record<string, unknown>>,
      resolvedActivityId
    );
  }

  return {
    activity_id: resolvedActivityId,
    timestamp: new Date().toISOString(),
    was_generated_by: buildWasGeneratedBy(toolId, expanded, fallback),
    used: resolveUsedFeatureIds(toolResult, expanded),
    generated: resolveGeneratedOutputs(toolResult, expanded),
    execution_duration: msToIsoDuration(toolResult.duration_ms),
    generated_result_id: expanded?.created_assets?.[0]?.result_id ?? null,
    tune: null,
    input_state: inputState ?? toolResult.input_state ?? null,
  };
}

/**
 * Build a LogEntry for a Storyboard edit operation (Feature 218).
 *
 * Pure — no I/O. The op, sceneId, storyboardId, thumbnailAssetRef,
 * underlyingActivityId, and pairActivityId are carried as
 * `was_generated_by.parameters` entries so #176's card renderer (and
 * the existing `getTimeline` machinery) can read them without a
 * schema change.
 *
 * The `rationale` field carries the one-line summary so the
 * LogPanel's Compact view can render it directly.
 */
export function buildStoryboardEditLogEntry(
  input: RecordStoryboardEditInput,
): LogEntry {
  const param = (value: unknown): ParameterValue => ({
    value,
    default: false,
    tunable: false,
  });
  const parameters: Record<string, ParameterValue> = {
    op: param(input.op),
    actor: param(input.actor),
    storyboardId: param(input.storyboardId),
    sceneId: param(input.sceneId),
    thumbnailAssetRef: param(input.thumbnailAssetRef),
    underlyingActivityId: param(input.underlyingActivityId),
    pairActivityId: param(input.pairActivityId),
  };
  const used: string[] = [input.storyboardId];
  if (input.sceneId !== null) {
    used.push(input.sceneId);
  }
  const generated: string[] = [input.sceneId ?? input.storyboardId];
  const wasGeneratedBy: WasGeneratedBy = {
    tool: STORYBOARD_EDIT_TOOL_SENTINEL,
    tool_version: '1',
    parameters,
  };
  return {
    activity_id: generateActivityId(),
    timestamp: input.timestamp,
    was_generated_by: wasGeneratedBy,
    used,
    generated,
    execution_duration: 'PT0S',
    generated_result_id: null,
    tune: null,
    rationale: input.summary,
  };
}

/**
 * Build a LogEntry for a per-feature visibility change (feature 261, FR-013).
 *
 * Pure — no I/O. The entry attaches to the affected feature's own
 * `properties.provenance[]` and is bounded to saved states (FR-021): it is
 * produced when the `visible` flag is written into the FeatureCollection, not on
 * every transient in-memory toggle. The `was_generated_by.tool` sentinel marks
 * it as a visibility transition distinct from tool / file-save / storyboard-edit
 * records; `rationale` carries the human-readable summary for the LogPanel.
 *
 * No `activity_type` is set — the `ActivityType` enum (`snapshot`/`tool`/`tune`)
 * has no visibility member, and consumers treat an absent value as `tool`; the
 * sentinel tool name is the discriminator, so no schema change is required.
 */
export function buildVisibilityChangeLogEntry(
  input: RecordVisibilityChangeInput,
): LogEntry {
  const param = (value: unknown): ParameterValue => ({
    value,
    default: false,
    tunable: false,
  });
  const wasGeneratedBy: WasGeneratedBy = {
    tool: VISIBILITY_CHANGE_TOOL_SENTINEL,
    tool_version: '1',
    parameters: {
      actor: param(input.actor),
      visible: param(input.visible),
    },
  };
  return {
    activity_id: generateActivityId(),
    timestamp: input.timestamp,
    was_generated_by: wasGeneratedBy,
    used: [input.feature_id],
    generated: [input.feature_id],
    execution_duration: 'PT0S',
    generated_result_id: null,
    tune: null,
    rationale: input.visible ? 'Feature shown' : 'Feature hidden',
  };
}
