/**
 * Unit tests for `debrief_summarizeCurrentPlot.invoke` (#284, T027 / US3).
 */

import { describe, it, expect } from 'vitest';
import { SummarizeCurrentPlotTool } from '../../../src/copilot/summarizeCurrentPlotTool';
import {
  makeDeps,
  captureTelemetry,
  testRunContext,
  invocationOptions,
  resultJson,
} from './harness';
import type {
  NoPlotOpenResult,
  PlotSummaryView,
} from '../../../src/copilot/types';

describe('SummarizeCurrentPlotTool.invoke', () => {
  it('summarises the active plot with openPlots present', () => {
    const { deps } = makeDeps();
    const { writer } = captureTelemetry();
    const tool = new SummarizeCurrentPlotTool(deps, writer, testRunContext);

    const summary = resultJson<PlotSummaryView>(
      tool.invoke(invocationOptions({})),
    );

    expect(summary.title).toBe('Exercise Alpha — Day 1');
    expect(summary.features).toHaveLength(2);
    expect(summary.approxTokens).toBeGreaterThan(0);
    expect(summary.openPlots).toHaveLength(1);
    expect(summary.openPlots[0].active).toBe(true);
  });

  it('returns { noPlotOpen: true } when no plot is open (US3 AC-3)', () => {
    const { deps } = makeDeps({ hasPanel: false });
    const { writer } = captureTelemetry();
    const tool = new SummarizeCurrentPlotTool(deps, writer, testRunContext);

    const result = resultJson<NoPlotOpenResult>(
      tool.invoke(invocationOptions({})),
    );

    expect(result.noPlotOpen).toBe(true);
    expect(result.hint).toMatch(/search the catalog/i);
  });

  it('summarises only the selection when selectionOnly is set (US4)', () => {
    const { deps } = makeDeps({ selectedIds: ['track-1'] });
    const { writer } = captureTelemetry();
    const tool = new SummarizeCurrentPlotTool(deps, writer, testRunContext);

    const summary = resultJson<PlotSummaryView>(
      tool.invoke(invocationOptions({ selectionOnly: true })),
    );

    expect(summary.selectionOnly).toBe(true);
    expect(summary.features).toHaveLength(1);
    expect(summary.features[0].id).toBe('track-1');
  });

  it('reports the open plots when an explicit plotId is unknown', () => {
    const { deps } = makeDeps();
    const { writer } = captureTelemetry();
    const tool = new SummarizeCurrentPlotTool(deps, writer, testRunContext);

    const result = resultJson<NoPlotOpenResult>(
      tool.invoke(invocationOptions({ plotId: 'stac://store-1/items/nope/item.json' })),
    );

    expect(result.noPlotOpen).toBe(true);
    expect(result.openPlots).toHaveLength(1);
  });
});
