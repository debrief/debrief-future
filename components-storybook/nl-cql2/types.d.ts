import { FilterEngineConfig, FilterType, StacBrowserItem } from '../filter-engine';
import { LozengeItem } from '../FilterBar/types';

/** A CQL2-JSON object. Empty `{}` means no-op (match-all). */
export type Cql2Json = Record<string, unknown>;
/**
 * The chip seed the LLM emits. Picks the three persistable fields of
 * `LozengeItem` — the consumer assembles the full `LozengeItem` by adding
 * `kind: 'lozenge'` and a generated `id`. Decision 5A.
 */
export type LozengeSeed = Pick<LozengeItem, "filterType" | "value" | "negated">;
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
    readonly error: GenerationError | null;
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
export type { FilterType, StacBrowserItem, FilterEngineConfig };
//# sourceMappingURL=types.d.ts.map