/**
 * Contract: public API of the `nl-cql2` module (shared/components/src/nl-cql2/)
 * plus the new filter-engine additions this feature requires.
 *
 * This file is a specification artefact. The actual implementation (same
 * signatures) lives in `shared/components/src/nl-cql2/` and
 * `shared/components/src/filter-engine/`. Any deviation between this contract
 * and the implementation is a plan violation and must be reconciled before PR.
 *
 * Review decisions this contract reflects:
 *   1A — filter-engine gains a full CQL2-JSON → FilterExpression reverse parser
 *        plus a thin `filterByCql2Json` convenience method.
 *   2A / 5A — the generator emits `LozengeSeed[]`, reusing FilterBar's chip
 *        shape rather than a parallel `ChipSummary` type.
 *   3A — PROPERTY_MAP is exported from `filter-engine/cql2-json.ts` and feeds
 *        the prompt's schema description.
 *   6A — the harness operates on `ReadonlyArray<StacBrowserItem>` directly.
 *   8A — `GenerationErrorReason` adds `cql2-evaluation-failed`.
 */

import type {
  FilterExpression,
  FilterType,
  StacBrowserItem,
} from "../../../shared/components/src/filter-engine";
import type { LozengeItem } from "../../../shared/components/src/FilterBar/types";

// -----------------------------------------------------------------------------
// NEW in filter-engine (decision 1A + scope addition)
// -----------------------------------------------------------------------------

/**
 * CQL2-JSON object. Shape defined by the existing `cql2-filters-parser`.
 * `{}` is a valid no-op filter meaning "match all".
 */
export type Cql2Json = Record<string, unknown>;

/**
 * Reverse of `filterExpressionToCql2Json`. Accepts a CQL2-JSON object and
 * returns a typed `FilterExpression`. Throws a typed error when the input uses
 * unsupported operators, mis-arity args, or references properties absent from
 * `PROPERTY_MAP`. This is the new public function on the filter-engine added
 * by 188 and exported from `shared/components/src/filter-engine/cql2-json.ts`.
 */
export declare function cql2JsonToFilterExpression(
  cql2: Cql2Json,
): FilterExpression;

/**
 * One-liner convenience: parse the CQL2-JSON, then filter.
 * Added in `shared/components/src/filter-engine/engine.ts` as a free function
 * alongside `createFilterEngine`.
 */
export declare function filterByCql2Json<T extends StacBrowserItem>(
  items: readonly T[],
  cql2: Cql2Json,
): T[];

/**
 * Re-export of the already-internal PROPERTY_MAP (decision 3A).
 * Becomes exported from `filter-engine/cql2-json.ts` so the prompt builder
 * is guaranteed to match the evaluator.
 */
export declare const PROPERTY_MAP: Readonly<Record<FilterType, string>>;

// -----------------------------------------------------------------------------
// NL → CQL2 output types
// -----------------------------------------------------------------------------

/**
 * The chip seed the LLM emits. Picks the three persistable fields of
 * `LozengeItem` — the consumer (#190 or future callers) assembles the full
 * `LozengeItem` by adding `kind: 'lozenge'` and a nanoid `id`.
 *
 * Decision 5A: reuses the canonical chip shape; no parallel `ChipSummary` type.
 */
export type LozengeSeed = Pick<LozengeItem, "filterType" | "value" | "negated">;

export type GenerationErrorReason =
  | "malformed-json"
  | "schema-violation"
  | "hallucinated-field"
  | "unrecognised-term-leaked"
  | "cql2-evaluation-failed";

export interface GenerationError {
  reason: GenerationErrorReason;
  message: string;
  rawResponse: string;
}

export interface GenerationDiagnostics {
  promptVersion: string;
  promptHash: string;
  responseHash: string;
  usedLlm: boolean;
}

export interface GenerationResult {
  phrase: string;
  cql2: Cql2Json;
  lozenges: readonly LozengeSeed[];
  unrecognisedTerms: readonly string[];
  error: GenerationError | null;
  diagnostics: GenerationDiagnostics;
}

// -----------------------------------------------------------------------------
// LLM client abstraction
// -----------------------------------------------------------------------------

export interface LLMClient {
  generate(prompt: string): Promise<string>;
}

export interface RecordedResponse {
  rawResponse: string;
  promptHash: string;
  recordedAt: string;
  model: string;
}

export type ResponseMap = Readonly<Record<string, RecordedResponse>>;

export declare function createRecordedLLMClient(
  responses: ResponseMap,
): LLMClient;

export declare function createPassthroughLLMClient(
  fn: (prompt: string) => Promise<string>,
): LLMClient;

// -----------------------------------------------------------------------------
// Enum bundle (shape of shared/data/enum-bundle.json — narrowed at load time)
// -----------------------------------------------------------------------------

export interface EnumBundle {
  vessel_classes: unknown; // tree; narrowed by the taxonomy module
  nationalities: readonly string[];
  exercise_names: readonly string[];
  tags: readonly string[];
  feature_tags: readonly string[];
  _meta: {
    canonicalisation: string;
    exercise_parse_rule: string;
    generated_from_catalog: string;
    generated_from_registry: string;
    tool: string;
  };
}

// -----------------------------------------------------------------------------
// Generator entry point
// -----------------------------------------------------------------------------

export interface GenerateDeps {
  enums: EnumBundle;
  client: LLMClient;
  promptVersion?: string;
}

/**
 * The core generator. Pure function over `deps`; no hidden state.
 *
 * Behaviour (FR-001..FR-013):
 * - Empty/whitespace phrase → short-circuit, `usedLlm: false`, empty cql2/lozenges.
 * - Otherwise: build prompt, call `client.generate`, validate response,
 *   return GenerationResult (possibly with `error` populated).
 * - Never throws on LLM response failures; only throws on construction
 *   errors (missing/empty enum bundle).
 */
export declare function generateCql2(
  phrase: string,
  deps: GenerateDeps,
): Promise<GenerationResult>;

// -----------------------------------------------------------------------------
// Prompt composition (exported for tests + future prompt-cache wiring)
// -----------------------------------------------------------------------------

export declare function buildPrompt(phrase: string, enums: EnumBundle): string;

/**
 * Derives the CQL2 schema description block from the filter-engine's
 * PROPERTY_MAP (decision 3A). Consumers import this directly only in tests;
 * production callers use `buildPrompt`.
 */
export declare function schemaDescription(): string;

// -----------------------------------------------------------------------------
// Harness (lives under __tests__/ per decision 13A — not shipped in dist/)
// -----------------------------------------------------------------------------

export interface CorpusExpectation {
  matchCount: number | null;
  matchIds?: readonly string[];
  unrecognisedTerms?: readonly string[];
}

export interface CorpusRecord {
  id: string;
  phrase: string;
  expected: CorpusExpectation;
  notes?: string;
}

export interface HarnessPass {
  id: string;
  phrase: string;
  cql2: Cql2Json;
  matchCount: number;
}

export interface HarnessFail {
  id: string;
  phrase: string;
  reason: string;
  expected: CorpusExpectation;
  actual: {
    cql2: Cql2Json | null;
    matchCount: number | null;
    unrecognisedTerms: readonly string[];
  };
  rawResponse?: string;
}

export interface HarnessReport {
  passed: readonly HarnessPass[];
  failed: readonly HarnessFail[];
  elapsedMs: number;
  promptSizeBytes: number;
}

export declare function runHarness(
  corpus: readonly CorpusRecord[],
  client: LLMClient,
  enums: EnumBundle,
  catalog: readonly StacBrowserItem[],
): Promise<HarnessReport>;
