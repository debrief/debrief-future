import { DatasetEnvelope } from '../types';
import { TransformFunction, TransformResult } from './types';

export type { TransformerError, TransformResult, TransformFunction } from './types';
/**
 * Transform a dataset envelope into a Vega-Lite spec.
 *
 * Validates the dataset, looks up the registered mapping function,
 * and merges the current theme config into the result.
 */
export declare function transformDataset(dataset: DatasetEnvelope): TransformResult;
/** Register a custom dataset type mapping at runtime. */
export declare function registerTransformer(type: string, fn: TransformFunction): void;
/** List all supported dataset types. */
export declare function getSupportedTypes(): string[];
//# sourceMappingURL=index.d.ts.map