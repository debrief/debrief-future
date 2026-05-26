/**
 * Adapter unit tests (T048–T051).
 *
 * Each adapter is exercised against a fake Leaflet map / the local
 * Zustand store. The full lock-step behaviour is covered by the
 * playback-driver test (`playbackDriver.test.ts`).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createBrowserMapAdapter,
  createLocalSessionStoreAdapter,
  createBrowserPanelViewAdapter,
  createBrowserTimeRangeViewAdapter,
} from '..';
import { useBriefingStore } from '../../store';

beforeEach(() => {
  useBriefingStore.setState({
    scenes: [],
    currentSceneIndex: 0,
    currentTime: 0,
    scrubbableRangeStart: null,
    scrubbableRangeEnd: null,
  });
});

describe('BrowserMapAdapter', () => {
  it('no-ops when no map is attached', () => {
    const a = createBrowserMapAdapter();
    expect(() => a.flyToViewport({ center: [0, 0], zoom: 6 }, 0)).not.toThrow();
  });

  it('calls setView for zero-duration snaps and flyTo for animated transitions', () => {
    const flyTo = vi.fn();
    const setView = vi.fn();
    const fakeMap = { flyTo, setView } as unknown as Parameters<
      ReturnType<typeof createBrowserMapAdapter>['setMap']
    >[0];
    const a = createBrowserMapAdapter();
    a.setMap(fakeMap);

    a.flyToViewport({ center: [-4, 50], zoom: 6 }, 0);
    expect(setView).toHaveBeenCalledWith([50, -4], 6, { animate: false });
    expect(flyTo).not.toHaveBeenCalled();

    a.flyToViewport({ center: [-4, 50], zoom: 6 }, 1000);
    expect(flyTo).toHaveBeenCalledWith([50, -4], 6, { duration: 1 });
  });

  it('converts viewport center from [lon, lat] to Leaflet [lat, lon]', () => {
    const setView = vi.fn();
    const a = createBrowserMapAdapter();
    a.setMap({ flyTo: vi.fn(), setView } as unknown as Parameters<
      ReturnType<typeof createBrowserMapAdapter>['setMap']
    >[0]);
    a.flyToViewport({ center: [10, 20], zoom: 5 }, 0);
    expect(setView).toHaveBeenCalledWith([20, 10], 5, { animate: false });
  });
});

describe('LocalSessionStoreAdapter', () => {
  it('writes currentTime to the store', () => {
    const a = createLocalSessionStoreAdapter();
    a.setCurrentTime(1_700_000_000_000);
    expect(useBriefingStore.getState().currentTime).toBe(1_700_000_000_000);
    expect(a.getCurrentTime()).toBe(1_700_000_000_000);
  });
});

describe('BrowserPanelViewAdapter', () => {
  it('updates the active Scene index when notified of a known Scene', () => {
    useBriefingStore.setState({
      scenes: [
        {
          type: 'Feature',
          id: 'A',
          geometry: { type: 'Polygon', coordinates: [] },
          properties: { id: 'A', kind: 'STORYBOARD_SCENE' },
        },
        {
          type: 'Feature',
          id: 'B',
          geometry: { type: 'Polygon', coordinates: [] },
          properties: { id: 'B', kind: 'STORYBOARD_SCENE' },
        },
      ] as unknown as ReturnType<typeof useBriefingStore.getState>['scenes'],
      currentSceneIndex: 0,
    });
    const a = createBrowserPanelViewAdapter();
    a.notifySceneChange('B');
    expect(useBriefingStore.getState().currentSceneIndex).toBe(1);
  });

  it('does nothing when the Scene id is unknown', () => {
    const a = createBrowserPanelViewAdapter();
    a.notifySceneChange('UNKNOWN');
    expect(useBriefingStore.getState().currentSceneIndex).toBe(0);
  });
});

describe('BrowserTimeRangeViewAdapter', () => {
  it('writes the slider range to the store', () => {
    const a = createBrowserTimeRangeViewAdapter();
    a.setScrubbableRange(1_700_000_000_000, 1_700_001_000_000);
    const s = useBriefingStore.getState();
    expect(s.scrubbableRangeStart).toBe(1_700_000_000_000);
    expect(s.scrubbableRangeEnd).toBe(1_700_001_000_000);
  });

  it('clears the range when passed null/null', () => {
    const a = createBrowserTimeRangeViewAdapter();
    a.setScrubbableRange(1, 2);
    a.setScrubbableRange(null, null);
    const s = useBriefingStore.getState();
    expect(s.scrubbableRangeStart).toBeNull();
    expect(s.scrubbableRangeEnd).toBeNull();
  });
});
