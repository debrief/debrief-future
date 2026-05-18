/**
 * @vitest-environment jsdom
 *
 * Unit tests for MapPanel storyboard-playback additions (#217 T130):
 *   - flyToViewport(viewport, durationMs): number
 *   - setSceneRectangles(scenes, activeStoryboardId, currentSceneId)
 *   - onFlyToComplete event + flyToComplete inbound handling
 *   - onSceneRectangleClick event + sceneRectangleClicked inbound handling
 *   - onFeaturesChanged event fires on every setFeatures call
 *
 * Uses the prototype-synthesis pattern established by
 * `mapPanel-setFeatures.test.ts` to avoid spinning up a real WebviewPanel.
 */

import { describe, it, expect, vi } from 'vitest';
import * as vscode from 'vscode';
import { MapPanel } from '../../src/webview/mapPanel';
import type { DebriefFeature } from '@debrief/components';
import type { Plot } from '../../src/types/plot';
import type { SceneFeature, Viewport } from '@debrief/schemas';

interface MapPanelInternals {
  currentFeatures: DebriefFeature[];
  currentPlot: Plot | null;
  postMessage: (msg: unknown) => void;
  flyToTokenCounter: number;
  _onSceneRectangleClick: vscode.EventEmitter<string>;
  _onFlyToComplete: vscode.EventEmitter<number>;
  _onFeaturesChanged: vscode.EventEmitter<DebriefFeature[]>;
  onSceneRectangleClick: vscode.Event<string>;
  onFlyToComplete: vscode.Event<number>;
  onFeaturesChanged: vscode.Event<DebriefFeature[]>;
  handleWebviewMessage(msg: unknown): void;
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
  internals: MapPanelInternals;
  postMessage: ReturnType<typeof vi.fn>;
} {
  const panel = Object.create(MapPanel.prototype) as MapPanel;
  const internals = panel as unknown as MapPanelInternals;
  internals.currentPlot = plot;
  internals.currentFeatures = features;
  internals.flyToTokenCounter = 0;
  internals._onSceneRectangleClick = new vscode.EventEmitter<string>();
  internals._onFlyToComplete = new vscode.EventEmitter<number>();
  internals._onFeaturesChanged = new vscode.EventEmitter<DebriefFeature[]>();
  internals.onSceneRectangleClick = internals._onSceneRectangleClick.event;
  internals.onFlyToComplete = internals._onFlyToComplete.event;
  internals.onFeaturesChanged = internals._onFeaturesChanged.event;
  const postMessage = vi.fn();
  internals.postMessage = postMessage;
  return { panel, internals, postMessage };
}

function makeScene(id: string, lonLatCorners: [number, number][]): SceneFeature {
  return {
    type: 'Feature',
    id,
    geometry: {
      type: 'Polygon',
      coordinates: [lonLatCorners.map((c) => [c[0], c[1]])],
    },
    properties: {
      id,
      kind: 'STORYBOARD_SCENE',
      storyboard_id: 'sb-1',
      viewport: { center: [lonLatCorners[0]![0], lonLatCorners[0]![1]], zoom: 10, bearing: 0 },
      timestamp: '2026-04-20T10:00:00Z',
      title: 'Scene',
      schema_version: 1,
    },
  } as unknown as SceneFeature;
}

describe('MapPanel.flyToViewport', () => {
  it('allocates fresh monotonic tokens and posts a flyTo message', () => {
    const { panel, postMessage } = makePanel(makePlot(), []);
    const vp: Viewport = { center: [-5, 50], zoom: 12, bearing: 0 };

    const token1 = panel.flyToViewport(vp, 500);
    const token2 = panel.flyToViewport(vp, 1000);

    expect(token1).toBe(1);
    expect(token2).toBe(2);
    expect(postMessage).toHaveBeenCalledTimes(2);
    expect(postMessage.mock.calls[0]![0]).toEqual({
      type: 'flyTo',
      token: 1,
      center: [50, -5],  // [lat, lng]
      zoom: 12,
      durationMs: 500,
    });
    expect(postMessage.mock.calls[1]![0]).toEqual(
      expect.objectContaining({ type: 'flyTo', token: 2, durationMs: 1000 }),
    );
  });

  it('forwards durationMs === 0 (jump-without-animation) verbatim', () => {
    const { panel, postMessage } = makePanel(makePlot(), []);
    const vp: Viewport = { center: [0, 0], zoom: 5, bearing: 0 };

    panel.flyToViewport(vp, 0);

    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'flyTo', durationMs: 0 }),
    );
  });
});

