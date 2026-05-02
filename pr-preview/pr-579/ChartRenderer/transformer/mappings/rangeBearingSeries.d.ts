import { TopLevelSpec } from 'vega-lite';
import { DatasetEnvelope } from '../../types';

/**
 * Transform a range_bearing_series dataset into a Vega-Lite line chart spec.
 *
 * Expects `dataset.series` to be an array of `{ name, data: [{ time, value }] }`.
 * Each series becomes a separate coloured line with a legend entry.
 */
export declare function rangeBearingSeries(dataset: DatasetEnvelope): TopLevelSpec;
//# sourceMappingURL=rangeBearingSeries.d.ts.map