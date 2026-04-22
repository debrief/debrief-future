/**
 * Scene `feature_set_hash` computation.
 *
 * Canonicalisation (sync): trim every ID, reject empty-after-trim,
 * dedupe, sort lexicographically.
 *
 * Hash (async): SHA-256 hex of `JSON.stringify(canonical)` via the
 * shared `sha256Hex` helper in `utils/hash.ts`. Async because Web Crypto's
 * `subtle.digest` is async.
 */
/**
 * Canonicalise an array of visible feature IDs:
 *   1. trim every ID
 *   2. reject empty-after-trim → throws ReservedSlotViolationError
 *   3. dedupe (Set)
 *   4. sort lexicographically ascending
 *
 * Sync — no crypto, no I/O.
 */
export declare function canonicaliseVisibleFeatureIds(visibleFeatureIds: readonly string[]): string[];
/**
 * Compute `feature_set_hash` over the canonicalised visible feature IDs.
 *
 * Returns SHA-256 hex (lowercase, 64 chars). Async because Web Crypto's
 * `subtle.digest` is async.
 */
export declare function computeFeatureSetHash(visibleFeatureIds: readonly string[]): Promise<string>;
//# sourceMappingURL=hash.d.ts.map