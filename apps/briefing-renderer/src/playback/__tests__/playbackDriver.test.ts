import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createPlaybackDriver } from '../playbackDriver';
import { useBriefingStore } from '../../store';
import type {
  BrowserMapAdapter,
  BrowserPanelViewAdapter,
  BrowserSessionStoreAdapter,
  BrowserTimeRangeViewAdapter,
} from '../../adapters';
import type { SceneFeature } from '@debrief/components/storyboard';

function instantScene(id: string, lon: number, lat: number, ts: string): SceneFeature {
  return {
    type: 'Feature',
    id,
    geometry: { type: 'Polygon', coordinates: [] },
    properties: {
      kind: 'STORYBOARD_SCENE',
      id,
      storyboard_id: 'SB',
      title: id,
      timestamp: ts,
      creation_order: 0,
      viewport: { center: [lon, lat], zoom: 6, bearing: 0 },
      transition_duration_ms: 0,
    },
  } as unknown as SceneFeature;
}

function timeRangeScene(id: string): SceneFeature {
  return {
    type: 'Feature',
    id,
    geometry: { type: 'Polygon', coordinates: [] },
    properties: {
      kind: 'STORYBOARD_SCENE',
      id,
      storyboard_id: 'SB',
      title: id,
      timestamp: '2025-01-15T12:00:00Z',
      creation_order: 0,
      viewport: { center: [0, 0], zoom: 6, bearing: 0 },
      viewport_end: { center: [4, 4], zoom: 6, bearing: 0 },
      time_range: {
        start: '2025-01-15T12:00:00Z',
        end: '2025-01-15T12:01:00Z',
      },
      transition_duration_ms: 0, // snap-resolves
    },
  } as unknown as SceneFeature;
}

function makeAdapters(): {
  map: BrowserMapAdapter & { _map?: unknown };
  session: BrowserSessionStoreAdapter;
  panel: BrowserPanelViewAdapter;
  timeRange: BrowserTimeRangeViewAdapter;
  flyToCalls: Array<{ viewport: { center: [number, number]; zoom: number }; durationMs: number }>;
  setTimeCalls: number[];
  rangeCalls: Array<[number | null, number | null]>;
  panelCalls: string[];
} {
  const flyToCalls: Array<{
    viewport: { center: [number, number]; zoom: number };
    durationMs: number;
  }> = [];
  const setTimeCalls: number[] = [];
  const rangeCalls: Array<[number | null, number | null]> = [];
  const panelCalls: string[] = [];

  return {
    map: {
      setMap: vi.fn(),
      flyToViewport: (viewport, durationMs) => {
        flyToCalls.push({ viewport, durationMs });
      },
    },
    session: {
      setCurrentTime: (t) => {
        setTimeCalls.push(t);
      },
      getCurrentTime: () => 0,
    },
    panel: {
      notifySceneChange: (id) => {
        panelCalls.push(id);
      },
    },
    timeRange: {
      setScrubbableRange: (s, e) => {
        rangeCalls.push([s, e]);
      },
    },
    flyToCalls,
    setTimeCalls,
    rangeCalls,
    panelCalls,
  };
}

beforeEach(() => {
  useBriefingStore.setState({
    scenes: [],
    currentSceneIndex: 0,
    currentTime: 0,
    playState: 'idle',
    bootState: 'ready',
    haltedReason: null,
    scrubbableRangeStart: null,
    scrubbableRangeEnd: null,
  });
});

