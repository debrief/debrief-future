/**
 * @debrief/utils - Shared utility functions for Debrief v4.x
 */

// Duration utilities
export { parseDuration, formatDuration } from './duration.js';

// Interval utilities
export {
  findIntervalPositions,
  findNearestPositionIndex,
  resolvePositionStyle,
  formatTimestampForLabel,
  computeAllPositionStyles,
} from './interval.js';

// Bounds utilities
export {
  calculateBounds,
  mergeBounds,
  boundsToLeaflet,
  isValidBounds,
} from './bounds.js';

// Temporal utilities
export {
  findNearestPointIndex,
  sliceTrackToTime,
} from './temporal.js';

// Error message utilities
export {
  formatErrorMessage,
  ImportMessages,
  type ErrorCode,
  type ErrorContext,
} from './errorMessages.js';

// Types
export type {
  GeoJSONFeature,
  GeoJSONFeatureCollection,
  Bounds,
  SafeGeometry,
  SafeFeature,
  SafeFeatureCollection,
  PositionStyle,
  PositionStyleOverride,
  ResolvedPositionStyle,
} from './types.js';

// CSV utilities
export {
  sanitizeFilename,
  generateCsvFilename,
  formatCsvValue,
  buildCsvContent,
} from './csv.js';

// MCP types
export type {
  DebriefAnnotations,
  MCPContentItem,
  MCPToolResponse,
  MCPErrorResponse,
  MCPSelectionRequirement,
  MCPToolDefinition,
} from './mcp-types.js';
