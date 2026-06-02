/**
 * @vitest-environment node
 *
 * saveSession integration (#268 US1) — a writer failure during the commit
 * leaves the previously-persisted plot intact and openable, with no partial
 * state and no false success. Drives the REAL `createSaveSessionCommand` with a
 * REAL `stacWriterFs` wrapped in the shared fault-injection helper.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { createSaveSessionCommand } from '../../src/commands/saveSession';
import { createStacWriterFs } from '../../src/services/stacWriterFs';
import { StacService } from '../../src/services/stacService';
import { createFaultInjectingWriter } from './helpers/saveFaultInjection';
import type { SessionManager } from '../../src/services/sessionManager';
import type { MapPanel } from '../../src/webview/mapPanel';

const PLOT_URI = 'stac://my-store/core--boat1/item.json';

function viewStateStub(): Record<string, unknown> {
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

const V1 = {
  type: 'FeatureCollection',
  features: [{ type: 'Feature', id: 't1', geometry: { type: 'Point', coordinates: [0, 0] }, properties: { kind: 'TRACK', name: 'v1' } }],
};
const V2_FEATURES = [
  { type: 'Feature', id: 't2', geometry: { type: 'Point', coordinates: [3, 4] }, properties: { kind: 'TRACK', name: 'v2' } },
];

describe('saveSession integration — writer failure preserves the previous plot (#268 US1)', () => {
  let storePath: string;
  let itemJson: string;
  let featuresPath: string;

  beforeEach(() => {
    vi.clearAllMocks();
    storePath = fs.mkdtempSync(path.join(os.tmpdir(), 'debrief-savesess-commit-'));
    fs.mkdirSync(path.join(storePath, 'core--boat1'), { recursive: true });
    itemJson = path.join(storePath, 'core--boat1', 'item.json');
    featuresPath = path.join(storePath, 'core--boat1', 'features.geojson');
    fs.writeFileSync(
      itemJson,
      `${JSON.stringify({ type: 'Feature', stac_version: '1.1.0', id: 'boat1', geometry: { type: 'Point', coordinates: [0, 0] }, bbox: [0, 0, 0, 0], properties: { datetime: '2024-01-01T00:00:00Z', title: 'Boat 1' }, links: [], assets: {} }, null, 2)}\n`,
    );
    fs.writeFileSync(featuresPath, `${JSON.stringify(V1, null, 2)}\n`);
  });

  afterEach(() => {
    fs.rmSync(storePath, { recursive: true, force: true });
  });

  it('a rejected commit surfaces a failure, keeps the plot dirty, and leaves both files byte-identical', async () => {
    const itemBefore = fs.readFileSync(itemJson);
    const fcBefore = fs.readFileSync(featuresPath);

    const state = viewStateStub();
    const sessionManager = {
      getActiveSession: () => ({ getState: () => state }),
      getActiveDocumentUri: () => PLOT_URI,
    } as unknown as SessionManager;
    const mapPanel = {
      requestThumbnailCapture: vi.fn().mockResolvedValue({ largePngBase64: '', smallPngBase64: '' }),
      getCurrentFeatures: vi.fn().mockReturnValue(V2_FEATURES),
    } as unknown as MapPanel;

    // Real fs adaptor, wrapped so commitPlotSave rejects as if the store were
    // read-only — the previously-persisted plot must be left untouched.
    const realWriter = createStacWriterFs({ storePath, stacService: new StacService() });
    const faultyWriter = createFaultInjectingWriter(realWriter, {
      method: 'commitPlotSave',
      failOnCall: 1,
      kind: 'read-only-fs',
      message: 'simulated read-only filesystem',
    });

    const command = createSaveSessionCommand(
      sessionManager,
      () => storePath,
      () => mapPanel,
      () => faultyWriter,
    );
    await command();

    // Failure surfaced, no success, dirty retained.
    const showErr = vscode.window.showErrorMessage as unknown as ReturnType<typeof vi.fn>;
    expect(showErr).toHaveBeenCalledTimes(1);
    expect(showErr.mock.calls[0]?.[0]).toMatch(/Failed to save plot/);
    expect(state.markClean as ReturnType<typeof vi.fn>).not.toHaveBeenCalled();

    // Previous version intact + openable (byte-identical) — no partial.
    expect(fs.readFileSync(itemJson).equals(itemBefore)).toBe(true);
    expect(fs.readFileSync(featuresPath).equals(fcBefore)).toBe(true);
    expect(JSON.parse(fs.readFileSync(featuresPath, 'utf8'))).toMatchObject({
      features: [{ properties: { name: 'v1' } }],
    });
    // No stray temps / journal from the aborted save.
    expect(fs.readdirSync(path.join(storePath, 'core--boat1')).filter((f) => f.endsWith('.tmp') || f.endsWith('.save-journal.json'))).toEqual([]);
  });

  it('a clean save through the same path commits the new version', async () => {
    const state = viewStateStub();
    const sessionManager = {
      getActiveSession: () => ({ getState: () => state }),
      getActiveDocumentUri: () => PLOT_URI,
    } as unknown as SessionManager;
    const mapPanel = {
      requestThumbnailCapture: vi.fn().mockResolvedValue({ largePngBase64: '', smallPngBase64: '' }),
      getCurrentFeatures: vi.fn().mockReturnValue(V2_FEATURES),
    } as unknown as MapPanel;

    const realWriter = createStacWriterFs({ storePath, stacService: new StacService() });
    const command = createSaveSessionCommand(sessionManager, () => storePath, () => mapPanel, () => realWriter);
    await command();

    expect(state.markClean as ReturnType<typeof vi.fn>).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fs.readFileSync(featuresPath, 'utf8'))).toMatchObject({
      features: [{ properties: { name: 'v2' } }],
    });
  });
});
