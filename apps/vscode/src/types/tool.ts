/**
 * Tool-related type definitions for the Debrief VS Code Extension
 *
 * Imports base types from @debrief/schemas (the single source of truth,
 * generated from LinkML) and extends with VS Code extension-specific fields.
 * #105 — no hand-authored type shadows.
 */

import type {
  SelectionRequirement as SchemaSelectionRequirement,
  Tool as SchemaTool,
  ToolParameter as ToolParameterSchema,
} from '@debrief/schemas';

/**
 * Selection requirement — re-exported directly from schema (no extension needed).
 */
// eslint-disable-next-line no-restricted-syntax -- deliberate local alias of @debrief/schemas.SelectionRequirement (adapter layer); follow-up to migrate callers off this re-export, #214 scope-adjacent
export type SelectionRequirement = SchemaSelectionRequirement;

/**
 * A configurable parameter for a tool, extracted from MCP annotations.
 *
 * Schema-rooted on `ToolParameter` from `@debrief/schemas` (LinkML
 * `tool.yaml`) and narrowed with the VS Code camelCase view-layer field
 * names (`valueType`, `defaultValue`, `paramType`). The schema base
 * contributes `name`, `description`, `required`, and the new `choices`
 * slot (added under spec 222 P2 to collapse the drift cluster — audit
 * §3.2 rows 37 and 86). Per FR-004 (R4 import-based schema rooting) the
 * audit treats this file as schema-rooted.
 */
// eslint-disable-next-line no-restricted-syntax -- consumer-narrowing of @debrief/schemas.ToolParameter via Omit + intersection — schema-rooted per spec 222 §FR-004 (R4 import-based classification); replaces the pre-existing camelCase adapter (#214 scope-adjacent)
export type ToolParameter = Omit<ToolParameterSchema, 'type' | 'default_value' | 'param_type'> & {
  /** Value type (mapped from schema's "type" field) */
  valueType: 'string' | 'number' | 'boolean' | 'enum';
  /** Default value (mapped from schema's "default_value" field) */
  defaultValue?: unknown;
  /** Schema-defined parameter type name (from x-debrief-param-type) */
  paramType?: string;
};

/**
 * Tool definition — extends schema's Tool with VS Code-specific fields.
 * Base fields (id, name, description, version, requirements) come from schema.
 */
// eslint-disable-next-line no-restricted-syntax -- VS Code-local Tool extends @debrief/schemas.Tool with camelCase helpers; follow-up to consolidate with @debrief/components.Tool, #214 scope-adjacent
export interface Tool extends SchemaTool {
  /** Minimum total features across all kinds (for multi-kind tools) */
  minFeatures?: number;
  /** Configurable parameters (only those with paramType or choices) */
  parameters?: ToolParameter[];
}

/**
 * Selection map - feature kind to count.
 */
export type ToolSelection = Map<string, number>;

/**
 * Result of checking a tool against a selection.
 */
// eslint-disable-next-line no-restricted-syntax -- VS Code-local MatchResult uses the local `Tool` extension; follow-up to consolidate with @debrief/components.MatchResult, #214 scope-adjacent
export interface MatchResult {
  /** The tool being checked */
  tool: Tool;
  /** Whether the tool is active for the selection */
  isActive: boolean;
  /** Explanation of why the tool is active/inactive */
  explanation?: string;
}

/**
 * Create an empty selection.
 */
// eslint-disable-next-line no-restricted-syntax -- VS Code-local createSelection returns the local `ToolSelection` Map; distinct signature from @debrief/session-state.createSelection. Follow-up to rename or consolidate, #214 scope-adjacent
export function createSelection(): ToolSelection {
  return new Map();
}

/**
 * Create a selection from a record of kind → count.
 */
// eslint-disable-next-line no-restricted-syntax -- VS Code-local createSelectionFromCounts mirrors @debrief/components.createSelectionFromCounts; follow-up to consolidate, #214 scope-adjacent
export function createSelectionFromCounts(counts: Record<string, number>): ToolSelection {
  return new Map(Object.entries(counts));
}

/**
 * Check if ANY of a tool's requirements are satisfied by a selection (OR semantics).
 *
 * Each requirement entry is an alternative — selecting 1 POLY or 1 RECTANGLE
 * or 1 CIRCLE each independently satisfies a tool that lists all three.
 */
