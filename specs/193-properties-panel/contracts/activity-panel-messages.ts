/**
 * Contract: webview ↔ extension messages introduced by the Properties Panel.
 *
 * Locations at implementation time:
 *   - shared/components/src/ActivityPanel/types.ts (extend ActivityPanelMessage)
 *   - shared/components/src/StacBrowser/types.ts (extend StacBrowserMessage)
 *
 * Extension-side handlers:
 *   - apps/vscode/src/panels/activityPanelView.ts
 *   - apps/vscode/src/panels/stacBrowserPanel.ts
 *
 * Decision 2 (post-review) collapsed the per-surface messages into a single
 * 'properties:commit' variant shared by both surfaces. There is NO
 * session-state staging, so no update/discard/save-direct-batch variants.
 */

export type FieldKey = string;
export type FieldValue = unknown;

/**
 * Per-field (or small-batch) commit. Sent when the user commits an edit via
 * blur or Enter. Extension translates this to a single
 * stacService.updateItemMetadata call.
 *
 * `patch` is flat — typically a single {field: value} entry; array widgets may
 * produce a full replacement (e.g. the whole debrief:tags array) but still as
 * one patch entry.
 */
export interface PropertiesCommitMessage {
  type: 'properties:commit';
  storePath: string;
  itemPath: string;
  patch: Record<FieldKey, FieldValue>;
}

export type PropertiesPanelMessage = PropertiesCommitMessage;
