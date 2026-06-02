import { Plot, SceneFeature } from './types';

/**
 * Enforce the #263 Scene flavour XOR: a Scene is either the instant flavour
 * (both `time_range` and `viewport_end` absent) or the time-range flavour
 * (both present, with `time_range.end > time_range.start`).
 *
 * Throws `SceneFlavourXorViolationError` for mixed-slot scenes and
 * `SceneTimeRangeEndNotAfterStartError` for reversed/zero ranges.
 *
 * Pure; no side effects.
 */
export declare function flavourCheck(scene: SceneFeature): void;
export declare function validatePlot(plot: Plot): void;
//# sourceMappingURL=validate.d.ts.map