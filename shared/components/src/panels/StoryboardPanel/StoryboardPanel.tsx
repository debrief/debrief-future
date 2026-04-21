/**
 * Storyboard panel — minimal (Scene list only) for Feature 216.
 *
 * #217 will extend with transport controls + multi-Storyboard dropdown.
 * #218 will extend with edit affordances. This spec ships a presentational
 * Scene list only — a confirmation surface for the capture flow.
 *
 * No VS Code imports; theming flows through the existing `ThemeProvider`
 * tokens so the panel works unmodified in Storybook.
 */

import React from 'react';
import { SceneList } from './SceneList';
import type { StoryboardPanelProps } from './types';

const EMPTY_STATE_COPY =
  'No Storyboards yet. Press Ctrl/Cmd+Alt+C on the map to capture your first Scene.';

const EMPTY_STORYBOARD_COPY =
  'No Scenes yet. Press Ctrl/Cmd+Alt+C on the map to capture one.';

export function StoryboardPanel({
  scenes,
  activeStoryboardName,
  captureInFlight,
  onCaptureClick,
  onSceneRowClick,
}: StoryboardPanelProps): React.ReactElement {
  const isEmptyNoStoryboard =
    activeStoryboardName === null && scenes.length === 0 && !captureInFlight;
  const isEmptyStoryboard =
    activeStoryboardName !== null && scenes.length === 0 && !captureInFlight;
  const sceneCount = scenes.length;

  return (
    <div
      data-testid="storyboard-panel"
      className="storyboard-panel"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
      }}
    >
      <header
        className="storyboard-panel__header"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 10px',
          borderBottom: '1px solid var(--vscode-panel-border, #3c3c3c)',
          gap: 8,
        }}
      >
        <div
          className="storyboard-panel__title"
          style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}
        >
          <span
            data-testid="storyboard-name"
            style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}
          >
            {activeStoryboardName ?? 'Storyboard'}
          </span>
          {activeStoryboardName !== null && (
            <span
              data-testid="storyboard-scene-count"
              style={{ fontSize: 11, opacity: 0.7 }}
            >
              {sceneCount === 1 ? '1 scene' : `${sceneCount} scenes`}
            </span>
          )}
        </div>
        <button
          type="button"
          data-testid="capture-button"
          aria-label="Capture scene"
          onClick={onCaptureClick}
          className="storyboard-panel__capture"
          style={{ padding: '4px 10px' }}
        >
          Capture
        </button>
      </header>

      {isEmptyNoStoryboard ? (
        <div
          data-testid="storyboard-empty-state"
          className="storyboard-panel__empty"
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            textAlign: 'center',
            opacity: 0.8,
          }}
        >
          {EMPTY_STATE_COPY}
        </div>
      ) : isEmptyStoryboard ? (
        <div
          data-testid="storyboard-empty-storyboard"
          className="storyboard-panel__empty-storyboard"
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            textAlign: 'center',
            opacity: 0.8,
          }}
        >
          {EMPTY_STORYBOARD_COPY}
        </div>
      ) : (
        <div
          className="storyboard-panel__body"
          style={{ flex: 1, overflow: 'auto', minHeight: 0 }}
        >
          <SceneList
            scenes={scenes}
            captureInFlight={captureInFlight}
            onSceneRowClick={onSceneRowClick}
          />
        </div>
      )}
    </div>
  );
}
