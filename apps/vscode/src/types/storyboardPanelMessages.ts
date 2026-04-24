/**
 * Typed message contracts for the Storyboard panel webview
 * (Features 216 + 217).
 *
 * All payloads are JSON-safe; no raw filesystem paths cross the boundary
 * (Article X). Discriminated unions keep extension / webview code
 * strictly typed (Article XV).
 */

import type {
  SceneRowViewModel,
  StoryboardOptionViewModel,
  TransportViewModel,
} from '@debrief/components';

/** Webview → Extension. */
export type StoryboardPanelMessage =
  | { readonly type: 'ready' }
  | { readonly type: 'capture-clicked' }
  | { readonly type: 'scene-row-clicked'; readonly sceneId: string }
  | {
      readonly type: 'log';
      readonly level: 'debug' | 'warn' | 'error';
      readonly message: string;
    }
  // #217 — multi-Storyboard + transport
  | { readonly type: 'active-storyboard-changed'; readonly storyboardId: string }
  | { readonly type: 'transport-forward-clicked' }
  | { readonly type: 'transport-backward-clicked' }
  | { readonly type: 'create-storyboard-requested' }
  | { readonly type: 'rename-storyboard-requested' }
  | { readonly type: 'delete-storyboard-requested' };

/**
 * Full snapshot projection for the panel (#217). Replaces the narrower
 * #216 `scenes` message when the playback service is wired up.
 */
export interface StoryboardPlaybackSnapshotMessage {
  readonly type: 'snapshot';
  readonly storyboards: readonly StoryboardOptionViewModel[];
  readonly scenes: readonly SceneRowViewModel[];
  readonly activeStoryboardId: string | null;
  readonly activeStoryboardName: string | null;
  readonly currentSceneId: string | null;
  readonly transport: TransportViewModel;
}

/** Extension → Webview. */
export type ExtensionToStoryboardPanelMessage =
  | {
      readonly type: 'scenes';
      readonly scenes: SceneRowViewModel[];
      readonly activeStoryboardName: string | null;
      readonly activeStoryboardId: string | null;
    }
  | {
      readonly type: 'captureInFlight';
      readonly inFlight: boolean;
    }
  | {
      readonly type: 'theme';
      readonly theme: 'light' | 'dark' | 'vscode';
    }
  // #217 — full playback snapshot
  | StoryboardPlaybackSnapshotMessage;
