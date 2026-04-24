/**
 * UndoToast — presentational Storybook/web-shell variant of the
 * session-scoped undo toast (Feature 218).
 *
 * VS Code host uses native `showInformationMessage` for the real
 * path; this inline variant renders in Storybook/web-shell where no
 * VS Code host is available.
 *
 * Phase 1: typed skeleton returning null. Real implementation
 * lands in Phase 3 T059.
 */

import React from 'react';

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

export const UndoToast: React.FC<UndoToastProps> = () => {
  return null;
};
