/**
 * Copilot spike (#284) — barrel entry.
 *
 * The extension imports `registerLmTools` from here to wire the four Debrief
 * Language Model tools into Copilot Chat agent mode. All spike code lives under
 * this folder so the experiment is trivially removable (spike discipline).
 */

export { registerLmTools, LM_TOOL_IDS } from './registerLmTools';
export type {
  RegisterLmToolsOptions,
} from './registerLmTools';
export type { CopilotToolDeps } from './deps';
export type { RunContext, RunContextProvider } from './runContext';
export type { TelemetryWriter } from './telemetry';
