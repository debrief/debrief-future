/**
 * Unit tests for the VS Code command handler shim (T034).
 *
 * Exercises the user-cancel, missing-Storyboard, plot-read failure
 * surfaces, and the happy-path notification.
 */

import { describe, it, expect, vi } from 'vitest';
import * as vscode from 'vscode';
import type { ExportHostDeps } from '@/commands/exportStoryboardAsBriefingZip';
import { exportStoryboardAsBriefingZip } from '@/commands/exportStoryboardAsBriefingZip';
import type { StoryboardPlot } from '@debrief/components/storyboard';
import type { StacItemMinimal } from '@/services/briefingZipExport';

function sb(id: string, name: string) {
  return {
    type: 'Feature' as const,
    id,
    geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] },
    properties: { kind: 'STORYBOARD', id, name, schema_version: 2 },
  };
}

function scene(id: string, sbId: string, index: number) {
  return {
    type: 'Feature' as const,
    id,
    geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] },
    properties: {
      kind: 'STORYBOARD_SCENE',
      id,
      storyboard_id: sbId,
      title: id,
      timestamp: new Date(Date.UTC(2025, 0, 15, 12, index * 5)).toISOString(),
      creation_order: index,
      viewport: { center: [0, 0], zoom: 6, bearing: 0 },
      visible_feature_ids: [],
    },
  };
}

const PLOT: StoryboardPlot = {
  type: 'FeatureCollection',
  features: [sb('SB-A', 'A'), scene('SC-A1', 'SB-A', 0)],
};

const ITEM: StacItemMinimal = {
  type: 'Feature',
  stac_version: '1.1.0',
  id: 'plot-1',
  properties: { title: 'P' },
  assets: {},
  links: [],
};

const SPA_TEMPLATE = `<!doctype html><html><body>
  <script type="application/json" id="briefing-features-data"></script>
  <script type="application/json" id="briefing-item-data"></script>
  <script type="application/json" id="briefing-config"></script>
</body></html>`;

function makeDeps(overrides: Partial<ExportHostDeps> = {}): ExportHostDeps {
  return {
    readPlot: vi.fn(async () => ({ fc: PLOT, item: ITEM, itemDir: '/tmp/item' })),
    readThumbnail: vi.fn(async () => null),
    fetchTile: vi.fn(async () => new Uint8Array([0xff])),
    readStaticBundle: vi.fn(async () =>
      new Map([
        ['index.html', new TextEncoder().encode(SPA_TEMPLATE)],
        ['assets/index.js', new TextEncoder().encode('//')],
      ]),
    ),
    writeFile: vi.fn(async () => {}),
    showSaveDialog: vi.fn(),
    showInfo: vi.fn(async () => undefined),
    showError: vi.fn(),
    logWarning: vi.fn(),
    withProgress: async (_title, task) => {
      return task({ report: () => {} });
    },
    ...overrides,
  };
}

describe('exportStoryboardAsBriefingZip', () => {
  it('is a no-op when the user cancels the destination prompt', async () => {
    const deps = makeDeps({
      showSaveDialog: vi.fn(async () => undefined),
    });
    await exportStoryboardAsBriefingZip(
      { storyboardId: 'SB-A', documentUri: vscode.Uri.file('/tmp/plot') },
      deps,
    );
    expect(deps.writeFile).not.toHaveBeenCalled();
    expect(deps.showError).not.toHaveBeenCalled();
  });

  it('surfaces an error when the plot cannot be read', async () => {
    const deps = makeDeps({
      readPlot: vi.fn(async () => {
        throw new Error('Permission denied');
      }),
    });
    await exportStoryboardAsBriefingZip(
      { storyboardId: 'SB-A', documentUri: vscode.Uri.file('/tmp/plot') },
      deps,
    );
    expect(deps.showError).toHaveBeenCalled();
    expect(deps.writeFile).not.toHaveBeenCalled();
  });

  it('surfaces an error when the Storyboard id is not in the plot', async () => {
    const deps = makeDeps();
    await exportStoryboardAsBriefingZip(
      { storyboardId: 'UNKNOWN', documentUri: vscode.Uri.file('/tmp/plot') },
      deps,
    );
    expect(deps.showError).toHaveBeenCalledWith(expect.stringMatching(/UNKNOWN/));
    expect(deps.writeFile).not.toHaveBeenCalled();
  });

  it('writes the zip and shows a success notification on the happy path', async () => {
    const dest = vscode.Uri.file('/tmp/briefing.zip');
    const deps = makeDeps({
      showSaveDialog: vi.fn(async () => dest),
    });
    await exportStoryboardAsBriefingZip(
      { storyboardId: 'SB-A', documentUri: vscode.Uri.file('/tmp/plot') },
      deps,
    );
    expect(deps.writeFile).toHaveBeenCalledTimes(1);
    const callArgs = (deps.writeFile as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(callArgs[0]).toBe(dest);
    expect(callArgs[1]).toBeInstanceOf(Uint8Array);
    expect((callArgs[1] as Uint8Array).length).toBeGreaterThan(0);
    expect(deps.showInfo).toHaveBeenCalled();
    // This path does real JSZip assembly (~4.8s solo) and tips over the 5s
    // default under full-suite load — give it head-room to avoid CI flakes.
  }, 15_000);
});
