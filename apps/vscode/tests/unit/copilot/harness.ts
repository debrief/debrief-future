/**
 * Mocked-LM test harness for the Copilot spike tools (#284, T009 / FR-021).
 *
 * Builds a fully-stubbed `CopilotToolDeps`, fake `LanguageModelToolInvocation*`
 * options, a capturing telemetry writer, and small feature/tool/catalog
 * fixtures so each tool's `invoke`/`prepareInvocation` can be asserted against
 * mocked service dependencies without a real model, Python, or filesystem.
 */

import { vi } from 'vitest';
// The `vscode` import resolves to tests/__mocks__/vscode.ts via the vitest alias.
import {
  LanguageModelTextPart,
  LanguageModelToolResult,
  CancellationTokenSource,
} from 'vscode';
import type { CopilotToolDeps } from '../../../src/copilot/deps';
import type {
  TelemetryWriter,
} from '../../../src/copilot/telemetry';
import type {
  TelemetryRecord,
  TelemetryRecordDraft,
} from '../../../src/copilot/types';
import type { RunContext } from '../../../src/copilot/runContext';
import type { Tool, ToolExecutionResult } from '../../../src/types/tool';
import type { StacItemSummary } from '../../../src/types/stac';
import type { DebriefFeature } from '@debrief/schemas';

/** A capturing telemetry writer plus the list it appends to. */
export function captureTelemetry(): {
  writer: TelemetryWriter;
  records: TelemetryRecord[];
} {
  const records: TelemetryRecord[] = [];
  const writer: TelemetryWriter = {
    record(draft: TelemetryRecordDraft): TelemetryRecord {
      const full: TelemetryRecord = { ts: '2026-07-11T00:00:00.000Z', ...draft };
      records.push(full);
      return full;
    },
  };
  return { writer, records };
}

/** A fixed run context for deterministic telemetry assertions. */
export const TEST_RUN_CONTEXT: RunContext = {
  activeModel: 'test-model',
  primingEnabled: true,
};

/** The run-context provider used by the tests. */
export const testRunContext = (): RunContext => TEST_RUN_CONTEXT;

/** Extract the concatenated text from a tool result. */
export function resultText(result: unknown): string {
  if (!(result instanceof LanguageModelToolResult)) {
    return '';
  }
  return result.content
    .filter((p): p is InstanceType<typeof LanguageModelTextPart> =>
      p instanceof LanguageModelTextPart,
    )
    .map((p) => p.value)
    .join('');
}

/** Parse a JSON tool result into a typed value. */
export function resultJson<T = unknown>(result: unknown): T {
  return JSON.parse(resultText(result)) as T;
}

/** Build fake `LanguageModelToolInvocationOptions` around an input. */
export function invocationOptions<T>(input: T): { input: T; toolInvocationToken: undefined } {
  return { input, toolInvocationToken: undefined };
}

/** A cancellation token for `invoke` calls. */
export function cancellationToken(): InstanceType<typeof CancellationTokenSource>['token'] {
  return new CancellationTokenSource().token;
}

// ─── Fixtures ────────────────────────────────────────────────────────────────

/** A minimal track feature (only the fields the tools read). */
export function trackFixture(
  overrides: Partial<{
    id: string;
    platform_name: string;
    platform_id: string;
    start_time: string;
    end_time: string;
    positions: unknown[];
  }> = {},
): DebriefFeature {
  const o = {
    id: 'track-1',
    platform_name: 'HMS Nelson',
    platform_id: 'NELSON',
    start_time: '2026-03-01T00:00:00Z',
    end_time: '2026-03-01T06:00:00Z',
    positions: [{}, {}, {}],
    ...overrides,
  };
  return {
    type: 'Feature',
    id: o.id,
    geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1]] },
    properties: {
      kind: 'TRACK',
      platform_id: o.platform_id,
      platform_name: o.platform_name,
      track_type: 'SOLUTION',
      start_time: o.start_time,
      end_time: o.end_time,
      positions: o.positions,
    },
  } as unknown as DebriefFeature;
}

/** A minimal reference-location (point) feature. */
export function pointFixture(
  overrides: Partial<{ id: string; label: string }> = {},
): DebriefFeature {
  const o = { id: 'point-1', label: 'Datum A', ...overrides };
  return {
    type: 'Feature',
    id: o.id,
    geometry: { type: 'Point', coordinates: [2, 2] },
    properties: { kind: 'POINT', label: o.label },
  } as unknown as DebriefFeature;
}

/** A registry tool fixture. */
export function toolFixture(overrides: Partial<Tool> = {}): Tool {
  return {
    id: 'set-track-color',
    name: 'Set Track Color',
    description: 'Recolour selected tracks',
    version: '1.0.0',
    category: 'style',
    requirements: [],
    parameters: [
      {
        name: 'color',
        valueType: 'string',
        description: 'Hex or named colour',
        required: true,
      },
    ],
    ...overrides,
  } as Tool;
}

/** A STAC item-summary fixture. */
export function itemFixture(
  overrides: Partial<StacItemSummary> = {},
): StacItemSummary {
  return {
    id: 'exercise-alpha-day1',
    title: 'Exercise Alpha — Day 1',
    datetime: '2026-03-01T00:00:00Z',
    itemPath: 'items/alpha-day1/item.json',
    catalogId: 'cat-1',
    storeId: 'store-1',
    bbox: [-5, 50, 0, 55],
    startDatetime: '2026-03-01T00:00:00Z',
    endDatetime: '2026-03-01T12:00:00Z',
    platforms: [{ id: 'NELSON', name: 'HMS Nelson', vessel_type: 'submarine' }],
    tags: ['exercise'],
    featureTags: [],
    ...overrides,
  } as StacItemSummary;
}

