import { LLMClient, LiveConfig, LiveConfigValidationResult, LiveLLMClient, LiveTransportError, ResponseMap } from './types';

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
/**
 * Parse a raw value loaded from `live-config.json` into a validated
 * `LiveConfig`. Never throws on user-input errors — returns a tagged union so
 * the demo can route misconfig to a fallback-to-fixture banner naming the
 * specific field that failed.
 */
export declare function validateLiveConfig(raw: unknown): LiveConfigValidationResult;
/**
 * Type guard for `LiveTransportError`. Shape check only — NOT `instanceof`,
 * because the value flows as plain data through a discriminated union in
 * `GenerationResult.error` and may have crossed a structuredClone boundary.
 */
export declare function isLiveTransportError(value: unknown): value is LiveTransportError;
/**
 * Marker class thrown by `createLiveLLMClient` to signal a typed transport
 * failure through the string-returning `LLMClient.generate` contract.
 * Caught inside `generate.ts` and wrapped into `GenerationResult.error` with
 * `kind: "transport"` — consumers of `generateCql2` see the typed error, not
 * this marker.
 */
export declare class LiveTransportAbort extends Error {
    readonly transportError: LiveTransportError;
    constructor(transportError: LiveTransportError);
}
/**
 * Build a live LLM client backed by a local proxy. Caller owns the config
 * loading; this function does no filesystem I/O.
 *
 * The client:
 *   - issues POST /generate against `config.proxyUrl`
 *   - adds `X-Proxy-Token: <config.proxyToken>` when `proxyToken` is present
 *   - enforces `timeoutMs` per-call via AbortController
 *   - enforces `maxCalls` by short-circuiting further calls with a
 *     `usage-cap-reached` LiveTransportError (no fetch issued)
 *   - enforces `maxResponseBytes` as a UTF-8 byte count via a streaming
 *     reader that aborts the response once the accumulated byte count
 *     exceeds the cap, raising `oversize-response`
 *   - emits one TransportCallRecord per call to console.info
 *   - maps proxy `{ ok: false, kind: "bad-request" }` to client
 *     `reason: "transport-error"`
 *
 * All failure paths surface via a thrown `LiveTransportAbort` marker which
 * `generateCql2` catches and converts into `GenerationResult.error` with
 * `kind: "transport"` — generateCql2 itself never throws.
 */
export declare function createLiveLLMClient(config: LiveConfig): LiveLLMClient;
//# sourceMappingURL=clients.d.ts.map