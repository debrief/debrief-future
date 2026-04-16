/**
 * Fixture-rehashing helper test (#188 T038 support).
 *
 * Gated by the `DEBRIEF_REHASH_NL_FIXTURES` environment variable so it runs
 * only during the dedicated maintenance step — not on every CI invocation.
 *
 * When the env var is set:
 *   - Loads the current enum bundle + corpus.
 *   - Recomputes `promptHash` for every corpus phrase against the current
 *     `buildPrompt` template.
 *   - Writes the updated hashes back to `responses.json`, leaving
 *     `rawResponse` bodies untouched.
 *
 * When the env var is NOT set, the test no-ops (skipped with a reason).
 *
 * Ships under `__tests__/` so it does not appear in `dist/` and has zero
 * production cost (decision 13A).
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "vitest";
import { buildPrompt } from "../buildPrompt";
import { loadEnumBundle } from "./loadEnumBundle";
import { sha256Hex, canonicalisePhrase } from "../hash";
import type { CorpusRecord, RecordedResponse } from "../types";

const SHOULD_RUN = process.env.DEBRIEF_REHASH_NL_FIXTURES === "1";

describe("NL → CQL2 fixture rehash", () => {
  it.skipIf(!SHOULD_RUN)(
    "recomputes promptHash for every corpus entry",
    async () => {
      const repoRoot = process.env.DEBRIEF_REPO_ROOT!;
      const fixturesDir = resolve(
        repoRoot,
        "shared/components/src/nl-cql2/__tests__/fixtures",
      );
      const corpusPath = resolve(fixturesDir, "corpus.json");
      const responsesPath = resolve(fixturesDir, "responses.json");

      const corpus = JSON.parse(
        readFileSync(corpusPath, "utf-8"),
      ) as CorpusRecord[];
      const responses = JSON.parse(
        readFileSync(responsesPath, "utf-8"),
      ) as Record<string, RecordedResponse>;
      const enums = loadEnumBundle(repoRoot);

      let updated = 0;
      for (const record of corpus) {
        const key = canonicalisePhrase(record.phrase);
        const entry = responses[key];
        if (!entry) {
          throw new Error(`no response for "${record.phrase}" (key "${key}")`);
        }
        const prompt = buildPrompt(record.phrase, enums);
        const hash = await sha256Hex(prompt);
        if (entry.promptHash !== hash) {
          responses[key] = { ...entry, promptHash: hash };
          updated += 1;
          console.log(`  ${key} → ${hash.slice(0, 12)}…`);
        }
      }
      writeFileSync(
        responsesPath,
        JSON.stringify(responses, null, 2) + "\n",
        "utf-8",
      );
      console.log(`rehashed ${updated} entries`);
    },
  );
});
