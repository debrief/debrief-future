import { LLMClient, ResponseMap } from './types';

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
export declare function createRecordedLLMClient(responses: ResponseMap): LLMClient;
/**
 * Trivial wrapper around a caller-supplied async function.
 *
 * Callers use this to plug in a live transport (MCP, HTTP, local model) or a
 * deterministic stub (e.g. to record new fixtures). #188 never invokes a live
 * model; that responsibility is owned by #190.
 */
export declare function createPassthroughLLMClient(fn: (prompt: string) => Promise<string>): LLMClient;
/**
 * Recover the phrase from the end of the prompt. Matches the
 * `Phrase: <text>` suffix produced by `buildPrompt.ts`. Exported so tests can
 * verify the round-trip.
 */
export declare function extractPhraseFromPrompt(prompt: string): string;
//# sourceMappingURL=clients.d.ts.map