/**
 * Tool-related type definitions for the Debrief VS Code Extension
 */

import type { FeatureCollection } from 'geojson';
import type { SelectionContextType, FeatureKind } from './plot';

/**
 * An analysis tool from debrief-calc
 */
export interface AnalysisTool {
  /** Tool identifier (from debrief-calc) */
  name: string;

  /** Human-readable display name */
  displayName: string;

  /** Tool description */
  description: string;

  /** Required selection context type */
  contextType: SelectionContextType | 'any';

  /** Accepted input feature kinds */
  inputKinds: FeatureKind[];

  /** JSON Schema for tool parameters */
  inputSchema: Record<string, unknown>;
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

  /** Source tool name */
  toolName: string;

  /** Execution ID that produced this layer */
  executionId: string;

  /** GeoJSON FeatureCollection of results */
  features: FeatureCollection;

  /** Layer styling configuration */
  style: LayerStyle;

  /** Whether layer is visible */
  visible: boolean;

  /** Creation timestamp */
  createdAt: string;

  /** Z-order (higher = on top) */
  zIndex: number;
}

/**
 * Tool execution request
 */
export interface ToolExecutionRequest {
  /** Tool name */
  toolName: string;

  /** Selected track IDs */
  trackIds: string[];

  /** Selected location IDs */
  locationIds: string[];

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
  features?: FeatureCollection;

  /** Error message (if failed) */
  error?: string;

  /** Execution duration in ms */
  durationMs: number;
}

/**
 * Check if a tool is applicable to the given selection context
 */
export function isToolApplicable(
  tool: AnalysisTool,
  contextType: SelectionContextType,
  featureKinds: FeatureKind[]
): boolean {
  // Check context type
  if (tool.contextType !== 'any' && tool.contextType !== contextType) {
    return false;
  }

  // Check feature kinds
  if (tool.inputKinds.length > 0) {
    const hasRequiredKind = tool.inputKinds.some((kind) =>
      featureKinds.includes(kind)
    );
    if (!hasRequiredKind) {
      return false;
    }
  }

  return true;
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
    strokeColor: `hsl(${hue}, 70%, 50%)`,
    strokeWidth: 2,
    dashArray: [8, 4],
    fillColor: `hsl(${hue}, 70%, 50%)`,
    fillOpacity: 0.3,
  };
}

/**
 * Create a new tool execution record
 */
export function createToolExecution(
  toolName: string
): ToolExecution {
  return {
    id: `exec-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    toolName,
    status: 'pending',
    startedAt: new Date().toISOString(),
  };
}
