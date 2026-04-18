/**
 * Contract (design artefact) for the ProviderAdapter extension seam.
 *
 * Not shipped — this file lives under specs/ to document the public
 * TypeScript surface that `shared/components/src/nl-cql2/providerAdapters/`
 * MUST implement in /speckit.tasks. Implementations reference this contract;
 * any deviation must be justified in research.md or a follow-up ADR.
 *
 * Fold location: the three adapters live in
 *   `shared/components/src/nl-cql2/providerAdapters/anthropic.ts`
 *   `shared/components/src/nl-cql2/providerAdapters/openai.ts`
 *   `shared/components/src/nl-cql2/providerAdapters/ollama.ts`
 * and are registered in
 *   `shared/components/src/nl-cql2/providerAdapters/index.ts`
 *
 * The central `providerCall()` function in
 *   `shared/components/src/nl-cql2/providerCall.ts`
 * picks an adapter from the registry by `config.provider`.
 */

import type { LiveOutcome } from "./live-config-multi";

// ---------------------------------------------------------------------------
// Provider identity
// ---------------------------------------------------------------------------

export type ProviderId = "anthropic" | "openai" | "ollama";

// ---------------------------------------------------------------------------
// composeRequest()
// ---------------------------------------------------------------------------

export interface ComposeRequestInput {
  /** Fully-composed, provider-neutral prompt produced by buildPrompt.ts. */
  readonly prompt: string;
  /** Model identifier meaningful to the chosen provider. */
  readonly model: string;
  /**
   * API key for cloud providers. `null` for Ollama (and for misconfigured
   * cloud providers — in which case providerCall() short-circuits to a
   * `LiveNotConfigured` outcome BEFORE composeRequest is called, so the
   * contract is: implementations MAY assume `apiKey` is non-null when they
   * require one).
   */
  readonly apiKey: string | null;
  /**
   * Base URL for providers that require operator-supplied endpoints (Ollama).
   * `null` for providers with a canonical hosted URL (Anthropic, OpenAI).
   * Adapters MUST ignore this field when not relevant to their provider.
   */
  readonly baseUrl: string | null;
}

export interface ProviderRequest {
  /** Fully-formed URL to POST to. */
  readonly url: string;
  /**
   * Non-enumerable header map. MUST include `Content-Type: application/json`.
   * MAY include provider-specific auth headers. MUST NOT include any header
   * that echoes the raw prompt or response content.
   */
  readonly headers: Record<string, string>;
  /** JSON-stringified body. Passed verbatim to the HTTP client. */
  readonly body: string;
}

// ---------------------------------------------------------------------------
// parseResponse()
// ---------------------------------------------------------------------------

export interface ParseResponseInput {
  readonly httpStatus: number;
  readonly bodyText: string;
  readonly responseBytes: number;
}

/**
 * The normalised result of successfully receiving an HTTP response. Does NOT
 * cover transport failures, timeouts, or oversize responses — those flow
 * through `mapError()` instead.
 *
 * When `parseResponse` returns `"success"`, `rawResponse` carries the
 * provider's response TEXT (extracted from the per-provider envelope), ready
 * to be handed to #188's `parseResponse` for CQL2 extraction.
 */
export type ProviderResponseEnvelope =
  | {
      readonly kind: "success";
      readonly rawResponse: string;
      readonly responseBytes: number;
    }
  | {
      readonly kind: "non-json";
      readonly responseBytes: number;
    }
  | {
      readonly kind: "schema-violation";
      readonly responseBytes: number;
      /** Short, machine-readable token, safe to log. No raw payload. */
      readonly detail: string;
    };

// ---------------------------------------------------------------------------
// mapError()
// ---------------------------------------------------------------------------

export type MapErrorCondition =
  | { readonly kind: "http-error"; readonly status: number; readonly bodyText: string }
  | { readonly kind: "network-error"; readonly reason: "refused" | "dns" | "other" }
  | { readonly kind: "timeout" }
  | { readonly kind: "aborted" }
  | { readonly kind: "oversize"; readonly responseBytes: number }
  | { readonly kind: "non-json"; readonly responseBytes: number };

export interface MapErrorInput {
  readonly condition: MapErrorCondition;
  readonly durationMs: number;
  readonly callIndex: number;
}

/**
 * Produces a `LiveOutcome` classifying the failure. Implementations MUST use
 * only the existing `LiveOutcome.kind` values — no new kinds are introduced
 * by this feature.
 *
 * The returned outcome MUST NOT carry any credential material, full prompt
 * body, or full response body. Short provider messages (e.g., Ollama's
 * "model not pulled") are permitted in debug-log paths but not in the
 * outcome's fields (which reach the UI).
 */
export type MapError = (input: MapErrorInput) => LiveOutcome;

// ---------------------------------------------------------------------------
// ProviderAdapter contract
// ---------------------------------------------------------------------------

/**
 * A provider adapter is a bundle of three pure functions plus its own id.
 * Implementations MUST be pure (no I/O, no globals, no time reads).
 */
export interface ProviderAdapter {
  readonly id: ProviderId;
  composeRequest(input: ComposeRequestInput): ProviderRequest;
  parseResponse(input: ParseResponseInput): ProviderResponseEnvelope;
  mapError(input: MapErrorInput): LiveOutcome;
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

/**
 * Registry of known adapters, keyed by provider id. The registry MUST be
 * exhaustive — adding a new ProviderId variant without a registry entry
 * MUST cause a compile-time error (enforced via exhaustiveness in the
 * registry definition).
 */
export type ProviderAdapterRegistry = {
  readonly [K in ProviderId]: ProviderAdapter;
};

export declare const providerAdapters: ProviderAdapterRegistry;
