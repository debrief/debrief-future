import { EnumBundle } from './types';

/**
 * Current prompt template version. Bump manually when the prompt changes in
 * a way that would invalidate recorded fixtures. `RecordedLLMClient` compares
 * hashes (not versions) to detect drift, but this string travels with the
 * diagnostics for debugging.
 */
export declare const PROMPT_VERSION = "2026-04-14.1";
/**
 * Build the full prompt for a given phrase + enum bundle.
 *
 * Order (research.md §5, decision 2A/3A):
 *   1. Role framing
 *   2. CQL2 schema description (derived from PROPERTY_MAP)
 *   3. Enum bundle
 *   4. Worked examples (not from corpus)
 *   5. User phrase
 */
export declare function buildPrompt(phrase: string, enums: EnumBundle): string;
//# sourceMappingURL=buildPrompt.d.ts.map