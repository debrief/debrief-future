/**
 * Unit tests for `MapView.flyToTarget` + `onFlyToComplete` (Feature 217 — T140).
 *
 * Covers the contract in
 * `specs/217-storyboarding-playback/contracts/map-view-flyto.md` §1.
 * `L.Map.flyTo` and `L.Map.setView` are spied via the react-leaflet mock.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { MapView } from '../MapView';
import type { FlyToTarget } from '../MapView';
import type { DebriefFeatureCollection } from '../../utils/types';

// Shared map spy — exposed to tests and reset between them.
interface MockMap {
  flyTo: ReturnType<typeof vi.fn>;
  setView: ReturnType<typeof vi.fn>;
  fitBounds: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
  off: ReturnType<typeof vi.fn>;
  getZoom: () => number;
  getBounds: () => {
    getWest: () => number;
    getSouth: () => number;
    getEast: () => number;
    getNorth: () => number;
  };
}

let mockMap: MockMap;

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TileLayer: () => <div data-testid="tile-layer" />,
  GeoJSON: () => <div data-testid="geojson-layer" />,
  Polygon: () => <div data-testid="scene-rect" />,
  useMap: () => mockMap,
  useMapEvents: () => null,
}));

const emptyCollection: DebriefFeatureCollection = {
  type: 'FeatureCollection',
  features: [],
};

describe('MapView.flyToTarget', () => {
  beforeEach(() => {
    mockMap = {
      flyTo: vi.fn(),
      setView: vi.fn(),
      fitBounds: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      getZoom: () => 10,
      getBounds: () => ({
        getWest: () => -5,
        getSouth: () => 50,
        getEast: () => -3,
        getNorth: () => 52,
      }),
    };
  });

  it('triggers L.Map.flyTo with duration/easeLinearity when durationMs > 0', () => {
    const target: FlyToTarget = {
      token: 1,
      center: [50.0, -4.0],
      zoom: 12,
      durationMs: 500,
    };
    render(<MapView features={emptyCollection} flyToTarget={target} autoFitBounds={false} />);

    expect(mockMap.flyTo).toHaveBeenCalledTimes(1);
    expect(mockMap.flyTo).toHaveBeenCalledWith(
      [50.0, -4.0],
      12,
      { duration: 0.5, easeLinearity: 0.25 },
    );
    expect(mockMap.setView).not.toHaveBeenCalled();
  });

  it('triggers L.Map.setView with animate:false when durationMs === 0', () => {
    const target: FlyToTarget = {
      token: 2,
      center: [40, 10],
      zoom: 5,
      durationMs: 0,
    };
    const onFlyToComplete = vi.fn();
    render(
      <MapView
        features={emptyCollection}
        flyToTarget={target}
        onFlyToComplete={onFlyToComplete}
        autoFitBounds={false}
      />,
    );

    expect(mockMap.setView).toHaveBeenCalledWith([40, 10], 5, { animate: false });
    expect(mockMap.flyTo).not.toHaveBeenCalled();
    // Completion fires synchronously on the zero-duration path.
    expect(onFlyToComplete).toHaveBeenCalledWith(2);
  });

  it('a new token during an in-flight flyTo supersedes the previous flight', () => {
    const onFlyToComplete = vi.fn();
    const { rerender } = render(
      <MapView
        features={emptyCollection}
        flyToTarget={{ token: 1, center: [0, 0], zoom: 5, durationMs: 500 }}
        onFlyToComplete={onFlyToComplete}
        autoFitBounds={false}
      />,
    );
    expect(mockMap.flyTo).toHaveBeenCalledTimes(1);
    const firstMoveEnd = mockMap.on.mock.calls.find((c) => c[0] === 'moveend');
    expect(firstMoveEnd).toBeDefined();

    // Transition to a new token. The cleanup MUST detach the previous
    // moveend listener before a fresh flyTo is issued.
    rerender(
      <MapView
        features={emptyCollection}
        flyToTarget={{ token: 2, center: [10, 10], zoom: 6, durationMs: 500 }}
        onFlyToComplete={onFlyToComplete}
        autoFitBounds={false}
      />,
    );

    expect(mockMap.off).toHaveBeenCalledWith('moveend', firstMoveEnd![1]);
    expect(mockMap.flyTo).toHaveBeenCalledTimes(2);
  });

  it('fires onFlyToComplete with the correct token on moveend', () => {
    const onFlyToComplete = vi.fn();
    render(
      <MapView
        features={emptyCollection}
        flyToTarget={{ token: 7, center: [0, 0], zoom: 5, durationMs: 500 }}
        onFlyToComplete={onFlyToComplete}
        autoFitBounds={false}
      />,
    );
    // Extract the handler react registered and simulate Leaflet firing moveend.
    const moveEnd = mockMap.on.mock.calls.find((c) => c[0] === 'moveend');
    expect(moveEnd).toBeDefined();
    const handler = moveEnd![1] as () => void;

    handler();

    expect(onFlyToComplete).toHaveBeenCalledWith(7);
  });

  it('does nothing when flyToTarget is null', () => {
    render(<MapView features={emptyCollection} flyToTarget={null} autoFitBounds={false} />);
    expect(mockMap.flyTo).not.toHaveBeenCalled();
    expect(mockMap.setView).not.toHaveBeenCalled();
  });

  it('repeated renders with the same token do not re-trigger the animation', () => {
    const target: FlyToTarget = { token: 1, center: [0, 0], zoom: 5, durationMs: 500 };
    const { rerender } = render(
      <MapView features={emptyCollection} flyToTarget={target} autoFitBounds={false} />,
    );
    expect(mockMap.flyTo).toHaveBeenCalledTimes(1);

    // Re-render with an equal-but-different-reference target (same token).
    rerender(
      <MapView
        features={emptyCollection}
        flyToTarget={{ ...target }}
        autoFitBounds={false}
      />,
    );
    expect(mockMap.flyTo).toHaveBeenCalledTimes(1);
  });
});
