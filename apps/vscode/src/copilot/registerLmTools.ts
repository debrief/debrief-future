/**
 * Activation wiring for the Copilot LM tools (#284, R1).
 *
 * Registers the four tools with `vscode.lm.registerTool` and pushes their
 * disposables. Everything the tools need is injected through the structural
 * `CopilotToolDeps` seam, so the concrete service singletons are the only
 * coupling to the rest of the extension. Telemetry defaults to a JSONL file
 * under the extension's log directory (copied into `evidence/` for the
 * findings report); tests inject their own writer + run context.
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import type { CopilotToolDeps } from './deps';
import {
  createTelemetryWriter,
  createFileSink,
  type TelemetryWriter,
} from './telemetry';
import {
  defaultRunContextProvider,
  type RunContextProvider,
} from './runContext';
import { SearchPlotsTool } from './searchPlotsTool';
import { SummarizeCurrentPlotTool } from './summarizeCurrentPlotTool';
import { ListToolsTool } from './listToolsTool';
import { RunToolTool } from './runToolTool';

/** Overridable collaborators (tests inject stubs; production uses defaults). */
export interface RegisterLmToolsOptions {
  telemetry?: TelemetryWriter;
  runContext?: RunContextProvider;
}

/** The LM tool ids contributed in `package.json`. */
export const LM_TOOL_IDS = {
  searchPlots: 'debrief_searchPlots',
  summarizeCurrentPlot: 'debrief_summarizeCurrentPlot',
  listTools: 'debrief_listTools',
  runTool: 'debrief_runTool',
} as const;

/** Build the default file-backed telemetry writer under the log directory. */
function defaultTelemetry(context: vscode.ExtensionContext): TelemetryWriter {
  try {
    const dir = context.logUri.fsPath;
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, 'copilot-telemetry.jsonl');
    const sink = createFileSink((line) => {
      try {
        fs.appendFileSync(file, line);
      } catch {
        // Never let telemetry break a tool call.
      }
    });
    return createTelemetryWriter({ sink });
  } catch {
    return createTelemetryWriter();
  }
}

/**
 * Register the four Debrief LM tools.
 *
 * @param context - the extension context (disposables + log dir).
 * @param deps    - the injected service seams.
 * @param options - optional telemetry/run-context overrides (tests).
 */
export function registerLmTools(
  context: vscode.ExtensionContext,
  deps: CopilotToolDeps,
  options: RegisterLmToolsOptions = {},
): void {
  const telemetry = options.telemetry ?? defaultTelemetry(context);
  const runContext = options.runContext ?? defaultRunContextProvider;

  context.subscriptions.push(
    vscode.lm.registerTool(
      LM_TOOL_IDS.searchPlots,
      new SearchPlotsTool(deps, telemetry, runContext),
    ),
    vscode.lm.registerTool(
      LM_TOOL_IDS.summarizeCurrentPlot,
      new SummarizeCurrentPlotTool(deps, telemetry, runContext),
    ),
    vscode.lm.registerTool(
      LM_TOOL_IDS.listTools,
      new ListToolsTool(deps, telemetry, runContext),
    ),
    vscode.lm.registerTool(
      LM_TOOL_IDS.runTool,
      new RunToolTool(deps, telemetry, runContext),
    ),
  );
}
