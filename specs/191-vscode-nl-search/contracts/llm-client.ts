/**
 * LLMClient + LiveOutcome + LiveConfig contracts for #191.
 *
 * Per /speckit.review outcomes:
 *   - Decision 1 (pre-release migration): ONE canonical LLMClient interface.
 *     The #188 shape `generate(prompt): Promise<string>` is replaced by this
 *     outcome-returning shape across both consumers (#189 demo + VS Code).
 *   - Decision 3: provider-call core lives in `shared/components/src/nl-cql2/
 *     providerCall.ts`; both transport wrappers delegate into it.
 *   - Decision 4: cancellation is `client.abort()`, owned by each
 *     implementation. FilterBar calls `abort()` when a new phrase
 *     supersedes an in-flight one.
 *   - Decision 5: one discriminated `LiveConfig` with a
 *     `transport: "browser-proxy" | "vscode-host"` tag.
 *   - Decision 6: one canonical `LiveOutcome` union; `ceiling-reached`
 *     replaces `usage-cap-reached`; `malformed-response` absorbs
 *     `oversize-response` via a nested `reason`; `not-configured` is new.
 *   - Decision 8: no `close()`. `abort()` is idempotent and releases any
 *     pending listeners.
 *
 * This file is the CONTRACT — the implementation lives in
 * `shared/components/src/nl-cql2/types.ts` and `clients.ts`, which the #190
 * migration will update in-place.
 */

// ---------------------------------------------------------------------------
// LiveConfig — one discriminated type, two transports
// ---------------------------------------------------------------------------

interface LiveConfigBase {
  readonly enabled: boolean;
  readonly model: string;
  readonly timeoutMs: number;        // upper-bound per call
  readonly callCeiling: number;      // per-session cap (#190 maxCalls ≡ this)
  readonly maxResponseBytes: number; // defensive truncation threshold
}

/**
 * Browser variant (#189/#190). The proxy holds the credential; the browser
 * speaks HTTP to a loopback proxy.
 */
export interface BrowserLiveConfig extends LiveConfigBase {
  readonly transport: "browser-proxy";
  readonly proxyUrl: string;
  readonly proxyToken: string | null;  // optional X-Proxy-Token
}

/**
 * VS Code variant (#191). The extension host holds the credential in
 * SecretStorage; the webview speaks postMessage to the host.
 */
export interface VsCodeLiveConfig extends LiveConfigBase {
  readonly transport: "vscode-host";
  readonly hasApiKey: boolean;  // presence bool; the key itself NEVER leaves the host
}

export type LiveConfig = BrowserLiveConfig | VsCodeLiveConfig;

// ---------------------------------------------------------------------------
// LiveOutcome — the single canonical union
// ---------------------------------------------------------------------------

/**
 * Outcome of one NL → CQL2 call. A discriminated union; every consumer
 * branches on `kind`. No transport-specific variants — both browser and
 * VS Code clients produce exactly this shape.
 */
export type LiveOutcome =
  | LiveSuccess
  | LiveAuthFailure
  | LiveRateLimit
  | LiveProviderError
  | LiveTransportError
  | LiveTimeout
  | LiveMalformedResponse
  | LiveNotConfigured     // NEW in #191 (enabled but no key) — per review Decision 6
  | LiveCeilingReached;   // renamed from `usage-cap-reached` per review Decision 6

export interface LiveSuccess {
  readonly kind: "success";
  readonly rawResponse: string;      // parsed downstream by parseResponse()
  readonly durationMs: number;
  readonly responseBytes: number;
  readonly model: string;
}

export interface LiveAuthFailure {
  readonly kind: "auth-failure";
  readonly providerStatus: number;   // 401/403
  readonly durationMs: number;
}

export interface LiveRateLimit {
  readonly kind: "rate-limit";
  readonly providerStatus: number;   // 429
  readonly retryAfterSeconds: number | null;
  readonly durationMs: number;
}

export interface LiveProviderError {
  readonly kind: "provider-error";
  readonly providerStatus: number;   // 5xx or non-success
  readonly durationMs: number;
}

