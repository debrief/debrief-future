/**
 * Unit tests for `debrief_runTool.prepareInvocation` — the confirmation gate
 * (#284, T016 / FR-015). Mutating tools yield a plain-language confirmation;
 * analytical tools yield none.
 */

import { describe, it, expect } from 'vitest';
import { RunToolTool } from '../../../src/copilot/runToolTool';
import {
  makeDeps,
  toolFixture,
  captureTelemetry,
  testRunContext,
} from './harness';

function prepare(
  deps: ReturnType<typeof makeDeps>['deps'],
  input: unknown,
) {
  const { writer } = captureTelemetry();
  const tool = new RunToolTool(deps, writer, testRunContext);
  return tool.prepareInvocation({ input } as never);
}

describe('RunToolTool.prepareInvocation', () => {
  it('gates a mutating (style) tool with a plain-language confirmation', () => {
    const { deps } = makeDeps({
      tools: [toolFixture({ id: 'set-track-color', category: 'style' })],
      selectedIds: ['track-1'],
    });

    const prepared = prepare(deps, {
      toolId: 'set-track-color',
      params: { color: 'red' },
    });

    expect(prepared.confirmationMessages).toBeDefined();
    const body = String(prepared.confirmationMessages?.message.value ?? '');
    expect(body).toContain('Set Track Color');
    expect(body).toContain('HMS Nelson'); // target feature by name
    expect(body).toContain('color: red'); // plain-language param
    expect(body).not.toContain('{"'); // never raw JSON
  });

  it('omits confirmation for an analytical (calc) tool', () => {
    const { deps } = makeDeps({
      tools: [toolFixture({ id: 'track-stats', name: 'Track Stats', category: 'calc', parameters: [] })],
      selectedIds: ['track-1'],
    });

    const prepared = prepare(deps, { toolId: 'track-stats' });
    expect(prepared.confirmationMessages).toBeUndefined();
    expect(prepared.invocationMessage).toBe('Running Track Stats…');
  });

  it('omits confirmation for an unknown tool (invoke corrects it)', () => {
    const { deps } = makeDeps({ tools: [] });
    const prepared = prepare(deps, { toolId: 'invented-tool' });
    expect(prepared.confirmationMessages).toBeUndefined();
  });
});
