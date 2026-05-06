/**
 * SHA-256 hashing utility for the NL → CQL2 generator (#188).
 *
 * `sha256Hex` has been lifted to `shared/components/src/utils/hash.ts` in
 * feature 215 so the storyboard CRUD module can reuse the same primitive.
 * This module re-exports the canonical helper, and also owns the nl-cql2-
 * specific `canonicalisePhrase` helper.
 */
export { sha256Hex } from '../utils/hash';
/**
 * Canonicalise an analyst phrase for fixture lookup: trim, lowercase, collapse
 * internal whitespace. Used by `RecordedLLMClient` so fixtures survive minor
 * phrase-edit churn.
 */
export declare function canonicalisePhrase(phrase: string): string;
//# sourceMappingURL=hash.d.ts.map