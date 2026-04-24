/**
 * Public and internal types for the NL → CQL2 generator (#188) + live
 * transport (#190, #191).
 *
 * Shape history:
 *   - #188 established the `LLMClient` contract and the core
 *     `GenerationResult`/`LozengeSeed` shapes.
 *   - #190 added a browser-side loopback proxy implementation.
 *   - #191 (review Decisions 1, 5, 6, 8) collapsed the dual `LLMClient` /
 *     `LiveLLMClient` interfaces into ONE canonical interface returning the
 *     `LiveOutcome` union, and split `LiveConfig` into a discriminated union
 *     so the same nl-cql2 module feeds both the browser demo and the VS Code
 *     extension.
 *
 * All entities are in-memory TypeScript types; there is no persistence layer.
 */

import type {
  FilterEngineConfig,
  FilterType,
  StacBrowserItem,
} from "../filter-engine";
import type { LozengeItem } from "../FilterBar/types";

/** A CQL2-JSON object. Empty `{}` means no-op (match-all). */
export type Cql2Json = Record<string, unknown>;

/**
 * The chip seed the LLM emits. Picks the three persistable fields of a
 * simple `LozengeItem` — the consumer assembles the full `LozengeItem` by
 * adding `kind: 'lozenge'`, `shape: 'simple'`, and a generated `id`.
 */
export type LozengeSeed = {
  readonly filterType: Extract<LozengeItem, { shape: 'simple' }>['filterType'];
  readonly value: string;
  readonly negated?: boolean;
};

/** All five generator-level failure reasons. */
export type GenerationErrorReason =
  | "malformed-json"
  | "schema-violation"
  | "hallucinated-field"
  | "unrecognised-term-leaked"
  | "cql2-evaluation-failed";

export interface GenerationError {
  readonly reason: GenerationErrorReason;
  readonly message: string;
  readonly rawResponse: string;
}

export interface GenerationDiagnostics {
  /** Bumped manually when the prompt template changes materially. */
  readonly promptVersion: string;
  /** SHA-256 hex of the prompt string. */
  readonly promptHash: string;
  /** SHA-256 hex of the raw LLM response. */
  readonly responseHash: string;
  /** false for short-circuited empty phrases; true otherwise. */
  readonly usedLlm: boolean;
}

export interface GenerationResult {
  readonly phrase: string;
  readonly cql2: Cql2Json;
  readonly lozenges: readonly LozengeSeed[];
  readonly unrecognisedTerms: readonly string[];
  /**
   * Discriminated union so the demo can route generator-level (#188) vs
   * transport-level (#190/#191) failures to the correct banner. `null` on
   * success.
   */
  readonly error: GenerationResultError | null;
  readonly diagnostics: GenerationDiagnostics;
}

// ---------------------------------------------------------------------------
// LiveConfig — one discriminated union, two transports (review Decision 5)
// ---------------------------------------------------------------------------

interface LiveConfigBase {
  readonly enabled: boolean;
  readonly model: string;
  /** Upper-bound wall-clock per call, milliseconds. */
  readonly timeoutMs: number;
  /**
   * Per-session ceiling; call index `callCeiling` is the last permitted call.
   * Renamed from #190's `maxCalls` (review Decision 6).
   */
  readonly callCeiling: number;
  /**
   * Defensive truncation threshold for the provider's response body,
   * measured in UTF-8 bytes.
   */
  readonly maxResponseBytes: number;
}

/**
 * Browser variant (#189/#190). The credential lives in a loopback proxy's
 * environment; the browser speaks HTTP to that proxy and the proxy speaks
 * HTTPS to the provider.
 */
export interface BrowserLiveConfig extends LiveConfigBase {
  readonly transport: "browser-proxy";
  readonly proxyUrl: string;
  /**
   * Optional X-Proxy-Token. Required when the proxy is bound to a
   * non-loopback interface (`PROXY_ALLOW_REMOTE=true`). `null` when the
   * proxy is loopback-only.
   */
  readonly proxyToken: string | null;
}

/**
 * VS Code variant (#191). The extension host owns the credential in
 * SecretStorage; the webview speaks `postMessage` to the host and the host
 * speaks HTTPS to the provider.
 */
export interface VsCodeLiveConfig extends LiveConfigBase {
  readonly transport: "vscode-host";
  /** Presence bool — the key itself NEVER leaves the extension host. */
  readonly hasApiKey: boolean;
}

export type LiveConfig = BrowserLiveConfig | VsCodeLiveConfig;

export interface LiveConfigValidationError {
  readonly field: string;
  readonly message: string;
}

export type LiveConfigValidationResult =
  | { readonly ok: true; readonly value: LiveConfig }
  | { readonly ok: false; readonly errors: readonly LiveConfigValidationError[] };

// ---------------------------------------------------------------------------
// LiveOutcome — the single canonical result union (review Decision 6)
// ---------------------------------------------------------------------------

/**
 * Outcome of one NL → CQL2 provider call. A discriminated union; every
 * consumer branches on `kind`. No transport-specific variants — both the
 * browser and VS Code clients produce exactly this shape.
 *
 * Renames/absorptions vs #190:
 *   - `usage-cap-reached` → `ceiling-reached`.
 *   - `oversize-response` folded into `malformed-response` with
 *     `reason: "oversize"`.
 *   - `not-configured` added for #191's opt-in toggle (enabled without key).
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
  readonly providerStatus: number; // 401/403
  readonly durationMs: number;
}

export interface LiveRateLimit {
  readonly kind: "rate-limit";
  readonly providerStatus: number; // 429
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

/**
 * Covers both non-JSON and oversize responses (review Decision 6). The
 * `reason` discriminates.
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

/**
 * Discriminated error union carried by `GenerationResult.error`.
 *
 * `kind: "generation"` surfaces a #188-level parse/schema/evaluation failure
 * with full `GenerationError` details. `kind: "transport"` surfaces a
 * non-success `LiveOutcome` from the provider/transport layer (#190/#191).
 */
