/**
 * Webview ↔ Extension message contracts for the flip-card interaction.
 *
 * These extend the existing Log Panel message protocol defined in
 * apps/vscode/src/views/logPanelView.ts and apps/vscode/src/webview/web/logPanel.tsx.
 */

// ---------------------------------------------------------------------------
// Schema loading (webview → extension → webview)
// ---------------------------------------------------------------------------

/** Webview requests tool parameter schema on card flip. */
export interface SchemaRequestMessage {
  readonly type: 'schema:request';
  readonly payload: {
    readonly toolId: string;
  };
}

/** Extension returns tool parameter schema. */
export interface SchemaResponseMessage {
  readonly type: 'schema:response';
  readonly payload: {
    readonly toolId: string;
    readonly parameters: ReadonlyArray<ParameterSchemaEntry>;
  } | {
    readonly toolId: string;
    readonly error: string;
  };
}

export interface ParameterSchemaEntry {
  readonly name: string;
  readonly type: 'number' | 'string' | 'boolean' | 'enum' | 'object' | 'array';
  readonly description: string;
  readonly tunable: boolean;
  readonly defaultValue: unknown;
  readonly minimum: number | null;
  readonly maximum: number | null;
  readonly step: number | null;
  readonly choices: ReadonlyArray<unknown> | null;
  readonly paramType: string | null;
}

// ---------------------------------------------------------------------------
// Live replay (webview → extension)
// ---------------------------------------------------------------------------

/** Webview requests live replay after parameter change. */
export interface LiveReplayRequestMessage {
  readonly type: 'live-replay:request';
  readonly payload: {
    readonly activityId: string;
    readonly parameter: string;
    readonly newValue: unknown;
  };
}

/** Extension reports live replay result. */
export interface LiveReplayResultMessage {
  readonly type: 'live-replay:result';
  readonly payload: {
    readonly activityId: string;
    readonly status: 'completed' | 'halted' | 'error';
    readonly errorMessage: string | null;
  };
}

// ---------------------------------------------------------------------------
// Disable toggle (webview → extension)
// ---------------------------------------------------------------------------

/** Webview toggles an entry's disabled state. */
export interface DisableToggleMessage {
  readonly type: 'disable:toggle';
  readonly payload: {
    readonly activityId: string;
    readonly disabled: boolean;
  };
}

/** Extension reports which entries were affected by the disable cascade. */
export interface DisableCascadeMessage {
  readonly type: 'disable:cascade';
  readonly payload: {
    readonly disabledActivityIds: ReadonlyArray<string>;
    readonly causeActivityId: string;
  };
}

// ---------------------------------------------------------------------------
// Delete entry (webview → extension)
// ---------------------------------------------------------------------------

/** Webview requests soft-delete of an entry (after user confirmation). */
export interface DeleteEntryMessage {
  readonly type: 'delete:request';
  readonly payload: {
    readonly activityId: string;
  };
}

// ---------------------------------------------------------------------------
// Rationale update (webview → extension)
// ---------------------------------------------------------------------------

/** Webview saves rationale text for an entry. */
export interface RationaleUpdateMessage {
  readonly type: 'rationale:update';
  readonly payload: {
    readonly activityId: string;
    readonly rationale: string;
  };
}

// ---------------------------------------------------------------------------
// Union types
// ---------------------------------------------------------------------------

/** All messages sent from webview to extension (new for this feature). */
export type FlipCardWebviewMessage =
  | SchemaRequestMessage
  | LiveReplayRequestMessage
  | DisableToggleMessage
  | DeleteEntryMessage
  | RationaleUpdateMessage;

/** All messages sent from extension to webview (new for this feature). */
export type FlipCardExtensionMessage =
  | SchemaResponseMessage
  | LiveReplayResultMessage
  | DisableCascadeMessage;
