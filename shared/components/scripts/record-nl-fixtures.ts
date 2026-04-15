/**
 * Fixture-recording script for the NL → CQL2 corpus (#188 T038).
 *
 * Builds the prompt for each corpus phrase, forwards to a caller-supplied
 * LLM transport (e.g. #189's wiring), and writes the raw responses + hashes
 * to `__tests__/fixtures/responses.json`.
 *
 * 188 ships with a hand-crafted interim version of `responses.json` (see
 * `generate-interim-fixtures.ts`). #189 will plug a real transport into
 * this script's `TRANSPORT` slot and re-run to replace the hand-crafted
 * fixtures with real-model recordings.
 *
 * Usage (intended, once #189's transport lands):
 *
 *   export DEBRIEF_REPO_ROOT=...                    # or set by vitest globalSetup
 *   export ANTHROPIC_API_KEY=...                    # or whatever the transport needs
 *   pnpm --filter @debrief/components exec tsx scripts/record-nl-fixtures.ts
 */

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildPrompt } from "../src/nl-cql2/buildPrompt";
import { canonicalisePhrase, createPassthroughLLMClient } from "../src/nl-cql2/clients";
import { loadEnumBundle } from "../src/nl-cql2/loadEnumBundle";
import type { CorpusRecord, LLMClient, RecordedResponse } from "../src/nl-cql2/types";

function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

function repoRoot(): string {
  const root = process.env.DEBRIEF_REPO_ROOT;
  if (root) return root;
  // Fall back to walking up from this script.
  const here = new URL(import.meta.url).pathname.replace(/^\/([a-zA-Z]:)/, "$1");
  return resolve(here, "..", "..", "..", "..");
}

function fixturesPath(name: string): string {
  return resolve(
    repoRoot(),
    "shared",
    "components",
    "src",
    "nl-cql2",
    "__tests__",
    "fixtures",
    name,
  );
}

/**
 * TRANSPORT SLOT — replace this with a real implementation in #189.
 *
 * Must return a fully-formed `{cql2, lozenges, unrecognisedTerms}` JSON
 * string. For #189 this will delegate to Anthropic SDK / local proxy / etc.
 */
async function realTransport(_prompt: string): Promise<string> {
  throw new Error(
    "record-nl-fixtures: no real transport wired yet. #189 will replace " +
      "this stub with a concrete LLM client. For 188, use " +
      "`scripts/generate-interim-fixtures.ts` to produce hand-crafted " +
      "fixtures.",
  );
}

async function main(): Promise<void> {
  process.env.DEBRIEF_REPO_ROOT = repoRoot();

  const corpus = JSON.parse(
    readFileSync(fixturesPath("corpus.json"), "utf-8"),
  ) as CorpusRecord[];
  const enums = loadEnumBundle();
  const client: LLMClient = createPassthroughLLMClient(realTransport);

  const now = new Date().toISOString();
  const responses: Record<string, RecordedResponse> = {};

  for (const record of corpus) {
    const prompt = buildPrompt(record.phrase, enums);
    const rawResponse = await client.generate(prompt);
    const key = canonicalisePhrase(record.phrase);
    responses[key] = {
      rawResponse,
      promptHash: sha256(prompt),
      recordedAt: now,
      model: process.env.DEBRIEF_LLM_MODEL ?? "unknown",
    };
    console.log(`recorded ${record.id} (${record.phrase})`);
  }

  writeFileSync(
    fixturesPath("responses.json"),
    JSON.stringify(responses, null, 2) + "\n",
    "utf-8",
  );
  console.log(`wrote ${Object.keys(responses).length} responses`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
