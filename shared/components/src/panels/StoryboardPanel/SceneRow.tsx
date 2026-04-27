/**
 * A single Scene row in the Storyboard panel (Feature 216 / 217 / 230).
 *
 * #230 additions:
 *  - Chevron control toggles the inline edit form (FR-001).
 *  - Double-click on the row body toggles the form (FR-002).
 *  - Right-click / Shift+F10 / ContextMenu key opens the overflow menu
 *    (FR-003, US2).
 *
 * Single-click preserves #217's `onClick(sceneId)` transport-select.
 */

import React, { useRef } from 'react';
import type { SceneRowViewModel } from './types';

export interface SceneRowProps {
  readonly scene: SceneRowViewModel;
  /** When true, the row renders with bolder styling + `data-active="true"` —
   *  used by Feature 217 to highlight the current transport scene. */
  readonly active?: boolean;
  /** When true, the chevron glyph renders in its expanded (▼) state and
   *  the row's `aria-expanded` is true. From #230 panel reducer. */
  readonly editFormOpen?: boolean;
  onClick(sceneId: string): void;
  /** #230 FR-001 — chevron click / double-click / keyboard disclosure. */
  onExpandToggle?(sceneId: string): void;
  /** #230 FR-003 — overflow menu open (right-click / Shift+F10). */
  onOverflowMenuOpen?(sceneId: string, anchorRect: DOMRect): void;
}

const THUMBNAIL_WIDTH = 200;
const THUMBNAIL_HEIGHT = 150;

