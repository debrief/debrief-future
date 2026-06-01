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
  expandBounds,
  isPointInBounds,
  bboxOverlapsViewport,
  viewportToBounds,
  filterBySpatialExtent,
} from './bounds.js';

// Spatial converters (feature 203)
export {
  toGeoJSONCoord,
  fromGeoJSONCoord,
} from './spatial-converters.js';

// Spatial validators + viewport centre (feature 203)
export {
  validateCoordinate,
  validateViewportPolygon,
  calculateViewportCenter,
} from './spatial-validators.js';

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
  Bounds,
  PointShape,
  PositionStyle,
  PositionStyleOverride,
  ResolvedPositionStyle,
  AxisDefinition,
  DatasetMetadata,
  DataSeries,
  DatasetEnvelope,
} from './types.js';

// Exhaustiveness helper
export { assertNever } from './assert.js';

// Errors
export { InvalidPointShapeError } from './errors.js';

// CSV utilities
export {
  sanitizeFilename,
  generateCsvFilename,
  formatCsvValue,
  buildCsvContent,
  parseCsvToTableDataset,
} from './csv.js';

// Dataset synthesis (Feature: 178)
export { synthesizeTableDataset } from './datasetSynthesis.js';

// MCP types
export type {
  DebriefAnnotations,
  MCPContentItem,
  MCPToolResponse,
  MCPErrorResponse,
  MCPSelectionRequirement,
  MCPToolDefinition,
} from './mcp-types.js';
