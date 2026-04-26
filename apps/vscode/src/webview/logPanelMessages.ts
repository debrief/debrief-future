/**
 * Shared message contract between the Log Panel webview and the VS Code
 * extension host.
 *
 * Why this file exists:
 *   `vscode.postMessage()` is typed as `(msg: any) => void`. Without a shared
 *   contract, the webview and extension can drift on payload shapes and the
 *   compiler can't catch it (see commit 43882a7 for the resulting bug).
 *
 *   Both sides import from this single file:
 *     - Webview (`webview/web/logPanel.tsx`) uses `postWebviewMessage()`
 *     - Extension (`views/logPanelView.ts`) types its incoming `WebviewMessage`
 *       and outgoing `ExtensionMessage` against the same union types.
 *
 *   Any mismatch becomes a compile error, not a runtime `undefined`.
 */

import type {
  LogPanelMessage,
  ExtensionToWebviewMessage,
  ParameterSchemaEntry,
  ToolCategoryMap,
} from '@debrief/components';
import type { ReplayResult } from '@debrief/session-state';

export type { ToolCategoryMap };

// ─── Webview → Extension messages ────────────────────────────────────────

/** Phase 6 (Feature 076-replay-tune): request a parameter tune + replay. */
export interface TuneRequestMessage {
  type: 'tune:request';
  payload: { activity_id: string; parameter: string; new_value: unknown };
}

export interface RevertToRequestMessage {
  type: 'revert-to:request';
  payload: { activity_id: string };
}

export interface RevertThisRequestMessage {
  type: 'revert-this:request';
  payload: { activity_id: string };
}

export interface RestoreRequestMessage {
  type: 'restore:request';
  payload: { activity_id: string };
}

export interface ReplayCancelMessage {
  type: 'replay:cancel';
}

/** Feature 113: flip-card edit operations. */
export interface DisableToggleMessage {
  type: 'disable:toggle';
  payload: { activity_id: string; disabled: boolean };
}

export interface RationaleUpdateMessage {
  type: 'rationale:update';
  payload: { activity_id: string; rationale: string };
}

export interface SchemaRequestMessage {
  type: 'schema:request';
  payload: { toolId: string };
}

export interface WebviewReadyMessage {
  type: 'webviewReady';
}

/**
 * All messages the Log Panel webview can post to the extension.
 *
 * Extends `LogPanelMessage` (entry:select, entry:deselect, action:invoke,
 * mode:change) from `@debrief/components` with vscode-specific Phase 6 +
 * Feature 113 messages.
 */
export type WebviewMessage =
  | LogPanelMessage
  | TuneRequestMessage
  | RevertToRequestMessage
  | RevertThisRequestMessage
  | RestoreRequestMessage
  | ReplayCancelMessage
  | DisableToggleMessage
  | RationaleUpdateMessage
  | SchemaRequestMessage
  | WebviewReadyMessage;

// ─── Extension → Webview messages ────────────────────────────────────────

/**
 * Replay progress payload — shape mirrors `LogPanelProps.replayProgress`
 * (the consumer in `@debrief/components`). Note: uses camelCase
 * `currentToolId` because that's what the LogPanel React prop expects.
 *
 * The session-state `ReplayProgress` interface uses snake_case
 * `current_tool_id` (wire format). That divergence pre-dates this contract;
 * it should be unified in a follow-up so the prop, message, and engine all
 * agree.
 */
export interface ReplayProgressPayload {
  current: number;
  total: number;
  currentToolId: string;
  phase: string;
}

export interface ReplayProgressMessage {
  type: 'replay:progress';
  payload: ReplayProgressPayload;
}

/** Replay completion result — shape mirrors session-state ReplayResult. */
export interface ReplayResultMessage {
  type: 'replay:result';
  payload: ReplayResult;
}

export interface ReplayErrorMessage {
  type: 'replay:error';
  payload: { message: string };
}

export interface SchemaResponseMessage {
  type: 'schema:response';
  payload: {
    toolId: string;
    schema: ReadonlyArray<ParameterSchemaEntry>;
    error: string | null;
  };
}

/**
 * Feature 207: Tool manifest snapshot for Log Panel icon category resolution.
 *
 * Pushed by the extension host on session start and whenever `calcService`'s
 * tools cache refreshes. The webview stores the map and passes it to the
 * LogPanel component as the `toolCategories` prop.
 *
 * Keys are tool IDs (kebab-case). Values are canonical ToolCategoryEnum
 * values, or `null` when the tool declared no category (or declared an
 * invalid value — coerced at the MCP boundary).
 */
export interface ToolsManifestMessage {
  type: 'tools:manifest';
  payload: {
    categories: ToolCategoryMap;
  };
}

/**
 * All messages the extension can post to the Log Panel webview.
 *
 * Extends `ExtensionToWebviewMessage` (timeline:update, session:change,
 * selection:update, action:result, mode:init) from `@debrief/components`
 * with Phase 6 + Feature 113 messages.
 */
export type ExtensionMessage =
  | ExtensionToWebviewMessage
  | ReplayProgressMessage
  | ReplayResultMessage
  | ReplayErrorMessage
  | SchemaResponseMessage
  | ToolsManifestMessage;

// ─── Typed postMessage helpers ───────────────────────────────────────────

/**
 * VS Code webview API surface used by `postWebviewMessage`.
 * Defined locally so this module can be imported by both extension and
 * webview without pulling in the full vscode types.
 */
interface VsCodeApiLike {
  postMessage(message: unknown): void;
}

/**
 * Type-safe wrapper around `vscode.postMessage()` for the webview side.
 *
 * Use this instead of `vscode.postMessage(...)` directly so TypeScript
 * verifies the message shape matches `WebviewMessage`. A mismatch (e.g.
 * `activityId` instead of `activity_id`) becomes a compile error.
 */
export function postWebviewMessage(
  vscode: VsCodeApiLike,
  message: WebviewMessage
): void {
  vscode.postMessage(message);
}
