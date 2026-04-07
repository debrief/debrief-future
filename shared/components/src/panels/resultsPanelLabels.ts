/**
 * Externalisable labels for the Results panel (ChartPanelWrapper + TableRenderer).
 *
 * Per Constitution Article XI (Internationalisation), all user-facing strings
 * must be externalisable for translation. Consumers can pass a partial labels
 * object to override any string with a localised version.
 *
 * Feature: 177-tabular-results-panel
 */

export interface ResultsPanelLabels {
  // Empty / placeholder states
  noResults: string;
  noDataToDisplay: string;

  // Loading / error states
  loadingResults: string;
  computingResults: string;
  toolExecutionFailed: string;
  unableToRender: string;

  // Tab actions
  closeTab: (title: string) => string;
  unsavedResult: string;

  // Save controls
  save: string;
  saveResult: string;
  saveAs: string;
  saveResultAs: string;

  // Save As form
  nameLabel: string;
  tagLabel: string;
  baseFilenameAriaLabel: string;
  optionalTagAriaLabel: string;
  confirmSave: string;
  cancelSave: string;
  ok: string;
  cancel: string;

  // Retry control
  retry: string;
  retryToolExecution: string;

  // Table renderer
  toolResultsTableLabel: string;
}

/**
 * Default English labels.
 */
export const DEFAULT_RESULTS_PANEL_LABELS: ResultsPanelLabels = {
  noResults: 'No results to display. Run a tool or open a file from the Navigation panel.',
  noDataToDisplay: 'No data to display',

  loadingResults: 'Loading results',
  computingResults: 'Computing results…',
  toolExecutionFailed: 'Tool execution failed',
  unableToRender: 'Unable to render chart',

  closeTab: (title: string) => `Close ${title}`,
  unsavedResult: 'Unsaved result',

  save: 'Save',
  saveResult: 'Save result',
  saveAs: 'Save As…',
  saveResultAs: 'Save result as',

  nameLabel: 'Name:',
  tagLabel: 'Tag:',
  baseFilenameAriaLabel: 'Base filename',
  optionalTagAriaLabel: 'Optional tag',
  confirmSave: 'Confirm save',
  cancelSave: 'Cancel save',
  ok: 'OK',
  cancel: 'Cancel',

  retry: 'Retry',
  retryToolExecution: 'Retry tool execution',

  toolResultsTableLabel: 'Tool results',
};
