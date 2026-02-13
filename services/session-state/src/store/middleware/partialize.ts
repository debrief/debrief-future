/**
 * State partialize utilities for undo/redo.
 * Feature: 024-document-session-state
 *
 * Defines which state is persistent vs ephemeral.
 */

/**
 * Ephemeral fields that are NOT tracked in undo history.
 */
export const EPHEMERAL_FIELDS = [
  'playbackState',  // FR-023: playback control is ephemeral
  'dirty',          // Document dirty flag is ephemeral
  'undoStack',      // Undo/redo stacks are ephemeral
  'redoStack',
  'drawingMode',    // FR-093: drawing toolbar state is ephemeral
] as const;

/**
 * Check if a field is ephemeral.
 */
export function isEphemeralField(field: string): boolean {
  return (EPHEMERAL_FIELDS as readonly string[]).includes(field);
}

/**
 * Get persistent state fields for a given slice.
 */
export function getPersistentFields(slice: string): string[] {
  switch (slice) {
    case 'temporal':
      return [
        'currentTime',
        'timeRange',
        'timeFilter',
        'stepSize',
        'playbackRate',
        'displayMode',
      ];
    case 'spatial':
      return ['viewport', 'rotation'];
    case 'features':
      return ['featureCollectionUri', 'selection', 'hiddenFeatureIds'];
    case 'document':
      return ['savePath'];
    default:
      return [];
  }
}

/**
 * Check if a state change should be tracked in history.
 */
export function shouldTrackChange(changedKeys: string[]): boolean {
  return changedKeys.some((key) => !isEphemeralField(key));
}
