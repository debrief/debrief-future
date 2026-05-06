import { GenerationResult } from './types';

/**
 * Parse and validate a raw LLM response. Never throws; populates `error`
 * instead.
 *
 * `promptHash` and `promptVersion` are copied into the diagnostics and also
 * used by the caller to decide whether to invoke the LLM or short-circuit.
 */
export declare function parseResponse(phrase: string, rawResponse: string, promptHash: string, promptVersion: string): Promise<GenerationResult>;
//# sourceMappingURL=parseResponse.d.ts.map