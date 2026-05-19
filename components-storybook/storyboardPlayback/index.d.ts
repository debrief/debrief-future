/**
 * Public barrel for the shared storyboard playback primitives (#263).
 *
 * Currently exports the `TimeRangeTween` RAF primitive used by the VS Code
 * (and, in a follow-up, the web-shell) playback engines to drive a
 * synchronised viewport + slider scrub for time-range Scenes.
 *
 * The full engine relocation from `apps/vscode/src/services/storyboardPlayback.ts`
 * into this module (per spec #263 plan T047a–T047e) is deferred to a
 * follow-up — the web-shell does not yet have a storyboard playback engine
 * at all (#264 work), and a relocation without a second consumer is
 * premature.
 */
export { blendViewport, runTimeRangeTween, } from './timeRangeTween';
export type { TimeRangeTweenDirection, TimeRangeTweenHandle, TimeRangeTweenPorts, TimeRangeTweenResult, FrameScheduler, RunTimeRangeTweenInput, } from './timeRangeTween';
//# sourceMappingURL=index.d.ts.map