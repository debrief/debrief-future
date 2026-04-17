import { FilterEngineConfig, FilterType, StacBrowserItem } from '../filter-engine';
import { LozengeItem } from '../FilterBar/types';

/** A CQL2-JSON object. Empty `{}` means no-op (match-all). */
export type Cql2Json = Record<string, unknown>;
/**
 * The chip seed the LLM emits. Picks the three persistable fields of a
 * simple `LozengeItem` — the consumer assembles the full `LozengeItem` by
 * adding `kind: 'lozenge'`, `shape: 'simple'`, and a generated `id`.
 * Decision 5A.
 *
 * Platform chips (#186) are not emitted by the NL generator; saved filters
 * include them via the CQL2 round-trip path rather than a seed.
 */
export type LozengeSeed = {
    readonly filterType: Extract<LozengeItem, {
        shape: 'simple';
    }>['filterType'];
    readonly value: string;
    readonly negated?: boolean;
};
/** All five generator-level failure reasons (decision 8A). */
export type GenerationErrorReason = "malformed-json" | "schema-violation" | "hallucinated-field" | "unrecognised-term-leaked" | "cql2-evaluation-failed";
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
     * transport-level (#190) failures to the correct banner. `null` on success.
     */
    readonly error: GenerationResultError | null;
    readonly diagnostics: GenerationDiagnostics;
}
export interface LLMClient {
    generate(prompt: string): Promise<string>;
}
export interface RecordedResponse {
    readonly rawResponse: string;
    readonly promptHash: string;
    readonly recordedAt: string;
    readonly model: string;
}
export type ResponseMap = Readonly<Record<string, RecordedResponse>>;
export interface VesselClassNode {
    readonly _class?: {
        readonly full_name: string;
    };
    readonly [childKey: string]: VesselClassNode | {
        readonly full_name: string;
    } | undefined;
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
export interface GenerateDeps {
    readonly enums: EnumBundle;
    readonly client: LLMClient;
    readonly promptVersion?: string;
}
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
/**
 * Runtime configuration for the live LLM client.
 *
 * Loaded at demo boot from `apps/nl-demo/live-config.json` (gitignored, app
 * root). Credentials MUST NOT appear on this type — they live only in the
 * proxy's environment (see `ProxyEnv` in data-model.md §2).
 */
export interface LiveConfig {
    readonly enabled: boolean;
    readonly proxyUrl: string;
    readonly model: string;
    readonly timeoutMs: number;
    readonly maxCalls: number;
    /** UTF-8 byte count (not UTF-16 code units). Enforced by a streaming reader. */
    readonly maxResponseBytes: number;
    /**
     * Required only when the proxy was started with `PROXY_ALLOW_REMOTE=true`.
     * Sent as `X-Proxy-Token` on every `/generate` and `/health` request.
     * Omitted (or empty) for the default loopback-bound proxy.
     */
    readonly proxyToken?: string;
}
export interface LiveConfigValidationError {
    readonly field: keyof LiveConfig;
    readonly message: string;
}
export type LiveConfigValidationResult = {
    readonly ok: true;
    readonly value: LiveConfig;
} | {
    readonly ok: false;
    readonly errors: readonly LiveConfigValidationError[];
};
/** Seven disjoint failure classes surfaced by the live transport. */
export type LiveTransportErrorReason = "auth-failure" | "rate-limit" | "provider-error" | "transport-error" | "timeout" | "oversize-response" | "usage-cap-reached";
/**
 * Plain data interface — NOT an Error subclass. The live client returns this
 * via `GenerationResult.error` with `kind: "transport"`. It is never thrown,
 * preserving #188's "generateCql2 never throws on normal failure paths"
 * invariant.
 */
export interface LiveTransportError {
    readonly reason: LiveTransportErrorReason;
    readonly message: string;
    readonly providerStatus: number | null;
    readonly durationMs: number;
    readonly callIndex: number;
}
/**
 * Observability record emitted via `console.info("[nl-demo/live]", record)`
 * once per live call (success or failure). NEVER contains prompt, response,
 * or credential content.
 */
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
/**
 * Discriminated error union carried by `GenerationResult.error`. Routes
 * generator-level (#188) vs transport-level (#190) failures to the correct
 * demo banner via a `switch (result.error.kind)` dispatch.
 */
export type GenerationResultError = {
    readonly kind: "generation";
    readonly error: GenerationError;
} | {
    readonly kind: "transport";
    readonly error: LiveTransportError;
};
/**
 * LLMClient backed by a real provider. Extends the #188 contract with the
 * methods the demo needs to implement FR-012 (supersession) and SC-008
 * (usage cap surfacing).
 *
 * `generate()` returns `rawResponse: string` on success (matching the
 * LLMClient contract). On transport failure it throws a `LiveTransportAbort`
 * marker carrying the typed `LiveTransportError`; `generateCql2` catches and
 * wraps it into `GenerationResult.error` with `kind: "transport"` — the
 * LiveTransportError value itself is never thrown, preserving the
 * "generateCql2 never throws on normal failure paths" invariant.
 */
export interface LiveLLMClient extends LLMClient {
    /**
     * Abort every in-flight `generate()` call. Used by the demo when a new
     * phrase supersedes an older one (FR-012). Aborted calls settle as
     * transport errors with `reason: "transport-error"` and
     * `message: "superseded"`; the demo's existing submission-token filter
     * discards these before they reach the UI.
     */
    cancelPending(): void;
    /** Read-only view of the usage counter. */
    readonly usage: {
        readonly used: number;
        readonly cap: number;
    };
}
export type { FilterType, StacBrowserItem, FilterEngineConfig };
//# sourceMappingURL=types.d.ts.map