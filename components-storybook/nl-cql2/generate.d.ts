import { GenerateDeps, GenerationResult } from './types';

/** The prompt-template version. Bump when the template changes materially. */
export declare const PROMPT_VERSION = "2026-04-16.1";
/**
 * Translate a natural-language phrase into a structured `GenerationResult`.
 *
 * @param phrase - Analyst phrase (2–10 words, English).
 * @param deps - Injected dependencies: enum bundle and LLM client.
 * @returns A GenerationResult. Errors populate `.error` — never throws on
 *   normal failure paths. Programmer-error throws from stub clients (e.g.
 *   `createRecordedLLMClient` miss) still propagate.
 */
export declare function generateCql2(phrase: string, deps: GenerateDeps): Promise<GenerationResult>;
//# sourceMappingURL=generate.d.ts.map