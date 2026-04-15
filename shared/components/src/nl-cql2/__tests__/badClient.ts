/**
 * Test-only bad-LLM client (#188 T036 / decision 9A).
 *
 * Always yields the given (deliberately broken) response. Used by the
 * harness self-test to prove that a malformed LLM response surfaces as a
 * structured failure rather than a silent pass.
 *
 * Lives under `__tests__/` and is NOT exported from the public barrel.
 */

import type { LLMClient } from "../types";

export function createBadLLMClient(rawResponse: string): LLMClient {
  return {
    async generate(): Promise<string> {
      return rawResponse;
    },
  };
}
