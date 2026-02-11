/**
 * User-facing strings for the LogPanel component.
 * Externalized for future i18n support (Constitution XI).
 *
 * Feature: 072-log-panel
 */
export declare const LOG_PANEL_STRINGS: {
    readonly emptyNoPlot: "No plot is open. Open a plot to view its analytical history.";
    readonly emptyNoEntries: "No operations recorded yet. Tool executions will appear here as you work.";
    readonly viewTimeline: "Timeline";
    readonly viewByFeature: "By Feature";
    readonly modeCompact: "Compact";
    readonly modeNormal: "Normal";
    readonly modeDetailed: "Detailed";
    readonly filterSearch: "Search entries...";
    readonly filterToolType: "All tools";
    readonly filterCategory: "All categories";
    readonly filterCollapse: "Hide filters";
    readonly filterExpand: "Show filters";
    readonly filterCount: (shown: number, total: number) => string;
    readonly categoryCalculation: "Calculation";
    readonly categoryImport: "Import";
    readonly categoryPropertyEdit: "Property edit";
    readonly categoryExport: "Export";
    readonly actionTune: "Tune";
    readonly actionRevertTo: "Revert to here";
    readonly actionRevertThis: "Revert this";
    readonly actionSnapshot: "Snapshot";
    readonly actionRationale: "Rationale";
    readonly actionNotAvailable: (actionName: string, phase: string) => string;
    readonly actionTunePhase: "Phase 6";
    readonly actionRevertPhase: "Phase 4";
    readonly actionSnapshotPhase: "Phase 4";
    readonly actionRationalePhase: "Phase 6";
    readonly deletedFeature: "(deleted)";
    readonly durationLabel: "Duration";
    readonly timestampLabel: "Time";
    readonly parametersLabel: "Parameters";
    readonly snapshotBoundary: "Snapshot boundary";
    readonly showEarlierHistory: "Show earlier history";
    readonly toolVersionTooltip: (version: string) => string;
};
//# sourceMappingURL=strings.d.ts.map