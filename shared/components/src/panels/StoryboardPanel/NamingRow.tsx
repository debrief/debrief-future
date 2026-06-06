/**
 * NamingRow — first-capture inline Storyboard naming row (Feature 235).
 *
 * Replaces the legacy host-level quick-pick (VS Code `showInputBox` /
 * web-shell modal) with an in-rail editable row. Auto-focuses the input
 * on mount; Enter confirms (when valid), Escape cancels, blur outside
 * cancels.
 *
 * The component is presentational — the analyst's typing is propagated
 * via `onTextChange`; the host owns the canonical `pendingName`. The
 * component renders whatever `viewModel.pendingName` says and only fires
 * `onConfirm` when `viewModel.canConfirm` is true.
 */

import React, { useEffect, useRef } from 'react';
import type { NamingRowViewModel } from './types';

export interface NamingRowProps {
  readonly viewModel: NamingRowViewModel;
  readonly onTextChange: (pendingName: string) => void;
  readonly onConfirm: (name: string) => void;
  readonly onCancel: () => void;
}

export const NamingRow: React.FC<NamingRowProps> = ({
  viewModel,
  onTextChange,
  onConfirm,
  onCancel,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (viewModel.visible) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [viewModel.visible]);

  if (!viewModel.visible) {
    return null;
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (viewModel.canConfirm) {
        onConfirm(viewModel.pendingName.trim());
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <div
      data-testid="storyboard-naming-row"
      role="group"
      aria-label="Name new storyboard"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        padding: '8px 10px',
        borderBottom: '1px solid var(--vscode-panel-border, #3c3c3c)',
        background:
          'var(--vscode-sideBar-background, var(--vscode-editor-background, transparent))',
      }}
    >
      <label
        htmlFor="storyboard-naming-row-input"
        style={{ fontSize: 11, opacity: 0.85 }}
      >
        Name your storyboard
      </label>
      <input
        ref={inputRef}
        id="storyboard-naming-row-input"
        data-testid="storyboard-naming-row-input"
        type="text"
        value={viewModel.pendingName}
        onChange={(e): void => onTextChange(e.currentTarget.value)}
        onKeyDown={handleKeyDown}
        aria-invalid={viewModel.collisionWith !== null}
        aria-describedby={
          viewModel.collisionWith !== null
            ? 'storyboard-naming-row-collision'
            : undefined
        }
        style={{
          padding: '4px 6px',
          fontSize: 13,
          width: '100%',
          boxSizing: 'border-box',
        }}
      />
      {viewModel.collisionWith !== null && (
        <span
          id="storyboard-naming-row-collision"
          data-testid="storyboard-naming-row-collision"
          role="alert"
          style={{
            fontSize: 11,
            color:
              'var(--vscode-inputValidation-errorForeground, #f48771)',
          }}
        >
          A storyboard named &quot;{viewModel.collisionWith}&quot; already
          exists on this plot.
        </span>
      )}
      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
        <button
          type="button"
          data-testid="storyboard-naming-row-cancel"
          onClick={onCancel}
          aria-label="Cancel naming new storyboard"
        >
          Cancel
        </button>
        <button
          type="button"
          data-testid="storyboard-naming-row-confirm"
          onClick={(): void => {
            if (viewModel.canConfirm) {
              onConfirm(viewModel.pendingName.trim());
            }
          }}
          disabled={!viewModel.canConfirm}
          aria-label="Confirm storyboard name"
        >
          Confirm
        </button>
      </div>
    </div>
  );
};
