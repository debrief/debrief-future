/**
 * BrowserPanelViewAdapter (T046) — the briefing renderer's analogue of
 * the VS Code Storyboard panel. The SPA has no Storyboard panel surface
 * (it's a recipient-facing playback view, not an authoring tool), so
 * this adapter's only job is to track the active Scene id in the local
 * store. The TransportBar and ModeToggle subscribe to that slice and
 * render accordingly.
 */

import { useBriefingStore } from '../store';

export interface BrowserPanelViewAdapter {
  /** Called when the active Scene changes. */
  notifySceneChange(sceneId: string): void;
}

export function createBrowserPanelViewAdapter(): BrowserPanelViewAdapter {
  return {
    notifySceneChange(sceneId) {
      const state = useBriefingStore.getState();
      const idx = state.scenes.findIndex(
        (s) => (s.properties as { id?: string }).id === sceneId,
      );
      if (idx >= 0 && idx !== state.currentSceneIndex) {
        state.setCurrentSceneIndex(idx);
      }
    },
  };
}
