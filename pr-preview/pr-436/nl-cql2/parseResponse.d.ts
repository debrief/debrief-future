import { Cql2Json, GenerationResult } from './types';

declare function sha256(s: string): string;
/**
 * Walk a CQL2-JSON tree and collect every string value that appears as a
 * predicate value (RHS of `=`, RHS pattern of `like`, first element of the
 * `a_containedBy` value array, and `=` values inside `array_filter`'s inner
 * predicate tree).
 *
 * Property names are deliberately excluded — only VALUES are checked against
 * the unrecognised-term list.
 */
export declare function collectCql2Values(cql2: Cql2Json): string[];
/** Collect every property reference encountered in the CQL2 tree. */
export declare function collectCql2Properties(cql2: Cql2Json): string[];
export declare function parseResponse(phrase: string, rawResponse: string, promptHash: string, promptVersion: string): GenerationResult;
export { sha256 };
//# sourceMappingURL=parseResponse.d.ts.map