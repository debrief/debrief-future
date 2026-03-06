/**
 * DeleteConfirmation — inline confirmation prompt for entry deletion.
 * Feature: 113-prov-card-flip
 */

import React from 'react';
import { LOG_PANEL_STRINGS } from './strings';

export interface DeleteConfirmationProps {
  readonly visible: boolean;
  readonly toolName: string;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}

export function DeleteConfirmation({
  visible,
  onConfirm,
  onCancel,
}: DeleteConfirmationProps): React.ReactElement | null {
  if (!visible) return null;

  return (
    <div
      className="log-panel__delete-confirm"
      data-testid="delete-confirmation"
      role="alertdialog"
      aria-label={LOG_PANEL_STRINGS.editFaceDeleteConfirmTitle}
    >
      <div className="log-panel__delete-confirm-title">
        {LOG_PANEL_STRINGS.editFaceDeleteConfirmTitle}
      </div>
      <div className="log-panel__delete-confirm-message">
        {LOG_PANEL_STRINGS.editFaceDeleteConfirmMessage}
      </div>
      <div className="log-panel__delete-confirm-actions">
        <button
          className="log-panel__delete-confirm-btn log-panel__delete-confirm-btn--danger"
          onClick={onConfirm}
          data-testid="delete-confirm-button"
        >
          {LOG_PANEL_STRINGS.editFaceDeleteConfirm}
        </button>
        <button
          className="log-panel__delete-confirm-btn"
          onClick={onCancel}
          data-testid="delete-cancel-button"
        >
          {LOG_PANEL_STRINGS.editFaceDeleteCancel}
        </button>
      </div>
    </div>
  );
}
