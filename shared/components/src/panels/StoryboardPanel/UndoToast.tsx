/**
 * UndoToast — presentational variant of the session-scoped undo toast
 * (Feature 218 — FR-EDIT-003).
 *
 * The VS Code host uses `window.showInformationMessage` for the real
 * toast; this inline variant renders in Storybook and the web-shell
 * where no VS Code host is available. Dismiss on Escape; Undo click
 * fires `onUndo`; the Undo button disables when `canUndo === false`
 * (buffer eviction).
 */

import React, { useEffect, useRef } from 'react';

export interface UndoToastState {
  readonly sceneId: string;
  readonly sceneTitle: string;
  readonly deletedAt: string;
  readonly canUndo: boolean;
}

export interface UndoToastProps {
  readonly state: UndoToastState | null;
  readonly onUndo: () => void;
  readonly onDismiss: () => void;
}

export const UndoToast: React.FC<UndoToastProps> = ({ state, onUndo, onDismiss }) => {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!state) {
      return;
    }
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        onDismiss();
      }
    };
    const el = rootRef.current;
    el?.addEventListener('keydown', handler);
    el?.focus();
    return (): void => {
      el?.removeEventListener('keydown', handler);
    };
  }, [state, onDismiss]);

  if (!state) {
    return null;
  }

  return (
    <div
      ref={rootRef}
      role="status"
      aria-live="polite"
      tabIndex={-1}
      data-testid="undo-toast"
      data-scene-id={state.sceneId}
    >
      <span data-testid="undo-toast-message">
        Deleted scene &quot;{state.sceneTitle}&quot;
      </span>
      <button
        type="button"
        data-testid="undo-toast-undo-button"
        onClick={onUndo}
        disabled={!state.canUndo}
        aria-label={`Undo delete of scene ${state.sceneTitle}`}
      >
        Undo
      </button>
      <button
        type="button"
        data-testid="undo-toast-dismiss-button"
        onClick={onDismiss}
        aria-label={`Dismiss undo toast for ${state.sceneTitle}`}
      >
        Dismiss
      </button>
    </div>
  );
};
