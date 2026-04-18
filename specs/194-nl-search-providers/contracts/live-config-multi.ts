/**
 * Contract (design artefact) for the extended LiveConfig union that carries
 * a `provider` discriminator.
 *
 * Not shipped — this file lives under specs/ to document how the existing
 * #190/#191 `LiveConfig` union extends. The live implementation remains in
 *   `shared/components/src/nl-cql2/types.ts`
 * and
 *   `shared/components/src/nl-cql2/clients.ts`
 * which this feature edits in-place.
 *
 * Compared to #191's contract (`specs/191-vscode-nl-search/contracts/
 * llm-client.ts`):
 *   - `LiveConfigBase` gains a mandatory `provider` field.
 *   - `LiveConfigBase` gains an optional `baseUrl` field (required when
 *     `provider === "ollama"`).
 *   - The discriminated union `BrowserLiveConfig | VsCodeLiveConfig` is
 *     otherwise unchanged.
 *
 * The `LiveOutcome` union is re-exported here UNCHANGED so downstream
 * consumers can import it from this single contract file.
 */

import type { ProviderId } from "./provider-adapter";

// ---------------------------------------------------------------------------
// Base + variants
// ---------------------------------------------------------------------------

export interface LiveConfigBase {
  readonly enabled: boolean;
  /** NEW in #194 — mandatory; back-compat defaults to "anthropic". */
  readonly provider: ProviderId;
  readonly model: string;
  readonly timeoutMs: number;
  readonly callCeiling: number;
  readonly maxResponseBytes: number;
  /**
   * NEW in #194 — required only when `provider === "ollama"`. Validated by
   * `validateLiveConfig` to be a parseable URL.
   */
  readonly baseUrl?: string;
}

/**
 * Browser flavour (#189/#190). The proxy holds any credential; the browser
 * speaks HTTP to a loopback proxy.
 */
export interface BrowserLiveConfig extends LiveConfigBase {
  readonly transport: "browser-proxy";
  readonly proxyUrl: string;
  readonly proxyToken: string | null;
}

/**
 * VS Code flavour (#191). The extension host holds the credential in
 * SecretStorage; the webview speaks postMessage to the host.
 *
 * `hasApiKey` is `false` for Ollama (no key required). For cloud providers,
 * `hasApiKey === false` short-circuits to `LiveNotConfigured`.
 */
export interface VsCodeLiveConfig extends LiveConfigBase {
  readonly transport: "vscode-host";
  readonly hasApiKey: boolean;
}

export type LiveConfig = BrowserLiveConfig | VsCodeLiveConfig;

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export interface LiveConfigValidationError {
  readonly field: keyof LiveConfigBase | "proxyUrl" | "proxyToken" | "hasApiKey" | "transport";
  readonly message: string;
}

/**
 * Extended `validateLiveConfig` behaviour beyond the #190 baseline:
 *
 *  - `provider` MUST be a known `ProviderId`. Unknown string → validation
 *    error. Absent field → upgraded to `"anthropic"` with a console.warn
 *    (back-compat for existing live-config.json files).
 *  - When `provider === "ollama"`, `baseUrl` MUST be present and parseable
 *    as an absolute URL.
 *  - When `provider !== "ollama"`, any present `baseUrl` is ignored (not an
 *    error).
 *  - All other fields retain their #190/#191 validation rules.
 */
export declare function validateLiveConfig(
  raw: unknown,
):
  | { ok: true; value: LiveConfig }
  | { ok: false; errors: readonly LiveConfigValidationError[] };

// ---------------------------------------------------------------------------
// LiveOutcome — re-exported UNCHANGED from #191
// ---------------------------------------------------------------------------

/**
 * The canonical outcome union. No new kinds are introduced by #194.
 * Copied here for self-contained reading; the implementation canon lives
 * in `shared/components/src/nl-cql2/types.ts`.
 */
export type LiveOutcome =
  | LiveSuccess
  | LiveAuthFailure
  | LiveRateLimit
  | LiveProviderError
  | LiveTransportError
  | LiveTimeout
  | LiveMalformedResponse
  | LiveNotConfigured
  | LiveCeilingReached;

export interface LiveSuccess {
  readonly kind: "success";
  readonly rawResponse: string;
  readonly durationMs: number;
  readonly responseBytes: number;
  readonly model: string;
}

export interface LiveAuthFailure {
  readonly kind: "auth-failure";
  readonly providerStatus: number;
  readonly durationMs: number;
}

export interface LiveRateLimit {
  readonly kind: "rate-limit";
  readonly providerStatus: number;
  readonly retryAfterSeconds: number | null;
  readonly durationMs: number;
}

export interface LiveProviderError {
  readonly kind: "provider-error";
  readonly providerStatus: number;
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

export interface LiveMalformedResponse {
  readonly kind: "malformed-response";
  readonly reason: "non-json" | "oversize" | "truncated";
  readonly durationMs: number;
  readonly responseBytes: number;
}

/**
 * `not-configured` now has a third reason `"no-baseUrl"` implicitly — the
 * existing `"no-key"` reason is semantically equivalent for Ollama (the
 * "missing credential" for Ollama is a valid baseUrl). We reuse the
 * existing two reasons rather than add a third; providerCall() maps the
 * Ollama missing-baseUrl case to `no-key` for UI simplicity.
 */
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
