/**
 * Spec 260 — viewport-lock handler snapshot-restore correctness (T034 / GAP-1
 * from /speckit.review).
 *
 * Verifies that flipping `viewportLocked` true → false → true → false
 * preserves any host-disabled handler (e.g. the `keyboard` handler off for a
 * measurement-tool mode). The snapshot is captured at lock-on, not at mount,
 * so a host that pre-disables a handler keeps it disabled across a full
 * lock cycle.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { MapView } from '../MapView';
import type { DebriefFeatureCollection } from '../../utils/types';

interface MockHandler {
  enabled: ReturnType<typeof vi.fn>;
  enable: ReturnType<typeof vi.fn>;
  disable: ReturnType<typeof vi.fn>;
}

function makeHandler(initialEnabled: boolean): MockHandler {
  let state = initialEnabled;
  const handler: MockHandler = {
    enabled: vi.fn(() => state),
    enable: vi.fn(() => {
      state = true;
    }),
    disable: vi.fn(() => {
      state = false;
    }),
  };
  return handler;
}

interface MockMap {
  dragging: MockHandler;
  scrollWheelZoom: MockHandler;
  doubleClickZoom: MockHandler;
  touchZoom: MockHandler;
  boxZoom: MockHandler;
  keyboard: MockHandler;
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

describe('MapView — viewport lock handler snapshot-restore (spec 260)', () => {
  beforeEach(() => {
    mockMap = {
      // Default-on Leaflet handlers — these should flip back to enabled
      // after a lock cycle.
      dragging: makeHandler(true),
      scrollWheelZoom: makeHandler(true),
      doubleClickZoom: makeHandler(true),
      touchZoom: makeHandler(true),
      boxZoom: makeHandler(true),
      // Host-disabled handler — MUST stay disabled across the cycle.
      keyboard: makeHandler(false),
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

  it('disables all six handlers when viewportLocked transitions false → true', () => {
    const { rerender } = render(
      <MapView features={emptyCollection} autoFitBounds={false} viewportLocked={false} />,
    );

    // Sanity: no disables on initial mount with lock off.
    expect(mockMap.dragging.disable).not.toHaveBeenCalled();
    expect(mockMap.keyboard.disable).not.toHaveBeenCalled();

    rerender(<MapView features={emptyCollection} autoFitBounds={false} viewportLocked={true} />);

    expect(mockMap.dragging.disable).toHaveBeenCalledTimes(1);
    expect(mockMap.scrollWheelZoom.disable).toHaveBeenCalledTimes(1);
    expect(mockMap.doubleClickZoom.disable).toHaveBeenCalledTimes(1);
    expect(mockMap.touchZoom.disable).toHaveBeenCalledTimes(1);
    expect(mockMap.boxZoom.disable).toHaveBeenCalledTimes(1);
    expect(mockMap.keyboard.disable).toHaveBeenCalledTimes(1);
  });

  it('restores only default-on handlers on unlock (host-disabled keyboard stays off)', () => {
    const { rerender } = render(
      <MapView features={emptyCollection} autoFitBounds={false} viewportLocked={false} />,
    );
    // Lock on — snapshot captures `keyboard.enabled() === false`.
    rerender(<MapView features={emptyCollection} autoFitBounds={false} viewportLocked={true} />);
    // Lock off — only handlers whose snapshot was `true` should be re-enabled.
    rerender(<MapView features={emptyCollection} autoFitBounds={false} viewportLocked={false} />);

    expect(mockMap.dragging.enable).toHaveBeenCalledTimes(1);
    expect(mockMap.scrollWheelZoom.enable).toHaveBeenCalledTimes(1);
    expect(mockMap.doubleClickZoom.enable).toHaveBeenCalledTimes(1);
    expect(mockMap.touchZoom.enable).toHaveBeenCalledTimes(1);
    expect(mockMap.boxZoom.enable).toHaveBeenCalledTimes(1);
    // GAP-1: the host had it off before; the lock cycle MUST leave it off.
    expect(mockMap.keyboard.enable).not.toHaveBeenCalled();
    expect(mockMap.keyboard.enabled()).toBe(false);
    // Default-on confirmation.
    expect(mockMap.dragging.enabled()).toBe(true);
  });

  it('survives multiple lock cycles without leaking', () => {
    const { rerender } = render(
      <MapView features={emptyCollection} autoFitBounds={false} viewportLocked={false} />,
    );
    rerender(<MapView features={emptyCollection} autoFitBounds={false} viewportLocked={true} />);
    rerender(<MapView features={emptyCollection} autoFitBounds={false} viewportLocked={false} />);
    rerender(<MapView features={emptyCollection} autoFitBounds={false} viewportLocked={true} />);
    rerender(<MapView features={emptyCollection} autoFitBounds={false} viewportLocked={false} />);

    expect(mockMap.dragging.disable).toHaveBeenCalledTimes(2);
    expect(mockMap.dragging.enable).toHaveBeenCalledTimes(2);
    expect(mockMap.keyboard.disable).toHaveBeenCalledTimes(2);
    expect(mockMap.keyboard.enable).not.toHaveBeenCalled();
  });

  it('is idempotent — re-entering the same state is a no-op', () => {
    const { rerender } = render(
      <MapView features={emptyCollection} autoFitBounds={false} viewportLocked={true} />,
    );
    const initialDisables = mockMap.dragging.disable.mock.calls.length;

    // Re-render with the same prop value. Should NOT fire any extra
    // disables (the effect dep guard + snapshot-non-null guard combine).
    rerender(<MapView features={emptyCollection} autoFitBounds={false} viewportLocked={true} />);

    expect(mockMap.dragging.disable.mock.calls.length).toBe(initialDisables);
  });
});