describe('MapPanel.setSceneRectangles', () => {
  it('posts a setSceneRectangles message with per-Scene polygon coordinates', () => {
    const { panel, postMessage } = makePanel(makePlot(), []);
    const scene = makeScene('scene-1', [
      [-5, 50],
      [-4, 50],
      [-4, 51],
      [-5, 51],
      [-5, 50],
    ]);

    panel.setSceneRectangles([scene], 'sb-1', 'scene-1');

    expect(postMessage).toHaveBeenCalledTimes(1);
    const msg = postMessage.mock.calls[0]![0] as {
      type: string;
      scenes: Array<{ sceneId: string; polygon: number[][][] }>;
      activeStoryboardId: string;
      currentSceneId: string;
    };
    expect(msg.type).toBe('setSceneRectangles');
    expect(msg.activeStoryboardId).toBe('sb-1');
    expect(msg.currentSceneId).toBe('scene-1');
    expect(msg.scenes).toHaveLength(1);
    expect(msg.scenes[0]!.sceneId).toBe('scene-1');
    expect(msg.scenes[0]!.polygon[0]).toHaveLength(5);
  });

  it('passing null clears the overlay', () => {
    const { panel, postMessage } = makePanel(makePlot(), []);

    panel.setSceneRectangles(null, null, null);

    expect(postMessage).toHaveBeenCalledWith({
      type: 'setSceneRectangles',
      scenes: null,
      activeStoryboardId: null,
      currentSceneId: null,
    });
  });

  it('threads `_polygon_source` provenance through the snapshot (Spec #258 / FR-006)', () => {
    const { panel, postMessage } = makePanel(makePlot(), []);
    const scene = makeScene('scene-bounds', [
      [-5, 50],
      [-4, 50],
      [-4, 51],
      [-5, 51],
      [-5, 50],
    ]);
    (scene.properties as { _polygon_source?: string })._polygon_source = 'bounds';

    panel.setSceneRectangles([scene], 'sb-1', 'scene-bounds');

    const msg = postMessage.mock.calls[0]![0] as {
      scenes: Array<{ sceneId: string; polygonSource?: string }>;
    };
    expect(msg.scenes[0]!.polygonSource).toBe('bounds');
  });

  it('omits `polygonSource` when the Scene has no provenance (legacy)', () => {
    const { panel, postMessage } = makePanel(makePlot(), []);
    const scene = makeScene('scene-legacy', [
      [-5, 50],
      [-4, 50],
      [-4, 51],
      [-5, 51],
      [-5, 50],
    ]);
    // `_polygon_source` intentionally absent — mirrors pre-#258 scenes.

    panel.setSceneRectangles([scene], 'sb-1', 'scene-legacy');

    const msg = postMessage.mock.calls[0]![0] as {
      scenes: Array<{ sceneId: string; polygonSource?: string }>;
    };
    expect(msg.scenes[0]).not.toHaveProperty('polygonSource');
  });
});

