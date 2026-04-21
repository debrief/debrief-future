/**
 * Renders the list of Scene rows for the active Storyboard (Feature 216).
 * Prepends a pending row when `captureInFlight` is true.
 */

import React from 'react';
import { SceneRow } from './SceneRow';
import type { SceneRowViewModel } from './types';

export interface SceneListProps {
  readonly scenes: readonly SceneRowViewModel[];
  readonly captureInFlight: boolean;
  onSceneRowClick(sceneId: string): void;
}

const PENDING_SCENE: SceneRowViewModel = {
  sceneId: '__capturing__',
  title: 'Capturing…',
  timestampIso: '',
  dtgLabel: 'Capturing…',
  thumbnailHref: '',
  state: { kind: 'pending' },
};

export function SceneList({
  scenes,
  captureInFlight,
  onSceneRowClick,
}: SceneListProps): React.ReactElement {
  return (
    <div
      role="list"
      data-testid="scene-list"
      className="storyboard-scene-list"
      style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: 4 }}
    >
      {captureInFlight && (
        <SceneRow scene={PENDING_SCENE} onClick={onSceneRowClick} />
      )}
      {scenes.map((scene) => (
        <SceneRow
          key={scene.sceneId}
          scene={scene}
          onClick={onSceneRowClick}
        />
      ))}
    </div>
  );
}
