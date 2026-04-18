/**
 * AuditRecord contract for #197 — per-prompt NL-search audit trail (opt-in).
 *
 * This is the canonical on-disk line format written to `nl-audit.jsonl` and
 * `nl-audit-archive.jsonl`. The same shape is asserted at runtime by
 * `contracts/audit-record.schema.json`.
 *
 * Per research.md decisions:
 *   - Decision 4: flat record; `schemaVersion` is a string tag; `responseBody`
 *     lives at the top level (not nested under `outcome.rawResponse`);
 *     `callIndex` is the join key against #191's [nl-search/live] telemetry.
 *   - Decision 5: the enable flag reaches the webview via
 *     `VsCodeLiveConfig.auditEnabled` (see #191 contracts) — not modelled here.
 *
 * Written by `apps/vscode/src/services/auditSink.ts` on every NL-search call
 * when `debrief.nlSearch.audit.enabled === true`.
 *
 * NEVER populated with: the API key, the `x-api-key` header, any other
 * credential substring, or any request header.
 */

// ---------------------------------------------------------------------------
// AuditOutcome — #191's LiveOutcome union with rawResponse stripped out
// ---------------------------------------------------------------------------

/**
 * The #191 `LiveOutcome` union, re-exported here MINUS the `rawResponse`
 * field on `LiveSuccess`. The response body is promoted to
 * `AuditRecord.responseBody` at the top level so SIEM field mappings can
 * target one source field for "what the model said" regardless of outcome.
 *
 * All other fields on every outcome kind are preserved verbatim from the
 * #191 contract. The implementation produces `AuditOutcome` via a type
 * helper rather than a second union definition.
 */
export type AuditOutcome =
  | AuditSuccess
  | AuditAuthFailure
  | AuditRateLimit
  | AuditProviderError
  | AuditTransportError
  | AuditTimeout
  | AuditMalformedResponse
  | AuditNotConfigured
  | AuditCeilingReached;

export interface AuditSuccess {
  readonly kind: "success";
  readonly durationMs: number;
  readonly responseBytes: number;
  readonly model: string;
  // NOTE: `rawResponse` is NOT here — promoted to AuditRecord.responseBody.
}

export interface AuditAuthFailure {
  readonly kind: "auth-failure";
  readonly providerStatus: number;
  readonly durationMs: number;
}

export interface AuditRateLimit {
  readonly kind: "rate-limit";
  readonly providerStatus: number;
  readonly retryAfterSeconds: number | null;
  readonly durationMs: number;
}

export interface AuditProviderError {
  readonly kind: "provider-error";
  readonly providerStatus: number;
  readonly durationMs: number;
}

export interface AuditTransportError {
  readonly kind: "transport-error";
  readonly reason: "network" | "cancelled" | "unknown";
  readonly durationMs: number;
}

export interface AuditTimeout {
  readonly kind: "timeout";
  readonly durationMs: number;
}

export interface AuditMalformedResponse {
  readonly kind: "malformed-response";
  readonly reason: "non-json" | "oversize" | "truncated";
  readonly durationMs: number;
  readonly responseBytes: number;
}

export interface AuditNotConfigured {
  readonly kind: "not-configured";
  readonly reason: "disabled" | "no-key";
  readonly durationMs: 0;
}

export interface AuditCeilingReached {
  readonly kind: "ceiling-reached";
  readonly ceiling: number;
  readonly durationMs: 0;
}

// ---------------------------------------------------------------------------
// AuditRecord — the on-disk line format
// ---------------------------------------------------------------------------

/**
 * One line of `nl-audit.jsonl` or `nl-audit-archive.jsonl`. Serialised with
 * `JSON.stringify(record) + "\n"`. UTF-8, LF.
 *
 * Every field is always present (no `undefined`). Fields that don't apply to
 * an outcome kind are explicit `null` (e.g. `responseBody = null` on
 * pre-provider outcomes).
 */
export interface AuditRecord {
  /** Schema version tag. Currently "1". Bumped on breaking field changes. */
  readonly schemaVersion: "1";

  /** Joins to #191's [nl-search/live] telemetry line. Unique per session. */
  readonly callIndex: number;

  /** ISO-8601 UTC with explicit `Z` suffix, e.g. "2026-04-18T14:32:01.234Z". */
  readonly timestampUtc: string;

  /** Provider identifier. Currently always "anthropic"; expandable via #196. */
  readonly provider: "anthropic";

  /** Provider-specific model identifier, e.g. "claude-haiku-4-5-20251001". */
  readonly model: string;

  /** Classified outcome — #191 LiveOutcome minus `rawResponse`. */
  readonly outcome: AuditOutcome;

  /** Full prompt as submitted by FilterBar. Trimmed; length ≤ 500 chars. */
  readonly phrase: string;

  /**
   * Response body as received from the provider, bounded at the #191
   * `maxResponseBytes` ceiling. `null` for outcomes where no body ever
   * arrived (`not-configured`, `ceiling-reached`, pre-response
   * `transport-error`).
   */
  readonly responseBody: string | null;

  /** `true` iff `responseBody` was truncated at `maxResponseBytes`. */
  readonly responseBodyTruncated: boolean;

  /** Wall-clock duration from submission to outcome classification. */
  readonly durationMs: number;
}

// ---------------------------------------------------------------------------
// AuditSink input surface — what the call-site in llmProxy passes
// ---------------------------------------------------------------------------

/**
 * The call-site in `apps/vscode/src/services/llmProxy.ts` passes this shape
 * to `auditSink.record(input)`. The sink composes the full `AuditRecord` by
 * adding `schemaVersion`, `timestampUtc`, and `provider`.
 *
 * CRITICAL: `apiKey` is deliberately NOT a field. The sink is handed no
 * credential material. A negative unit test fails CI if a sentinel API key
 * ever appears in any emitted record's serialised bytes.
 */
export interface AuditRecordInput {
  readonly callIndex: number;
  readonly model: string;
  readonly outcome: AuditOutcome;
  readonly phrase: string;
  readonly responseBody: string | null;
  readonly responseBodyTruncated: boolean;
  readonly durationMs: number;
}