/** Options for {@link makeDeps}. */
export interface MakeDepsOptions {
  features?: DebriefFeature[];
  selectedIds?: string[];
  tools?: Tool[];
  items?: StacItemSummary[];
  executeResult?: ToolExecutionResult;
  hasPanel?: boolean;
  openPlots?: { uri: string; title: string }[];
  plotTitle?: string;
  plotItemPath?: string;
  storeId?: string;
  storePath?: string;
}

/** A stubbed deps object plus handles to the key spies. */
export interface StubbedDeps {
  deps: CopilotToolDeps;
  spies: {
    executeTool: ReturnType<typeof vi.fn>;
    updatePlotFeatures: ReturnType<typeof vi.fn>;
    createResultLayer: ReturnType<typeof vi.fn>;
    markDirty: ReturnType<typeof vi.fn>;
    addDatasetsForToolResult: ReturnType<typeof vi.fn>;
    addErrorTab: ReturnType<typeof vi.fn>;
    recordToolResult: ReturnType<typeof vi.fn>;
    listTools: ReturnType<typeof vi.fn>;
  };
}

/** Build a fully-stubbed `CopilotToolDeps`. */
export function makeDeps(options: MakeDepsOptions = {}): StubbedDeps {
  const features = options.features ?? [trackFixture(), pointFixture()];
  const tools = options.tools ?? [toolFixture()];
  const items = options.items ?? [itemFixture()];
  const hasPanel = options.hasPanel ?? true;
  const storeId = options.storeId ?? 'store-1';
  const storePath = options.storePath ?? '/tmp/store-1';
  const plotItemPath = options.plotItemPath ?? 'items/alpha-day1/item.json';
  const plotTitle = options.plotTitle ?? 'Exercise Alpha — Day 1';

  const executeResult: ToolExecutionResult =
    options.executeResult ?? {
      success: true,
      durationMs: 12,
      resultType: 'mutation/style',
      features: { type: 'FeatureCollection', features: [] },
      modifiedFeatures: [
        { feature_id: 'track-1', changed_properties: {} },
      ],
    };

  const executeTool = vi.fn(async () => executeResult);
  const updatePlotFeatures = vi.fn();
  const createResultLayer = vi.fn(() => ({
    id: 'layer-1',
    name: 'Set Track Color',
    toolId: 'set-track-color',
    toolName: 'Set Track Color',
    executionId: 'exec-1',
    features: { type: 'FeatureCollection', features: [{ id: 'track-1' }] },
    style: {},
    visible: true,
    createdAt: '2026-07-11T00:00:00Z',
    zIndex: 100,
    provenance: {},
  }));
  const markDirty = vi.fn();
  const addDatasetsForToolResult = vi.fn();
  const addErrorTab = vi.fn();
  const recordToolResult = vi.fn(async () => ({ activity_id: 'act-1' }));
  const listTools = vi.fn(async () => tools);

  const logService = { recordToolResult };
  const panel = {
    getFeatures: () => features,
    getCurrentPlot: () =>
      ({
        id: 'alpha-day1',
        title: plotTitle,
        datetime: '2026-03-01T00:00:00Z',
        itemPath: plotItemPath,
        catalogId: 'cat-1',
        bbox: [-5, 50, 0, 55],
        timeExtent: ['2026-03-01T00:00:00Z', '2026-03-01T12:00:00Z'],
        trackCount: 1,
        locationCount: 1,
      }),
    getCurrentStore: () => ({ id: storeId, path: storePath, status: 'available' }),
    getLogService: () => logService,
    updatePlotFeatures,
  };

  const deps: CopilotToolDeps = {
    calcService: {
      listTools,
      getCurrentTools: () => tools,
      executeTool,
      createResultLayer,
      getCurrentExecution: () => ({ id: 'exec-1' }),
      cancelExecution: vi.fn(),
    },
    stacService: {
      listCatalogs: async () => [
        { id: 'cat-1', storeId, catalogPath: 'catalog.json', title: 'Catalog' },
      ],
      listItems: async () => items,
    },
    configService: {
      getStores: () => [{ id: storeId, path: storePath, status: 'available' }],
    },
    resultsPanelService: { addDatasetsForToolResult, addErrorTab },
    openPlotsService: {
      getOpenPlots: () =>
        (options.openPlots ?? [
          { uri: `stac://${storeId}/${plotItemPath}`, title: plotTitle },
        ]).map((p) => ({
          uri: p.uri,
          title: p.title,
          storeId,
          itemPath: plotItemPath,
          openedAt: '2026-07-11T00:00:00Z',
        })),
    },
    toolMatchAdapter: {
      getSelectedFeatureIds: () => options.selectedIds ?? [],
    },
    sessionManager: {
      getActiveSession: () => ({ getState: () => ({ markDirty }) }),
    },
    getMapPanel: () => (hasPanel ? panel : undefined),
  } as unknown as CopilotToolDeps;

  return {
    deps,
    spies: {
      executeTool,
      updatePlotFeatures,
      createResultLayer,
      markDirty,
      addDatasetsForToolResult,
      addErrorTab,
      recordToolResult,
      listTools,
    },
  };
}
