/**
 * SHA-256 hashing utility for the NL → CQL2 generator (#188).
 *
 * Uses the Web Crypto API (`crypto.subtle.digest`), which is available in
 * modern Node (18+) and all evergreen browsers — keeps the module
 * browser-compatible per the plan's Target Platform requirement.
 */
/** Return the SHA-256 of `input` as a lowercase hex string. */
export declare function sha256Hex(input: string): Promise<string>;
/**
 * Canonicalise an analyst phrase for fixture lookup: trim, lowercase, collapse
 * internal whitespace. Used by `RecordedLLMClient` so fixtures survive minor
 * phrase-edit churn.
 */
export declare function canonicalisePhrase(phrase: string): string;
//# sourceMappingURL=hash.d.ts.map