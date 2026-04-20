/**
 * Shared SHA-256 hashing utility.
 *
 * Uses the Web Crypto API (`crypto.subtle.digest`), available in Node 18+ and
 * every evergreen browser. Keeps callers browser-compatible with no
 * third-party dependency.
 *
 * Lifted from `shared/components/src/nl-cql2/hash.ts` in feature 215 so the
 * storyboard CRUD module can reuse the same primitive for
 * `feature_set_hash`. The nl-cql2 module re-exports from this location.
 */

/** Return the SHA-256 of `input` as a lowercase hex string. */
export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error(
      "[utils/hash] globalThis.crypto.subtle is not available; " +
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
