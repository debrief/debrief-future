/**
 * NL → CQL2 generator entry point (#188 FR-001, FR-009, FR-011).
 *
 * Pure function over `deps`. Short-circuits empty/whitespace phrases without
 * invoking the LLM (FR-009). Otherwise builds the prompt, calls the injected
 * LLM client, and delegates to `parseResponse` for validation.
 *
 * Post-#191 (review Decision 1): `client.generate()` returns a `LiveOutcome`
 * union. Non-success outcomes populate `GenerationResult.error` with
 * `kind: "transport"` — no exceptions cross the seam.
 */
import { buildPrompt } from "./buildPrompt";
import { sha256Hex } from "./hash";
import { parseResponse } from "./parseResponse";
import type { GenerateDeps, GenerationResult } from "./types";

/** The prompt-template version. Bump when the template changes materially. */
export const PROMPT_VERSION = "2026-04-16.1";

function emptyResult(
  phrase: string,
  promptVersion: string,
): GenerationResult {
  return {
    phrase,
    cql2: {},
    lozenges: [],
    unrecognisedTerms: [],
    error: null,
    diagnostics: {
      promptVersion,
      promptHash: "",
      responseHash: "",
      usedLlm: false,
    },
  };
}

/**
 * Translate a natural-language phrase into a structured `GenerationResult`.
 *
 * @param phrase - Analyst phrase (2–10 words, English).
 * @param deps - Injected dependencies: enum bundle and LLM client.
 * @returns A GenerationResult. Errors populate `.error` — never throws on
 *   normal failure paths. Programmer-error throws from stub clients (e.g.
 *   `createRecordedLLMClient` miss) still propagate.
 */
export async function generateCql2(
  phrase: string,
  deps: GenerateDeps,
): Promise<GenerationResult> {
  const promptVersion = deps.promptVersion ?? PROMPT_VERSION;

  // FR-009: short-circuit empty or whitespace-only phrases — do not call LLM.
  if (phrase.trim().length === 0) {
    return emptyResult(phrase, promptVersion);
  }

  const prompt = buildPrompt(phrase, deps.enums);
  const promptHash = await sha256Hex(prompt);

  const outcome = await deps.client.generate(prompt);

  if (outcome.kind !== "success") {
    return {
      phrase,
      cql2: {},
      lozenges: [],
      unrecognisedTerms: [],
      error: { kind: "transport", outcome },
      diagnostics: {
        promptVersion,
        promptHash,
        responseHash: "",
        usedLlm: true,
      },
    };
  }

  return parseResponse(phrase, outcome.rawResponse, promptHash, promptVersion);
}
