/**
 * React Context that exposes the active playback driver + the four
 * browser adapters to the rest of the SPA. Created once at boot when
 * the inline data + map are ready; reused by TransportBar / ModeToggle /
 * TimeSlider so they don't reach for the store directly to advance Scenes.
 */

import { createContext, useContext, useEffect, useMemo, type FC, type ReactNode } from 'react';
import type { Map as LeafletMap } from 'leaflet';
import {
  createBrowserMapAdapter,
  createBrowserPanelViewAdapter,
  createBrowserTimeRangeViewAdapter,
  createLocalSessionStoreAdapter,
  type BrowserMapAdapter,
} from '../adapters';
import { createPlaybackDriver, type PlaybackDriver } from './playbackDriver';

interface PlaybackBundle {
  driver: PlaybackDriver;
  mapAdapter: BrowserMapAdapter;
}

const PlaybackCtx = createContext<PlaybackBundle | null>(null);

export const PlaybackProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const bundle = useMemo<PlaybackBundle>(() => {
    const mapAdapter = createBrowserMapAdapter();
    const sessionAdapter = createLocalSessionStoreAdapter();
    const panelAdapter = createBrowserPanelViewAdapter();
    const timeRangeAdapter = createBrowserTimeRangeViewAdapter();
    const driver = createPlaybackDriver({
      mapAdapter,
      sessionAdapter,
      panelAdapter,
      timeRangeAdapter,
    });
    return { driver, mapAdapter };
  }, []);

  useEffect(() => {
    return () => bundle.driver.dispose();
  }, [bundle]);

  return <PlaybackCtx.Provider value={bundle}>{children}</PlaybackCtx.Provider>;
};

export function usePlaybackDriver(): PlaybackDriver {
  const ctx = useContext(PlaybackCtx);
  if (!ctx) {
    throw new Error('usePlaybackDriver must be used inside <PlaybackProvider>');
  }
  return ctx.driver;
}

export function useBrowserMapAdapter(): BrowserMapAdapter {
  const ctx = useContext(PlaybackCtx);
  if (!ctx) {
    throw new Error('useBrowserMapAdapter must be used inside <PlaybackProvider>');
  }
  return ctx.mapAdapter;
}

/** Convenience for tests that want to set the map directly. */
export function attachMapToAdapter(adapter: BrowserMapAdapter, map: LeafletMap | null): void {
  adapter.setMap(map);
}
