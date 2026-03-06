/**
 * Webview ↔ Extension message contracts for the flip-card interaction.
 *
 * These extend the existing Log Panel message protocol defined in
 * apps/vscode/src/views/logPanelView.ts and apps/vscode/src/webview/web/logPanel.tsx.
 *
 * REVIEW DECISION (113-review):
 * - live-replay:request/result REMOVED — reuse existing tune:request message
 *   (routes to logService.tuneEntry() which already handles parameter change + replay)
 * - delete:request REMOVED — reuse existing revert-this:request message
 *   (routes to logService.revertThis() which already handles soft-delete + replay)
 * - SchemaResponseMessage gains status discriminator (8A)
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

/**
 * Extension returns tool parameter schema.
 *
 * Uses explicit `status` discriminator (matching ReplayResult pattern)
 * rather than structural narrowing on optional fields.
 */
export interface SchemaResponseMessage {
  readonly type: 'schema:response';
  readonly payload: {
    readonly toolId: string;
    readonly status: 'success' | 'error';
    readonly parameters?: ReadonlyArray<ParameterSchemaEntry>;
    readonly error?: string;
  };
}

/**
 * Describes a single tool parameter's type and constraints for rendering
 * the appropriate edit control.
 *
 * REVIEW DECISION (113-review, 2A): This type extends the existing
 * ToolParameter interface (apps/vscode/src/types/tool.ts, shared/components/
 * src/ToolMatch/types.ts) with flip-card-specific fields: tunable, minimum,
 * maximum, step. During implementation, consolidate with the existing
 * ToolParameter type rather than maintaining two parallel definitions.
 */
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

/**
 * New messages sent from webview to extension for flip-card interaction.
 *
 * Note: Parameter changes reuse existing tune:request message.
 * Entry deletion reuses existing revert-this:request message.
 */
export type FlipCardWebviewMessage =
  | SchemaRequestMessage
  | DisableToggleMessage
  | RationaleUpdateMessage;

/** All messages sent from extension to webview (new for this feature). */
export type FlipCardExtensionMessage =
  | SchemaResponseMessage
  | DisableCascadeMessage;