export function SceneRow({
  scene,
  active = false,
  editFormOpen = false,
  onClick,
  onExpandToggle,
  onOverflowMenuOpen,
}: SceneRowProps): React.ReactElement {
  const rowRef = useRef<HTMLDivElement>(null);

  const handleClick = (): void => {
    if (scene.state.kind === 'pending') return;
    onClick(scene.sceneId);
  };

  const handleDoubleClick = (e: React.MouseEvent): void => {
    if (scene.state.kind === 'pending') return;
    // Guard: double-click on the chevron or overflow trigger should not
    // also fire a row-level dblclick (stopPropagation is set on those).
    if (onExpandToggle) {
      e.preventDefault();
      onExpandToggle(scene.sceneId);
    }
  };

  const handleChevronClick = (e: React.MouseEvent): void => {
    e.stopPropagation();
    if (scene.state.kind === 'pending') return;
    onExpandToggle?.(scene.sceneId);
  };

  const handleContextMenu = (e: React.MouseEvent): void => {
    if (scene.state.kind === 'pending') return;
    if (!onOverflowMenuOpen || !rowRef.current) return;
    e.preventDefault();
    onOverflowMenuOpen(scene.sceneId, rowRef.current.getBoundingClientRect());
  };

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (scene.state.kind === 'pending') return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    } else if (
      // Shift+F10 or ContextMenu key → overflow menu
      (e.shiftKey && e.key === 'F10') ||
      e.key === 'ContextMenu'
    ) {
      e.preventDefault();
      if (onOverflowMenuOpen && rowRef.current) {
        onOverflowMenuOpen(
          scene.sceneId,
          rowRef.current.getBoundingClientRect(),
        );
      }
    }
  };
  const isPending = scene.state.kind === 'pending';
  const chevronLabel = editFormOpen
    ? `Collapse edit form for ${scene.title}`
    : `Expand edit form for ${scene.title}`;
  return (
    // 234 US3 fix (FR-022): role="listitem" was paired with role="list"
    // on the parent SceneList; both removed because the parent
    // interleaves rows with StaleBadge + SceneEditForm overlays
    // (axe-core aria-required-children — critical). Accessible name
    // remains via aria-label.
    <div
      ref={rowRef}
      aria-label={`${scene.dtgLabel} — ${scene.title}`}
      // 234 US3 fix (FR-022): aria-expanded was on the row div without
      // a supporting role (axe-core aria-allowed-attr — critical). The
      // attribute is correctly carried by the chevron button below; no
      // duplication needed.
      data-testid="scene-row"
      data-scene-id={scene.sceneId}
      data-state={scene.state.kind}
      data-active={active ? 'true' : undefined}
      data-edit-form-open={editFormOpen ? 'true' : undefined}
      tabIndex={isPending ? -1 : 0}
      className={`storyboard-scene-row ${isPending ? 'is-pending' : ''} ${active ? 'is-active' : ''}`}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      onKeyDown={handleKeyDown}
      style={{
        display: 'flex',
        gap: 8,
        padding: 6,
        alignItems: 'flex-start',
        cursor: isPending ? 'default' : 'pointer',
        opacity: isPending ? 0.6 : 1,
        outline: active ? '2px solid var(--vscode-focusBorder, #007acc)' : 'none',
        background: active
          ? 'var(--vscode-list-activeSelectionBackground, rgba(0, 122, 204, 0.15))'
          : 'transparent',
      }}
    >
      {onExpandToggle !== undefined && !isPending && (
        <button
          type="button"
          aria-label={chevronLabel}
          aria-expanded={editFormOpen}
          data-testid="scene-row-chevron"
          className="storyboard-scene-row__chevron"
          onClick={handleChevronClick}
          onDoubleClick={(e): void => {
            e.stopPropagation();
          }}
          style={{
            flex: '0 0 auto',
            width: 18,
            height: 18,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            border: 'none',
            color: 'inherit',
            cursor: 'pointer',
            fontSize: 10,
          }}
        >
          <span aria-hidden="true">{editFormOpen ? '▼' : '▶'}</span>
        </button>
      )}
      {isPending ? (
        <div
          className="storyboard-scene-row__placeholder"
          aria-hidden="true"
          style={{
            width: THUMBNAIL_WIDTH,
            height: THUMBNAIL_HEIGHT,
            background: 'var(--vscode-editorWidget-background, #2a2d2e)',
            border: '1px dashed var(--vscode-panel-border, #3c3c3c)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 11,
          }}
        >
          Capturing…
        </div>
      ) : (
        <img
          src={scene.thumbnailHref}
          alt=""
          loading="lazy"
          width={THUMBNAIL_WIDTH}
          height={THUMBNAIL_HEIGHT}
          className="storyboard-scene-row__thumb"
          style={{
            flex: '0 0 auto',
            display: 'block',
            background: 'var(--vscode-editorWidget-background, #2a2d2e)',
          }}
        />
      )}
      <div
        className="storyboard-scene-row__meta"
        style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, flex: 1 }}
      >
        <span
          className="storyboard-scene-row__dtg"
          data-testid="scene-row-dtg"
          style={{ fontWeight: 600 }}
        >
          {scene.dtgLabel}
        </span>
        <span
          className="storyboard-scene-row__title"
          data-testid="scene-row-title"
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={scene.title}
        >
          {scene.title}
        </span>
        <span
          className="storyboard-scene-row__timestamp"
          data-testid="scene-row-timestamp"
          style={{ fontSize: 11, opacity: 0.7 }}
        >
          {scene.timestampIso}
        </span>
      </div>
      {onOverflowMenuOpen !== undefined && !isPending && (
        <button
          type="button"
          aria-label={`Scene actions menu for ${scene.title}`}
          aria-haspopup="menu"
          data-testid="scene-overflow-trigger"
          className="storyboard-scene-row__overflow"
          onClick={(e): void => {
            e.stopPropagation();
            if (rowRef.current) {
              onOverflowMenuOpen(
                scene.sceneId,
                rowRef.current.getBoundingClientRect(),
              );
            }
          }}
          onDoubleClick={(e): void => {
            e.stopPropagation();
          }}
          style={{
            flex: '0 0 auto',
            width: 22,
            height: 22,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            border: 'none',
            color: 'inherit',
            cursor: 'pointer',
          }}
        >
          <span aria-hidden="true">⋯</span>
        </button>
      )}
    </div>
  );
}
