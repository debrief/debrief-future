/**
 * `debrief_searchPlots` — read tool that searches the local STAC catalog by
 * the four criteria and, on an `open: true` single match, opens the plot in
 * the Debrief editor via `debrief.openPlot` (#284, FR-003/FR-006). No
 * confirmation (read-only). Empty and empty-catalog results report the applied
 * criteria — no hallucinated plots (US1 AC-3).
 */

import * as vscode from 'vscode';
import type { CopilotToolDeps } from './deps';
import { jsonResult, textResult } from './resultHelpers';
import { searchCatalog, describeCriteria } from './searchCatalog';
import type { TelemetryWriter } from './telemetry';
import type { RunContextProvider } from './runContext';
import { validateSearchPlotsInput } from './validate';
import { InputValidationError } from './validate';
import type { SearchPlotsInput } from './types';

/** Command id used to open a chosen plot (reused from the STAC tree). */
export const OPEN_PLOT_COMMAND = 'debrief.openPlot';

export class SearchPlotsTool implements vscode.LanguageModelTool<unknown> {
  constructor(
    private readonly deps: CopilotToolDeps,
    private readonly telemetry: TelemetryWriter,
    private readonly runContext: RunContextProvider,
  ) {}

  async invoke(
    options: vscode.LanguageModelToolInvocationOptions<unknown>,
  ): Promise<vscode.LanguageModelToolResult> {
    const start = Date.now();
    const ctx = this.runContext();

    let input: SearchPlotsInput;
    try {
      input = validateSearchPlotsInput(options.input);
    } catch (err) {
      const reason =
        err instanceof InputValidationError ? err.message : String(err);
      this.telemetry.record({
        tool: 'searchPlots',
        input: {},
        validation: { rejected: reason },
        retries: 0,
        confirmation: 'not_required',
        latencyMs: { total: Date.now() - start },
        activeModel: ctx.activeModel,
        primingEnabled: ctx.primingEnabled,
        outcome: { error: reason },
      });
      return textResult(`Invalid search input: ${reason}`);
    }

    const matches = await searchCatalog(this.deps, input);
    const total = Date.now() - start;

    let opened: string | null = null;
    const only = matches.length === 1 ? matches[0] : undefined;
    if (input.open === true && only) {
      await vscode.commands.executeCommand(OPEN_PLOT_COMMAND, {
        uri: only.plotId,
      });
      opened = only.plotId;
    }

    this.telemetry.record({
      tool: 'searchPlots',
      input,
      validation: 'accepted',
      retries: 0,
      confirmation: 'not_required',
      latencyMs: { total },
      activeModel: ctx.activeModel,
      primingEnabled: ctx.primingEnabled,
      outcome: 'ok',
    });

    if (matches.length === 0) {
      return jsonResult({
        matches: [],
        message: 'No plots matched.',
        criteriaApplied: describeCriteria(input),
      });
    }

    return jsonResult({
      matches,
      ...(opened ? { opened } : {}),
    });
  }
}
