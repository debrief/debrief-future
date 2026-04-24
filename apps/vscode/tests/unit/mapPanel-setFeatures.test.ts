/**
 * @vitest-environment jsdom
 *
 * Unit tests for MapPanel.setFeatures + getCurrentFeatures (Feature 216, T201).
 *
 * The production MapPanel has a private constructor and is tightly bound to a
 * real vscode.WebviewPanel. For these pure-data-layer additions we exercise
 * the new methods against a prototype-synthesised instance so the test stays
 * focused on the contract without spinning up a full webview.
 *
 * jsdom environment is needed because `@debrief/components` transitively
 * imports Leaflet (MapView), which touches `window` at module-init time.
 */

import { describe, it, expect, vi } from 'vitest';
import { MapPanel } from '../../src/webview/mapPanel';
import type { DebriefFeature } from '@debrief/components';
import type { Plot } from '../../src/types/plot';

interface MapPanelInternals {
  currentFeatures: DebriefFeature[];
  currentPlot: Plot | null;
  postMessage: (msg: unknown) => void;
  _onFeaturesChanged: { fire: (features: DebriefFeature[]) => void };
}

function makeFeature(id: string): DebriefFeature {
  return {
    type: 'Feature',
    id,
    geometry: { type: 'Point', coordinates: [0, 0] },
    properties: { id, kind: 'REFERENCE_POINT' },
  } as unknown as DebriefFeature;
}

function makePlot(): Plot {
  return {
    id: 'plot-1',
    title: 'Test Plot',
    datetime: '2026-01-01T00:00:00.000Z',
    itemPath: 'test/item.json',
    catalogId: 'catalog-1',
    bbox: [-10, -10, 10, 10],
    timeExtent: ['2026-01-01T00:00:00.000Z', '2026-01-01T01:00:00.000Z'],
    trackCount: 0,
    locationCount: 0,
  };
}

function makePanel(plot: Plot | null, features: DebriefFeature[]): {
  panel: MapPanel;
  postMessage: ReturnType<typeof vi.fn>;
} {
  const panel = Object.create(MapPanel.prototype) as MapPanel;
  const internals = panel as unknown as MapPanelInternals;
  internals.currentPlot = plot;
  internals.currentFeatures = features;
  const postMessage = vi.fn();
  internals.postMessage = postMessage;
  internals._onFeaturesChanged = { fire: vi.fn() };
  return { panel, postMessage };
}

describe('MapPanel.setFeatures', () => {
  it('replaces currentFeatures and posts a loadPlot-style update to the webview', () => {
    const plot = makePlot();
    const { panel, postMessage } = makePanel(plot, [makeFeature('old-1')]);

    const next = [makeFeature('new-1'), makeFeature('new-2')];
    panel.setFeatures(next);

    expect(panel.getCurrentFeatures()).toHaveLength(2);
    expect(panel.getCurrentFeatures().map((f) => f.id)).toEqual(['new-1', 'new-2']);
    expect(postMessage).toHaveBeenCalledTimes(1);
    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'loadPlot',
        plot: expect.objectContaining({
          id: plot.id,
          title: plot.title,
          bbox: plot.bbox,
          timeExtent: plot.timeExtent,
        }),
      }),
    );
    const message = postMessage.mock.calls[0]![0] as {
      plot: { features: DebriefFeature[] };
    };
    expect(message.plot.features.map((f) => f.id)).toEqual(['new-1', 'new-2']);
  });

  it('does not post to webview when no plot is currently loaded', () => {
    const { panel, postMessage } = makePanel(null, []);
    panel.setFeatures([makeFeature('a')]);

    expect(panel.getCurrentFeatures().map((f) => f.id)).toEqual(['a']);
    expect(postMessage).not.toHaveBeenCalled();
  });

  it('preserves currentPlot (STAC metadata) unchanged after setFeatures', () => {
    const plot = makePlot();
    const { panel } = makePanel(plot, []);
    panel.setFeatures([makeFeature('a')]);
    expect(panel.getCurrentPlot()).toBe(plot);
  });
});

describe('MapPanel.getCurrentFeatures', () => {
  it('returns a shallow copy, not the live private array', () => {
    const original = [makeFeature('f1'), makeFeature('f2')];
    const { panel } = makePanel(makePlot(), original);

    const returned = panel.getCurrentFeatures();
    expect(returned).not.toBe(original);
    expect(returned).toEqual(original);

    returned.push(makeFeature('mutated'));
    expect(panel.getCurrentFeatures()).toHaveLength(2);
  });
});
