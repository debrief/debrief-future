/**
 * @vitest-environment node
 *
 * saveSession honest-reporting / ordering tests (#268 US2 — contract C3,
 * SC-003). Success (cleared dirty flag + "Plot saved") MUST appear only AFTER
 * the whole save unit has committed; a rejected commit MUST surface a failure,
 * keep the plot dirty, and show no success message.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { StacWriterError, type StacWriter } from '@debrief/stac-writer';
import { createSaveSessionCommand } from '../../src/commands/saveSession';
import type { SessionManager } from '../../src/services/sessionManager';
import type { MapPanel } from '../../src/webview/mapPanel';

const PLOT_URI = 'stac://my-store/core--boat1/item.json';

function makeState(): Record<string, unknown> {
  return {
    currentTime: null,
    timeRange: null,
    timeFilter: null,
    stepSize: { value: 1, unit: 'minute' },
    playbackRate: 1,
    displayMode: 'full',
    viewport: null,
    rotation: 0,
    featureCollectionUri: null,
    selection: { featureIds: [], primary: null, timestamp: { epoch: 0, iso: '1970-01-01T00:00:00.000Z' } },
    hiddenFeatureIds: [],
    markClean: vi.fn(),
  };
}

function build(opts: {
  storePath: string;
  commitPlotSave: ReturnType<typeof vi.fn>;
  state: Record<string, unknown>;
}) {
  const sessionManager = {
    getActiveSession: () => ({ getState: () => opts.state }),
    getActiveDocumentUri: () => PLOT_URI,
  } as unknown as SessionManager;
  const mapPanel = {
    requestThumbnailCapture: vi.fn().mockResolvedValue({ largePngBase64: '', smallPngBase64: '' }),
    getCurrentFeatures: vi.fn().mockReturnValue([]),
  } as unknown as MapPanel;
  const getStacWriter = vi
    .fn()
    .mockReturnValue({ commitPlotSave: opts.commitPlotSave } as Partial<StacWriter> as StacWriter);
  return createSaveSessionCommand(sessionManager, () => opts.storePath, () => mapPanel, getStacWriter);
}

describe('saveSession reporting order (#268 US2)', () => {
  let storePath: string;

  beforeEach(() => {
    vi.clearAllMocks();
    storePath = fs.mkdtempSync(path.join(os.tmpdir(), 'debrief-report-'));
    fs.mkdirSync(path.join(storePath, 'core--boat1'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(storePath, { recursive: true, force: true });
  });

  it('markClean + "Plot saved" fire strictly AFTER commitPlotSave resolves', async () => {
    const commitPlotSave = vi.fn().mockResolvedValue({
      featuresPath: 'core--boat1/features.geojson',
      thumbnailPath: null,
      overviewPath: null,
    });
    const state = makeState();
    await build({ storePath, commitPlotSave, state })();

    const markClean = state.markClean as ReturnType<typeof vi.fn>;
    const showInfo = vscode.window.showInformationMessage as unknown as ReturnType<typeof vi.fn>;
    expect(commitPlotSave).toHaveBeenCalledTimes(1);
    expect(markClean).toHaveBeenCalledTimes(1);
    expect(showInfo).toHaveBeenCalledWith('Plot saved');

    // Strict ordering via global mock invocation order.
    const commitOrder = commitPlotSave.mock.invocationCallOrder[0]!;
    const markCleanOrder = markClean.mock.invocationCallOrder[0]!;
    const successOrder = showInfo.mock.invocationCallOrder[0]!;
    expect(commitOrder).toBeLessThan(markCleanOrder);
    expect(markCleanOrder).toBeLessThan(successOrder);
  });

  it('a rejected commit shows a failure, keeps dirty, and shows NO success (SC-003)', async () => {
    const commitPlotSave = vi
      .fn()
      .mockRejectedValue(new StacWriterError('write-failed', 'disk full', { path: 'core--boat1/item.json' }));
    const state = makeState();
    await build({ storePath, commitPlotSave, state })();

    const markClean = state.markClean as ReturnType<typeof vi.fn>;
    const showInfo = vscode.window.showInformationMessage as unknown as ReturnType<typeof vi.fn>;
    const showErr = vscode.window.showErrorMessage as unknown as ReturnType<typeof vi.fn>;

    expect(markClean).not.toHaveBeenCalled();
    // No success message for a save that did not fully commit (SC-003).
    expect(showInfo.mock.calls.find((c) => c[0] === 'Plot saved')).toBeUndefined();
    expect(showErr).toHaveBeenCalledTimes(1);
    expect(showErr.mock.calls[0]?.[0]).toMatch(/Failed to save plot: disk full/);
  });

  it('does not show success until the (slow) commit settles', async () => {
    let resolveCommit: (() => void) | undefined;
    const gate = new Promise<void>((r) => {
      resolveCommit = r;
    });
    const commitPlotSave = vi.fn().mockImplementation(async () => {
      await gate;
      return { featuresPath: 'core--boat1/features.geojson', thumbnailPath: null, overviewPath: null };
    });
    const state = makeState();
    const pending = build({ storePath, commitPlotSave, state })();

    // Let microtasks drain — the commit is still gated (unresolved).
    await Promise.resolve();
    const showInfo = vscode.window.showInformationMessage as unknown as ReturnType<typeof vi.fn>;
    expect(state.markClean as ReturnType<typeof vi.fn>).not.toHaveBeenCalled();
    expect(showInfo.mock.calls.find((c) => c[0] === 'Plot saved')).toBeUndefined();

    resolveCommit?.();
    await pending;
    expect(state.markClean as ReturnType<typeof vi.fn>).toHaveBeenCalledTimes(1);
    expect(showInfo).toHaveBeenCalledWith('Plot saved');
  });
});