function checkRequirements(requirements: SelectionRequirement[], selection: ToolSelection): boolean {
  for (const req of requirements) {
    const count = selection.get(req.kind) ?? 0;
    const min = req.min ?? 1;

    if (count < min) {
      continue;
    }
    if (req.max !== undefined && count > req.max) {
      continue;
    }
    return true;
  }
  return false;
}

/**
 * Get the reason why a tool is inactive for a selection.
 */
// eslint-disable-next-line no-restricted-syntax -- VS Code-local getInactiveReason mirrors @debrief/components.getInactiveReason but uses the local `Tool`; follow-up to consolidate, #214 scope-adjacent
export function getInactiveReason(tool: Tool, selection: ToolSelection): string {
  if (!tool.requirements || tool.requirements.length === 0) {
    return '';
  }

  // OR semantics — show what kinds would satisfy the tool
  const accepted = tool.requirements.map((r) => r.kind);
  const selectedKinds = [...selection.entries()]
    .filter(([, count]) => count > 0)
    .map(([kind]) => kind);

  if (selectedKinds.length === 0) {
    return `Select ${accepted.join(' or ')}`;
  }

  return `Need ${accepted.join(' or ')}, have ${selectedKinds.join(', ')}`;
}

/**
 * Get all inactive reasons for a tool.
 */
// eslint-disable-next-line no-restricted-syntax -- VS Code-local getAllInactiveReasons mirrors @debrief/components.getAllInactiveReasons; follow-up to consolidate, #214 scope-adjacent
export function getAllInactiveReasons(tool: Tool, selection: ToolSelection): string[] {
  const reason = getInactiveReason(tool, selection);
  return reason ? [reason] : [];
}

/**
 * Tool matching service.
 * Matches tools to feature selections based on requirements.
 */
// eslint-disable-next-line no-restricted-syntax -- VS Code-local ToolMatchService mirrors @debrief/components.ToolMatchService with the local `Tool` extension; follow-up to consolidate, #214 scope-adjacent
export class ToolMatchService {
  private tools: Tool[];

  constructor(tools: Tool[]) {
    // Sort tools alphabetically by name
    this.tools = [...tools].sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Get all tools in the inventory.
   */
  getAllTools(): Tool[] {
    return [...this.tools];
  }

  /**
   * Check if a tool is active for a selection.
   */
  isToolActive(tool: Tool, selection: ToolSelection): boolean {
    if (!tool.requirements || tool.requirements.length === 0) {
      return true; // No requirements = always active
    }
    if (!checkRequirements(tool.requirements, selection)) {
      return false;
    }
    if (tool.minFeatures !== undefined) {
      let total = 0;
      for (const count of selection.values()) {
        total += count;
      }
      if (total < tool.minFeatures) {
        return false;
      }
    }
    return true;
  }

  /**
   * Get all active tools for a selection.
   */
  getActiveTools(selection: ToolSelection): Tool[] {
    return this.tools.filter((tool) => this.isToolActive(tool, selection));
  }

  /**
   * Get match results for all tools.
   */
  getMatchResults(selection: ToolSelection): MatchResult[] {
    return this.tools.map((tool) => {
      const isActive = this.isToolActive(tool, selection);
      return {
        tool,
        isActive,
        explanation: isActive ? undefined : getInactiveReason(tool, selection),
      };
    });
  }
}

// Result-carrying GeoJSON collection type from @debrief/schemas (#212).
// IngressFeatureCollection (schema-derived, geometry may be null) rather than
// RawGeoJSONFeatureCollection: a ResultLayer / ToolExecutionResult is populated
// unconditionally from the MCP tool-result parse boundary (an Ingress boundary
// per spec FR-005) and flows on to the host→webview message DTOs (also Ingress,
// FR-006). Typing it Ingress keeps the whole result pipeline cast-free and
// preserves the RFC-7946 null-geometry channel end-to-end (SC-004).
import type { IngressFeatureCollection } from '@debrief/schemas';

/**
 * Tool execution state
 */
export type ToolExecutionStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

/**
 * State of a tool execution in progress or completed
 */
export interface ToolExecution {
  /** Unique execution ID */
  id: string;

  /** Tool being executed */
  toolId: string;

  /** Tool name for display */
  toolName: string;

  /** Execution state */
  status: ToolExecutionStatus;

  /** Progress (0-100) if available */
  progress?: number;

  /** Progress message from tool */
  progressMessage?: string;

  /** Start timestamp */
  startedAt: string;

  /** Completion timestamp */
  completedAt?: string;

  /** Error message if failed */
  error?: string;

