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

import { sha256Hex } from "../utils/hash";
import { ReservedSlotViolationError } from "./errors";

/**
 * Canonicalise an array of visible feature IDs:
 *   1. trim every ID
 *   2. reject empty-after-trim → throws ReservedSlotViolationError
 *   3. dedupe (Set)
 *   4. sort lexicographically ascending
 *
 * Sync — no crypto, no I/O.
 */
export function canonicaliseVisibleFeatureIds(
  visibleFeatureIds: readonly string[],
): string[] {
  const trimmed: string[] = [];
  for (const raw of visibleFeatureIds) {
    const t = raw.trim();
    if (t === "") {
      throw new ReservedSlotViolationError("visible_feature_ids", raw);
    }
    trimmed.push(t);
  }
  const deduped = Array.from(new Set(trimmed));
  deduped.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  return deduped;
}

/**
 * Compute `feature_set_hash` over the canonicalised visible feature IDs.
 *
 * Returns SHA-256 hex (lowercase, 64 chars). Async because Web Crypto's
 * `subtle.digest` is async.
 */
export async function computeFeatureSetHash(
  visibleFeatureIds: readonly string[],
): Promise<string> {
  const canonical = canonicaliseVisibleFeatureIds(visibleFeatureIds);
  return sha256Hex(JSON.stringify(canonical));
}
