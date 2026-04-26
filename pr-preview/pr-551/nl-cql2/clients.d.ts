import { BrowserLiveConfig, LLMClient, LiveConfig, LiveConfigValidationResult, LiveTransportError, ResponseMap } from './types';

/**
 * A client that plays back pre-recorded responses from a hand-authored map.
 *
 * Lookup strategy:
 *   1. Canonicalise the phrase recovered from the prompt's `Phrase: <text>`
 *      suffix (see `buildPrompt.ts`).
 *   2. Verify the stored `promptHash` matches SHA-256 of the received prompt.
 *      Any mismatch means the fixture was recorded against a different prompt
 *      template and must be re-authored.
 *
 * Miss or hash-mismatch throws an `Error` — this is a programmer / fixture
 * authoring bug, NOT a normal transport failure, so it does not map to a
 * `LiveOutcome`. Callers wrap `generateCql2` in try/catch if they want
 * fallback behaviour (e.g. `apps/nl-demo` surfaces it as an off-corpus
 * banner).
 */
export declare function createRecordedLLMClient(responses: ResponseMap): LLMClient;
/**
 * Trivial wrapper around a caller-supplied async function. The function
 * returns the raw provider response string; this wrapper adapts it to the
 * `LiveOutcome` contract by producing a `success` outcome.
 *
 * If the function throws, the throw propagates out of `generate()` — the
 * contract's "never throws on normal failure paths" guarantee applies to the
 * live transport, not to caller-supplied stubs.
 */
export declare function createPassthroughLLMClient(fn: (prompt: string) => Promise<string>, opts?: {
    readonly model?: string;
}): LLMClient;
/**
 * Recover the phrase from the end of the prompt. Matches the
 * `Phrase: <text>` suffix produced by `buildPrompt.ts`. Exported so tests can
 * verify the round-trip.
 */
export declare function extractPhraseFromPrompt(prompt: string): string;
/**
 * Parse a raw value loaded from `live-config.json` into a validated
 * `BrowserLiveConfig`. The `transport` discriminator is filled in by the
 * validator (users don't write it in their local config); `callCeiling`
 * replaces the #190 `maxCalls` field (review Decision 6).
 *
 * Never throws on user-input errors — returns a tagged union so the demo
 * can route misconfig to a fallback-to-fixture banner naming the specific
 * field that failed.
 */
export declare function validateLiveConfig(raw: unknown): LiveConfigValidationResult;
/**
 * Type guard for `LiveTransportError`. Shape check only — NOT `instanceof`,
 * because the value may have crossed a structuredClone boundary.
 */
export declare function isLiveTransportError(value: unknown): value is LiveTransportError;
/**
 * Build a live LLM client backed by a local loopback HTTP proxy. The proxy
 * itself holds the Anthropic credential in its environment and speaks HTTPS
 * upstream via the shared `providerCall` core. This client's responsibilities
 * are URL assembly, optional `X-Proxy-Token`, streams-and-counts response
 * reading, outcome classification, and cancellation via `abort()`.
 *
 * Behaviour invariants:
 *   - `generate()` NEVER throws — all outcomes are `LiveOutcome`.
 *   - `abort()` is idempotent. It tears down every in-flight `fetch()` and
 *     causes the pending `generate()` to resolve with
 *     `{kind:"transport-error", reason:"cancelled"}`.
 *   - Per-session call ceiling short-circuits without issuing a fetch.
 *   - Per-call response budget enforced via streaming reader.
 */
export declare function createLiveLLMClient(config: BrowserLiveConfig): LLMClient;
/**
 * Dependency-injection surface for `createPostMessageLLMClient`.
 * The webview supplies:
 *   - `postMessage` — typically `acquireVsCodeApi().postMessage` bound.
 *   - `subscribe`   — an `addEventListener('message', handler)` bridge that
 *     returns an unsubscribe function.
 *   - `uuid`        — injectable id generator; production passes
 *     `() => crypto.randomUUID()`.
 */
export interface PostMessageLLMClientOptions {
    readonly postMessage: (msg: unknown) => void;
    readonly subscribe: (handler: (msg: unknown) => void) => () => void;
    readonly uuid: () => string;
}
/**
 * Build an `LLMClient` that forwards `generate()` calls across the
 * webview ↔ extension-host boundary via `postMessage`. The extension host
 * owns the credential and the HTTPS call; this client is a transport
 * adapter that waits for the matching `nlOutcome` response.
 *
 * Contract:
 *   - One `generate()` call issues exactly one `nlGenerate` message with a
 *     fresh `requestId` and waits for an `nlOutcome` with the same id.
 *   - `abort()` fires an `nlAbort` for every currently-pending id and
 *     resolves each pending `generate()` to
 *     `{kind:"transport-error", reason:"cancelled"}`.
 *   - Unknown response ids (e.g. after an abort) are ignored silently.
 *   - The client NEVER throws on normal failure paths — every outcome flows
 *     back as a `LiveOutcome`.
 */
export declare function createPostMessageLLMClient(options: PostMessageLLMClientOptions): LLMClient;
export type { LiveConfig };
//# sourceMappingURL=clients.d.ts.map