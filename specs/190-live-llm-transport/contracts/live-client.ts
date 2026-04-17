/**
 * Contract (design artefact) for the live LLM client.
 *
 * Not shipped — this file lives under specs/ to document the public
 * TypeScript surface that `shared/components/src/nl-cql2/` MUST implement
 * in /speckit.tasks. Implementations reference this contract; any deviation
 * must be justified in research.md or a follow-up ADR.
 *
 * Fold location: per the package's established convention, these types live
 * in the existing `shared/components/src/nl-cql2/types.ts` and the factory +
 * guards live in the existing `shared/components/src/nl-cql2/clients.ts`.
 * No new top-level files are introduced.
 */

import type {
  LLMClient,
  GenerationError,
} from "../../../shared/components/src/nl-cql2/types";

// ---------------------------------------------------------------------------
// Runtime configuration (browser-visible, gitignored on disk)
// ---------------------------------------------------------------------------

export interface LiveConfig {
  readonly enabled: boolean;
  readonly proxyUrl: string;
  readonly model: string;
  readonly timeoutMs: number;
  readonly maxCalls: number;
  /** UTF-8 byte count (not UTF-16 code units). Measured in the browser via a
   *  streaming byte accumulator; see `createLiveLLMClient` lifecycle. */
  readonly maxResponseBytes: number;
  /** Required only when the proxy was started with `PROXY_ALLOW_REMOTE=true`.
   *  Sent as `X-Proxy-Token` on every `/generate` and `/health` request.
   *  Empty or omitted for the default loopback-bound proxy. */
  readonly proxyToken?: string;
}

export interface LiveConfigValidationError {
  readonly field: keyof LiveConfig;
  readonly message: string;
}

/**
 * Parse and narrow a raw value loaded from `live-config.json` into a
 * validated LiveConfig. Never throws on user-input errors — returns a tagged
 * union so the demo can route misconfig to a fallback-to-fixture banner.
 */
export declare function validateLiveConfig(
  raw: unknown,
): { ok: true; value: LiveConfig } | { ok: false; errors: readonly LiveConfigValidationError[] };

// ---------------------------------------------------------------------------
// Transport error envelope
// ---------------------------------------------------------------------------

export type LiveTransportErrorReason =
  | "auth-failure"
  | "rate-limit"
  | "provider-error"
  | "transport-error"
  | "timeout"
  | "oversize-response"
  | "usage-cap-reached";

/**
 * A plain data interface — NOT an Error subclass. The live client returns
 * LiveTransportError via `GenerationResult.error` with `kind: "transport"`.
 * It is never thrown, preserving #188's "generateCql2 never throws on normal
 * failure paths" invariant.
 */
export interface LiveTransportError {
  readonly reason: LiveTransportErrorReason;
  readonly message: string;
  readonly providerStatus: number | null;
  readonly durationMs: number;
  readonly callIndex: number;
}

/**
 * Type guard used by the demo when inspecting `GenerationResult.error`.
 * Paired with the `kind: "transport"` discriminator in the error union.
 */
export declare function isLiveTransportError(value: unknown): value is LiveTransportError;

// ---------------------------------------------------------------------------
// GenerationResult error union (extends #188 to carry transport failures)
// ---------------------------------------------------------------------------

/**
 * The live client returns one of these in `GenerationResult.error` when a
 * call fails. #188's existing GenerationError path is preserved unchanged;
 * the transport path is additive.
 */
export type GenerationResultError =
  | { readonly kind: "generation"; readonly error: GenerationError }
  | { readonly kind: "transport"; readonly error: LiveTransportError };

// ---------------------------------------------------------------------------
// Call-record observability
// ---------------------------------------------------------------------------

export interface TransportCallRecord {
  readonly ts: string;
  readonly provider: "anthropic";
  readonly model: string;
  readonly durationMs: number;
  readonly outcome: "success" | LiveTransportErrorReason;
  /** UTF-8 byte count; null on non-success. */
  readonly responseBytes: number | null;
  readonly callIndex: number;
}

// ---------------------------------------------------------------------------
// Client factory
// ---------------------------------------------------------------------------

export interface LiveLLMClient extends LLMClient {
  /**
   * Abort every in-flight `generate()` call. Used by the demo when the
   * stakeholder submits a new phrase while a previous call is still pending
   * (FR-012). No-op when no calls are outstanding.
   *
   * An aborted call's promise resolves with a `GenerationResult` whose error
   * carries `reason: "transport-error"` and `message: "superseded"`, which
   * the demo's submission-token filter discards before it reaches the UI.
   */
  cancelPending(): void;

  /**
   * Read-only view of the usage counter. Exposed for the demo's
   * "usage cap reached" diagnostic; does not allow resetting.
   */
  readonly usage: { readonly used: number; readonly cap: number };
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
 *     `reason: "transport-error"` (proxy-rejected-request indicates a
 *     client-version mismatch, not a user-actionable failure class)
 *
 * Never throws. All failure paths return via `GenerationResult.error` with
 * `kind: "transport"`.
 */
export declare function createLiveLLMClient(config: LiveConfig): LiveLLMClient;
