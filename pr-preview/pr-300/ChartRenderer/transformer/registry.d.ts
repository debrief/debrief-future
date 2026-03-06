import { DatasetEnvelope } from '../types';
import { TransformFunction, TransformResult } from './types';

/**
 * Registry mapping dataset type identifiers to transform functions.
 *
 * Each dataset type (e.g., "zone_histogram") has a dedicated mapping
 * function that produces a Vega-Lite TopLevelSpec.
 */
export declare class TransformerRegistry {
    private mappings;
    /** Register a transform function for a dataset type. */
    register(type: string, fn: TransformFunction): void;
    /** List all registered dataset types. */
    getSupportedTypes(): string[];
    /** Check whether a dataset type is supported. */
    has(type: string): boolean;
    /**
     * Transform a dataset envelope into a Vega-Lite spec.
     *
     * Returns `{ ok: true, spec }` on success or
     * `{ ok: false, error }` when the type is unsupported.
     */
    transform(dataset: DatasetEnvelope): TransformResult;
}
//# sourceMappingURL=registry.d.ts.map