import { DebriefFeature } from '../utils/types';
import { Plot as StoryboardPlot } from '../storyboard/types';

export declare function plotFromFeatures(features: readonly DebriefFeature[]): StoryboardPlot;
/**
 * Inverse of `plotFromFeatures` — unwraps a `StoryboardPlot.features`
 * array (returned from #215's async CRUD) back into the canonical
 * `DebriefFeature[]` view. Same ADR-019 boundary.
 */
export declare function featuresFromPlot(plot: StoryboardPlot): DebriefFeature[];
//# sourceMappingURL=plotFromFeatures.d.ts.map