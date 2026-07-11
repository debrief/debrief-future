/**
 * Unit tests for selection-scope wiring in `debrief_runTool` (#284, T030 / US4).
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

function runTool(deps: ReturnType<typeof makeDeps>['deps']) {
  const { writer } = captureTelemetry();
  return new RunToolTool(deps, writer, testRunContext);
}

describe('runTool selection scope (US4)', () => {
  it('passes exactly the selected feature ids to executeTool (AC-1)', async () => {
    const stub = makeDeps({ selectedIds: ['track-1'] });
    const tool = runTool(stub.deps);

    await tool.invoke(
      invocationOptions({
        toolId: 'set-track-color',
        params: { color: 'red' },
        scope: 'selection',
      }),
      cancellationToken(),
    );

    expect(stub.spies.executeTool).toHaveBeenCalledWith(
      expect.objectContaining({ featureIds: ['track-1'] }),
    );
  });

  it('returns "nothing selected" on an empty selection scope (AC-2)', async () => {
    const stub = makeDeps({ selectedIds: [] });
    const tool = runTool(stub.deps);

    const result = await tool.invoke(
      invocationOptions({
        toolId: 'set-track-color',
        params: { color: 'red' },
        scope: 'selection',
      }),
      cancellationToken(),
    );

    expect(resultText(result)).toMatch(/nothing is selected/i);
    expect(stub.spies.executeTool).not.toHaveBeenCalled();
  });

  it('defaults to selection when features are selected', async () => {
    const stub = makeDeps({ selectedIds: ['track-1'] });
    const tool = runTool(stub.deps);

    await tool.invoke(
      invocationOptions({ toolId: 'set-track-color', params: { color: 'red' } }),
      cancellationToken(),
    );

    expect(stub.spies.executeTool).toHaveBeenCalledWith(
      expect.objectContaining({ featureIds: ['track-1'] }),
    );
  });

  it('defaults to all features when nothing is selected and scope omitted', async () => {
    const stub = makeDeps({ selectedIds: [] });
    const tool = runTool(stub.deps);

    await tool.invoke(
      invocationOptions({ toolId: 'set-track-color', params: { color: 'red' } }),
      cancellationToken(),
    );

    expect(stub.spies.executeTool).toHaveBeenCalledWith(
      expect.objectContaining({ featureIds: ['track-1', 'point-1'] }),
    );
  });
});