describe('MapPanel viewport echo suppression (PR #625)', () => {
  /**
   * After the user pans, the host receives `viewportChanged`, debounces
   * 100ms, then writes the new corners to session-state. The spatial
   * subscription would *then* post `setViewport(avg-centre, zoom)` back to
   * the webview — and Leaflet's `setView(avg-centre)` shifts the map off
   * the user's original pixel-centre because `avg(corners.lat) ≠
   * map.getCenter().lat` in Mercator. To break that round-trip,
   * `handleViewportChanged` primes `lastSentViewportKey` to the new
   * viewport's key *before* it writes to session-state, so the subscription
   * sees a match and skips the echo.
   */
  it('primes `lastSentViewportKey` to the new viewport before writing to session-state', () => {
    vi.useFakeTimers();
    try {
      const { panel, internals } = makePanel(makePlot(), []);
      const setViewportSpy = vi.fn();
      const sessionState = {
        viewport: null,
        setViewport: setViewportSpy,
      } as unknown as { viewport: unknown; setViewport: typeof setViewportSpy };
      (internals as unknown as { activeSession: unknown }).activeSession = {
        getState: () => sessionState,
      };

      const corners: [
        [number, number],
        [number, number],
        [number, number],
        [number, number],
      ] = [
        [-3, 51],
        [-1, 51],
        [-1, 49],
        [-3, 49],
      ];
      const handler = (panel as unknown as {
        handleViewportChanged: (vp: {
          center: [number, number];
          zoom: number;
          bounds?: [
            [number, number],
            [number, number],
            [number, number],
            [number, number],
          ];
        }) => void;
      }).handleViewportChanged.bind(panel);

      handler({ center: [50, -2], zoom: 10, bounds: corners });
      vi.advanceTimersByTime(101); // VIEWPORT_DEBOUNCE_MS = 100

      expect(setViewportSpy).toHaveBeenCalledTimes(1);
      // Key encodes avg(corners.lat) = 50, avg(corners.lng) = -2, zoom = 10.
      const key = (panel as unknown as { lastSentViewportKey: string }).lastSentViewportKey;
      expect(key).toBe('50.000000,-2.000000,10');
    } finally {
      vi.useRealTimers();
    }
  });

  it('viewportPolygonKey is identical to the spatial-subscription centre math', () => {
    const { panel } = makePanel(makePlot(), []);
    // High-latitude case where Mercator distortion matters most. Both sites
    // use the same lat-/lng-average so the key always matches and the
    // suppression is deterministic — verify the formula here so a future
    // change to one site forces the other to follow.
    const key = (panel as unknown as {
      viewportPolygonKey: (
        coords: ReadonlyArray<{ longitude: number; latitude: number }>,
        zoom: number,
      ) => string;
    }).viewportPolygonKey(
      [
        { longitude: -10, latitude: 60 },
        { longitude: 10, latitude: 60 },
        { longitude: 10, latitude: 40 },
        { longitude: -10, latitude: 40 },
      ],
      8,
    );
    expect(key).toBe('50.000000,0.000000,8');
  });
});

describe('MapPanel event emitters', () => {
  it('onFlyToComplete fires with the correct token on flyToComplete inbound message', () => {
    const { panel, internals } = makePanel(makePlot(), []);
    const spy = vi.fn();
    panel.onFlyToComplete(spy);

    internals.handleWebviewMessage({ type: 'flyToComplete', token: 42 });

    expect(spy).toHaveBeenCalledWith(42);
  });

  it('onSceneRectangleClick fires with the correct sceneId on sceneRectangleClicked', () => {
    const { panel, internals } = makePanel(makePlot(), []);
    const spy = vi.fn();
    panel.onSceneRectangleClick(spy);

    internals.handleWebviewMessage({ type: 'sceneRectangleClicked', sceneId: 'scene-7' });

    expect(spy).toHaveBeenCalledWith('scene-7');
  });

  it('onFeaturesChanged fires on every setFeatures call', () => {
    const { panel } = makePanel(makePlot(), []);
    const spy = vi.fn();
    panel.onFeaturesChanged(spy);

    panel.setFeatures([makeFeature('a')]);
    panel.setFeatures([makeFeature('b'), makeFeature('c')]);

    expect(spy).toHaveBeenCalledTimes(2);
    expect((spy.mock.calls[0]![0] as DebriefFeature[]).map((f) => f.id)).toEqual(['a']);
    expect((spy.mock.calls[1]![0] as DebriefFeature[]).map((f) => f.id)).toEqual(['b', 'c']);
  });

  it('onFeaturesChanged fires even when currentPlot is null', () => {
    const { panel } = makePanel(null, []);
    const spy = vi.fn();
    panel.onFeaturesChanged(spy);

    panel.setFeatures([makeFeature('x')]);

    expect(spy).toHaveBeenCalledOnce();
  });
});
