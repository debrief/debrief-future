/**
 * Unit tests for named-feature targeting in `debrief_runTool` (#284, post-#672).
 *
 * An analyst can target a feature by name or id ("buffer the Contact track")
 * without a manual map selection. Unknown/ambiguous names are reported, never
 * guessed; the confirmation names the resolved features.
 */

import { describe, it, expect } from 'vitest';
import { RunToolTool } from '../../../src/copilot/runToolTool';
import {
  makeDeps,
  toolFixture,
  trackFixture,
  captureTelemetry,
  testRunContext,
  invocationOptions,
  cancellationToken,
  resultText,
} from './harness';

function runTool(deps: ReturnType<typeof makeDeps>['deps']) {
  const { writer } = captureTelemetry();
  return new RunToolTool(deps, writer, testRunContext);
}

describe('runTool named-feature targeting', () => {
  it('runs on an explicit featureId with no selection', async () => {
    const stub = makeDeps({ selectedIds: [] });
    const tool = runTool(stub.deps);

    await tool.invoke(
      invocationOptions({
        toolId: 'set-track-color',
        params: { color: 'red' },
        featureIds: ['track-1'],
      }),
      cancellationToken(),
    );

    expect(stub.spies.executeTool).toHaveBeenCalledWith(
      expect.objectContaining({ featureIds: ['track-1'] }),
    );
  });

  it('resolves a featureName to its id (exact, case-insensitive) with no selection', async () => {
    const stub = makeDeps({ selectedIds: [] });
    const tool = runTool(stub.deps);

    await tool.invoke(
      invocationOptions({
        toolId: 'set-track-color',
        params: { color: 'red' },
        featureNames: ['hms nelson'],
      }),
      cancellationToken(),
    );

    expect(stub.spies.executeTool).toHaveBeenCalledWith(
      expect.objectContaining({ featureIds: ['track-1'] }),
    );
  });

  it('resolves a featureName by unique substring', async () => {
    const stub = makeDeps({ selectedIds: [] });
    const tool = runTool(stub.deps);

    await tool.invoke(
      invocationOptions({
        toolId: 'set-track-color',
        params: { color: 'red' },
        featureNames: ['Nelson'],
      }),
      cancellationToken(),
    );

    expect(stub.spies.executeTool).toHaveBeenCalledWith(
      expect.objectContaining({ featureIds: ['track-1'] }),
    );
  });

  it('reports an unknown name and does not execute', async () => {
    const stub = makeDeps({ selectedIds: [] });
    const tool = runTool(stub.deps);

    const result = await tool.invoke(
      invocationOptions({
        toolId: 'set-track-color',
        params: { color: 'red' },
        featureNames: ['Nonexistent'],
      }),
      cancellationToken(),
    );

    expect(resultText(result)).toMatch(/no feature named "Nonexistent"/i);
    expect(stub.spies.executeTool).not.toHaveBeenCalled();
  });

  it('reports an ambiguous name and does not execute', async () => {
    const features = [
      trackFixture({ id: 'rx-a', platform_name: 'RX Alpha' }),
      trackFixture({ id: 'rx-b', platform_name: 'RX Beta' }),
    ];
    const stub = makeDeps({ features, selectedIds: [] });
    const tool = runTool(stub.deps);

    const result = await tool.invoke(
      invocationOptions({
        toolId: 'set-track-color',
        params: { color: 'red' },
        featureNames: ['RX'],
      }),
      cancellationToken(),
    );

    expect(resultText(result)).toMatch(/ambiguous/i);
    expect(resultText(result)).toContain('RX Alpha');
    expect(resultText(result)).toContain('RX Beta');
    expect(stub.spies.executeTool).not.toHaveBeenCalled();
  });

  it('reports an unknown featureId and does not execute', async () => {
    const stub = makeDeps({ selectedIds: [] });
    const tool = runTool(stub.deps);

    const result = await tool.invoke(
      invocationOptions({
        toolId: 'set-track-color',
        params: { color: 'red' },
        featureIds: ['ghost-99'],
      }),
      cancellationToken(),
    );

    expect(resultText(result)).toMatch(/no feature with id "ghost-99"/i);
    expect(stub.spies.executeTool).not.toHaveBeenCalled();
  });

  it('names the resolved feature in the mutating confirmation', () => {
    const stub = makeDeps({ selectedIds: [] });
    const { writer } = captureTelemetry();
    const tool = new RunToolTool(stub.deps, writer, testRunContext);

    const prepared = tool.prepareInvocation({
      input: {
        toolId: 'set-track-color',
        params: { color: 'red' },
        featureNames: ['HMS Nelson'],
      },
    } as never);

    const body = String(prepared.confirmationMessages?.message.value ?? '');
    expect(body).toContain('HMS Nelson');
  });
});
