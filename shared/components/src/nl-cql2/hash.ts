/**
 * SHA-256 hashing utility for the NL → CQL2 generator (#188).
 *
 * Uses the Web Crypto API (`crypto.subtle.digest`), which is available in
 * modern Node (18+) and all evergreen browsers — keeps the module
 * browser-compatible per the plan's Target Platform requirement.
 */

/** Return the SHA-256 of `input` as a lowercase hex string. */
export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error(
      "[nl-cql2/hash] globalThis.crypto.subtle is not available; " +
        "run under Node 18+ or a modern browser.",
    );
  }
  const digest = await subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(digest);
  let hex = "";
  for (const b of bytes) {
    hex += b.toString(16).padStart(2, "0");
  }
  return hex;
}

/**
 * Canonicalise an analyst phrase for fixture lookup: trim, lowercase, collapse
 * internal whitespace. Used by `RecordedLLMClient` so fixtures survive minor
 * phrase-edit churn.
 */
export function canonicalisePhrase(phrase: string): string {
  return phrase.trim().toLowerCase().replace(/\s+/g, " ");
}
