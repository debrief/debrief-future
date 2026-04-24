/**
 * Test helper: a deliberately-broken LLM client (#188 T036, decision 9A).
 *
 * Always returns the fixed `rawResponse` regardless of the prompt. Used by
 * the harness self-test to prove the regression signal works — injecting
 * malformed JSON must produce a visible FAIL with reason `malformed-json`.
 *
 * Lives under `__tests__/` so it is never bundled into `dist/`; not exported
 * from the public barrel.
 *
 * #191 migration: `generate()` returns a `LiveOutcome` (success variant) so
 * the canonical `LLMClient` contract is satisfied.
 */

import type { LiveOutcome, LLMClient } from "../types";

export function createBadLLMClient(rawResponse: string): LLMClient {
  return {
    async generate(): Promise<LiveOutcome> {
      return {
        kind: "success",
        rawResponse,
        durationMs: 0,
        responseBytes: rawResponse.length,
        model: "bad-client",
      };
    },
    abort() {
      // No in-flight state.
    },
  };
}
