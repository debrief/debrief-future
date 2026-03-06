import { TopLevelSpec } from 'vega-lite';
import { DatasetEnvelope } from '../../types';

/**
 * Transform a zone_histogram dataset into a Vega-Lite bar chart spec.
 *
 * Expects `dataset.data` to be an array of `{ zone: string, count: number }`.
 */
export declare function zoneHistogram(dataset: DatasetEnvelope): TopLevelSpec;
//# sourceMappingURL=zoneHistogram.d.ts.map