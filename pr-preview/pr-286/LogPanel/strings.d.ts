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
    readonly tunePanelTitle: "Edit Parameter";
    readonly tuneCommit: "Apply";
    readonly tuneCancel: "Cancel";
    readonly tuneNotTunable: "This parameter cannot be modified.";
    readonly replayProgressLoading: "Loading snapshot…";
    readonly replayProgressReplaying: (current: number, total: number) => string;
    readonly replayProgressFinalising: "Finalising…";
    readonly replayCancel: "Cancel replay";
    readonly replayCompleted: (count: number) => string;
    readonly replayHalted: (toolId: string, reason: string) => string;
    readonly replayCancelled: "Replay cancelled. Previous state restored.";
    readonly revertToConfirmTitle: "Revert to here?";
    readonly revertToConfirmMessage: "All operations after this point will be permanently removed. This cannot be undone.";
    readonly revertToConfirmButton: "Revert";
    readonly revertThisLabel: "Remove this operation";
    readonly restoreLabel: "Restore this operation";
    readonly deletedEntryBadge: "Removed";
    readonly tunedEntryBadge: "Tuned";
    readonly versionMismatch: (tool: string, expected: string, installed: string) => string;
    readonly editIconTooltip: "Edit parameters";
    readonly editFaceDone: "Done";
    readonly editFaceMetadataTitle: "Metadata";
    readonly editFaceParametersTitle: "Parameters";
    readonly editFaceNoParameters: "This tool has no tunable parameters.";
    readonly editFaceSchemaLoading: "Loading parameter schema…";
    readonly editFaceSchemaError: "Failed to load parameter schema.";
    readonly editFaceSchemaRetry: "Retry";
    readonly editFaceRationaleLabel: "Rationale";
    readonly editFaceRationalePlaceholder: "Why was this operation performed?";
    readonly editFaceDisableLabel: "Disable this entry";
    readonly editFaceDisableWarning: (causeId: string) => string;
    readonly editFaceDeleteButton: "Delete";
    readonly editFaceDeleteConfirmTitle: "Delete this entry?";
    readonly editFaceDeleteConfirmMessage: "All subsequent operations will replay without this entry.";
    readonly editFaceDeleteConfirm: "Delete";
    readonly editFaceDeleteCancel: "Cancel";
    readonly disabledEntryBadge: "Disabled";
    readonly sliderValueLabel: (value: number) => string;
    readonly jsonEditorParseError: "Invalid JSON";
    readonly colorPickerLabel: "Select colour";
};
//# sourceMappingURL=strings.d.ts.map