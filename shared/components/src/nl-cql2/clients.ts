/**
 * LLM client implementations for the NL → CQL2 generator (#188).
 *
 * Two in-tree clients:
 *   - `createRecordedLLMClient(responses)` — replays a map of hand-authored
 *     fixtures keyed by canonicalised phrase. Throws on miss or prompt-hash
 *     mismatch. Used in CI and offline stakeholder demos.
 *   - `createPassthroughLLMClient(fn)` — trivial wrapper that forwards to a
 *     caller-supplied async function. Used by #189 transport integration and
 *     by the fixture-authoring workflow.
 *
 * A third client — `createBadLLMClient` — lives under `__tests__/` and is not
 * exported from the public barrel (decision 9A).
 */

import { canonicalisePhrase, sha256Hex } from "./hash";
import type { LLMClient, ResponseMap } from "./types";

/**
 * A client that plays back pre-recorded responses from a hand-authored map.
 *
 * Lookup strategy:
 *   1. Canonicalise the phrase (the implementer is responsible for passing
 *      the phrase into `generate(prompt)` alongside the prompt — but since
 *      the LLMClient contract only exposes the prompt, we encode the phrase
 *      inside the prompt and recover it here).
 *   2. Verify the stored `promptHash` matches the SHA-256 of the prompt we
 *      received. Any mismatch means the fixture was recorded against a
 *      different prompt template and must be re-authored.
 *
 * Prompt-suffix convention: the prompt's last non-blank line is
 * `Phrase: <text>` (see `buildPrompt.ts`). This client extracts that line to
 * canonicalise and look up the fixture.
 */
export function createRecordedLLMClient(responses: ResponseMap): LLMClient {
  return {
    async generate(prompt: string): Promise<string> {
      const phrase = extractPhraseFromPrompt(prompt);
      const canonical = canonicalisePhrase(phrase);
      const fixture = responses[canonical];
      if (!fixture) {
        throw new Error(
          `[nl-cql2/RecordedLLMClient] no recorded response for phrase ` +
            `"${canonical}". Re-author the fixture in responses.json.`,
        );
      }
      const actualHash = await sha256Hex(prompt);
      if (fixture.promptHash !== actualHash) {
        throw new Error(
          `[nl-cql2/RecordedLLMClient] prompt-hash mismatch for phrase ` +
            `"${canonical}". Stored: ${fixture.promptHash.slice(0, 12)}…, ` +
            `actual: ${actualHash.slice(0, 12)}…. The prompt template has ` +
            `changed since the fixture was recorded — re-author the fixture.`,
        );
      }
      return fixture.rawResponse;
    },
  };
}

/**
 * Trivial wrapper around a caller-supplied async function.
 *
 * Callers use this to plug in a live transport (MCP, HTTP, local model) or a
 * deterministic stub (e.g. to record new fixtures). #188 never invokes a live
 * model; that responsibility is owned by #190.
 */
export function createPassthroughLLMClient(
  fn: (prompt: string) => Promise<string>,
): LLMClient {
  return {
    async generate(prompt: string): Promise<string> {
      return fn(prompt);
    },
  };
}

/**
 * Recover the phrase from the end of the prompt. Matches the
 * `Phrase: <text>` suffix produced by `buildPrompt.ts`. Exported so tests can
 * verify the round-trip.
 */
export function extractPhraseFromPrompt(prompt: string): string {
  const lines = prompt.split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i]!;
    const match = line.match(/^Phrase:\s*(.*)$/);
    if (match) return match[1]!;
  }
  throw new Error(
    `[nl-cql2/extractPhraseFromPrompt] prompt does not end with "Phrase: ..."`,
  );
}
