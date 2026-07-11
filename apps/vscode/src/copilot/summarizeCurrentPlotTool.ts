/**
 * `debrief_summarizeCurrentPlot` — read tool returning a thinned, token-bounded
 * inventory of the open plot for grounding edits (#284, FR-003/FR-008). Defaults
 * to the active plot, accepts an explicit `plotId`, lists all open plots
 * (FR-009), supports selection-scoped summaries (US4), and returns a clean
 * `noPlotOpen` sentinel rather than an error trace (US3 AC-3). No confirmation.
 */

import type * as vscode from 'vscode';
import type { CopilotToolDeps } from './deps';
import { jsonResult } from './resultHelpers';
import { buildPlotSummary } from './summarize';
import {
  resolvePlotContext,
  resolveSelection,
  listOpenPlots,
} from './plotContext';
import type { TelemetryWriter } from './telemetry';
import type { RunContextProvider } from './runContext';
import { validateSummarizeInput } from './validate';
import type { NoPlotOpenResult, TimeSpan } from './types';

export class SummarizeCurrentPlotTool
  implements vscode.LanguageModelTool<unknown>
{
  constructor(
    private readonly deps: CopilotToolDeps,
    private readonly telemetry: TelemetryWriter,
    private readonly runContext: RunContextProvider,
  ) {}

  invoke(
    options: vscode.LanguageModelToolInvocationOptions<unknown>,
  ): vscode.LanguageModelToolResult {
    const start = Date.now();
    const ctx = this.runContext();
    const input = validateSummarizeInput(options.input);

    const resolution = resolvePlotContext(this.deps, input.plotId);

    if (resolution.kind !== 'resolved') {
      this.telemetry.record({
        tool: 'summarizeCurrentPlot',
        input,
        validation: 'accepted',
        retries: 0,
        confirmation: 'not_required',
        latencyMs: { total: Date.now() - start },
        activeModel: ctx.activeModel,
        primingEnabled: ctx.primingEnabled,
        outcome: 'ok',
      });
      const hint =
        resolution.kind === 'noPlotOpen'
          ? 'No plot is open. Search the catalog first, then open a plot.'
          : resolution.kind === 'unknownPlotId'
            ? `No open plot matches "${resolution.requestedPlotId}". Choose one of the open plots.`
            : `That plot is open but not focused. Open "${resolution.requestedPlotId}" to summarise it.`;
      const result: NoPlotOpenResult = {
        noPlotOpen: true,
        hint,
        openPlots: resolution.openPlots,
      };
      return jsonResult(result);
    }

    const selectionOnly = input.selectionOnly === true;
    const allFeatures = resolution.panel.getFeatures();
    const features = selectionOnly
      ? resolveSelection(this.deps, resolution.panel).features
      : allFeatures;

    const extent = resolution.plot.timeExtent;
    const timeSpan: TimeSpan | null =
      extent.length === 2 ? { start: extent[0], end: extent[1] } : null;

    const summary = buildPlotSummary({
      plotId: resolution.plotId,
      title: resolution.title,
      timeSpan,
      features,
      openPlots: listOpenPlots(this.deps),
      selectionOnly,
    });

    this.telemetry.record({
      tool: 'summarizeCurrentPlot',
      input,
      validation: 'accepted',
      retries: 0,
      confirmation: 'not_required',
      latencyMs: { total: Date.now() - start },
      activeModel: ctx.activeModel,
      primingEnabled: ctx.primingEnabled,
      outcome: 'ok',
    });

    return jsonResult(summary);
  }
}