describe('createPlaybackDriver', () => {
  it('snaps to the current instant Scene viewport and disables the slider range', async () => {
    const a = makeAdapters();
    useBriefingStore.setState({
      scenes: [instantScene('S0', -4, 50, '2025-01-15T12:00:00Z')] as unknown as ReturnType<
        typeof useBriefingStore.getState
      >['scenes'],
    });
    const driver = createPlaybackDriver({
      mapAdapter: a.map,
      sessionAdapter: a.session,
      panelAdapter: a.panel,
      timeRangeAdapter: a.timeRange,
    });
    await driver.syncToCurrentScene();
    expect(a.flyToCalls.length).toBeGreaterThan(0);
    expect(a.flyToCalls[0]!.viewport.center).toEqual([-4, 50]);
    expect(a.rangeCalls.at(-1)).toEqual([null, null]);
    expect(a.panelCalls).toContain('S0');
  });

  it('advances to the next Scene on forward()', async () => {
    const a = makeAdapters();
    useBriefingStore.setState({
      scenes: [
        instantScene('S0', 0, 0, '2025-01-15T12:00:00Z'),
        instantScene('S1', 1, 1, '2025-01-15T12:05:00Z'),
      ] as unknown as ReturnType<typeof useBriefingStore.getState>['scenes'],
    });
    const driver = createPlaybackDriver({
      mapAdapter: a.map,
      sessionAdapter: a.session,
      panelAdapter: a.panel,
      timeRangeAdapter: a.timeRange,
    });
    await driver.forward();
    expect(useBriefingStore.getState().currentSceneIndex).toBe(1);
    expect(a.panelCalls.at(-1)).toBe('S1');
  });

  it('no-ops forward() at the last Scene', async () => {
    const a = makeAdapters();
    useBriefingStore.setState({
      scenes: [instantScene('S0', 0, 0, '2025-01-15T12:00:00Z')] as unknown as ReturnType<
        typeof useBriefingStore.getState
      >['scenes'],
    });
    const driver = createPlaybackDriver({
      mapAdapter: a.map,
      sessionAdapter: a.session,
      panelAdapter: a.panel,
      timeRangeAdapter: a.timeRange,
    });
    await driver.forward();
    expect(useBriefingStore.getState().currentSceneIndex).toBe(0);
  });

  it('replay() resets to Scene 0', async () => {
    const a = makeAdapters();
    useBriefingStore.setState({
      scenes: [
        instantScene('S0', 0, 0, '2025-01-15T12:00:00Z'),
        instantScene('S1', 1, 1, '2025-01-15T12:05:00Z'),
        instantScene('S2', 2, 2, '2025-01-15T12:10:00Z'),
      ] as unknown as ReturnType<typeof useBriefingStore.getState>['scenes'],
      currentSceneIndex: 2,
    });
    const driver = createPlaybackDriver({
      mapAdapter: a.map,
      sessionAdapter: a.session,
      panelAdapter: a.panel,
      timeRangeAdapter: a.timeRange,
    });
    await driver.replay();
    expect(useBriefingStore.getState().currentSceneIndex).toBe(0);
  });

  it('sets a scrubbable range for time-range Scenes', async () => {
    const a = makeAdapters();
    useBriefingStore.setState({
      scenes: [timeRangeScene('TR0')] as unknown as ReturnType<
        typeof useBriefingStore.getState
      >['scenes'],
    });
    const driver = createPlaybackDriver({
      mapAdapter: a.map,
      sessionAdapter: a.session,
      panelAdapter: a.panel,
      timeRangeAdapter: a.timeRange,
    });
    await driver.syncToCurrentScene();
    expect(a.rangeCalls[0]).toEqual([
      Date.parse('2025-01-15T12:00:00Z'),
      Date.parse('2025-01-15T12:01:00Z'),
    ]);
    // The tween writes at least the start + end frames via setCurrentTime.
    expect(a.setTimeCalls.length).toBeGreaterThan(0);
  });

  it('halts the SPA when an adapter throws (Article I.3)', async () => {
    const a = makeAdapters();
    a.map.flyToViewport = () => {
      throw new Error('map adapter boom');
    };
    useBriefingStore.setState({
      scenes: [instantScene('S0', 0, 0, '2025-01-15T12:00:00Z')] as unknown as ReturnType<
        typeof useBriefingStore.getState
      >['scenes'],
    });
    const driver = createPlaybackDriver({
      mapAdapter: a.map,
      sessionAdapter: a.session,
      panelAdapter: a.panel,
      timeRangeAdapter: a.timeRange,
    });
    await expect(driver.syncToCurrentScene()).rejects.toThrow(/map adapter boom/);
    const state = useBriefingStore.getState();
    expect(state.bootState).toBe('halted');
    if (state.haltedReason?.kind === 'adapter') {
      expect(state.haltedReason.adapter).toBe('BrowserMapAdapter');
    }
  });
});
