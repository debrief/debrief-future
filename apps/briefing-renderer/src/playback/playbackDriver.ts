/**
 * SPA-local playback driver (T053).
 *
 * A lightweight playback engine scoped to the briefing renderer's
 * read-only Storyboard surface. It is intentionally narrower than
 * the authoring environment's `StoryboardPlaybackService` (which
 * handles CRUD, lifecycle, panel snapshots, the missing-data detector,
 * etc.) — the briefing context has no editing, no missing-data flow,
 * and a single fixed Storyboard per page.
 *
 * The driver:
 *   1. Reads the ordered Scene list + the current index from the
 *      Zustand store.
 *   2. Branches on `isTimeRangeScene(scene)`:
 *      - Instant: snap the map to `viewport`; set slider to `timestamp`.
 *      - Time-range: invoke `runTimeRangeTween` (from #263) which
 *        drives slider + viewport in lock-step over `transition_duration_ms`.
 *   3. Forwards each frame's `setCurrentTime` / `flyToViewport` through
 *      the four browser port adapters, each wrapped by `withHaltGuard`
 *      so a throw transitions the store to the visible halted state
 *      (Article I.3).
 *   4. Guards the tween's `done` Promise with `guardTween` (T053).
 *
 * Compared to the full T-HOIST option, this driver:
 *   - Does not implement the panel-snapshot stream (no Storyboard panel
 *     in the SPA).
 *   - Does not implement the Scene-rectangle click flow (no edit surface).
 *   - Does not own missing-data validation (the SPA's loader gate
 *     already rejects broken payloads).
 *
 * When the hoisted `StoryboardPlaybackService` lands as a follow-up,
 * the SPA can swap in that service with a stub `PanelView` adapter and
 * delete this file.
 */

import { runTimeRangeTween, isTimeRangeScene } from '@debrief/components';
import type { SceneFeature, TimeRangeSceneFeature } from '@debrief/components/storyboard';
import { useBriefingStore } from '../store';
import { withHaltGuard, guardTween } from './haltedState';
import type {
  BrowserMapAdapter,
  BrowserPanelViewAdapter,
  BrowserSessionStoreAdapter,
  BrowserTimeRangeViewAdapter,
} from '../adapters';

export interface PlaybackDriverOpts {
  mapAdapter: BrowserMapAdapter;
  sessionAdapter: BrowserSessionStoreAdapter;
  panelAdapter: BrowserPanelViewAdapter;
  timeRangeAdapter: BrowserTimeRangeViewAdapter;
}

export interface PlaybackDriver {
  /** Snap to the current Scene index in the store. */
  syncToCurrentScene(): Promise<void>;
  /** Advance forward — Scene index + 1, or no-op at end. */
  forward(): Promise<void>;
  /** Step backward — Scene index - 1, or no-op at start. */
  backward(): Promise<void>;
  /** Jump to a specific Scene index. */
  jumpTo(index: number): Promise<void>;
  /** Reset to Scene 0 (Replay button). */
  replay(): Promise<void>;
  /** Cancel any in-flight tween. */
  dispose(): void;
}

function getViewportFromScene(scene: SceneFeature): {
  center: [number, number];
  zoom: number;
} {
  const v = scene.properties.viewport as
    | { center?: number[]; zoom?: number }
    | undefined;
  return {
    center: [v?.center?.[0] ?? 0, v?.center?.[1] ?? 0],
    zoom: v?.zoom ?? 0,
  };
}

