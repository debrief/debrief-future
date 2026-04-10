/**
 * Regression: executeTool must route dataset-carrier features to the
 * Results panel in-memory only, and must NOT auto-persist them to STAC.
 *
 * This test reproduces the user-reported bug where running `range-bearing`
 * (which returns a synthetic carrier Feature with `__datasets` in its
 * properties) was calling `stacService.addFeatures()` with the carrier
 * feature, thereby writing a point at (0,0) + the full dataset into the
 * plot's main GeoJSON asset.  Saves should be explicit (FR-009): only
 * clicking Save / Save As in the Results panel should touch disk.
 *
 * Feature: 178-vscode-tabular-results
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { createExecuteToolCommand } from '../../src/commands/executeTool';
import type { CalcService } from '../../src/services/calcService';
import type { StacService } from '../../src/services/stacService';
import type { ToolMatchAdapter } from '../../src/services/toolMatchAdapter';
import type { ActivityPanelViewProvider } from '../../src/views/activityPanelView';
import type { LayersTreeProvider } from '../../src/providers/layersTreeProvider';
import type { LogService } from '@debrief/session-state';
import type { ResultsPanelService } from '../../src/services/resultsPanelService';
import type { MapPanel } from '../../src/webview/mapPanel';
import type { ToolExecutionResult } from '../../src/types/tool';

// The `vscode` module is aliased to tests/__mocks__/vscode.ts by vitest.config.ts.
// `withProgress` needs a real implementation so executeTool can await its task
// closure. `restoreMocks: true` resets implementations between tests, so we
// (re-)configure it in beforeEach.
function setupVscodeMocks(): void {
  (
    vscode.window.withProgress as unknown as ReturnType<typeof vi.fn>
  ).mockImplementation(
    async (
      _opts: unknown,
      task: (
        progress: unknown,
        token: { onCancellationRequested: (cb: () => void) => void },
      ) => Promise<unknown>,
    ): Promise<unknown> => {
      return task({}, { onCancellationRequested: () => {} });
    },
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Test fixtures
// ─────────────────────────────────────────────────────────────────────────────

const STORE_PATH = '/tmp/test-store';
const ITEM_PATH = 'exercise-alpha/item.json';
const SELECTED_IDS = ['track-1', 'track-2'];
const TOOL_ID = 'range-bearing';

/**
 * Synthetic range-bearing tool result: a single carrier feature (Point [0,0])
 * with `__datasets` containing two DatasetEnvelopes.  Mirrors what the real
 * Python `range_bearing.py` tool emits.
 */
function rangeBearingResult(): ToolExecutionResult {
  return {
    success: true,
    durationMs: 120,
    resultType: 'addition/range_bearing_series',
    label: 'Range & Bearing: track-1 → track-2',
    sourceFeatureIds: SELECTED_IDS,
    features: {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          id: 'rb-abc123',
          geometry: {
            type: 'Point',
            coordinates: [0, 0],
          },
          properties: {
            name: 'Range & Bearing: track-1 → track-2',
            from_feature: 'track-1',
            to_feature: 'track-2',
            __datasets: [
              {
                type: 'range_bearing_series',
                title: 'Range: track-1 → track-2',
                metadata: {
                  xAxis: { label: 'Time', type: 'temporal' },
                  yAxis: { label: 'Range', type: 'quantitative', units: 'nm' },
                },
                series: [
                  {
                    name: 'track-1 → track-2',
                    data: [
                      { time: '2024-01-01T00:00:00Z', value: 12.5 },
                      { time: '2024-01-01T00:05:00Z', value: 11.9 },
                    ],
                  },
                ],
              },
              {
                type: 'range_bearing_series',
                title: 'Bearing: track-1 → track-2',
                metadata: {
                  xAxis: { label: 'Time', type: 'temporal' },
                  yAxis: { label: 'Bearing', type: 'quantitative', units: '°' },
                },
                series: [
                  {
                    name: 'track-1 → track-2',
                    data: [
                      { time: '2024-01-01T00:00:00Z', value: 45 },
                      { time: '2024-01-01T00:05:00Z', value: 48 },
                    ],
                  },
                ],
              },
            ],
          },
        },
      ],
    },
  };
}

