/**
 * Contract: public symbols the stakeholder demo imports from @debrief/components.
 *
 * This file documents the dependency surface 189 uses. It does NOT define these
 * types — they are owned upstream (188 / #185). This file exists to freeze the
 * contract for review: any change in the set of symbols or their shapes is a
 * coordination point between 189 and its upstream items.
 *
 * Source of truth:
 *   - @debrief/components/nl-cql2        (owned by 188)
 *   - @debrief/components/filter-engine  (owned by #126 + #185)
 */

declare module '@debrief/components/nl-cql2' {
  export interface LLMClient {
    generate(prompt: string): Promise<string>;
  }

  export interface LozengeSeed {
    filterType: string;  // narrows to FilterType union at runtime
    value: unknown;
    negated: boolean;
  }

  export interface GenerationDiagnostics {
    promptVersion: string;
    promptHash: string;
    modelIdentifier: string | null;
    usedLlm: boolean;
  }

  export type GenerationErrorReason =
    | 'malformed-json'
    | 'schema-violation'
    | 'hallucinated-field'
    | 'unrecognised-term-leaked'
    | 'cql2-evaluation-failed';

  export interface GenerationError {
    reason: GenerationErrorReason;
    phrase: string;
    rawResponse: string | null;
    message: string;
  }

  export interface GenerationResult {
    phrase: string;
    cql2: unknown | null;             // Cql2Json | null
    lozenges: LozengeSeed[];
    unrecognisedTerms: string[];
    diagnostics: GenerationDiagnostics;
    error: GenerationError | null;
  }

  export interface ResponseMap {
    [canonicalisedPhrase: string]: {
      rawResponse: string;
      promptHash: string;
      authoredAt: string;
      authoredBy: string;
    };
  }

  export interface EnumBundle {
    // Shape defined by #187 — this declaration is illustrative only.
    nationalities: string[];
    exercises: string[];
    tags: string[];
    featureTags: string[];
    vesselClassTree: unknown;
  }

  export interface GenerateDeps {
    llmClient: LLMClient;
    enumBundle: EnumBundle;
  }

  export function generateCql2(
    phrase: string,
    deps: GenerateDeps,
  ): Promise<GenerationResult>;

  export function createRecordedLLMClient(responses: ResponseMap): LLMClient;
}

declare module '@debrief/components/filter-engine' {
  /**
   * Evaluate a CQL2 JSON filter against a collection of items.
   * Returns the subset of items that satisfy the filter.
   */
  export function filterByCql2Json<T>(items: T[], cql2: unknown): T[];
}
