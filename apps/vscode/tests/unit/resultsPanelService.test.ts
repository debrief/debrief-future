/**
 * Unit tests for ResultsPanelService.
 *
 * Feature: 178-vscode-tabular-results
 *
 * Covers:
 *   - US1: addDatasetsForToolResult creates tabs from __datasets + statistics
 *   - US1: first tab triggers visibility; close-last hides
 *   - US2: handleSave writes CSV, records FileSavedEvent, transitions state
 *   - US2: STAC failure leaves tab in error state
 *   - US5: addErrorTab creates error tab without recording provenance
 *   - US5: handleRetry removes the failed tab
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ResultsPanelService, type ResultsPanelServiceDeps } from '../../src/services/resultsPanelService';
import type { LogService } from '@debrief/session-state';

// vscode mock — the service calls vscode.workspace.fs and vscode.window.
vi.mock('vscode', () => {
  return {
    window: {
      showInformationMessage: vi.fn(),
      showErrorMessage: vi.fn(),
      showWarningMessage: vi.fn(),
    },
    commands: {
      executeCommand: vi.fn().mockResolvedValue(undefined),
    },
    workspace: {
      fs: {
        readFile: vi.fn(),
        writeFile: vi.fn().mockResolvedValue(undefined),
      },
    },
    Uri: {
      file: (p: string) => ({ fsPath: p, path: p }),
    },
    Disposable: class { dispose() {} },
  };
});

function makeDeps(overrides?: Partial<ResultsPanelServiceDeps>): ResultsPanelServiceDeps {
  const stacService = {
    addResultAsset: vi.fn().mockResolvedValue('/mock/assets/file.csv'),
    deleteResultAsset: vi.fn().mockResolvedValue(true),
  } as unknown as ResultsPanelServiceDeps['stacService'];
  const logService = {
    recordFileSaved: vi.fn().mockResolvedValue({ activity_id: 'file-save-1' }),
  } as unknown as LogService;
  const panelView = {
    postMessage: vi.fn(),
    reveal: vi.fn().mockResolvedValue(undefined),
  };
  const activityPanelView = {
    addResultFile: vi.fn(),
  } as unknown as ResultsPanelServiceDeps['activityPanelView'];

  return {
    stacService,
    getLogService: () => logService,
    panelView,
    activityPanelView,
    sessionManager: undefined,
    ...overrides,
  };
}

const plotKey = { storePath: '/store', itemPath: 'item.json' };

describe('ResultsPanelService — addDatasetsForToolResult (US1)', () => {
  let deps: ResultsPanelServiceDeps;
  let service: ResultsPanelService;

  beforeEach(() => {
    deps = makeDeps();
    service = new ResultsPanelService(deps);
  });

  it('creates a tab per __datasets entry (FR-002)', () => {
    service.addDatasetsForToolResult({
      plotKey,
      toolId: 'range-bearing',
      result: {
        features: {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              properties: {
                __datasets: [
                  {
                    type: 'range_series',
                    title: 'Range',
                    displayHint: 'chart',
                    metadata: {
                      xAxis: { label: 'Time', type: 'temporal' },
                      yAxis: { label: 'Range', type: 'quantitative' },
                    },
                    data: [{ t: 1, r: 100 }],
                  },
                  {
                    type: 'bearing_series',
                    title: 'Bearing',
                    displayHint: 'chart',
                    metadata: {
                      xAxis: { label: 'Time', type: 'temporal' },
                      yAxis: { label: 'Bearing', type: 'quantitative' },
                    },
                    data: [{ t: 1, b: 45 }],
                  },
                ],
              },
            },
          ],
        },
      },
      sourceFeatureIds: ['track-1', 'track-2'],
      parentActivityId: 'act-parent',
    });

    const tabs = service.getTabsForTest();
    expect(tabs).toHaveLength(2);
    expect(tabs[0]!.envelope.title).toBe('Range');
    expect(tabs[1]!.envelope.title).toBe('Bearing');
    expect(tabs[0]!.state).toEqual({ kind: 'unsaved' });
  });

  it('synthesizes a table tab from properties.statistics (FR-003)', () => {
    service.addDatasetsForToolResult({
      plotKey,
      toolId: 'track-stats',
      result: {
        features: {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              properties: {
                name: 'Track Alpha',
                statistics: {
                  total_distance_nm: 12.5,
                  average_speed_kn: 8.3,
                },
              },
            },
          ],
        },
      },
      sourceFeatureIds: ['track-1'],
      parentActivityId: 'act-parent',
    });

    const tabs = service.getTabsForTest();
    expect(tabs).toHaveLength(1);
    expect(tabs[0]!.envelope.displayHint).toBe('table');
    expect(tabs[0]!.envelope.title).toBe('Track Alpha');
    expect(tabs[0]!.envelope.data).toHaveLength(2);
  });

  it('first tab triggers visibility and emits setTabs (FR-004)', () => {
    expect(service.isPanelVisibleForTest()).toBe(false);

    service.addDatasetsForToolResult({
      plotKey,
      toolId: 'track-stats',
      result: {
        features: {
          type: 'FeatureCollection',
          features: [
            { type: 'Feature', properties: { statistics: { count: 5 } } },
          ],
        },
      },
      sourceFeatureIds: ['track-1'],
      parentActivityId: 'act-parent',
    });

    expect(service.isPanelVisibleForTest()).toBe(true);
    const post = deps.panelView.postMessage as unknown as { mock: { calls: unknown[][] } };
    const types = post.mock.calls.map((c) => (c[0] as { type: string }).type);
    expect(types).toContain('results:setVisibility');
    expect(types).toContain('results:setTabs');
  });

  it('first tab calls panelView.reveal() — bootstraps the webview when the panel has never been opened (user-reported bug)', () => {
    // This is the regression test for the user-reported bug:
    // "I ran a range-bearing tool. It completed, but I didn't see the
    // range graph."  Root cause: `reveal()` was a no-op until
    // `resolveWebviewView` had fired, which only happens AFTER the user
    // manually opens the panel dock.  On first-ever-result, messages
    // would queue in `_pendingMessages` and the user would see the
    // completion toast but no panel.
    expect(deps.panelView.reveal).not.toHaveBeenCalled();

    service.addDatasetsForToolResult({
      plotKey,
      toolId: 'range-bearing',
      result: {
        features: {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              properties: {
                __datasets: [
                  {
                    type: 'range_bearing_series',
                    title: 'Range',
                    metadata: {
                      xAxis: { label: 'Time', type: 'temporal' },
                      yAxis: { label: 'Range', type: 'quantitative' },
                    },
                    series: [{ name: 'a→b', data: [{ time: 'x', value: 1 }] }],
                  },
                ],
              },
            },
          ],
        },
      },
      sourceFeatureIds: ['track-1', 'track-2'],
      parentActivityId: 'act-parent',
    });

    // The fix: reveal() is called on the first result, unconditionally.
    expect(deps.panelView.reveal).toHaveBeenCalledTimes(1);
  });

  it('subsequent tabs also call reveal() — panel may have been closed between runs', () => {
    // First tab — reveal fires.
    service.addDatasetsForToolResult({
      plotKey,
      toolId: 'track-stats',
      result: {
        features: {
          type: 'FeatureCollection',
          features: [
            { type: 'Feature', properties: { statistics: { count: 5 } } },
          ],
        },
      },
      sourceFeatureIds: ['track-1'],
      parentActivityId: 'act-1',
    });
    expect(deps.panelView.reveal).toHaveBeenCalledTimes(1);

    // Second tab — reveal fires again (panel may have been closed
    // by the user between runs; reveal() is idempotent so it's
    // always safe to call).
    service.addDatasetsForToolResult({
      plotKey,
      toolId: 'track-stats',
      result: {
        features: {
          type: 'FeatureCollection',
          features: [
            { type: 'Feature', properties: { statistics: { count: 10 } } },
          ],
        },
      },
      sourceFeatureIds: ['track-2'],
      parentActivityId: 'act-2',
    });
    expect(deps.panelView.reveal).toHaveBeenCalledTimes(2);
    expect(service.getTabsForTest()).toHaveLength(2);
  });

  it('is a no-op when the result has no datasets or statistics', () => {
    service.addDatasetsForToolResult({
      plotKey,
      toolId: 'noop',
      result: { features: { type: 'FeatureCollection', features: [] } },
      sourceFeatureIds: [],
      parentActivityId: 'act-parent',
    });
    expect(service.getTabsForTest()).toHaveLength(0);
    expect(service.isPanelVisibleForTest()).toBe(false);
  });
});

describe('ResultsPanelService — handleCloseTab (US1)', () => {
  it('hides the panel when the last tab closes (FR-006)', () => {
    const deps = makeDeps();
    const service = new ResultsPanelService(deps);

    service.addDatasetsForToolResult({
      plotKey,
      toolId: 'track-stats',
      result: {
        features: {
          type: 'FeatureCollection',
          features: [
            { type: 'Feature', properties: { statistics: { count: 1 } } },
          ],
        },
      },
      sourceFeatureIds: ['track-1'],
      parentActivityId: 'act-parent',
    });

    const tabs = service.getTabsForTest();
    expect(tabs).toHaveLength(1);
    const tabId = tabs[0]!.id;

    service.handleCloseTab(tabId);
    expect(service.getTabsForTest()).toHaveLength(0);
    expect(service.isPanelVisibleForTest()).toBe(false);
  });
});

describe('ResultsPanelService — handleSave (US2)', () => {
  let deps: ResultsPanelServiceDeps;
  let service: ResultsPanelService;

  beforeEach(() => {
    deps = makeDeps();
    service = new ResultsPanelService(deps);
    service.addDatasetsForToolResult({
      plotKey,
      toolId: 'track-stats',
      result: {
        features: {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              properties: {
                name: 'Stats',
                statistics: { total_distance_nm: 12.5 },
              },
            },
          ],
        },
      },
      sourceFeatureIds: ['track-1'],
      parentActivityId: 'act-parent',
    });
  });

  it('writes CSV via StacService and records FileSavedEvent (FR-009)', async () => {
    const tabId = service.getTabsForTest()[0]!.id;
    await service.handleSave(tabId);

    expect(deps.stacService.addResultAsset).toHaveBeenCalledWith(
      '/store',
      'item.json',
      expect.stringMatching(/^track-stats--/),
      expect.any(String),
      'text/csv',
      expect.objectContaining({
        'debrief:toolId': 'track-stats',
        'debrief:parentActivityId': 'act-parent',
      }),
    );
    expect(deps.getLogService()!.recordFileSaved).toHaveBeenCalledWith(
      '/store',
      'item.json',
      'act-parent',
      expect.stringMatching(/^assets\/track-stats--.*\.csv$/),
      expect.any(String),
    );
    expect(deps.activityPanelView.addResultFile).toHaveBeenCalled();

    const tab = service.getTabsForTest()[0]!;
    expect(tab.state.kind).toBe('saved');
    if (tab.state.kind === 'saved') {
      expect(tab.state.savedActivityId).toBe('file-save-1');
    }
  });

  it('STAC failure leaves tab in error state and no provenance recorded (FR-011)', async () => {
    (deps.stacService.addResultAsset as unknown as { mockRejectedValueOnce: (err: Error) => void })
      .mockRejectedValueOnce(new Error('STAC boom'));

    const tabId = service.getTabsForTest()[0]!.id;
    await service.handleSave(tabId);

    const tab = service.getTabsForTest()[0]!;
    expect(tab.state.kind).toBe('error');
    if (tab.state.kind === 'error') {
      expect(tab.state.message).toContain('STAC boom');
    }
    expect(deps.getLogService()!.recordFileSaved).not.toHaveBeenCalled();
  });

  it('handleSaveAs re-sanitises the base name and delegates (FR-010)', async () => {
    const tabId = service.getTabsForTest()[0]!.id;
    await service.handleSaveAs(tabId, 'My Stats!', 'v2');

    expect(deps.stacService.addResultAsset).toHaveBeenCalledWith(
      '/store',
      'item.json',
      expect.stringMatching(/^My-Stats--v2\.csv$/),
      expect.any(String),
      'text/csv',
      expect.any(Object),
    );
  });
});

describe('ResultsPanelService — addErrorTab (US5)', () => {
  it('creates an error tab without calling logService (FR-019)', () => {
    const deps = makeDeps();
    const service = new ResultsPanelService(deps);

    service.addErrorTab({
      plotKey,
      toolId: 'track-stats',
      errorMessage: 'invalid selection',
      sourceFeatureIds: ['track-1'],
    });

    const tabs = service.getTabsForTest();
    expect(tabs).toHaveLength(1);
    expect(tabs[0]!.state.kind).toBe('error');
    if (tabs[0]!.state.kind === 'error') {
      expect(tabs[0]!.state.message).toBe('invalid selection');
    }
    expect(deps.getLogService()!.recordFileSaved).not.toHaveBeenCalled();
  });
});

describe('ResultsPanelService — handleRetry (US5)', () => {
  it('removes the failed tab and re-invokes executeTool (FR-020)', async () => {
    const deps = makeDeps();
    const service = new ResultsPanelService(deps);

    service.addErrorTab({
      plotKey,
      toolId: 'track-stats',
      errorMessage: 'boom',
      sourceFeatureIds: ['track-1'],
      parameters: { foo: 'bar' },
    });

    const tabId = service.getTabsForTest()[0]!.id;
    service.handleRetry(tabId);

    expect(service.getTabsForTest()).toHaveLength(0);

    const vscode = (await import('vscode')) as unknown as {
      commands: { executeCommand: { mock: { calls: unknown[][] } } };
    };
    expect(vscode.commands.executeCommand.mock.calls.length).toBeGreaterThan(0);
  });
});
