/**
 * Webview ↔ extension message variants introduced by the Properties Panel.
 * Both ActivityPanel and StacBrowser surfaces send the same commit message
 * (Decision 2: direct-write, no session-state staging).
 */
export type FieldKey = string;
export type FieldValue = unknown;
/** Per-field commit — sent when the user commits via blur or Enter. */
export interface PropertiesCommitMessage {
    type: 'properties:commit';
    /** Absolute path to the STAC store root. */
    storePath: string;
    /** Relative path (from storePath) to the item.json. */
    itemPath: string;
    /** Flat field → value patch. Typically single-entry; arrays may replace whole array. */
    patch: Record<FieldKey, FieldValue>;
}
/**
 * Reply from the extension on successful write. Carries the authoritative
 * post-write state so the webview can reconcile its optimistic update.
 */
export interface PropertiesCommittedMessage {
    type: 'properties:committed';
    itemPath: string;
    /** The post-write `item.properties` (entire, not just the patched keys). */
    updatedProperties: Record<FieldKey, FieldValue>;
    /** Sorted, deduplicated debrief:overrides array. */
    overrides: string[];
    /** ULID of the provenance entry just written. */
    activityId: string;
}
/** Reply from the extension on write failure — webview rolls back the optimistic update. */
export interface PropertiesErrorMessage {
    type: 'properties:error';
    itemPath: string;
    /** The typed error name, e.g. 'StaleItemJsonError' | 'SchemaValidationError' | 'ReadOnlyFilesystemError'. */
    errorName: string;
    /** User-facing message for the banner. */
    message: string;
}
export type PropertiesPanelMessage = PropertiesCommitMessage | PropertiesCommittedMessage | PropertiesErrorMessage;
//# sourceMappingURL=messageTypes.d.ts.map