export interface LiveTransportError {
  readonly kind: "transport-error";
  readonly reason: "network" | "cancelled" | "unknown";
  readonly durationMs: number;
}

export interface LiveTimeout {
  readonly kind: "timeout";
  readonly durationMs: number;
}

/**
 * Covers both non-JSON and oversize responses. The `reason` discriminates
 * (per review Decision 6 — we folded the #190 `oversize-response` in here).
 */
export interface LiveMalformedResponse {
  readonly kind: "malformed-response";
  readonly reason: "non-json" | "oversize" | "truncated";
  readonly durationMs: number;
  readonly responseBytes: number;
}

export interface LiveNotConfigured {
  readonly kind: "not-configured";
  readonly reason: "disabled" | "no-key";
  readonly durationMs: 0;
}

export interface LiveCeilingReached {
  readonly kind: "ceiling-reached";
  readonly ceiling: number;
  readonly durationMs: 0;
}

// ---------------------------------------------------------------------------
// LLMClient interface — single canonical shape
// ---------------------------------------------------------------------------

/**
 * Transport-agnostic NL → CQL2 client. The phrase goes in; exactly one
 * `LiveOutcome` comes out. All failure paths are encoded as outcomes —
 * `generate` NEVER throws.
 *
 * Cancellation is `abort()`, owned by the implementation (review Decision 4).
 * FilterBar calls `client.abort()` when a new submission supersedes an
 * in-flight one; the superseded call resolves to
 * `{ kind: "transport-error", reason: "cancelled" }` and is dropped by
 * the caller (no banner for cancellations).
 *
 * The `prompt` argument is the fully-composed prompt (see
 * `shared/components/src/nl-cql2/buildPrompt.ts`), not the raw phrase —
 * consistent with the existing #188 shape.
 */
export interface LLMClient {
  generate(prompt: string): Promise<LiveOutcome>;
  abort(): void;   // idempotent; cancels every in-flight generate()
}

// ---------------------------------------------------------------------------
// Provider-call core (shared — per review Decision 3)
// ---------------------------------------------------------------------------

/**
 * Pure, transport-neutral Anthropic call. Lives at
 * `shared/components/src/nl-cql2/providerCall.ts` and is consumed by:
 *
 *   - `apps/nl-demo/scripts/live-proxy.mjs` (Node HTTP wrapper, #190)
 *   - `apps/vscode/src/services/llmProxy.ts`  (VS Code extension host, #191)
 *
 * The function performs the HTTPS request, streams-and-counts to enforce
 * `maxResponseBytes`, applies `timeoutMs`, classifies every failure mode,
 * and returns the same `LiveOutcome` union defined above. Callers pass an
 * `AbortSignal` and the API key; neither leaves this function.
 */
export interface ProviderCallInput {
  readonly prompt: string;
  readonly model: string;
  readonly apiKey: string;       // never stored, never logged
  readonly timeoutMs: number;
  readonly maxResponseBytes: number;
  readonly signal: AbortSignal;  // abort() cascades to socket close
  readonly callIndex: number;    // for logging
}

export type ProviderCall = (input: ProviderCallInput) => Promise<LiveOutcome>;

// ---------------------------------------------------------------------------
// Factory signatures
// ---------------------------------------------------------------------------

/**
 * Browser flavour (existing in #190; signature evolves to match the new
 * outcome-returning LLMClient shape).
 */
export interface LiveLLMClientOptions {
  readonly config: BrowserLiveConfig;
}
export type CreateLiveLLMClient = (options: LiveLLMClientOptions) => LLMClient;

/**
 * VS Code flavour (#191). Bridges webview `postMessage` ↔ extension host.
 * The webview creates this with `acquireVsCodeApi().postMessage` bound to
 * `postMessage` and an `addEventListener('message', ...)` bridge for
 * `subscribe`.
 */
export interface PostMessageLLMClientOptions {
  readonly postMessage: (msg: unknown) => void;
  readonly subscribe: (handler: (msg: unknown) => void) => () => void;  // returns unsubscribe
  readonly uuid: () => string;  // injectable for tests
}
export type CreatePostMessageLLMClient = (
  options: PostMessageLLMClientOptions,
) => LLMClient;
