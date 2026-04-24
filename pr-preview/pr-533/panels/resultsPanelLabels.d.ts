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
    noResults: string;
    noDataToDisplay: string;
    loadingResults: string;
    computingResults: string;
    toolExecutionFailed: string;
    unableToRender: string;
    closeTab: (title: string) => string;
    unsavedResult: string;
    save: string;
    saveResult: string;
    saveAs: string;
    saveResultAs: string;
    nameLabel: string;
    tagLabel: string;
    baseFilenameAriaLabel: string;
    optionalTagAriaLabel: string;
    confirmSave: string;
    cancelSave: string;
    ok: string;
    cancel: string;
    retry: string;
    retryToolExecution: string;
    toolResultsTableLabel: string;
}
/**
 * Default English labels.
 */
export declare const DEFAULT_RESULTS_PANEL_LABELS: ResultsPanelLabels;
//# sourceMappingURL=resultsPanelLabels.d.ts.map