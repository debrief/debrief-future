/**
 * Host-agnostic port interfaces for `StoryboardPlaybackService`.
 *
 * Extracted from `apps/vscode/src/services/storyboardPlayback.ts` during
 * the T-HOIST step of spec #264 so both consumers (the VS Code authoring
 * environment and the air-gapped briefing renderer SPA) implement the
 * same surface against different concrete hosts.
 *
 * Event-emitting ports use the local `HostEvent<T>` / `HostDisposable`
 * types from `./events`. Those are structurally compatible with
 * `vscode.Event` / `vscode.Disposable`, so the VS Code side continues
 * to pass `vscode.EventEmitter` instances through unchanged.
 */

import type { DebriefFeature } from '../utils/types';
import type { Plot as StoryboardPlot, SceneFeature } from '../storyboard/types';
import type { HostEvent } from './events';

// Vendored from VS Code's lib — equivalent to `PromiseLike<T>`. The VS
// Code app's `vscode.window.show*Message` family returns `Thenable<T>`,
// which is a `PromiseLike<T>`. Declaring it locally lets the shared
// playback module accept `vscode.window.showInformationMessage` results
// at the modal-prompt port boundary without importing vscode.
interface Thenable<T> extends PromiseLike<T> {}

/**
 * The subset of the session-state Zustand store the playback service
 * actually reads/writes. Declared structurally so the shared module
 * doesn't import `@debrief/session-state` (UI components stay UI; the
 * session store is a runtime service).
 *
 * The VS Code app's `SessionStoreApi` conforms structurally; a
 * browser-side adapter (the briefing renderer) provides its own
 * implementation against the same shape.
 */
export interface PlaybackSessionState {
  setDisplayMode(mode: string): void;
  setCurrentTime(epochMs: number): void;
}

export interface PlaybackSessionStore {
  getState(): PlaybackSessionState;
}

export interface PlaybackMapPanel {
  getCurrentFeatures(): DebriefFeature[];
  /** Push a new feature set back into the MapPanel after a #215 CRUD op
   *  (Feature 217 Phase 4). The subsequent `onFeaturesChanged` fires the
   *  normal recompute path; the service also re-seeds its own state
   *  directly from the `result.plot` to avoid racing the event loop. */
  setFeatures(features: readonly DebriefFeature[]): void;
  flyToViewport(viewport: SceneFeature['properties']['viewport'], durationMs: number): number;
  setSceneRectangles(
    scenes: ReadonlyArray<SceneFeature> | null,
    activeStoryboardId: string | null,
    currentSceneId: string | null,
  ): void;
  readonly onFlyToComplete: HostEvent<number>;
  readonly onSceneRectangleClick: HostEvent<string>;
  readonly onFeaturesChanged: HostEvent<DebriefFeature[]>;
}

export interface PlaybackSessionManager {
  getActiveDocumentUri(): string | null;
  getSession(uri: string): PlaybackSessionStore | undefined;
  getActiveSession(): PlaybackSessionStore | null;
  readonly onActiveSessionChange: HostEvent<PlaybackSessionStore | null>;
}

// Note: `PlaybackPanelView` is declared in `./service.ts` because its
// `applySnapshot` signature references `StoryboardPlaybackSnapshot`
// which lives there.

export interface PlaybackTimeRangeView {
  setScrubbableRange(start: number | null, end: number | null): void;
}

export interface ModalPromptPort {
  showInformationMessage(
    message: string,
    options: { modal: true },
    ...items: string[]
  ): Thenable<string | undefined>;
}

export interface VisibilityPort {
  readonly onDidChangeVisibility: HostEvent<boolean>;
}

// Re-export the StoryboardPlot type so consumers of ports.ts have one
// import path for the typed surface.
export type { StoryboardPlot, DebriefFeature, SceneFeature };
