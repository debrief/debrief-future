/**
 * Test helper: a deliberately-broken LLM client (#188 T036, decision 9A).
 *
 * Always returns the fixed `rawResponse` regardless of the prompt. Used by
 * the harness self-test to prove the regression signal works — injecting
 * malformed JSON must produce a visible FAIL with reason `malformed-json`.
 *
 * Lives under `__tests__/` so it is never bundled into `dist/`; not exported
 * from the public barrel.
 */

import type { LLMClient } from "../types";

export function createBadLLMClient(rawResponse: string): LLMClient {
  return {
    async generate(): Promise<string> {
      return rawResponse;
    },
  };
}
