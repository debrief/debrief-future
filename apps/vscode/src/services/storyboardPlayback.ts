/**
 * `StoryboardPlaybackService` shim.
 *
 * The service itself was hoisted to `@debrief/components/storyboard-playback`
 * during the T-HOIST step of spec #264 so both consumers (this extension
 * and the air-gapped briefing renderer SPA) compose the same engine.
 *
 * This file is now a thin re-export of the shared module. Existing
 * imports from `./services/storyboardPlayback` continue to resolve
 * unchanged; tests pass the same port types they always did. The only
 * behaviour change for the VS Code side is that the three previously
 * inline vscode defaults (`showErrorMessage`, `setContext`,
 * `showInformationMessage`) are now wired explicitly at the
 * `extension.ts` instantiation site rather than baked into the service.
 */

export {
  StoryboardPlaybackService,
  HostEventEmitter,
  plotFromFeatures,
  featuresFromPlot,
} from '@debrief/components/storyboardPlayback';

export type {
  StoryboardPlaybackServiceOptions,
  StoryboardPlaybackSnapshot,
  PlaybackMapPanel,
  PlaybackPanelView,
  PlaybackSessionManager,
  PlaybackSessionStore,
  PlaybackTimeRangeView,
  ModalPromptPort,
  VisibilityPort,
  HostDisposable,
  HostEvent,
} from '@debrief/components/storyboardPlayback';
