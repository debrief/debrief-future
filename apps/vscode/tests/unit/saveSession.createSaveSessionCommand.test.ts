/**
 * @vitest-environment node
 *
 * Unit tests for `createSaveSessionCommand` (Feature 242).
 *
 * Targets the new `getStacWriter` injection point and the error-surface
 * behaviour around `StacWriterError` (Article I.3 — no silent partial
 * catalog writes for thumbnail persistence failures).
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
const SMALL_B64 = Buffer.from('PNG-small').toString('base64');
const LARGE_B64 = Buffer.from('PNG-large').toString('base64');

function makeSessionState(savePath: string): Record<string, unknown> {
  return {
    dirty: true,
    savePath,
    // Minimal store surface read by the feature-261 systemStateBridge during
    // save (applyStateToFeatures reads the view-state slices). With timeRange /
    // viewport null and an empty selection, no state.* features are written —
    // the save still proceeds (FR-020) and writes features.geojson.
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

function makeSession(savePath: string): { getState: () => unknown } {
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
}): MapPanel {
  return {
    requestThumbnailCapture: vi.fn().mockResolvedValue(
      opts.thumbnails ?? { largePngBase64: '', smallPngBase64: '' },
    ),
    getCurrentFeatures: vi.fn().mockReturnValue(opts.features ?? []),
  } as unknown as MapPanel;
}

describe('createSaveSessionCommand — getStacWriter wiring (#242)', () => {
  let storePath: string;
  let savePath: string;

  beforeEach(() => {
    storePath = fs.mkdtempSync(path.join(os.tmpdir(), 'debrief-savesess-'));
    fs.mkdirSync(path.join(storePath, 'core--boat1'), { recursive: true });
    savePath = path.join(storePath, 'core--boat1', 'item.debrief-session');
    vi.clearAllMocks();
  });

  afterEach(() => {
    fs.rmSync(storePath, { recursive: true, force: true });
  });

  it('routes thumbnail writes through the injected StacWriter', async () => {
    const writePlotThumbnailPair = vi.fn().mockResolvedValue({
      thumbnailPath: 'core--boat1/thumbnail.png',
      overviewPath: 'core--boat1/overview.png',
    });
    const writer: Partial<StacWriter> = { writePlotThumbnailPair };
    const getStacWriter = vi.fn().mockReturnValue(writer as StacWriter);

    const sessionManager = makeSessionManager({
      session: makeSession(savePath),
      plotUri: PLOT_URI,
    });
    const mapPanel = makeMapPanel({
      thumbnails: { largePngBase64: LARGE_B64, smallPngBase64: SMALL_B64 },
    });

    const command = createSaveSessionCommand(
      sessionManager,
      () => storePath,
      () => mapPanel,
      getStacWriter,
    );

    await command();

    expect(getStacWriter).toHaveBeenCalledWith(storePath);
    expect(writePlotThumbnailPair).toHaveBeenCalledTimes(1);
    const callArg = writePlotThumbnailPair.mock.calls[0]?.[0] as {
      stacItemPath: string;
      smallPngBase64: string;
      largePngBase64: string;
    };
    expect(callArg.stacItemPath).toBe('core--boat1/item.json');
    expect(callArg.smallPngBase64).toBe(SMALL_B64);
    expect(callArg.largePngBase64).toBe(LARGE_B64);
  });

  it('skips the writer call when no thumbnails were captured', async () => {
    const writePlotThumbnailPair = vi.fn();
    const writer: Partial<StacWriter> = { writePlotThumbnailPair };
    const getStacWriter = vi.fn().mockReturnValue(writer as StacWriter);

    const sessionManager = makeSessionManager({
      session: makeSession(savePath),
      plotUri: PLOT_URI,
    });
    // Empty base64 → falsy → writer must not be invoked.
    const mapPanel = makeMapPanel({});

    const command = createSaveSessionCommand(
      sessionManager,
      () => storePath,
      () => mapPanel,
      getStacWriter,
    );

    await command();

    expect(writePlotThumbnailPair).not.toHaveBeenCalled();
  });

  it('surfaces StacWriterError via showErrorMessage (Article I.3)', async () => {
    const writePlotThumbnailPair = vi.fn().mockRejectedValue(
      new StacWriterError(
        'write-failed',
        'simulated service-write failure',
        { path: 'core--boat1/item.json' },
      ),
    );
    const writer: Partial<StacWriter> = { writePlotThumbnailPair };
    const getStacWriter = vi.fn().mockReturnValue(writer as StacWriter);

    const sessionManager = makeSessionManager({
      session: makeSession(savePath),
      plotUri: PLOT_URI,
    });
    const mapPanel = makeMapPanel({
      thumbnails: { largePngBase64: LARGE_B64, smallPngBase64: SMALL_B64 },
    });

    const command = createSaveSessionCommand(
      sessionManager,
      () => storePath,
      () => mapPanel,
      getStacWriter,
    );

    await command();

    const showErr = vscode.window.showErrorMessage as unknown as ReturnType<typeof vi.fn>;
    expect(showErr).toHaveBeenCalledTimes(1);
    expect(showErr.mock.calls[0]?.[0]).toMatch(/Thumbnail save failed: simulated/);
  });

  it('treats non-StacWriterError exceptions as non-blocking (warn only)', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const writePlotThumbnailPair = vi.fn();
    const writer: Partial<StacWriter> = { writePlotThumbnailPair };
    const getStacWriter = vi.fn().mockReturnValue(writer as StacWriter);

    const sessionManager = makeSessionManager({
      session: makeSession(savePath),
      plotUri: PLOT_URI,
    });
    const mapPanel = {
      requestThumbnailCapture: vi
        .fn()
        .mockRejectedValue(new Error('webview busy')),
      getCurrentFeatures: vi.fn().mockReturnValue([]),
    } as unknown as MapPanel;

    const command = createSaveSessionCommand(
      sessionManager,
      () => storePath,
      () => mapPanel,
      getStacWriter,
    );

    await command();

    const showErr = vscode.window.showErrorMessage as unknown as ReturnType<typeof vi.fn>;
    expect(showErr).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
