/**
 * Spec 260 / T046 — `L` keyboard shortcut on MapView's root <div>.
 *
 * The shortcut MUST:
 *  - fire on plain lowercase L with no modifiers
 *  - fire on plain uppercase L with no modifiers (CapsLock tolerant)
 *  - NOT fire when any modifier key is held (Cmd+L is OS address bar)
 *  - NOT fire when focus is inside an input / textarea / contenteditable
 *  - remain available while the lock is on (so the user can exit)
 */

import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { MapView } from '../MapView';
import type { DebriefFeatureCollection } from '../../utils/types';

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

function setupMap(): void {
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
}

describe('MapView — L keyboard shortcut for viewport lock', () => {
  it('fires onViewportLockChange(true) on lowercase L when unlocked', () => {
    setupMap();
    const onViewportLockChange = vi.fn();
    const { container } = render(
      <MapView
        features={emptyCollection}
        autoFitBounds={false}
        viewportLocked={false}
        onViewportLockChange={onViewportLockChange}
      />,
    );
    const root = container.querySelector('.debrief-mapview') as HTMLElement;
    fireEvent.keyDown(root, { key: 'l' });
    expect(onViewportLockChange).toHaveBeenCalledWith(true);
  });

  it('fires onViewportLockChange(false) when already locked (escape via shortcut)', () => {
    setupMap();
    const onViewportLockChange = vi.fn();
    const { container } = render(
      <MapView
        features={emptyCollection}
        autoFitBounds={false}
        viewportLocked={true}
        onViewportLockChange={onViewportLockChange}
      />,
    );
    const root = container.querySelector('.debrief-mapview') as HTMLElement;
    fireEvent.keyDown(root, { key: 'l' });
    expect(onViewportLockChange).toHaveBeenCalledWith(false);
  });

  it('does NOT fire when metaKey is held (Cmd+L is the OS address bar)', () => {
    setupMap();
    const onViewportLockChange = vi.fn();
    const { container } = render(
      <MapView
        features={emptyCollection}
        autoFitBounds={false}
        viewportLocked={false}
        onViewportLockChange={onViewportLockChange}
      />,
    );
    const root = container.querySelector('.debrief-mapview') as HTMLElement;
    fireEvent.keyDown(root, { key: 'l', metaKey: true });
    fireEvent.keyDown(root, { key: 'l', ctrlKey: true });
    fireEvent.keyDown(root, { key: 'l', altKey: true });
    fireEvent.keyDown(root, { key: 'l', shiftKey: true });
    expect(onViewportLockChange).not.toHaveBeenCalled();
  });

  it('does NOT fire when focus is inside an input', () => {
    setupMap();
    const onViewportLockChange = vi.fn();
    const { container } = render(
      <MapView
        features={emptyCollection}
        autoFitBounds={false}
        viewportLocked={false}
        onViewportLockChange={onViewportLockChange}
      />,
    );
    const root = container.querySelector('.debrief-mapview') as HTMLElement;
    // Inject a fake input into the root so the event target's
    // closest('input') returns truthy.
    const input = document.createElement('input');
    root.appendChild(input);
    fireEvent.keyDown(input, { key: 'l' });
    expect(onViewportLockChange).not.toHaveBeenCalled();
  });

  it('does nothing when onViewportLockChange is not provided', () => {
    setupMap();
    const { container } = render(
      <MapView features={emptyCollection} autoFitBounds={false} />,
    );
    const root = container.querySelector('.debrief-mapview') as HTMLElement;
    // Must not throw.
    expect(() => fireEvent.keyDown(root, { key: 'l' })).not.toThrow();
  });
});
