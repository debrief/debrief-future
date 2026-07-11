/**
 * Unit tests for `debrief_listTools.invoke` (#284, T015 / US2).
 */

import { describe, it, expect } from 'vitest';
import { ListToolsTool } from '../../../src/copilot/listToolsTool';
import {
  makeDeps,
  toolFixture,
  captureTelemetry,
  testRunContext,
  invocationOptions,
  resultJson,
} from './harness';
import type {
  ToolRegistryView,
  ToolsUnavailableResult,
} from '../../../src/copilot/types';

describe('ListToolsTool.invoke', () => {
  it('projects the live registry to ToolRegistryView[] with the mutating flag', async () => {
    const tools = [
      toolFixture({ id: 'set-track-color', category: 'style' }),
      toolFixture({ id: 'track-stats', name: 'Track Stats', category: 'calc' }),
    ];
    const { deps } = makeDeps({ tools });
    const { writer } = captureTelemetry();
    const tool = new ListToolsTool(deps, writer, testRunContext);

    const view = resultJson<ToolRegistryView[]>(
      await tool.invoke(invocationOptions({})),
    );

    expect(view).toHaveLength(2);
    const style = view.find((t) => t.id === 'set-track-color');
    const calc = view.find((t) => t.id === 'track-stats');
    expect(style?.mutating).toBe(true); // style edits the plot
    expect(calc?.mutating).toBe(false); // calc is analytical
  });

  it('reports the degraded state when the registry is unavailable', async () => {
    const { deps } = makeDeps();
    deps.calcService.listTools = async () => {
      throw new Error('python env broken');
    };
    const { writer, records } = captureTelemetry();
    const tool = new ListToolsTool(deps, writer, testRunContext);

    const result = resultJson<ToolsUnavailableResult>(
      await tool.invoke(invocationOptions({})),
    );

    expect(result.toolsUnavailable).toBe(true);
    expect(result.reason).toContain('python env broken');
    expect(records[0].outcome).toMatchObject({ error: expect.any(String) });
  });
});
