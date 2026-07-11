/**
 * Unit tests for `debrief_runTool.invoke` — validation, routing, and the
 * dirty-only / no-disk-write apply (#284, T017 / FR-011..018).
 */

import { describe, it, expect } from 'vitest';
import { RunToolTool } from '../../../src/copilot/runToolTool';
import {
  makeDeps,
  toolFixture,
  captureTelemetry,
  testRunContext,
  invocationOptions,
  cancellationToken,
  resultText,
} from './harness';
import type { ToolExecutionResult } from '../../../src/types/tool';

function runTool(deps: ReturnType<typeof makeDeps>['deps']) {
  const { writer, records } = captureTelemetry();
  const tool = new RunToolTool(deps, writer, testRunContext);
  return { tool, records };
}

describe('RunToolTool.invoke', () => {
  it('(a) rejects an unknown toolId pre-dispatch with NO executeTool call (FR-017)', async () => {
    const stub = makeDeps({ tools: [toolFixture()], selectedIds: ['track-1'] });
    const { tool } = runTool(stub.deps);

    const result = await tool.invoke(
      invocationOptions({ toolId: 'invented-tool' }),
      cancellationToken(),
    );

    expect(resultText(result)).toContain('Unknown tool id');
    expect(stub.spies.executeTool).not.toHaveBeenCalled();
  });

  it('(a) rejects invalid params pre-dispatch with NO executeTool call (FR-017)', async () => {
    const stub = makeDeps({
      tools: [toolFixture({ id: 'set-track-color' })], // requires "color"
      selectedIds: ['track-1'],
    });
    const { tool } = runTool(stub.deps);

    const result = await tool.invoke(
      invocationOptions({ toolId: 'set-track-color', params: {} }),
      cancellationToken(),
    );

    expect(resultText(result)).toContain('missing required parameter "color"');
    expect(stub.spies.executeTool).not.toHaveBeenCalled();
  });

  it('(b) applies a mutation via updatePlotFeatures + markDirty, NO disk write (FR-011)', async () => {
    const stub = makeDeps({ selectedIds: ['track-1'] });
    const { tool } = runTool(stub.deps);

    const result = await tool.invoke(
      invocationOptions({ toolId: 'set-track-color', params: { color: 'red' } }),
      cancellationToken(),
    );

    expect(stub.spies.executeTool).toHaveBeenCalledOnce();
    expect(stub.spies.updatePlotFeatures).toHaveBeenCalledOnce();
    expect(stub.spies.markDirty).toHaveBeenCalledOnce();
    // The dirty-only path never touches the Results panel for a mutation.
    expect(stub.spies.addDatasetsForToolResult).not.toHaveBeenCalled();
    expect(resultText(result)).toMatch(/dirty|unsaved/i);
  });

  it('(c) routes an analytical result to the Results panel (FR-014)', async () => {
    const analytical: ToolExecutionResult = {
      success: true,
      durationMs: 5,
      resultType: 'addition/track-statistics',
      features: { type: 'FeatureCollection', features: [] },
    };
    const stub = makeDeps({
      tools: [toolFixture({ id: 'track-stats', name: 'Track Stats', category: 'calc', parameters: [] })],
      selectedIds: ['track-1'],
      executeResult: analytical,
    });
    const { tool } = runTool(stub.deps);

    const result = await tool.invoke(
      invocationOptions({ toolId: 'track-stats' }),
      cancellationToken(),
    );

    expect(stub.spies.addDatasetsForToolResult).toHaveBeenCalledOnce();
    expect(stub.spies.updatePlotFeatures).not.toHaveBeenCalled();
    expect(resultText(result)).toMatch(/Results panel/i);
  });

  it('(d) routes a failure to addErrorTab with structured error text (FR-018)', async () => {
    const failure: ToolExecutionResult = {
      success: false,
      durationMs: 0,
      error: 'tracks have no overlapping time range',
    };
    const stub = makeDeps({
      tools: [toolFixture({ id: 'track-stats', name: 'Track Stats', category: 'calc', parameters: [] })],
      selectedIds: ['track-1'],
      executeResult: failure,
    });
    const { tool, records } = runTool(stub.deps);

    const result = await tool.invoke(
      invocationOptions({ toolId: 'track-stats' }),
      cancellationToken(),
    );

    expect(stub.spies.addErrorTab).toHaveBeenCalledOnce();
    expect(stub.spies.updatePlotFeatures).not.toHaveBeenCalled();
    expect(resultText(result)).toContain('overlapping time range');
    expect(records.at(-1)?.outcome).toMatchObject({ error: expect.any(String) });
  });

  it('(e) throws when an analytical-classified tool returns a mutation (guard, T025)', async () => {
    const sneaky: ToolExecutionResult = {
      success: true,
      durationMs: 3,
      resultType: 'mutation/style', // mutation from a calc tool → unconfirmed
      features: { type: 'FeatureCollection', features: [] },
    };
    const stub = makeDeps({
      tools: [toolFixture({ id: 'track-stats', name: 'Track Stats', category: 'calc', parameters: [] })],
      selectedIds: ['track-1'],
      executeResult: sneaky,
    });
    const { tool } = runTool(stub.deps);

    await expect(
      tool.invoke(invocationOptions({ toolId: 'track-stats' }), cancellationToken()),
    ).rejects.toThrow(/unconfirmed edit/i);
    expect(stub.spies.updatePlotFeatures).not.toHaveBeenCalled();
  });

  it('reports "no plot open" without executing (edge case)', async () => {
    const stub = makeDeps({ hasPanel: false });
    const { tool } = runTool(stub.deps);

    const result = await tool.invoke(
      invocationOptions({ toolId: 'set-track-color', params: { color: 'red' } }),
      cancellationToken(),
    );

    expect(resultText(result)).toMatch(/no plot is open/i);
    expect(stub.spies.executeTool).not.toHaveBeenCalled();
  });

  it('records provenance with the chat initiator + utterance (FR-023)', async () => {
    const stub = makeDeps({ selectedIds: ['track-1'] });
    const { tool } = runTool(stub.deps);

    await tool.invoke(
      invocationOptions({
        toolId: 'set-track-color',
        params: { color: 'red' },
        utterance: 'colour the submarine track red',
      }),
      cancellationToken(),
    );

    expect(stub.spies.recordToolResult).toHaveBeenCalledOnce();
    const expanded = stub.spies.recordToolResult.mock.calls[0][1];
    expect(expanded.parameters.__chatInitiated.value).toBe(true);
    expect(expanded.parameters.__utterance.value).toBe('colour the submarine track red');
  });
});
