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
} as const;
