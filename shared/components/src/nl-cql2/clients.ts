/**
 * LLM client factories for the NL → CQL2 generator (#188 T024/T025).
 *
 * Two shapes:
 *   - `createRecordedLLMClient(responses)` replays fixtures. Throws loudly on
 *     unknown phrase or prompt-hash mismatch so stale fixtures cannot silently
 *     mask prompt drift.
 *   - `createPassthroughLLMClient(fn)` forwards to a caller-supplied function.
 *     Used by the fixture-recording script and by #189's transport integration.
 *
 * A third client — `createBadLLMClient` — lives under `__tests__/` only
 * (decision 9A) and is not exported from the public barrel.
 */

import { createHash } from "node:crypto";
import type { LLMClient, ResponseMap } from "./types";

/** Canonicalise a phrase for fixture lookup (trim + lowercase + whitespace collapse). */
export function canonicalisePhrase(phrase: string): string {
  return phrase.trim().toLowerCase().replace(/\s+/g, " ");
}

function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

/**
 * Extract the analyst phrase from a prompt built by `buildPrompt`. The prompt
 * ends with `Phrase: <input>`, so the lookup key can be derived directly
 * rather than passed separately. Returns the empty string if no phrase
 * marker is found — callers get a fixture-miss error either way.
 */
function extractPhrase(prompt: string): string {
  const marker = "\nPhrase: ";
  const idx = prompt.lastIndexOf(marker);
  if (idx === -1) return "";
  return prompt.slice(idx + marker.length);
}

/**
 * Replay-only client. Keys `responses` by canonicalised phrase; on lookup,
 * canonicalises the caller's prompt phrase and checks the recorded
 * `promptHash` matches SHA-256 of the current prompt. Any miss or mismatch
 * throws with a re-record diagnostic.
 */
export function createRecordedLLMClient(responses: ResponseMap): LLMClient {
  return {
    async generate(prompt: string): Promise<string> {
      const phrase = extractPhrase(prompt);
      const key = canonicalisePhrase(phrase);
      const recorded = responses[key];
      if (!recorded) {
        throw new Error(
          `RecordedLLMClient: no fixture for phrase "${phrase}" ` +
            `(canonical key: "${key}"). Re-record fixtures via the recorder script.`,
        );
      }
      const currentHash = sha256(prompt);
      if (recorded.promptHash !== currentHash) {
        throw new Error(
          `RecordedLLMClient: prompt hash mismatch for phrase "${phrase}". ` +
            `Recorded ${recorded.promptHash}, current ${currentHash}. ` +
            `Re-record fixtures — the prompt template has drifted.`,
        );
      }
      return recorded.rawResponse;
    },
  };
}

/** Trivial wrapper forwarding to a caller-supplied async function. */
export function createPassthroughLLMClient(
  fn: (prompt: string) => Promise<string>,
): LLMClient {
  return {
    async generate(prompt: string): Promise<string> {
      return fn(prompt);
    },
  };
}
