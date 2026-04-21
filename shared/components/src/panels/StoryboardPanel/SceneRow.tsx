/**
 * A single Scene row in the Storyboard panel (Feature 216).
 */

import React from 'react';
import type { SceneRowViewModel } from './types';

export interface SceneRowProps {
  readonly scene: SceneRowViewModel;
  onClick(sceneId: string): void;
}

const THUMBNAIL_WIDTH = 200;
const THUMBNAIL_HEIGHT = 150;

export function SceneRow({ scene, onClick }: SceneRowProps): React.ReactElement {
  const handleClick = (): void => {
    if (scene.state.kind === 'pending') return;
    onClick(scene.sceneId);
  };
  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };
  const isPending = scene.state.kind === 'pending';
  return (
    <div
      role="listitem"
      aria-label={`${scene.dtgLabel} — ${scene.title}`}
      data-testid="scene-row"
      data-scene-id={scene.sceneId}
      data-state={scene.state.kind}
      tabIndex={isPending ? -1 : 0}
      className={`storyboard-scene-row ${isPending ? 'is-pending' : ''}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      style={{
        display: 'flex',
        gap: 8,
        padding: 6,
        alignItems: 'flex-start',
        cursor: isPending ? 'default' : 'pointer',
        opacity: isPending ? 0.6 : 1,
      }}
    >
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
        style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}
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
    </div>
  );
}
