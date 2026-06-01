/**
 * SceneEditDialog — modal popup for editing a Scene's title + description.
 *
 * Replaces the former inline `SceneEditForm` expand-in-place surface (#230).
 * Per the UX review, per-Scene commands now live on the single `⋯` overflow
 * menu, and the only action that needs free-text input — "Edit" — opens this
 * dialog. Input-free commands (Update to current, Duplicate, Copy, Delete,
 * Refresh thumbnail) stay as direct menu actions.
 *
 * True modal: backdrop overlay, `role="dialog"` + `aria-modal`, autofocus on
 * the title field, Escape closes, click on the backdrop closes. No new runtime
 * deps — consumers inject `renderMarkdown` when they have a markdown library;
 * default is monospace plain text.
 */

import React, { useEffect, useRef, useState, type ReactNode } from 'react';
import type { SceneMissingData } from './SceneEditForm';

export interface SceneEditDialogProps {
  readonly sceneId: string;
  readonly title: string;
  readonly description: string | null;
  readonly timestamp: string;
  readonly missingData: SceneMissingData;
  /** Commits the edited title and description. The panel decides which of
   *  the underlying host callbacks to fire based on what actually changed. */
  readonly onSave: (title: string, description: string | null) => void;
  /** Recapture the Scene against the current view (missing-data remedy). */
  readonly onUpdateToCurrent: () => void;
  /** Close without saving (Cancel / Escape / backdrop click). */
  readonly onCancel: () => void;
  /** Optional markdown renderer; defaults to plain text in a <pre>. */
  readonly renderMarkdown?: (markdown: string) => ReactNode;
}

const defaultRenderMarkdown = (md: string): ReactNode => (
  <pre
    data-testid="scene-edit-dialog-preview"
    style={{ margin: 0, whiteSpace: 'pre-wrap' }}
  >
    {md}
  </pre>
);

export function SceneEditDialog({
  sceneId,
  title,
  description,
  timestamp,
  missingData,
  onSave,
  onUpdateToCurrent,
  onCancel,
  renderMarkdown = defaultRenderMarkdown,
}: SceneEditDialogProps): React.ReactElement {
  const [titleBuffer, setTitleBuffer] = useState(title);
  const [descriptionBuffer, setDescriptionBuffer] = useState(description ?? '');
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Autofocus the title field on open.
  useEffect(() => {
    titleInputRef.current?.focus();
    titleInputRef.current?.select();
  }, []);

  // Escape closes.
  useEffect(() => {
    const handleKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onCancel]);

  const handleSave = (): void => {
    onSave(
      titleBuffer.trim(),
      descriptionBuffer === '' ? null : descriptionBuffer,
    );
  };

  const titleInputId = `scene-edit-dialog-title-${sceneId}`;
  const descHintId = `scene-edit-dialog-desc-hint-${sceneId}`;

  return (
    <div
      data-testid="scene-edit-dialog-backdrop"
      onMouseDown={(e): void => {
        // Backdrop click (outside the dialog body) cancels.
        if (e.target === e.currentTarget) onCancel();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleInputId}
        data-testid="scene-edit-dialog"
        data-scene-id={sceneId}
        style={{
          width: 'min(420px, 90vw)',
          maxHeight: '90vh',
          overflow: 'auto',
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          background: 'var(--vscode-editor-background, #1e1e1e)',
          color: 'var(--vscode-foreground, #cccccc)',
          border: '1px solid var(--vscode-widget-border, #3c3c3c)',
          borderRadius: 6,
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.5)',
        }}
      >
        <h3 style={{ margin: 0, fontSize: 14 }}>Edit scene</h3>

        {/* Title */}
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 12, opacity: 0.8 }}>Title</span>
          <input
            id={titleInputId}
            ref={titleInputRef}
            type="text"
            aria-label="Scene title"
            data-testid="scene-edit-dialog-title-input"
            value={titleBuffer}
            onChange={(e): void => setTitleBuffer(e.target.value)}
            style={{ padding: '4px 6px' }}
          />
        </label>
        <span style={{ fontSize: 11, opacity: 0.6 }}>{timestamp}</span>

        {/* Description */}
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 12, opacity: 0.8 }}>Description</span>
          <textarea
            aria-label="Scene description"
            aria-describedby={descHintId}
            data-testid="scene-edit-dialog-description-textarea"
            rows={6}
            value={descriptionBuffer}
            onChange={(e): void => setDescriptionBuffer(e.target.value)}
            style={{ padding: '4px 6px', resize: 'vertical' }}
          />
          <span
            id={descHintId}
            style={{
              position: 'absolute',
              left: -9999,
              top: 'auto',
              width: 1,
              height: 1,
              overflow: 'hidden',
            }}
          >
            CommonMark is supported.
          </span>
        </label>
        {descriptionBuffer !== '' && (
          <div data-testid="scene-edit-dialog-preview-container">
            {renderMarkdown(descriptionBuffer)}
          </div>
        )}

        {/* Missing-data remediation */}
        {missingData.kind !== 'ok' && (
          <section
            role="region"
            aria-label="Missing data"
            data-testid="scene-edit-dialog-missing-data"
            style={{
              fontSize: 12,
              border: '1px solid var(--vscode-inputValidation-warningBorder, #b89500)',
              borderRadius: 4,
              padding: 8,
            }}
          >
            {missingData.kind === 'missing-features' ? (
              <span>
                Some features referenced by this scene no longer resolve.
              </span>
            ) : (
              <span>
                {missingData.scenario === 'before-start'
                  ? 'Scene timestamp is before the current plot time-range start.'
                  : 'Scene timestamp is after the current plot time-range end.'}
              </span>
            )}
            <div style={{ marginTop: 8 }}>
              <button
                type="button"
                data-testid="scene-edit-dialog-update-to-current"
                onClick={onUpdateToCurrent}
              >
                Update to current
              </button>
            </div>
          </section>
        )}

        {/* Footer actions */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8,
            marginTop: 4,
          }}
        >
          <button
            type="button"
            data-testid="scene-edit-dialog-cancel"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            data-testid="scene-edit-dialog-save"
            onClick={handleSave}
            style={{ fontWeight: 600 }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
