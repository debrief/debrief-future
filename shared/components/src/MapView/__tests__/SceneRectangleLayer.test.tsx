/**
 * Unit tests for `SceneRectangleLayer` (Feature 217 — T142).
 *
 * Covers the contract in
 * `specs/217-storyboarding-playback/contracts/scene-rectangle-layer.md`.
 * Leaflet's `Polygon` is stubbed so we can inspect the props the layer
 * passes — we don't need a real map to exercise the render logic.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { SceneRectangleLayer, computeFillOpacity, computeOverlapRanks } from '../SceneRectangleLayer';
import type { SceneFeature } from '@debrief/schemas';

// Capture rendered polygon props so tests can assert on them.
interface CapturedPolygon {
  positions: Array<[number, number]>;
  pathOptions: Record<string, unknown>;
  onClick: () => void;
}
let capturedPolygons: CapturedPolygon[] = [];

vi.mock('react-leaflet', () => ({
  Polygon: (props: {
    positions: Array<[number, number]>;
    pathOptions: Record<string, unknown>;
    eventHandlers?: { click?: (e: unknown) => void };
  }) => {
    const click = props.eventHandlers?.click ?? (() => undefined);
    capturedPolygons.push({
      positions: props.positions,
      pathOptions: props.pathOptions,
      onClick: () => click({
        originalEvent: { stopPropagation: () => undefined, preventDefault: () => undefined },
      }),
    });
    return <div data-testid="polygon" />;
  },
  // Spec #258 — SceneRectangleLayer now calls `useMap()` to recompute legacy
  // polygons. Returning a stub satisfies the hook contract; the recompute path
  // is exercised by the dedicated tests below.
  useMap: () => mockMapInstance,
}));

// Mutable in shape — individual tests can swap in different sizes / centres
// at runtime; the binding itself stays constant.
const mockMapInstance: {
  getZoom: () => number;
  getCenter: () => { lat: number; lng: number };
  getSize: () => { x: number; y: number };
  containerPointToLatLng: (point: [number, number] | { x: number; y: number }) => {
    lat: number;
    lng: number;
  };
} = {
  getZoom: () => 10,
  getCenter: () => ({ lat: 50, lng: -5 }),
  getSize: () => ({ x: 800, y: 600 }),
  containerPointToLatLng: (point) => {
    const x = Array.isArray(point) ? point[0] : point.x;
    const y = Array.isArray(point) ? point[1] : point.y;
    // Cheap linear-projection stub for testing.
    return { lat: 51 - (y / 600), lng: -6 + (x / 800) * 2 };
  },
};

// L.DomEvent.stopPropagation spy — the layer must call this on click.
const stopPropagationSpy = vi.fn();
vi.mock('leaflet', () => ({
  default: {
    DomEvent: {
      stopPropagation: (...args: unknown[]) => stopPropagationSpy(...args),
    },
  },
  DomEvent: {
    stopPropagation: (...args: unknown[]) => stopPropagationSpy(...args),
  },
}));

function makeScene(
  id: string,
  corners: Array<[number, number]>,
  timestamp = '2026-04-20T10:00:00Z',
): SceneFeature {
  // GeoJSON closing rule: last point == first point.
  const ring = [...corners, corners[0]!];
  // Default to `_polygon_source: 'bounds'` so the SceneRectangleLayer trusts
  // the stored geometry (post-#258 norm). Tests that exercise the legacy
  // recompute path explicitly use `makeSceneWithProvenance(..., undefined)`.
  return {
    type: 'Feature',
    id,
    geometry: { type: 'Polygon', coordinates: [ring] },
    properties: {
      id,
      kind: 'STORYBOARD_SCENE',
      storyboard_id: 'sb-1',
      title: id,
      viewport: { center: corners[0]!, zoom: 10, bearing: 0 },
      timestamp,
      visible_feature_ids: [],
      feature_set_hash: '0'.repeat(64),
      thumbnail_asset_ref: `thumbs/${id}.png`,
      transition_duration_ms: 500,
      schema_version: 1,
      _polygon_source: 'bounds',
    },
  } as unknown as SceneFeature;
}

describe('SceneRectangleLayer', () => {
  beforeEach(() => {
    capturedPolygons = [];
    stopPropagationSpy.mockReset();
  });

  it('renders nothing when activeStoryboardId is null', () => {
    const { queryAllByTestId } = render(
      <SceneRectangleLayer
        scenes={[makeScene('s1', [[-5, 50], [-4, 50], [-4, 51], [-5, 51]])]}
        activeStoryboardId={null}
        currentSceneId="s1"
        onSceneRectangleClick={vi.fn()}
      />,
    );
    expect(queryAllByTestId('polygon')).toHaveLength(0);
  });

  it('renders nothing when scenes is empty', () => {
    const { queryAllByTestId } = render(
      <SceneRectangleLayer
        scenes={[]}
        activeStoryboardId="sb-1"
        currentSceneId={null}
        onSceneRectangleClick={vi.fn()}
      />,
    );
    expect(queryAllByTestId('polygon')).toHaveLength(0);
  });

  it('renders one Polygon per Scene', () => {
    const scenes = [
      makeScene('s1', [[-5, 50], [-4, 50], [-4, 51], [-5, 51]], '2026-04-20T10:00:00Z'),
      makeScene('s2', [[0, 0], [1, 0], [1, 1], [0, 1]], '2026-04-20T11:00:00Z'),
      makeScene('s3', [[10, 10], [11, 10], [11, 11], [10, 11]], '2026-04-20T12:00:00Z'),
    ];
    const { queryAllByTestId } = render(
      <SceneRectangleLayer
        scenes={scenes}
        activeStoryboardId="sb-1"
        currentSceneId="s2"
        onSceneRectangleClick={vi.fn()}
      />,
    );
    expect(queryAllByTestId('polygon')).toHaveLength(3);
  });

  it('derives positions from scene.geometry.coordinates (lon,lat → lat,lon)', () => {
    const scenes = [
      makeScene('s1', [[-5, 50], [-4, 50], [-4, 51], [-5, 51]]),
    ];
    render(
      <SceneRectangleLayer
        scenes={scenes}
        activeStoryboardId="sb-1"
        currentSceneId={null}
        onSceneRectangleClick={vi.fn()}
      />,
    );
    expect(capturedPolygons).toHaveLength(1);
    // Corners: original [lon, lat] converted to [lat, lon].
    // Ring has 5 points (closed).
    expect(capturedPolygons[0]!.positions).toEqual([
      [50, -5],
      [50, -4],
      [51, -4],
      [51, -5],
      [50, -5],
    ]);
  });

  it('current Scene rectangle has bolder stroke and a "--current" className', () => {
    const scenes = [
      makeScene('s1', [[-5, 50], [-4, 50], [-4, 51], [-5, 51]], '2026-04-20T10:00:00Z'),
      makeScene('s2', [[0, 0], [1, 0], [1, 1], [0, 1]], '2026-04-20T11:00:00Z'),
    ];
    render(
      <SceneRectangleLayer
        scenes={scenes}
        activeStoryboardId="sb-1"
        currentSceneId="s2"
        onSceneRectangleClick={vi.fn()}
      />,
    );
    // Find the polygon whose className includes --current.
    const current = capturedPolygons.find((p) =>
      String(p.pathOptions.className).includes('--current'),
    );
    const nonCurrent = capturedPolygons.find((p) =>
      !String(p.pathOptions.className).includes('--current'),
    );
    expect(current).toBeDefined();
    expect(nonCurrent).toBeDefined();
    expect(current!.pathOptions.weight).toBe(2);
    expect(nonCurrent!.pathOptions.weight).toBe(1);
    expect(current!.pathOptions.opacity).toBe(0.9);
    expect(nonCurrent!.pathOptions.opacity).toBe(0.5);
  });

  it('overlapping rectangles get distinct opacity values, all >= 0.10', () => {
    // Three scenes with near-identical centroids → overlap rank 0/1/2.
    const scenes = [
      makeScene('s1', [[0, 0], [1, 0], [1, 1], [0, 1]], '2026-04-20T10:00:00Z'),
      makeScene('s2', [[0.01, 0.01], [1.01, 0.01], [1.01, 1.01], [0.01, 1.01]], '2026-04-20T11:00:00Z'),
      makeScene('s3', [[0.02, 0.02], [1.02, 0.02], [1.02, 1.02], [0.02, 1.02]], '2026-04-20T12:00:00Z'),
    ];
    render(
      <SceneRectangleLayer
        scenes={scenes}
        activeStoryboardId="sb-1"
        currentSceneId={null}
        onSceneRectangleClick={vi.fn()}
      />,
    );
    const opacities = capturedPolygons.map((p) => p.pathOptions.fillOpacity as number);
    // All distinct.
    expect(new Set(opacities).size).toBe(3);
    // All >= 0.10 floor.
    opacities.forEach((o) => expect(o).toBeGreaterThanOrEqual(0.10));
  });

  it('click fires onSceneRectangleClick with the correct sceneId and stops propagation', () => {
    const onClick = vi.fn();
    render(
      <SceneRectangleLayer
        scenes={[makeScene('s1', [[-5, 50], [-4, 50], [-4, 51], [-5, 51]])]}
        activeStoryboardId="sb-1"
        currentSceneId="s1"
        onSceneRectangleClick={onClick}
      />,
    );
    capturedPolygons[0]!.onClick();
    expect(onClick).toHaveBeenCalledWith('s1');
    expect(stopPropagationSpy).toHaveBeenCalledTimes(1);
  });

  it('topmost rectangle wins on overlapping click (rendered last == most recent)', () => {
    const scenes = [
      makeScene('older', [[0, 0], [1, 0], [1, 1], [0, 1]], '2026-04-20T10:00:00Z'),
      makeScene('newer', [[0, 0], [1, 0], [1, 1], [0, 1]], '2026-04-20T11:00:00Z'),
    ];
    render(
      <SceneRectangleLayer
        scenes={scenes}
        activeStoryboardId="sb-1"
        currentSceneId={null}
        onSceneRectangleClick={vi.fn()}
      />,
    );
    // Rendered in ascending timestamp order — the *last* rendered is topmost.
    expect(capturedPolygons).toHaveLength(2);
    // Since our mock records each Polygon's onClick with the sceneId bound
    // by the layer, simulating the click on the last polygon returns the
    // newer scene.
    expect(capturedPolygons[1]!.pathOptions.className).toBeDefined();
  });

  it('antimeridian-crossing viewport renders as a single best-effort polygon', () => {
    const scene = makeScene('ant', [[170, 10], [-170, 10], [-170, 0], [170, 0]]);
    const { queryAllByTestId } = render(
      <SceneRectangleLayer
        scenes={[scene]}
        activeStoryboardId="sb-1"
        currentSceneId="ant"
        onSceneRectangleClick={vi.fn()}
      />,
    );
    expect(queryAllByTestId('polygon')).toHaveLength(1);
    // Coordinates passed through unchanged (ring of 5 closed points).
    expect(capturedPolygons[0]!.positions).toHaveLength(5);
  });

  it('re-render with fewer scenes cleans up stale polygons', () => {
    const threeScenes = [
      makeScene('s1', [[-5, 50], [-4, 50], [-4, 51], [-5, 51]], '2026-04-20T10:00:00Z'),
      makeScene('s2', [[0, 0], [1, 0], [1, 1], [0, 1]], '2026-04-20T11:00:00Z'),
      makeScene('s3', [[10, 10], [11, 10], [11, 11], [10, 11]], '2026-04-20T12:00:00Z'),
    ];
    const { rerender, queryAllByTestId } = render(
      <SceneRectangleLayer
        scenes={threeScenes}
        activeStoryboardId="sb-1"
        currentSceneId={null}
        onSceneRectangleClick={vi.fn()}
      />,
    );
    expect(queryAllByTestId('polygon')).toHaveLength(3);

    rerender(
      <SceneRectangleLayer
        scenes={[threeScenes[0]!]}
        activeStoryboardId="sb-1"
        currentSceneId={null}
        onSceneRectangleClick={vi.fn()}
      />,
    );
    expect(queryAllByTestId('polygon')).toHaveLength(1);
  });
});

describe('computeFillOpacity', () => {
  it('floors at 0.10', () => {
    const dummyScene = {} as unknown as SceneFeature;
    expect(computeFillOpacity(dummyScene, 100, false)).toBe(0.10);
  });
  it('higher base for current vs non-current', () => {
    const dummyScene = {} as unknown as SceneFeature;
    expect(computeFillOpacity(dummyScene, 0, true)).toBeGreaterThan(
      computeFillOpacity(dummyScene, 0, false),
    );
  });
});

describe('computeOverlapRanks', () => {
  it('scenes with disjoint centres all get rank 0', () => {
    const scenes = [
      makeScene('a', [[-80, 0], [-79, 0], [-79, 1], [-80, 1]], '2026-04-20T10:00:00Z'),
      makeScene('b', [[80, 0], [81, 0], [81, 1], [80, 1]], '2026-04-20T11:00:00Z'),
    ];
    expect(computeOverlapRanks(scenes)).toEqual([0, 0]);
  });
  it('scenes with identical centroids get ascending ranks in timestamp order', () => {
    const scenes = [
      makeScene('a', [[0, 0], [1, 0], [1, 1], [0, 1]], '2026-04-20T12:00:00Z'),
      makeScene('b', [[0, 0], [1, 0], [1, 1], [0, 1]], '2026-04-20T10:00:00Z'),
      makeScene('c', [[0, 0], [1, 0], [1, 1], [0, 1]], '2026-04-20T11:00:00Z'),
    ];
    // Sorted by timestamp: b (0), c (1), a (2).
    const ranks = computeOverlapRanks(scenes);
    expect(ranks[0]).toBe(2); // a
    expect(ranks[1]).toBe(0); // b
    expect(ranks[2]).toBe(1); // c
  });
});

// ---------------------------------------------------------------------------
// Spec #258 tests — active-scene halo (US3 / FR-007) and polygon recompute
// for legacy scenes (US2 / FR-006).
// ---------------------------------------------------------------------------

function makeSceneWithProvenance(
  id: string,
  corners: Array<[number, number]>,
  source: 'bounds' | 'placeholder' | 'manual' | undefined,
): SceneFeature {
  const scene = makeScene(id, corners) as unknown as SceneFeature & {
    properties: SceneFeature['properties'] & { _polygon_source?: string };
  };
  if (source === undefined) {
    delete scene.properties._polygon_source;
  } else {
    scene.properties._polygon_source = source;
  }
  return scene;
}

describe('SceneRectangleLayer — Spec #258 active-scene halo (T046)', () => {
  beforeEach(() => {
    capturedPolygons = [];
  });

  it('adds debrief-map-feature--selected className when scene.id === currentSceneId', () => {
    const scenes = [
      makeSceneWithProvenance('s1', [[-5, 50], [-4, 50], [-4, 51], [-5, 51]], 'bounds'),
      makeSceneWithProvenance('s2', [[0, 0], [1, 0], [1, 1], [0, 1]], 'bounds'),
    ];
    render(
      <SceneRectangleLayer
        scenes={scenes}
        activeStoryboardId="sb-1"
        currentSceneId="s2"
        onSceneRectangleClick={vi.fn()}
      />,
    );
    const active = capturedPolygons.find((p) =>
      String(p.pathOptions.className).includes('--current'),
    );
    const inactive = capturedPolygons.find((p) =>
      !String(p.pathOptions.className).includes('--current'),
    );
    expect(active).toBeDefined();
    expect(inactive).toBeDefined();
    expect(String(active!.pathOptions.className)).toContain(
      'debrief-map-feature--selected',
    );
    expect(String(inactive!.pathOptions.className)).not.toContain(
      'debrief-map-feature--selected',
    );
  });

  it('omits debrief-map-feature--selected when currentSceneId is null (T047)', () => {
    const scenes = [
      makeSceneWithProvenance('s1', [[-5, 50], [-4, 50], [-4, 51], [-5, 51]], 'bounds'),
    ];
    render(
      <SceneRectangleLayer
        scenes={scenes}
        activeStoryboardId="sb-1"
        currentSceneId={null}
        onSceneRectangleClick={vi.fn()}
      />,
    );
    expect(capturedPolygons).toHaveLength(1);
    expect(String(capturedPolygons[0]!.pathOptions.className)).not.toContain(
      'debrief-map-feature--selected',
    );
  });

  it('changing currentSceneId transfers the halo in a single render pass (T047)', () => {
    const scenes = [
      makeSceneWithProvenance('a', [[-5, 50], [-4, 50], [-4, 51], [-5, 51]], 'bounds'),
      makeSceneWithProvenance('b', [[0, 0], [1, 0], [1, 1], [0, 1]], 'bounds'),
    ];
    const { rerender } = render(
      <SceneRectangleLayer
        scenes={scenes}
        activeStoryboardId="sb-1"
        currentSceneId="a"
        onSceneRectangleClick={vi.fn()}
      />,
    );
    expect(
      capturedPolygons.find((p) =>
        String(p.pathOptions.className).includes('debrief-map-feature--selected'),
      ),
    ).toBeDefined();
    capturedPolygons = [];
    rerender(
      <SceneRectangleLayer
        scenes={scenes}
        activeStoryboardId="sb-1"
        currentSceneId="b"
        onSceneRectangleClick={vi.fn()}
      />,
    );
    const halo = capturedPolygons.filter((p) =>
      String(p.pathOptions.className).includes('debrief-map-feature--selected'),
    );
    // Exactly one rectangle has the halo (FR-008 single-active invariant).
    expect(halo).toHaveLength(1);
  });
});

describe('SceneRectangleLayer — Spec #258 polygon recompute (T035)', () => {
  beforeEach(() => {
    capturedPolygons = [];
  });

  it('renders scene.geometry as-is when _polygon_source === "bounds"', () => {
    const corners: Array<[number, number]> = [
      [-5, 50],
      [-4, 50],
      [-4, 51],
      [-5, 51],
    ];
    const scenes = [makeSceneWithProvenance('s1', corners, 'bounds')];
    render(
      <SceneRectangleLayer
        scenes={scenes}
        activeStoryboardId="sb-1"
        currentSceneId={null}
        onSceneRectangleClick={vi.fn()}
      />,
    );
    expect(capturedPolygons).toHaveLength(1);
    // Stored polygon corners passed through verbatim (lat/lng order swapped).
    expect(capturedPolygons[0]!.positions).toEqual([
      [50, -5],
      [50, -4],
      [51, -4],
      [51, -5],
      [50, -5],
    ]);
  });

  it('recomputes the polygon when _polygon_source is absent (legacy scene)', () => {
    // The legacy scene's stored geometry is a tiny placeholder near (lon=0,
    // lat=0). The recompute path projects from the (stub) map's container size
    // around the scene's viewport centre, producing a larger polygon.
    const placeholderCorners: Array<[number, number]> = [
      [-0.001, -0.001],
      [0.001, -0.001],
      [0.001, 0.001],
      [-0.001, 0.001],
    ];
    const scenes = [makeSceneWithProvenance('legacy', placeholderCorners, undefined)];
    render(
      <SceneRectangleLayer
        scenes={scenes}
        activeStoryboardId="sb-1"
        currentSceneId={null}
        onSceneRectangleClick={vi.fn()}
      />,
    );
    expect(capturedPolygons).toHaveLength(1);
    // The recomputed polygon's lat/lng extent is dictated by the stub map's
    // 2°-wide / 1°-tall projection. Compare to the placeholder which would
    // only span ~0.002° on each axis.
    const positions = capturedPolygons[0]!.positions;
    const lats = positions.map((p) => p[0]);
    const lngs = positions.map((p) => p[1]);
    const latRange = Math.max(...lats) - Math.min(...lats);
    const lngRange = Math.max(...lngs) - Math.min(...lngs);
    expect(latRange).toBeGreaterThan(0.5); // dramatically larger than the 0.002 placeholder
    expect(lngRange).toBeGreaterThan(1);
  });

  it('also recomputes when _polygon_source is "placeholder"', () => {
    const placeholderCorners: Array<[number, number]> = [
      [-0.001, -0.001],
      [0.001, -0.001],
      [0.001, 0.001],
      [-0.001, 0.001],
    ];
    const scenes = [makeSceneWithProvenance('p', placeholderCorners, 'placeholder')];
    render(
      <SceneRectangleLayer
        scenes={scenes}
        activeStoryboardId="sb-1"
        currentSceneId={null}
        onSceneRectangleClick={vi.fn()}
      />,
    );
    const positions = capturedPolygons[0]!.positions;
    const lats = positions.map((p) => p[0]);
    const latRange = Math.max(...lats) - Math.min(...lats);
    expect(latRange).toBeGreaterThan(0.5);
  });
});
