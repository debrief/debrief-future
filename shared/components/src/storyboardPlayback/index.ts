/**
 * Public barrel for the shared storyboard playback primitives.
 *
 * Originally introduced for #263 (`TimeRangeTween` only); extended in #264
 * (T-HOIST) to export the full `StoryboardPlaybackService` so both
 * consumers — the VS Code authoring environment and the air-gapped
 * briefing renderer SPA — compose the same engine.
 */

export {
  blendViewport,
  runTimeRangeTween,
} from "./timeRangeTween";
export type {
  TimeRangeTweenDirection,
  TimeRangeTweenHandle,
  TimeRangeTweenPorts,
  TimeRangeTweenResult,
  FrameScheduler,
  RunTimeRangeTweenInput,
} from "./timeRangeTween";

export { StoryboardPlaybackService } from "./service";
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
} from "./service";

export {
  plotFromFeatures,
  featuresFromPlot,
} from "./plotFromFeatures";

export { HostEventEmitter } from "./events";
export type { HostDisposable, HostEvent } from "./events";