export type GenerationResultError =
  | { readonly kind: "generation"; readonly error: GenerationError }
  | { readonly kind: "transport"; readonly outcome: Exclude<LiveOutcome, LiveSuccess> };

// ---------------------------------------------------------------------------
// LLMClient — single canonical interface (review Decisions 1, 8)
// ---------------------------------------------------------------------------

/**
 * Transport-agnostic NL → CQL2 client. The phrase goes in; exactly one
 * `LiveOutcome` comes out. All failure paths are encoded as outcomes —
 * `generate` NEVER throws on normal failure paths.
 *
 * Cancellation is `abort()`, owned by each implementation (review
 * Decision 4). FilterBar calls `client.abort()` when a new submission
 * supersedes an in-flight one; the superseded call resolves to
 * `{ kind: "transport-error", reason: "cancelled" }` and is dropped by
 * the caller (no banner for cancellations).
 */
export interface LLMClient {
  generate(prompt: string): Promise<LiveOutcome>;
  /** Idempotent; cancels every in-flight `generate()`. */
  abort(): void;
}

export interface RecordedResponse {
  readonly rawResponse: string;
  readonly promptHash: string;
  readonly recordedAt: string;
  readonly model: string;
}

export type ResponseMap = Readonly<Record<string, RecordedResponse>>;

// ---------------------------------------------------------------------------
// Telemetry — structured log record emitted per call (unchanged from #190)
// ---------------------------------------------------------------------------

/**
 * Observability record emitted via `console.info("[nl-demo/live]", record)`
 * or `console.info("[nl-search/live]", record)` once per live call (success
 * or failure). NEVER contains prompt, response, or credential content.
 */
export interface TransportCallRecord {
  readonly ts: string;
  readonly provider: "anthropic";
  readonly model: string;
  readonly durationMs: number;
  readonly outcome: LiveOutcome["kind"];
  /** UTF-8 byte count; null on non-success. */
  readonly responseBytes: number | null;
  readonly callIndex: number;
}

// ---------------------------------------------------------------------------
// Enum bundle (shape of shared/data/enum-bundle.json — narrowed at load time)
// ---------------------------------------------------------------------------

export interface VesselClassNode {
  readonly _class?: {
    readonly full_name: string;
  };
  readonly [childKey: string]: VesselClassNode | { readonly full_name: string } | undefined;
}

export interface EnumBundleMeta {
  readonly canonicalisation: string;
  readonly exercise_parse_rule: string;
  readonly generated_from_catalog: string;
  readonly generated_from_registry: string;
  readonly tool: string;
}

export interface EnumBundle {
  readonly vessel_class_tree: Readonly<Record<string, VesselClassNode>>;
  readonly nationalities: readonly string[];
  readonly exercise_names: readonly string[];
  readonly tags: readonly string[];
  readonly feature_tags: readonly string[];
  readonly _meta: EnumBundleMeta;
}

// ---------------------------------------------------------------------------
// Generator dependencies
// ---------------------------------------------------------------------------

export interface GenerateDeps {
  readonly enums: EnumBundle;
  readonly client: LLMClient;
  readonly promptVersion?: string;
}

// ---------------------------------------------------------------------------
// Harness-only types (not shipped in dist/; declared here for single source
// of truth but the harness helpers live under __tests__/).
// ---------------------------------------------------------------------------

export interface CorpusExpectation {
  /**
   * Expected number of catalog items matching the generated CQL2, or `null`
   * when the phrase only exercises unrecognised-term handling.
   */
  readonly matchCount: number | null;
  /** Exact set of expected item IDs (order-independent). Optional. */
  readonly matchIds?: readonly string[];
  /** If present, `GenerationResult.unrecognisedTerms` MUST equal this set. */
  readonly unrecognisedTerms?: readonly string[];
}

export interface CorpusRecord {
  readonly id: string;
  readonly phrase: string;
  readonly expected: CorpusExpectation;
  readonly notes?: string;
}

export interface HarnessPass {
  readonly id: string;
  readonly phrase: string;
  readonly cql2: Cql2Json;
  readonly matchCount: number;
}

export interface HarnessFail {
  readonly id: string;
  readonly phrase: string;
  readonly reason: string;
  readonly expected: CorpusExpectation;
  readonly actual: {
    readonly cql2: Cql2Json | null;
    readonly matchCount: number | null;
    readonly unrecognisedTerms: readonly string[];
  };
  readonly rawResponse?: string;
}

export interface HarnessReport {
  readonly passed: readonly HarnessPass[];
  readonly failed: readonly HarnessFail[];
  readonly elapsedMs: number;
  readonly promptSizeBytes: number;
}

export interface RunHarnessDeps {
  readonly corpus: readonly CorpusRecord[];
  readonly client: LLMClient;
  readonly enums: EnumBundle;
  readonly catalog: readonly StacBrowserItem[];
  readonly filterConfig?: FilterEngineConfig;
  readonly promptVersion?: string;
}

// ---------------------------------------------------------------------------
// Re-exports for ergonomics
// ---------------------------------------------------------------------------

export type { FilterType, StacBrowserItem, FilterEngineConfig };