export function createPlaybackDriver(opts: PlaybackDriverOpts): PlaybackDriver {
  // Wrap every adapter — any throw transitions the store to 'halted'.
  // Each Proxy preserves the original interface — we re-type the result
  // to match (the Proxy can't carry generic info through `Reflect.get`).
  const map = withHaltGuard(
    opts.mapAdapter as unknown as Record<string, unknown>,
    'BrowserMapAdapter',
  ) as unknown as BrowserMapAdapter;
  const session = withHaltGuard(
    opts.sessionAdapter as unknown as Record<string, unknown>,
    'LocalSessionStoreAdapter',
  ) as unknown as BrowserSessionStoreAdapter;
  const panel = withHaltGuard(
    opts.panelAdapter as unknown as Record<string, unknown>,
    'BrowserPanelViewAdapter',
  ) as unknown as BrowserPanelViewAdapter;
  const timeRange = withHaltGuard(
    opts.timeRangeAdapter as unknown as Record<string, unknown>,
    'BrowserTimeRangeViewAdapter',
  ) as unknown as BrowserTimeRangeViewAdapter;

  let activeCancel: (() => void) | null = null;

  async function snapToInstantScene(scene: SceneFeature): Promise<void> {
    const viewport = getViewportFromScene(scene);
    const timestampMs = Date.parse(scene.properties.timestamp);

    map.flyToViewport(viewport, 1000);
    session.setCurrentTime(timestampMs);
    timeRange.setScrubbableRange(null, null);
    panel.notifySceneChange(scene.properties.id);
  }

  async function runTimeRangeScene(scene: TimeRangeSceneFeature): Promise<void> {
    const startEpoch = Date.parse(scene.properties.time_range.start);
    const endEpoch = Date.parse(scene.properties.time_range.end);

    timeRange.setScrubbableRange(startEpoch, endEpoch);
    panel.notifySceneChange(scene.properties.id);

    const ports = {
      setCurrentTime(epochMs: number) {
        session.setCurrentTime(epochMs);
      },
      flyToViewport(viewport: { center: number[]; zoom: number }, durationMs: 0) {
        // The runTimeRangeTween Viewport type has `center: number[]`;
        // narrow it to a 2-tuple at the adapter boundary.
        const center: [number, number] = [
          viewport.center[0] ?? 0,
          viewport.center[1] ?? 0,
        ];
        map.flyToViewport({ center, zoom: viewport.zoom }, durationMs);
      },
    };

    const handle = runTimeRangeTween({
      targetScene: scene,
      direction: 'forward',
      durationMs: scene.properties.transition_duration_ms ?? 500,
      ports,
    });
    activeCancel = () => handle.cancel();
    await guardTween(handle.done, `Scene ${scene.properties.id}`);
    activeCancel = null;
  }

  async function syncToCurrentScene(): Promise<void> {
    // Cancel any in-flight tween before starting the next one.
    if (activeCancel) {
      activeCancel();
      activeCancel = null;
    }
    const state = useBriefingStore.getState();
    if (state.scenes.length === 0) return;
    const scene = state.scenes[state.currentSceneIndex];
    if (!scene) return;
    if (isTimeRangeScene(scene)) {
      await runTimeRangeScene(scene);
    } else {
      await snapToInstantScene(scene);
    }
  }

  async function forward(): Promise<void> {
    const state = useBriefingStore.getState();
    const next = state.currentSceneIndex + 1;
    if (next >= state.scenes.length) return;
    state.setCurrentSceneIndex(next);
    await syncToCurrentScene();
  }

  async function backward(): Promise<void> {
    const state = useBriefingStore.getState();
    const prev = state.currentSceneIndex - 1;
    if (prev < 0) return;
    state.setCurrentSceneIndex(prev);
    await syncToCurrentScene();
  }

  async function jumpTo(index: number): Promise<void> {
    const state = useBriefingStore.getState();
    if (index < 0 || index >= state.scenes.length) return;
    state.setCurrentSceneIndex(index);
    await syncToCurrentScene();
  }

  async function replay(): Promise<void> {
    await jumpTo(0);
  }

  function dispose(): void {
    if (activeCancel) {
      activeCancel();
      activeCancel = null;
    }
  }

  return { syncToCurrentScene, forward, backward, jumpTo, replay, dispose };
}
