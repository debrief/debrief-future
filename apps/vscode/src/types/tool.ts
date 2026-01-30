/**
 * Tool-related type definitions for the Debrief VS Code Extension
 *
 * This module re-exports types from @debrief/components/ToolMatch and defines
 * additional extension-specific types for tool execution and result layers.
 */

/**
 * Selection requirement for a tool (from @debrief/schemas).
 * Defines what feature kinds and counts a tool needs.
 */
export interface SelectionRequirement {
  /** Feature kind (e.g., 'TRACK', 'POINT', 'CIRCLE') */
  kind: string;
  /** Minimum count required (default: 1) */
  min?: number;
  /** Maximum count allowed (undefined = no limit) */
  max?: number;
}

/**
 * Tool definition (from @debrief/schemas).
 * Describes an analysis tool and its requirements.
 */
export interface Tool {
  /** Unique tool identifier */
  id: string;
  /** Display name */
  name: string;
  /** Description of what the tool does */
  description?: string;
  /** Tool version */
  version?: string;
  /** Selection requirements for the tool to be active */
  requirements?: SelectionRequirement[];
}

/**
 * Selection map - feature kind to count.
 */
export type ToolSelection = Map<string, number>;

/**
 * Result of checking a tool against a selection.
 */
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
export function createSelection(): ToolSelection {
  return new Map();
}

/**
 * Create a selection from a record of kind → count.
 */
export function createSelectionFromCounts(counts: Record<string, number>): ToolSelection {
  return new Map(Object.entries(counts));
}

/**
 * Check if a tool's requirements are satisfied by a selection.
 */
function checkRequirements(requirements: SelectionRequirement[], selection: ToolSelection): boolean {
  const acceptedKinds = new Set(requirements.map((r) => r.kind));

  // Reject if selection contains kinds the tool doesn't accept
  for (const kind of selection.keys()) {
    if (!acceptedKinds.has(kind) && (selection.get(kind) ?? 0) > 0) {
      return false;
    }
  }

  for (const req of requirements) {
    const count = selection.get(req.kind) ?? 0;
    const min = req.min ?? 1;
    const max = req.max;

    if (count < min) {
      return false;
    }
    if (max !== undefined && count > max) {
      return false;
    }
  }
  return true;
}

/**
 * Get the reason why a tool is inactive for a selection.
 */
export function getInactiveReason(tool: Tool, selection: ToolSelection): string {
  if (!tool.requirements || tool.requirements.length === 0) {
    return '';
  }

  const reasons: string[] = [];
  const acceptedKinds = new Set(tool.requirements.map((r) => r.kind));

  for (const [kind, count] of selection) {
    if (!acceptedKinds.has(kind) && count > 0) {
      reasons.push(`Unexpected ${kind} in selection`);
    }
  }

  for (const req of tool.requirements) {
    const count = selection.get(req.kind) ?? 0;
    const min = req.min ?? 1;
    const max = req.max;

    if (count < min) {
      reasons.push(`Need ${min} ${req.kind}, have ${count}`);
    } else if (max !== undefined && count > max) {
      reasons.push(`Need at most ${max} ${req.kind}, have ${count}`);
    }
  }

  return reasons.join('; ');
}

/**
 * Get all inactive reasons for a tool.
 */
export function getAllInactiveReasons(tool: Tool, selection: ToolSelection): string[] {
  const reason = getInactiveReason(tool, selection);
  return reason ? [reason] : [];
}

/**
 * Tool matching service.
 * Matches tools to feature selections based on requirements.
 */
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
    return checkRequirements(tool.requirements, selection);
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

// Self-contained geometry type to avoid any
interface SafeGeometry {
  type: string;
  coordinates: unknown;
}

// Self-contained feature type to avoid any from geojson Feature
interface SafeFeature {
  type: 'Feature';
  geometry: SafeGeometry;
  properties: Record<string, unknown> | null;
}

// Self-contained FeatureCollection type to avoid any from geojson
interface SafeFeatureCollection {
  type: 'FeatureCollection';
  features: SafeFeature[];
}

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
  features: SafeFeatureCollection;

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
  toolVersion: string;

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
  features?: SafeFeatureCollection;

  /** Error message (if failed) */
  error?: string;

  /** Execution duration in ms */
  durationMs: number;
}

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
