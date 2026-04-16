/**
 * Contract (design artefact) for the live LLM client.
 *
 * Not shipped — this file lives under specs/ to document the public
 * TypeScript surface that `shared/components/src/nl-cql2/liveClient.ts`
 * MUST implement in /speckit.tasks. Implementations reference this contract;
 * any deviation must be justified in research.md or a follow-up ADR.
 */

import type { LLMClient } from "../../../shared/components/src/nl-cql2/types";

// ---------------------------------------------------------------------------
// Runtime configuration (browser-visible, gitignored on disk)
// ---------------------------------------------------------------------------

export interface LiveConfig {
  readonly enabled: boolean;
  readonly proxyUrl: string;
  readonly model: string;
  readonly timeoutMs: number;
  readonly maxCalls: number;
  readonly maxResponseBytes: number;
}

export type LiveConfigValidationError = {
  readonly field: keyof LiveConfig;
  readonly message: string;
};

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

export class LiveTransportError extends Error {
  readonly reason: LiveTransportErrorReason;
  readonly providerStatus: number | null;
  readonly durationMs: number;
  readonly callIndex: number;

  constructor(init: {
    readonly reason: LiveTransportErrorReason;
    readonly message: string;
    readonly providerStatus: number | null;
    readonly durationMs: number;
    readonly callIndex: number;
  });
}

/**
 * Type guard used by the demo when catching errors from `generateCql2`.
 * Fixture-path throws (RecordedLLMClient misses) remain plain `Error`
 * instances; the demo uses this guard to decide between the off-corpus
 * banner and the transport-error banner.
 */
export declare function isLiveTransportError(err: unknown): err is LiveTransportError;

// ---------------------------------------------------------------------------
// Call-record observability
// ---------------------------------------------------------------------------

export interface TransportCallRecord {
  readonly ts: string;
  readonly provider: "anthropic";
  readonly model: string;
  readonly durationMs: number;
  readonly outcome: "success" | LiveTransportErrorReason;
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
 *   - enforces `timeoutMs` per-call via AbortController
 *   - enforces `maxCalls` by short-circuiting further calls with a
 *     `usage-cap-reached` LiveTransportError
 *   - enforces `maxResponseBytes` by aborting the stream and raising
 *     `oversize-response`
 *   - emits one TransportCallRecord per call to console.info
 *
 * Never throws except through rejected promises from `generate()`.
 */
export declare function createLiveLLMClient(config: LiveConfig): LiveLLMClient;
