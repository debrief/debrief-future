/**
 * App-level keyboard-shortcut hook for the briefing renderer's mode
 * toggle. Listens for the `P` key (case-insensitive) and dispatches
 * `toggleDisplayMode` to the store.
 *
 * Lives at this scope rather than inside `ModeToggle` so the listener
 * is registered for the SPA's full lifetime — `ModeToggle` itself
 * lives inside the (un)mount-cycling `MinimalChrome` / `PresentChrome`
 * wrappers, and registering the listener inside it left a brief gap
 * between cleanup and re-add during a toggle. A `keydown` landing in
 * that gap was unhandled (and broke the 10-toggle Playwright soak in
 * `briefing-zip-mode-toggle.spec.ts`).
 */

import { useEffect } from 'react';
import { useBriefingStore } from '../store';

export function useKeyboardModeToggle(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'p' || e.key === 'P') {
        useBriefingStore.getState().toggleDisplayMode();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
