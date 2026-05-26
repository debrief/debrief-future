/**
 * Local Zustand store for the briefing renderer SPA.
 *
 * Per data-model § 5, the SPA does not depend on `@debrief/session-state` —
 * it owns its own playback + UI state, deliberately scoped to one
 * Storyboard. The `LocalSessionStoreAdapter` (T045) maps Zustand reads /
 * writes into the `PlaybackSessionManager` port that the shared
 * `StoryboardPlaybackService` expects.
 */

import { create } from 'zustand';
import type {
  BriefingConfig,
  BriefingFeatureCollection,
  BriefingItemJson,
  BriefingDisplayMode,
  HaltedReason,
  PlayState,
  SceneFeature,
} from './types';

export interface BriefingStoreState {
  // Source data — set once at boot, never mutated (Article III.2).
  features: BriefingFeatureCollection | null;
  item: BriefingItemJson | null;
  scenes: readonly SceneFeature[];
  config: BriefingConfig | null;

  // Boot / error state
  bootState: 'loading' | 'ready' | 'empty' | 'error' | 'halted';
  bootError: string | null;
  haltedReason: HaltedReason | null;

  // Playback state — owned by `StoryboardPlaybackService` via injected ports
  currentSceneIndex: number;
  currentTime: number; // epoch ms
  playState: PlayState;
  scrubbableRangeStart: number | null;
  scrubbableRangeEnd: number | null;

  // UI state
  displayMode: BriefingDisplayMode;
  modeToggleVisible: boolean;
}

export interface BriefingStoreActions {
  seed(input: {
    features: BriefingFeatureCollection;
    item: BriefingItemJson;
    scenes: readonly SceneFeature[];
    config: BriefingConfig;
  }): void;
  setBootState(state: BriefingStoreState['bootState'], error?: string | null): void;
  halt(reason: HaltedReason): void;
  setCurrentSceneIndex(index: number): void;
  setCurrentTime(time: number): void;
  setPlayState(state: PlayState): void;
  setScrubbableRange(start: number | null, end: number | null): void;
  setDisplayMode(mode: BriefingDisplayMode): void;
  toggleDisplayMode(): void;
  setModeToggleVisible(visible: boolean): void;
}

export type BriefingStore = BriefingStoreState & BriefingStoreActions;

export const useBriefingStore = create<BriefingStore>((set, _get) => ({
  features: null,
  item: null,
  scenes: [],
  config: null,
  bootState: 'loading',
  bootError: null,
  haltedReason: null,
  currentSceneIndex: 0,
  currentTime: 0,
  playState: 'idle',
  scrubbableRangeStart: null,
  scrubbableRangeEnd: null,
  displayMode: 'minimal', // FR-026
  modeToggleVisible: true,

  seed: (input) =>
    set(() => ({
      features: input.features,
      item: input.item,
      scenes: input.scenes,
      config: input.config,
      bootState: input.scenes.length === 0 ? 'empty' : 'ready',
      currentTime:
        input.scenes[0]?.properties.timestamp != null
          ? Date.parse(input.scenes[0].properties.timestamp)
          : 0,
    })),

  setBootState: (state, error = null) =>
    set(() => ({ bootState: state, bootError: error })),

  halt: (reason) =>
    set(() => ({ bootState: 'halted', haltedReason: reason, playState: 'paused' })),

  setCurrentSceneIndex: (index) => set(() => ({ currentSceneIndex: index })),
  setCurrentTime: (time) => set(() => ({ currentTime: time })),
  setPlayState: (state) => set(() => ({ playState: state })),
  setScrubbableRange: (start, end) =>
    set(() => ({ scrubbableRangeStart: start, scrubbableRangeEnd: end })),
  setDisplayMode: (mode) => set(() => ({ displayMode: mode })),
  toggleDisplayMode: () =>
    set((s) => ({ displayMode: s.displayMode === 'minimal' ? 'present' : 'minimal' })),
  setModeToggleVisible: (visible) => set(() => ({ modeToggleVisible: visible })),
}));
