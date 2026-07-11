/**
 * Operator-annotated run context for telemetry (#284, research R2).
 *
 * The LM Tools API does not expose the active model to a tool, so the model
 * identity (FR-026) and priming-file state (FR-027) are supplied by the
 * operator through extension settings and stamped onto every telemetry record.
 */

import * as vscode from 'vscode';

/** The per-run context stamped onto telemetry records. */
export interface RunContext {
  /** Operator-annotated model name for the current scenario run. */
  activeModel: string;
  /** Whether `.github/copilot-instructions.md` is active for the run. */
  primingEnabled: boolean;
}

/** A provider of the current run context (injectable for tests). */
export type RunContextProvider = () => RunContext;

/**
 * Default provider — reads `debrief.copilot.activeModel` /
 * `debrief.copilot.primingEnabled` from workspace settings.
 */
export function defaultRunContextProvider(): RunContext {
  const config = vscode.workspace.getConfiguration('debrief.copilot');
  return {
    activeModel: config.get<string>('activeModel') ?? 'unknown',
    primingEnabled: config.get<boolean>('primingEnabled') ?? true,
  };
}
