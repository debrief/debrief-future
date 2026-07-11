/**
 * Unit tests for `debrief_searchPlots.invoke` (#284, T011 / US1).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { commands } from 'vscode';
import { SearchPlotsTool } from '../../../src/copilot/searchPlotsTool';
import {
  makeDeps,
  itemFixture,
  captureTelemetry,
  testRunContext,
  invocationOptions,
  resultJson,
} from './harness';

describe('SearchPlotsTool.invoke', () => {
  beforeEach(() => {
    vi.mocked(commands.executeCommand).mockReset();
  });

  it('delegates to the filter and returns PlotMatch[]', async () => {
    const { deps } = makeDeps({ items: [itemFixture()] });
    const { writer } = captureTelemetry();
    const tool = new SearchPlotsTool(deps, writer, testRunContext);

    const result = await tool.invoke(invocationOptions({ text: 'Alpha' }));
    const parsed = resultJson<{ matches: { plotId: string }[] }>(result);

    expect(parsed.matches).toHaveLength(1);
    expect(parsed.matches[0].plotId).toBe('stac://store-1/items/alpha-day1/item.json');
  });

  it('opens the plot via debrief.openPlot on a single open:true match', async () => {
    const { deps } = makeDeps({ items: [itemFixture()] });
    const { writer } = captureTelemetry();
    const tool = new SearchPlotsTool(deps, writer, testRunContext);

    await tool.invoke(invocationOptions({ text: 'Alpha', open: true }));

    expect(commands.executeCommand).toHaveBeenCalledWith('debrief.openPlot', {
      uri: 'stac://store-1/items/alpha-day1/item.json',
    });
  });

  it('does NOT open when multiple matches (ambiguous)', async () => {
    const items = [
      itemFixture({ id: 'a', itemPath: 'items/a/item.json', title: 'Alpha One' }),
      itemFixture({ id: 'b', itemPath: 'items/b/item.json', title: 'Alpha Two' }),
    ];
    const { deps } = makeDeps({ items });
    const { writer } = captureTelemetry();
    const tool = new SearchPlotsTool(deps, writer, testRunContext);

    await tool.invoke(invocationOptions({ text: 'Alpha', open: true }));
    expect(commands.executeCommand).not.toHaveBeenCalled();
  });

  it('reports no matches with the applied criteria (no hallucinated plots)', async () => {
    const { deps } = makeDeps({ items: [itemFixture()] });
    const { writer } = captureTelemetry();
    const tool = new SearchPlotsTool(deps, writer, testRunContext);

    const result = await tool.invoke(invocationOptions({ text: 'nonexistent' }));
    const parsed = resultJson<{ matches: unknown[]; criteriaApplied: string[] }>(result);

    expect(parsed.matches).toEqual([]);
    expect(parsed.criteriaApplied).toContain('text ~ "nonexistent"');
  });

  it('records one telemetry entry per invocation', async () => {
    const { deps } = makeDeps({ items: [itemFixture()] });
    const { writer, records } = captureTelemetry();
    const tool = new SearchPlotsTool(deps, writer, testRunContext);

    await tool.invoke(invocationOptions({ text: 'Alpha' }));

    expect(records).toHaveLength(1);
    expect(records[0].tool).toBe('searchPlots');
    expect(records[0].confirmation).toBe('not_required');
    expect(records[0].activeModel).toBe('test-model');
  });
});
