/**
 * Scripted-transcript replay — the SC-002 / FR-031 gate (#284, T036).
 *
 * Encodes the eight quickstart scenarios (5 happy-path + 3 fail-safe) as canned
 * tool-call sequences (the calls a model would emit) driven through the real
 * tool `invoke`/`prepareInvocation` with mocked services — no human, no LLM.
 * Each scenario asserts its expected outcome. This replay is the automated
 * stand-in for the manual Copilot demo; the live session is supplementary.
 *
 * The run also emits `evidence/telemetry.jsonl` (validated against
 * `contracts/telemetry-record.schema.json` by the evidence step) so the
 * findings report has real per-invocation records (T047).
 */

import { describe, it, expect, afterAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { commands } from 'vscode';
import { vi } from 'vitest';
import { SearchPlotsTool } from '../../../src/copilot/searchPlotsTool';
import { SummarizeCurrentPlotTool } from '../../../src/copilot/summarizeCurrentPlotTool';
import { ListToolsTool } from '../../../src/copilot/listToolsTool';
import { RunToolTool } from '../../../src/copilot/runToolTool';
import {
  makeDeps,
  toolFixture,
  itemFixture,
  captureTelemetry,
  testRunContext,
  invocationOptions,
  cancellationToken,
  resultText,
  resultJson,
} from './harness';
import type { ToolExecutionResult } from '../../../src/types/tool';
import type { TelemetryRecord } from '../../../src/copilot/types';

const allRecords: TelemetryRecord[] = [];

/** The tool registry the scenarios reference. */
const REGISTRY = [
  toolFixture({ id: 'set-track-color', name: 'Set Track Color', category: 'style' }),
  toolFixture({
    id: 'speed-filter',
    name: 'Speed Filter',
    category: 'calc',
    parameters: [
      { name: 'max-knots', valueType: 'number', description: 'Upper speed bound', required: true },
    ],
  }),
];

describe('scripted-transcript replay (8 scenarios, no human, no LLM)', () => {
  afterAll(() => {
    // Emit the telemetry evidence produced by the replay (T047).
    try {
      const evidenceDir = path.resolve(
        process.cwd(),
        '../../specs/284-copilot-plot-editing/evidence',
      );
      fs.mkdirSync(evidenceDir, { recursive: true });
      const jsonl = allRecords.map((r) => JSON.stringify(r)).join('\n') + '\n';
      fs.writeFileSync(path.join(evidenceDir, 'telemetry.jsonl'), jsonl);
    } catch {
      // Evidence emission is best-effort; never fail the gate on it.
    }
  });

  // ── Happy path ──────────────────────────────────────────────────────────────

  it('H1 — open the day-1 plot (searchPlots open:true → editor opens)', async () => {
    vi.mocked(commands.executeCommand).mockReset();
    const { deps } = makeDeps({ items: [itemFixture()], tools: REGISTRY });
    const { writer, records } = captureTelemetry();
    const tool = new SearchPlotsTool(deps, writer, testRunContext);

    await tool.invoke(invocationOptions({ text: 'Alpha', open: true }), );
    expect(commands.executeCommand).toHaveBeenCalledWith('debrief.openPlot', {
      uri: 'stac://store-1/items/alpha-day1/item.json',
    });
    allRecords.push(...records);
  });

  it('H2 — what is in this plot? (summarizeCurrentPlot → grounded inventory)', () => {
    const { deps } = makeDeps({ tools: REGISTRY });
    const { writer, records } = captureTelemetry();
    const tool = new SummarizeCurrentPlotTool(deps, writer, testRunContext);

    const summary = resultJson<{ features: unknown[]; approxTokens: number }>(
      tool.invoke(invocationOptions({})),
    );
    expect(summary.features).toHaveLength(2);
    expect(summary.approxTokens).toBeGreaterThan(0);
    allRecords.push(...records);
  });

  it('H3 — colour the submarine track red (listTools + runTool → dirty edit, no disk write)', async () => {
    const stub = makeDeps({ tools: REGISTRY, selectedIds: ['track-1'] });
    const { writer, records } = captureTelemetry();

    const list = new ListToolsTool(stub.deps, writer, testRunContext);
    resultText(await list.invoke(invocationOptions({})));

    const run = new RunToolTool(stub.deps, writer, testRunContext);
    const prepared = run.prepareInvocation({
      input: { toolId: 'set-track-color', params: { color: 'red' } },
    } as never);
    expect(prepared.confirmationMessages).toBeDefined(); // gated

    const out = await run.invoke(
      invocationOptions({
        toolId: 'set-track-color',
        params: { color: 'red' },
        utterance: 'colour the submarine track red',
      }),
      cancellationToken(),
    );
    expect(stub.spies.updatePlotFeatures).toHaveBeenCalledOnce();
    expect(stub.spies.markDirty).toHaveBeenCalledOnce();
    expect(resultText(out)).toMatch(/dirty|unsaved/i);
    allRecords.push(...records);
  });

  it('H4 — speed-filter on the selection (analytical → Results panel)', async () => {
    const analytical: ToolExecutionResult = {
      success: true,
      durationMs: 8,
      resultType: 'addition/speed-filter',
      features: { type: 'FeatureCollection', features: [] },
    };
    const stub = makeDeps({
      tools: REGISTRY,
      selectedIds: ['track-1'],
      executeResult: analytical,
    });
    const { writer, records } = captureTelemetry();
    const run = new RunToolTool(stub.deps, writer, testRunContext);

    const out = await run.invoke(
      invocationOptions({
        toolId: 'speed-filter',
        params: { 'max-knots': 5 },
        scope: 'selection',
      }),
      cancellationToken(),
    );
    expect(stub.spies.addDatasetsForToolResult).toHaveBeenCalledOnce();
    expect(resultText(out)).toMatch(/Results panel/i);
    allRecords.push(...records);
  });

  it('H5 — summarise the selection (selectionOnly summary)', () => {
    const { deps } = makeDeps({ tools: REGISTRY, selectedIds: ['track-1'] });
    const { writer, records } = captureTelemetry();
    const tool = new SummarizeCurrentPlotTool(deps, writer, testRunContext);

    const summary = resultJson<{ features: unknown[]; selectionOnly?: boolean }>(
      tool.invoke(invocationOptions({ selectionOnly: true })),
    );
    expect(summary.selectionOnly).toBe(true);
    expect(summary.features).toHaveLength(1);
    allRecords.push(...records);
  });

  // ── Fail-safe ───────────────────────────────────────────────────────────────

  it('F1 — no plot open, edit requested (structured refusal, nothing runs)', async () => {
    const stub = makeDeps({ tools: REGISTRY, hasPanel: false });
    const { writer, records } = captureTelemetry();
    const run = new RunToolTool(stub.deps, writer, testRunContext);

    const out = await run.invoke(
      invocationOptions({ toolId: 'set-track-color', params: { color: 'red' } }),
      cancellationToken(),
    );
    expect(resultText(out)).toMatch(/no plot is open/i);
    expect(stub.spies.executeTool).not.toHaveBeenCalled();
    allRecords.push(...records);
  });

  it('F2 — ambiguous reference / empty selection (refuses to guess)', async () => {
    // Deterministic proxy for "colour the track" ambiguity: a selection-scoped
    // run with nothing selected refuses rather than editing a guessed track.
    const stub = makeDeps({ tools: REGISTRY, selectedIds: [] });
    const { writer, records } = captureTelemetry();
    const run = new RunToolTool(stub.deps, writer, testRunContext);

    const out = await run.invoke(
      invocationOptions({
        toolId: 'set-track-color',
        params: { color: 'red' },
        scope: 'selection',
      }),
      cancellationToken(),
    );
    expect(resultText(out)).toMatch(/nothing is selected/i);
    expect(stub.spies.updatePlotFeatures).not.toHaveBeenCalled();
    allRecords.push(...records);
  });

  it('F3 — invented tool id (corrective error, no Python spawn)', async () => {
    const stub = makeDeps({ tools: REGISTRY, selectedIds: ['track-1'] });
    const { writer, records } = captureTelemetry();
    const run = new RunToolTool(stub.deps, writer, testRunContext);

    const out = await run.invoke(
      invocationOptions({ toolId: 'make-it-pretty', params: {} }),
      cancellationToken(),
    );
    expect(resultText(out)).toMatch(/unknown tool id/i);
    expect(stub.spies.executeTool).not.toHaveBeenCalled();
    allRecords.push(...records);
  });

  it('emits a telemetry record for every scenario invocation (SC-006)', () => {
    // 8 scenarios; H3 emits 2 (listTools + runTool) → 9 records total.
    expect(allRecords.length).toBeGreaterThanOrEqual(9);
    for (const r of allRecords) {
      expect(r.ts).toBeTruthy();
      expect(r.activeModel).toBe('test-model');
    }
  });
});
