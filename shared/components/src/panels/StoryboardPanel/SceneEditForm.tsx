/**
 * SceneEditForm — per-Scene edit surface rendered inline inside an
 * expanded Scene row (Feature 218).
 *
 * Four sections:
 *  1. Title inline-rename (Enter commits, Escape reverts, blur commits)
 *  2. Markdown description editor + live preview (Save disabled until
 *     buffer differs from saved; Cancel reverts)
 *  3. Missing-data remediation panel (conditional on `missingData.kind`)
 *  4. Row actions (Update / Duplicate / Copy / Delete / Refresh)
 *
 * No new runtime deps — consumers inject `renderMarkdown` when they
 * have a markdown library; default is monospace plain text.
 *
 * Contract: specs/218-storyboarding-edit/contracts/scene-edit-form.md
 */

import React, { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

export type SceneMissingData =
  | { readonly kind: 'ok' }
  | { readonly kind: 'missing-features'; readonly ids: readonly string[] }
  | { readonly kind: 'out-of-range'; readonly scenario: 'before-start' | 'after-end' };

export interface SceneEditFormProps {
  readonly sceneId: string;
  readonly title: string;
  readonly description: string | null;
  readonly timestamp: string;
  readonly missingData: SceneMissingData;
  readonly onTitleRenameCommit: (newTitle: string) => void;
  readonly onDescriptionSubmit: (description: string | null) => void;
  readonly onUpdateToCurrent: () => void;
  readonly onDuplicate: () => void;
  readonly onCopyToOther: () => void;
  readonly onDelete: () => void;
  readonly onRefreshThumbnail: () => void;
  readonly onCancel: () => void;
  /** Optional markdown renderer; defaults to plain text in a <pre>. */
  readonly renderMarkdown?: (markdown: string) => ReactNode;
}

const defaultRenderMarkdown = (md: string): ReactNode => (
  <pre data-testid="scene-edit-form-preview" style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
    {md}
  </pre>
);

export const SceneEditForm: React.FC<SceneEditFormProps> = ({
  sceneId,
  title,
  description,
  timestamp,
  missingData,
  onTitleRenameCommit,
  onDescriptionSubmit,
  onUpdateToCurrent,
  onDuplicate,
  onCopyToOther,
  onDelete,
  onRefreshThumbnail,
  onCancel,
  renderMarkdown = defaultRenderMarkdown,
}) => {
  const [titleBuffer, setTitleBuffer] = useState(title);
  const [descriptionBuffer, setDescriptionBuffer] = useState(description ?? '');
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Sync buffer when props change (new scene selected etc).
  useEffect(() => {
    setTitleBuffer(title);
  }, [title]);
  useEffect(() => {
    setDescriptionBuffer(description ?? '');
  }, [description]);

  const commitTitle = useCallback((): void => {
    const trimmed = titleBuffer.trim();
    if (trimmed !== title) {
      onTitleRenameCommit(trimmed);
    }
  }, [titleBuffer, title, onTitleRenameCommit]);

  const handleTitleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>): void => {
      if (e.key === 'Enter') {
        e.preventDefault();
        commitTitle();
        titleInputRef.current?.blur();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setTitleBuffer(title);
        titleInputRef.current?.blur();
      }
    },
    [commitTitle, title],
  );

  const descriptionDirty = descriptionBuffer !== (description ?? '');

  const handleSaveDescription = useCallback((): void => {
    onDescriptionSubmit(descriptionBuffer === '' ? null : descriptionBuffer);
  }, [descriptionBuffer, onDescriptionSubmit]);

  const handleCancelDescription = useCallback((): void => {
    setDescriptionBuffer(description ?? '');
    onCancel();
  }, [description, onCancel]);

  const titleInputId = `scene-edit-title-${sceneId}`;

  return (
    <form
      role="form"
      aria-labelledby={titleInputId}
      data-testid="scene-edit-form"
      data-scene-id={sceneId}
      onSubmit={(e): void => e.preventDefault()}
    >
      {/* ── Section 1: Title inline-rename ─────────────────────── */}
      <div data-testid="scene-edit-form-title-row">
        <input
          id={titleInputId}
          ref={titleInputRef}
          type="text"
          aria-label="Scene title"
          data-testid="scene-edit-form-title-input"
          value={titleBuffer}
          onChange={(e): void => setTitleBuffer(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={handleTitleKeyDown}
        />
        <span
          aria-label="Scene timestamp"
          data-testid="scene-edit-form-timestamp"
          style={{ marginLeft: '0.5rem' }}
        >
          {timestamp}
        </span>
      </div>

      {/* ── Section 2: Description editor + preview ─────────────── */}
      <section aria-label="Description" data-testid="scene-edit-form-description-section">
        <textarea
          aria-label="Scene description"
          aria-describedby={`scene-edit-desc-hint-${sceneId}`}
          data-testid="scene-edit-form-description-textarea"
          rows={6}
          value={descriptionBuffer}
          onChange={(e): void => setDescriptionBuffer(e.target.value)}
        />
        <span
          id={`scene-edit-desc-hint-${sceneId}`}
          style={{ position: 'absolute', left: -9999, top: 'auto', width: 1, height: 1, overflow: 'hidden' }}
        >
          CommonMark is supported.
        </span>
        <div data-testid="scene-edit-form-preview-container">
          {renderMarkdown(descriptionBuffer)}
        </div>
        <button
          type="button"
          data-testid="scene-edit-form-save-description"
          onClick={handleSaveDescription}
          disabled={!descriptionDirty}
        >
          Save description
        </button>
        <button
          type="button"
          data-testid="scene-edit-form-cancel"
          onClick={handleCancelDescription}
        >
          Cancel
        </button>
      </section>

      {/* ── Section 3: Missing-data remediation ─────────────────── */}
      {missingData.kind !== 'ok' && (
        <section
          role="region"
          aria-labelledby={`missing-data-heading-${sceneId}`}
          data-testid="scene-edit-form-missing-data"
        >
          <h4 id={`missing-data-heading-${sceneId}`}>Missing data</h4>
          {missingData.kind === 'missing-features' && (
            <>
              <p>The following feature IDs no longer resolve:</p>
              <ul data-testid="scene-edit-form-missing-ids">
                {missingData.ids.map((id) => (
                  <li key={id}>{id}</li>
                ))}
              </ul>
            </>
          )}
          {missingData.kind === 'out-of-range' && (
            <p>
              {missingData.scenario === 'before-start'
                ? 'Scene timestamp is before the current plot time-range start.'
                : 'Scene timestamp is after the current plot time-range end.'}
            </p>
          )}
          <button
            type="button"
            data-testid="scene-edit-form-missing-update-to-current"
            aria-label={`Update scene ${sceneId} to current`}
            onClick={onUpdateToCurrent}
          >
            Update to current
          </button>
          <button
            type="button"
            data-testid="scene-edit-form-missing-delete"
            aria-label={`Delete scene ${sceneId}`}
            onClick={onDelete}
          >
            Delete
          </button>
        </section>
      )}

      {/* ── Section 4: Row actions ──────────────────────────────── */}
      <section aria-label="Scene actions" data-testid="scene-edit-form-row-actions">
        <button
          type="button"
          data-testid="scene-edit-form-action-update"
          aria-label={`Update scene ${sceneId} to current view`}
          onClick={onUpdateToCurrent}
        >
          Update to current
        </button>
        <button
          type="button"
          data-testid="scene-edit-form-action-duplicate"
          aria-label={`Duplicate scene ${sceneId}`}
          onClick={onDuplicate}
        >
          Duplicate
        </button>
        <button
          type="button"
          data-testid="scene-edit-form-action-copy"
          aria-label={`Copy scene ${sceneId} to another storyboard`}
          onClick={onCopyToOther}
        >
          Copy to other
        </button>
        <button
          type="button"
          data-testid="scene-edit-form-action-delete"
          aria-label={`Delete scene ${sceneId}`}
          onClick={onDelete}
        >
          Delete
        </button>
        <button
          type="button"
          data-testid="scene-edit-form-action-refresh"
          aria-label={`Refresh thumbnail for scene ${sceneId}`}
          onClick={onRefreshThumbnail}
        >
          Refresh thumbnail
        </button>
      </section>
    </form>
  );
};
