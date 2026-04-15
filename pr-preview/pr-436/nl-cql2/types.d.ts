import { FilterExpression, FilterType, StacBrowserItem } from '../filter-engine';
import { LozengeItem } from '../FilterBar/types';

export type { FilterType, StacBrowserItem, FilterExpression };
/**
 * CQL2-JSON object. Shape defined by `cql2-filters-parser`. `{}` is a valid
 * no-op filter meaning "match all".
 */
export type Cql2Json = Record<string, unknown>;
/**
 * The chip seed the LLM emits. Picks the three persistable fields of
 * `LozengeItem` — callers assemble the full `LozengeItem` by adding
 * `kind: 'lozenge'` and a generated `id` via the existing reducer action
 * (decision 5A).
 */
export type LozengeSeed = Pick<LozengeItem, "filterType" | "value" | "negated">;
export type GenerationErrorReason = "malformed-json" | "schema-violation" | "hallucinated-field" | "unrecognised-term-leaked" | "cql2-evaluation-failed";
export interface GenerationError {
    readonly reason: GenerationErrorReason;
    readonly message: string;
    readonly rawResponse: string;
}
export interface GenerationDiagnostics {
    readonly promptVersion: string;
    readonly promptHash: string;
    readonly responseHash: string;
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
export interface EnumBundleMeta {
    readonly canonicalisation: string;
    readonly exercise_parse_rule: string;
    readonly generated_from_catalog: string;
    readonly generated_from_registry: string;
    readonly tool: string;
}
export interface EnumBundle {
    readonly vessel_class_tree: unknown;
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
    readonly matchCount: number | null;
    readonly matchIds?: readonly string[];
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
//# sourceMappingURL=types.d.ts.map