import { TopLevelSpec } from 'vega-lite';
import { DatasetEnvelope } from '../types';

/** Error categories returned by the transformer. */
export type TransformerErrorType = 'unsupported_type' | 'invalid_schema' | 'empty_data';
/** Structured error when the transformer cannot convert a dataset. */
export interface TransformerError {
    type: TransformerErrorType;
    message: string;
    datasetType?: string;
    details?: Record<string, unknown>;
}
/** Result of a transformation — either a Vega-Lite spec or an error. */
export type TransformResult = {
    ok: true;
    spec: TopLevelSpec;
} | {
    ok: false;
    error: TransformerError;
};
/** A function that converts a dataset envelope into a Vega-Lite spec. */
export type TransformFunction = (dataset: DatasetEnvelope) => TopLevelSpec;
//# sourceMappingURL=types.d.ts.map