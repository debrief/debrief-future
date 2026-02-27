/**
 * User-facing strings for the LogPanel component.
 * Externalized for future i18n support (Constitution XI).
 *
 * Feature: 072-log-panel
 */

export const LOG_PANEL_STRINGS = {
  // Empty states
  emptyNoPlot: 'No plot is open. Open a plot to view its analytical history.',
  emptyNoEntries: 'No operations recorded yet. Tool executions will appear here as you work.',

  // View modes
  viewTimeline: 'Timeline',
  viewByFeature: 'By Feature',

  // Presentation modes
  modeCompact: 'Compact',
  modeNormal: 'Normal',
  modeDetailed: 'Detailed',

  // Filter row
  filterSearch: 'Search entries...',
  filterToolType: 'All tools',
  filterCategory: 'All categories',
  filterCollapse: 'Hide filters',
  filterExpand: 'Show filters',
  filterCount: (shown: number, total: number) => `${shown} of ${total} entries`,

  // Operation categories
  categoryCalculation: 'Calculation',
  categoryImport: 'Import',
  categoryPropertyEdit: 'Property edit',
  categoryExport: 'Export',

  // Action buttons
  actionTune: 'Tune',
  actionRevertTo: 'Revert to here',
  actionRevertThis: 'Revert this',
  actionSnapshot: 'Snapshot',
  actionRationale: 'Rationale',

  // Action result messages
  actionNotAvailable: (actionName: string, phase: string) =>
    `${actionName} is not yet available (planned for ${phase}).`,
  actionTunePhase: 'Phase 6',
  actionRevertPhase: 'Phase 4',
  actionSnapshotPhase: 'Phase 4',
  actionRationalePhase: 'Phase 6',

  // Entry display
  deletedFeature: '(deleted)',
  durationLabel: 'Duration',
  timestampLabel: 'Time',
  parametersLabel: 'Parameters',

  // Snapshot boundary
  snapshotBoundary: 'Snapshot boundary',
  showEarlierHistory: 'Show earlier history',

  // Tooltips
  toolVersionTooltip: (version: string) => `Tool version: ${version}`,

  // Replay and tuning (Feature: 076)
  tunePanelTitle: 'Edit Parameter',
  tuneCommit: 'Apply',
  tuneCancel: 'Cancel',
  tuneNotTunable: 'This parameter cannot be modified.',
  replayProgressLoading: 'Loading snapshot\u2026',
  replayProgressReplaying: (current: number, total: number) => `Replaying ${current}/${total}\u2026`,
  replayProgressFinalising: 'Finalising\u2026',
  replayCancel: 'Cancel replay',
  replayCompleted: (count: number) => `Replay completed: ${count} operations replayed.`,
  replayHalted: (toolId: string, reason: string) => `Replay halted at "${toolId}": ${reason}`,
  replayCancelled: 'Replay cancelled. Previous state restored.',
  revertToConfirmTitle: 'Revert to here?',
  revertToConfirmMessage: 'All operations after this point will be permanently removed. This cannot be undone.',
  revertToConfirmButton: 'Revert',
  revertThisLabel: 'Remove this operation',
  restoreLabel: 'Restore this operation',
  deletedEntryBadge: 'Removed',
  tunedEntryBadge: 'Tuned',
  versionMismatch: (tool: string, expected: string, installed: string) =>
    `"${tool}" version mismatch: expected ${expected}, found ${installed}.`,

  // Flip-card interaction (Feature: 113-prov-card-flip)
  editIconTooltip: 'Edit parameters',
  editFaceDone: 'Done',
  editFaceMetadataTitle: 'Metadata',
  editFaceParametersTitle: 'Parameters',
  editFaceNoParameters: 'This tool has no tunable parameters.',
  editFaceSchemaLoading: 'Loading parameter schema\u2026',
  editFaceSchemaError: 'Failed to load parameter schema.',
  editFaceSchemaRetry: 'Retry',
  editFaceRationaleLabel: 'Rationale',
  editFaceRationalePlaceholder: 'Why was this operation performed?',
  editFaceDisableLabel: 'Disable this entry',
  editFaceDisableWarning: (causeId: string) => `Auto-disabled due to dependency on ${causeId}`,
  editFaceDeleteButton: 'Delete',
  editFaceDeleteConfirmTitle: 'Delete this entry?',
  editFaceDeleteConfirmMessage: 'All subsequent operations will replay without this entry.',
  editFaceDeleteConfirm: 'Delete',
  editFaceDeleteCancel: 'Cancel',
  disabledEntryBadge: 'Disabled',
  sliderValueLabel: (value: number) => String(value),
  jsonEditorParseError: 'Invalid JSON',
  colorPickerLabel: 'Select colour',
} as const;
