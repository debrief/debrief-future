/**
 * Core NL → CQL2 generator (#188 T027).
 *
 * Pure function over `deps`; no hidden state. Contract:
 *   - Empty / whitespace-only phrase short-circuits with `usedLlm: false`,
 *     empty CQL2, empty lozenges (FR-009).
 *   - Otherwise: build prompt → call `client.generate` → delegate to
 *     `parseResponse` → return `GenerationResult` (possibly with `error`).
 *   - Never throws on LLM response failures; only throws on construction
 *     errors (e.g. LLM client itself throws).
 */

import { createHash } from "node:crypto";
import { PROMPT_VERSION, buildPrompt } from "./buildPrompt";
import { parseResponse } from "./parseResponse";
import type { GenerateDeps, GenerationResult } from "./types";

function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

function isBlank(phrase: string): boolean {
  return phrase.trim().length === 0;
}

export async function generateCql2(
  phrase: string,
  deps: GenerateDeps,
): Promise<GenerationResult> {
  const promptVersion = deps.promptVersion ?? PROMPT_VERSION;

  if (isBlank(phrase)) {
    // Short-circuit: no LLM call, empty filter.
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

  const prompt = buildPrompt(phrase, deps.enums);
  const promptHash = sha256(prompt);
  const rawResponse = await deps.client.generate(prompt);
  return parseResponse(phrase, rawResponse, promptHash, promptVersion);
}