/** A buffer-tool result — real spatial features, no dataset carriers. */
function bufferToolResult(): ToolExecutionResult {
  return {
    success: true,
    durationMs: 80,
    resultType: 'addition/buffer',
    sourceFeatureIds: ['track-1'],
    features: {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          id: 'buf-1',
          geometry: {
            type: 'Polygon',
            coordinates: [[[-1, 50], [-1, 51], [0, 51], [0, 50], [-1, 50]]],
          },
          properties: { name: 'Buffer around track-1' },
        },
      ],
    },
  };
}

interface Harness {
  runTool: (toolId: string) => Promise<void>;
  stacService: StacService;
  logService: LogService;
  resultsPanelService: ResultsPanelService;
  activityPanelProvider: ActivityPanelViewProvider;
  layersTreeProvider: LayersTreeProvider;
  mapPanel: MapPanel;
}

function buildHarness(mockedResult: ToolExecutionResult): Harness {
  // CalcService mock — executeTool + createResultLayer
  const calcService = {
    executeTool: vi.fn().mockResolvedValue(mockedResult),
    createResultLayer: vi.fn((toolId: string, execId: string, result: ToolExecutionResult) => {
      if (!result.features || result.features.features.length === 0) {
        return null;
      }
      return {
        id: `layer-${execId}`,
        name: toolId,
        toolId,
        toolName: toolId,
        executionId: execId,
        features: result.features,
        style: { strokeColor: '#000', strokeWidth: 2, fillColor: '#ccc', fillOpacity: 0.3, dashArray: null },
        visible: true,
        createdAt: new Date().toISOString(),
        zIndex: 100,
      };
    }),
    getCurrentExecution: vi.fn().mockReturnValue({ id: 'exec-1' }),
    cancelExecution: vi.fn(),
  } as unknown as CalcService;

  // StacService mock — this is the one we assert on
  const stacService = {
    addFeatures: vi.fn().mockResolvedValue(undefined),
    addResultAsset: vi.fn().mockResolvedValue('/tmp/asset.csv'),
    writeGeoJson: vi.fn().mockResolvedValue(undefined),
    loadGeoJsonForItem: vi.fn().mockResolvedValue(null),
    deleteResultAsset: vi.fn().mockResolvedValue(true),
  } as unknown as StacService;

  // LogService mock — we want to observe `recordToolResult` but also
  // provide a realistic return shape so executeTool keeps going.
  const recordedLogs: Array<{ toolResult: unknown; features: unknown }> = [];
  const logService = {
    recordToolResult: vi.fn(async (toolResult: { features?: unknown }) => {
      recordedLogs.push({ toolResult, features: toolResult.features });
      return { activity_id: `act-${recordedLogs.length}`, features_updated: 0, entries: [] };
    }),
    recordFileSaved: vi.fn(),
    getTimeline: vi.fn().mockResolvedValue([]),
  } as unknown as LogService;

  // ToolMatchAdapter mock
  const toolMatchAdapter = {
    getSelectedFeatureIds: vi.fn().mockReturnValue(SELECTED_IDS),
    getAllTools: vi.fn().mockReturnValue([
      { id: TOOL_ID, name: 'Range Bearing', parameters: [] },
      { id: 'buffer', name: 'Buffer', parameters: [] },
    ]),
  } as unknown as ToolMatchAdapter;

  // LayersTreeProvider mock
  const layersTreeProvider = {
    addResultLayer: vi.fn(),
  } as unknown as LayersTreeProvider;

  // ActivityPanelViewProvider mock
  const activityPanelProvider = {
    addResultFile: vi.fn(),
  } as unknown as ActivityPanelViewProvider;

  // MapPanel mock
  const getFeatures = vi.fn().mockReturnValue([]);
  const getCurrentStore = vi.fn().mockReturnValue({ path: STORE_PATH });
  const getCurrentPlot = vi.fn().mockReturnValue({ itemPath: ITEM_PATH });
  const mapPanel = {
    getFeatures,
    getCurrentStore,
    getCurrentPlot,
    getLogService: vi.fn().mockReturnValue(logService),
    addResultLayer: vi.fn(),
    updatePlotFeatures: vi.fn(),
  } as unknown as MapPanel;

  // ResultsPanelService mock — the bit we want the carrier features
  // to end up in.
  const resultsPanelService = {
    addDatasetsForToolResult: vi.fn(),
    addErrorTab: vi.fn(),
    handleSave: vi.fn(),
    handleSaveAs: vi.fn(),
    handleRetry: vi.fn(),
    handleCloseTab: vi.fn(),
    openSavedFile: vi.fn(),
    dispose: vi.fn(),
  } as unknown as ResultsPanelService;

  const command = createExecuteToolCommand(
    calcService,
    toolMatchAdapter,
    () => mapPanel,
    layersTreeProvider,
    stacService,
    activityPanelProvider,
    undefined,
    undefined,
    undefined,
    resultsPanelService,
  );

  return {
    runTool: (toolId: string) => command(toolId),
    stacService,
    logService,
    resultsPanelService,
    activityPanelProvider,
    layersTreeProvider,
    mapPanel,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('executeTool — dataset-carrier routing (Feature 178)', () => {
  // `mockReset: true` in vitest.config.ts wipes mock implementations
  // between tests, so re-apply withProgress at every test level.
  beforeEach(() => {
    setupVscodeMocks();
  });

  describe('dataset-only tool result (range-bearing)', () => {
    let harness: Harness;

    beforeEach(async () => {
      harness = buildHarness(rangeBearingResult());
      await harness.runTool(TOOL_ID);
    });

    it('does NOT call stacService.addFeatures for dataset carriers (FR-009, user-reported bug)', () => {
      expect(harness.stacService.addFeatures).not.toHaveBeenCalled();
    });

    it('does NOT add a map layer for dataset carriers', () => {
      expect(harness.mapPanel.addResultLayer).not.toHaveBeenCalled();
      expect(harness.layersTreeProvider.addResultLayer).not.toHaveBeenCalled();
    });

    it('DOES route the carrier features to ResultsPanelService.addDatasetsForToolResult', () => {
      expect(harness.resultsPanelService.addDatasetsForToolResult).toHaveBeenCalledTimes(1);
      const call = (harness.resultsPanelService.addDatasetsForToolResult as unknown as { mock: { calls: unknown[][] } }).mock.calls[0];
      const args = call![0] as {
        toolId: string;
        result: { features: { features: unknown[] } };
        parentActivityId: string;
      };
      expect(args.toolId).toBe(TOOL_ID);
      expect(args.result.features.features).toHaveLength(1);
      expect(args.parentActivityId).toBe('act-1');
    });

    it('DOES record a ToolRunEvent in the log (so FileSavedEvent can link later)', () => {
      expect(harness.logService.recordToolResult).toHaveBeenCalledTimes(1);
    });
  });

  describe('map-only tool result (buffer)', () => {
    let harness: Harness;

    beforeEach(async () => {
      harness = buildHarness(bufferToolResult());
      await harness.runTool('buffer');
    });

    it('DOES call stacService.addFeatures for real map features (regression guard)', () => {
      expect(harness.stacService.addFeatures).toHaveBeenCalledTimes(1);
      const call = (harness.stacService.addFeatures as unknown as { mock: { calls: unknown[][] } }).mock.calls[0];
      // (storePath, itemPath, features)
      expect(call![0]).toBe(STORE_PATH);
      expect(call![1]).toBe(ITEM_PATH);
      const features = call![2] as Array<{ geometry: { type: string } }>;
      expect(features).toHaveLength(1);
      expect(features[0]!.geometry.type).toBe('Polygon');
    });

    it('DOES add a map layer for real spatial results', () => {
      expect(harness.mapPanel.addResultLayer).toHaveBeenCalledTimes(1);
      expect(harness.layersTreeProvider.addResultLayer).toHaveBeenCalledTimes(1);
    });

    it('does NOT route map-only features into the Results panel', () => {
      expect(harness.resultsPanelService.addDatasetsForToolResult).not.toHaveBeenCalled();
    });
  });
});