  /** Result layer ID if completed */
  resultLayerId?: string;
}

/**
 * Layer styling configuration
 */
export interface LayerStyle {
  /** Line color (hex) */
  strokeColor: string;

  /** Line width */
  strokeWidth: number;

  /** Line dash pattern (for result differentiation) */
  dashArray?: number[];

  /** Fill color for polygons/markers */
  fillColor?: string;

  /** Fill opacity */
  fillOpacity?: number;
}

/**
 * A computed layer from tool execution
 */
export interface ResultLayer {
  /** Unique layer ID */
  id: string;

  /** Display name */
  name: string;

  /** Source tool ID */
  toolId: string;

  /** Source tool name */
  toolName: string;

  /** Execution ID that produced this layer */
  executionId: string;

  /** GeoJSON FeatureCollection of results */
  features: IngressFeatureCollection;

  /** Layer styling configuration */
  style: LayerStyle;

  /** Whether layer is visible */
  visible: boolean;

  /** Creation timestamp */
  createdAt: string;

  /** Z-order (higher = on top) */
  zIndex: number;

  /** Provenance metadata */
  provenance: ToolProvenance;

  /** Artifact file href (for non-GeoJSON results) */
  artifactHref?: string;

  /** Artifact MIME type */
  artifactMimeType?: string;
}

/**
 * Provenance metadata for tracking tool execution history (FR-024)
 */
export interface ToolProvenance {
  /** Tool identifier */
  toolId: string;

  /** Tool name */
  toolName: string;

  /** Tool version string */
  tool_version: string;

  /** Execution timestamp (ISO 8601) */
  executionTime: string;

  /** Source feature IDs that were inputs */
  sourceFeatureIds: string[];

  /** Execution duration in milliseconds */
  durationMs: number;
}

/**
 * Tool execution request
 */
export interface ToolExecutionRequest {
  /** Tool ID (from Tool.id) */
  toolId: string;

  /** Selected feature IDs grouped by kind */
  featureIds: string[];

  /** Additional parameters */
  params?: Record<string, unknown>;
}

/**
 * Tool execution result
 */
export interface ToolExecutionResult {
  /** Whether execution succeeded */
  success: boolean;

  /** Result features (if success) */
  features?: IngressFeatureCollection;

  /** Error message (if failed) */
  error?: string;

  /** Execution duration in ms */
  durationMs: number;

  /** MCP result type (e.g. "addition/track-statistics") */
  resultType?: string;

  /** Display label from annotations */
  label?: string;

  /** Source feature IDs from annotations */
  sourceFeatureIds?: string[];

  /** Artifact data string (for non-GeoJSON results like time-series) */
  artifactData?: string;

  /** Artifact filename hint from debrief:href annotation */
  artifactHref?: string;

  /** Tool version from expanded contract (Phase 0) */
  tool_version?: string;
  /** Modified features with property deltas (Phase 0) */
  modifiedFeatures?: Array<{ feature_id: string; changed_properties: Record<string, { previous_value: unknown; new_value: unknown }> }>;
  /** Created feature IDs (Phase 0) */
  createdFeatures?: string[];
  /** Created artifacts (Phase 0) */
  createdAssets?: Array<{ result_id: string; path: string; mime_type?: string }>;
  /** Full resolved parameters (Phase 0) */
  parameters?: Record<string, { value: unknown; default: boolean; tunable: boolean }>;
}

// ---------------------------------------------------------------------------
// MCP Content Types — canonical definitions in @debrief/utils/mcp-types
// ---------------------------------------------------------------------------
export type {
  DebriefAnnotations,
  MCPContentItem,
  MCPToolResponse,
  MCPErrorResponse,
  MCPSelectionRequirement,
  MCPToolDefinition,
} from '@debrief/utils';

/**
 * Create a default layer style for results
 */
export function createDefaultResultStyle(toolName: string): LayerStyle {
  // Color based on tool name hash for variety
  const hash = toolName.split('').reduce((a, b) => {
    a = (a << 5) - a + b.charCodeAt(0);
    return a & a;
  }, 0);

  const hue = Math.abs(hash) % 360;

  return {
    strokeColor: '#ff0000',
    strokeWidth: 4,
    dashArray: [8, 4],
    fillColor: `hsl(${hue}, 70%, 50%)`,
    fillOpacity: 0.3,
  };
}

/**
 * Create a new tool execution record
 */
export function createToolExecution(toolId: string, toolName: string): ToolExecution {
  return {
    id: `exec-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    toolId,
    toolName,
    status: 'pending',
    startedAt: new Date().toISOString(),
  };
}
