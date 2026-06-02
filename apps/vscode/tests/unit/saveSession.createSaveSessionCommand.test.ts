/**
 * @vitest-environment node
 *
 * Unit tests for `createSaveSessionCommand` — #268 atomic-save routing.
 *
 * The save now commits the whole unit (feature collection + optional
 * thumbnails) through `StacWriter.commitPlotSave` instead of a raw
 * features.geojson write followed by a separate thumbnail write. These tests
 * assert the routing and the best-effort thumbnail-capture behaviour; the
 * success/failure reporting ORDER is covered in saveSession.reporting.test.ts.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import {
  StacWriterError,
  type CommitPlotSaveInput,
  type StacWriter,
} from '@debrief/stac-writer';
import { createSaveSessionCommand } from '../../src/commands/saveSession';
import type { SessionManager } from '../../src/services/sessionManager';
import type { MapPanel } from '../../src/webview/mapPanel';

const PLOT_URI = 'stac://my-store/core--boat1/item.json';
const SMALL_B64 = Buffer.from('PNG-small').toString('base64');
const LARGE_B64 = Buffer.from('PNG-large').toString('base64');

function makeSessionState(savePath: string): Record<string, unknown> {
  return {
    dirty: true,
    savePath,
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
    setSavePath: vi.fn(),
    markClean: vi.fn(),
  };
}

function makeSession(savePath: string): { getState: () => Record<string, unknown> } {
  const state = makeSessionState(savePath);
  return { getState: () => state };
}

function makeSessionManager(opts: {
  session: { getState: () => unknown } | null;
  plotUri: string | null;
}): SessionManager {
  return {
    getActiveSession: () => opts.session,
    getActiveDocumentUri: () => opts.plotUri,
  } as unknown as SessionManager;
}

function makeMapPanel(opts: {
  thumbnails?: { largePngBase64: string; smallPngBase64: string };
  features?: unknown[];
  captureRejects?: boolean;
}): MapPanel {
  return {
    requestThumbnailCapture: opts.captureRejects
      ? vi.fn().mockRejectedValue(new Error('webview busy'))
      : vi.fn().mockResolvedValue(opts.thumbnails ?? { largePngBase64: '', smallPngBase64: '' }),
    getCurrentFeatures: vi.fn().mockReturnValue(opts.features ?? []),
  } as unknown as MapPanel;
}

describe('createSaveSessionCommand — #268 commitPlotSave routing', () => {
  let storePath: string;
  let savePath: string;

  beforeEach(() => {
    storePath = fs.mkdtempSync(path.join(os.tmpdir(), 'debrief-savesess-'));
    fs.mkdirSync(path.join(storePath, 'core--boat1'), { recursive: true });
    savePath = path.join(storePath, 'core--boat1', 'item.json');
    vi.clearAllMocks();
  });

  afterEach(() => {
    fs.rmSync(storePath, { recursive: true, force: true });
  });

  it('commits the feature collection + thumbnails through commitPlotSave', async () => {
    const commitPlotSave = vi.fn().mockResolvedValue({
      featuresPath: 'core--boat1/features.geojson',
      thumbnailPath: 'core--boat1/thumbnail.png',
      overviewPath: 'core--boat1/overview.png',
    });
    const getStacWriter = vi.fn().mockReturnValue({ commitPlotSave } as Partial<StacWriter> as StacWriter);
    const session = makeSession(savePath);

    const command = createSaveSessionCommand(
      makeSessionManager({ session, plotUri: PLOT_URI }),
      () => storePath,
      () => makeMapPanel({ thumbnails: { largePngBase64: LARGE_B64, smallPngBase64: SMALL_B64 } }),
      getStacWriter,
    );
    await command();

    expect(getStacWriter).toHaveBeenCalledWith(storePath);
    expect(commitPlotSave).toHaveBeenCalledTimes(1);
    const arg = commitPlotSave.mock.calls[0]?.[0] as CommitPlotSaveInput;
    expect(arg.stacItemPath).toBe('core--boat1/item.json');
    expect(arg.featureCollection.type).toBe('FeatureCollection');
    expect(arg.thumbnails).toEqual({ largePngBase64: LARGE_B64, smallPngBase64: SMALL_B64 });
    expect((session.getState().markClean as ReturnType<typeof vi.fn>)).toHaveBeenCalledTimes(1);
  });

  it('still commits the feature collection when no thumbnails were captured', async () => {
    const commitPlotSave = vi.fn().mockResolvedValue({
      featuresPath: 'core--boat1/features.geojson',
      thumbnailPath: null,
      overviewPath: null,
    });
    const getStacWriter = vi.fn().mockReturnValue({ commitPlotSave } as Partial<StacWriter> as StacWriter);

    const command = createSaveSessionCommand(
      makeSessionManager({ session: makeSession(savePath), plotUri: PLOT_URI }),
      () => storePath,
      () => makeMapPanel({}), // empty base64 → no thumbnails
      getStacWriter,
    );
    await command();

    expect(commitPlotSave).toHaveBeenCalledTimes(1);
    expect((commitPlotSave.mock.calls[0]?.[0] as CommitPlotSaveInput).thumbnails).toBeUndefined();
  });

  it('surfaces a commit failure via showErrorMessage and does NOT clear the dirty flag', async () => {
    const commitPlotSave = vi.fn().mockRejectedValue(
      new StacWriterError('read-only-fs', 'simulated read-only filesystem', {
        path: 'core--boat1/item.json',
      }),
    );
    const getStacWriter = vi.fn().mockReturnValue({ commitPlotSave } as Partial<StacWriter> as StacWriter);
    const session = makeSession(savePath);

    const command = createSaveSessionCommand(
      makeSessionManager({ session, plotUri: PLOT_URI }),
      () => storePath,
      () => makeMapPanel({ thumbnails: { largePngBase64: LARGE_B64, smallPngBase64: SMALL_B64 } }),
      getStacWriter,
    );
    await command();

    const showErr = vscode.window.showErrorMessage as unknown as ReturnType<typeof vi.fn>;
    expect(showErr).toHaveBeenCalledTimes(1);
    expect(showErr.mock.calls[0]?.[0]).toMatch(/Failed to save plot: simulated read-only/);
    expect((session.getState().markClean as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
  });

  it('treats a thumbnail-capture failure as non-blocking and still commits FC-only', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const commitPlotSave = vi.fn().mockResolvedValue({
      featuresPath: 'core--boat1/features.geojson',
      thumbnailPath: null,
      overviewPath: null,
    });
    const getStacWriter = vi.fn().mockReturnValue({ commitPlotSave } as Partial<StacWriter> as StacWriter);
    const session = makeSession(savePath);

    const command = createSaveSessionCommand(
      makeSessionManager({ session, plotUri: PLOT_URI }),
      () => storePath,
      () => makeMapPanel({ captureRejects: true }),
      getStacWriter,
    );
    await command();

    const showErr = vscode.window.showErrorMessage as unknown as ReturnType<typeof vi.fn>;
    expect(showErr).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
    expect(commitPlotSave).toHaveBeenCalledTimes(1);
    expect((commitPlotSave.mock.calls[0]?.[0] as CommitPlotSaveInput).thumbnails).toBeUndefined();
    expect((session.getState().markClean as ReturnType<typeof vi.fn>)).toHaveBeenCalledTimes(1);
    warnSpy.mockRestore();
  });
});
