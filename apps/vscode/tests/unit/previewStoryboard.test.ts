/**
 * Vitest for the #273 `debrief.storyboard.preview` command orchestration.
 */

import { describe, it, expect, vi } from 'vitest';
import { previewStoryboard } from '@/commands/previewStoryboard';

const STORYBOARD_ID = 'SB1';

function plotFeatures(): unknown[] {
  return [
    { type: 'Feature', id: 'SB1', geometry: null, properties: { kind: 'STORYBOARD', id: 'SB1', name: 'Live' } },
    {
      type: 'Feature',
      id: 'SC1',
      geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] },
      properties: {
        kind: 'STORYBOARD_SCENE',
        id: 'SC1',
        storyboard_id: 'SB1',
        title: 'Scene 1',
        timestamp: '2025-01-15T12:00:00Z',
        creation_order: 0,
        viewport: { center: [-4, 50], zoom: 6 },
      },
    },
  ];
}

function deps(overrides: Record<string, unknown> = {}) {
  const server = {
    setFeatures: vi.fn(),
    start: vi.fn().mockResolvedValue(54321),
    getPreviewUrl: vi.fn().mockReturnValue('http://127.0.0.1:54321/?features=features.geojson'),
    trustExternalHost: vi.fn(),
  };
  return {
    server,
    getPlotFeatures: vi.fn().mockReturnValue(plotFeatures()),
    asExternalUri: vi.fn().mockImplementation((u: string) => Promise.resolve(u)),
    openExternal: vi.fn().mockResolvedValue(true),
    showError: vi.fn(),
    ...overrides,
  };
}

describe('previewStoryboard', () => {
  it('scopes the active storyboard, seeds the server, and opens the browser', async () => {
    const d = deps();
    await previewStoryboard({ storyboardId: STORYBOARD_ID }, d);
    expect(d.server.setFeatures).toHaveBeenCalledTimes(1);
    const served = JSON.parse((d.server.setFeatures as ReturnType<typeof vi.fn>).mock.calls[0]![0]);
    expect(served.features.some((f: { properties?: { kind?: string } }) => f.properties?.kind === 'STORYBOARD')).toBe(true);
    expect(d.server.start).toHaveBeenCalled();
    expect(d.asExternalUri).toHaveBeenCalledWith('http://127.0.0.1:54321/?features=features.geojson');
    expect(d.openExternal).toHaveBeenCalledWith('http://127.0.0.1:54321/?features=features.geojson');
    expect(d.showError).not.toHaveBeenCalled();
  });

  it('C-B7: trusts the proxied host asExternalUri resolved to (Heroku/Remote)', async () => {
    const externalUrl = 'https://debrief-preview-pr-656.herokuapp.com/proxy/54321/?features=features.geojson';
    const d = deps({ asExternalUri: vi.fn().mockResolvedValue(externalUrl) });
    await previewStoryboard({ storyboardId: STORYBOARD_ID }, d);
    // The server must be told the external host *before* the tab is opened, so
    // the proxied request (foreign Host) is not 403'd as DNS-rebinding.
    expect(d.server.trustExternalHost).toHaveBeenCalledWith(externalUrl);
    expect(d.openExternal).toHaveBeenCalledWith(externalUrl);
    expect(d.showError).not.toHaveBeenCalled();
  });

  it('C-B6: refuses to launch and explains when the storyboard has no scenes', async () => {
    const onlyStoryboard = [
      { type: 'Feature', id: 'SB1', geometry: null, properties: { kind: 'STORYBOARD', id: 'SB1', name: 'Empty' } },
    ];
    const d = deps({ getPlotFeatures: vi.fn().mockReturnValue(onlyStoryboard) });
    await previewStoryboard({ storyboardId: STORYBOARD_ID }, d);
    expect(d.server.start).not.toHaveBeenCalled();
    expect(d.openExternal).not.toHaveBeenCalled();
    expect(d.showError).toHaveBeenCalledWith(expect.stringMatching(/at least one scene/i));
  });

  it('surfaces an error when the storyboard id is not in the plot', async () => {
    const d = deps();
    await previewStoryboard({ storyboardId: 'MISSING' }, d);
    expect(d.showError).toHaveBeenCalledWith(expect.stringMatching(/not found/i));
    expect(d.openExternal).not.toHaveBeenCalled();
  });

  it('FR-009: reports when the browser tab could not be opened', async () => {
    const d = deps({ openExternal: vi.fn().mockResolvedValue(false) });
    await previewStoryboard({ storyboardId: STORYBOARD_ID }, d);
    expect(d.showError).toHaveBeenCalledWith(expect.stringMatching(/could not open a browser/i));
  });
});
