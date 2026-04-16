/**
 * Corpus regression test (#188 T034).
 *
 * Runs every phrase in `fixtures/corpus.json` through the generator + the
 * recorded fixture LLM client, then evaluates the returned CQL2 against the
 * real sample catalog. A single assertion block enforces three contracts:
 *
 *   1. `report.failed.length === 0` — every phrase produces matching results.
 *   2. `report.promptSizeBytes < 20_480` — SC-004 per decision 15A.
 *   3. `report.elapsedMs < 120_000` — SC-003 ceiling.
 *
 * Failure messages include the generated CQL2 and raw LLM response so
 * regressions are diagnosed without re-running under a debugger.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createRecordedLLMClient } from "../clients";
import { loadEnumBundle } from "./loadEnumBundle";
import type { CorpusRecord, ResponseMap } from "../types";
import { loadSampleCatalog, runHarness, repoRoot } from "./harness";

function loadCorpus(): readonly CorpusRecord[] {
  const path = resolve(
    repoRoot(),
    "shared/components/src/nl-cql2/__tests__/fixtures/corpus.json",
  );
  return JSON.parse(readFileSync(path, "utf-8")) as CorpusRecord[];
}

function loadResponses(): ResponseMap {
  const path = resolve(
    repoRoot(),
    "shared/components/src/nl-cql2/__tests__/fixtures/responses.json",
  );
  return JSON.parse(readFileSync(path, "utf-8")) as ResponseMap;
}

function formatFailures(report: Awaited<ReturnType<typeof runHarness>>): string {
  if (report.failed.length === 0) return "";
  return report.failed
    .map((fail) => {
      const actualCql2 = JSON.stringify(fail.actual.cql2, null, 2);
      const raw = fail.rawResponse
        ? `\n  rawResponse: ${fail.rawResponse}`
        : "";
      return [
        `[${fail.id}] "${fail.phrase}"`,
        `  reason: ${fail.reason}`,
        `  expected: ${JSON.stringify(fail.expected)}`,
        `  actual.matchCount: ${fail.actual.matchCount}`,
        `  actual.unrecognisedTerms: ${JSON.stringify(fail.actual.unrecognisedTerms)}`,
        `  actual.cql2: ${actualCql2}${raw}`,
      ].join("\n");
    })
    .join("\n\n");
}

function formatPasses(report: Awaited<ReturnType<typeof runHarness>>): string {
  return report.passed
    .map(
      (p) =>
        `  [${p.id}] "${p.phrase}" → ${p.matchCount} matches — ${JSON.stringify(p.cql2).slice(0, 120)}`,
    )
    .join("\n");
}

describe("NL → CQL2 corpus regression (T034)", () => {
  it(
    "every corpus phrase matches expected outcome on the sample catalog",
    async () => {
      const corpus = loadCorpus();
      const responses = loadResponses();
      const client = createRecordedLLMClient(responses);
      const enums = loadEnumBundle();
      const catalog = loadSampleCatalog();

      const report = await runHarness({
        corpus,
        client,
        enums,
        catalog,
      });

      if (report.failed.length > 0) {
        throw new Error(
          `Corpus regression: ${report.failed.length} phrase(s) failed.\n\n` +
            formatFailures(report) +
            `\n\nPassed:\n${formatPasses(report)}`,
        );
      }

      // SC-004: prompt size under 20 KB (decision 15A)
      expect(report.promptSizeBytes).toBeLessThan(20_480);
      // SC-003: harness completes under 2 minutes
      expect(report.elapsedMs).toBeLessThan(120_000);
      // Sanity: all 9 corpus phrases made it
      expect(report.passed.length + report.failed.length).toBe(corpus.length);
    },
    // 2 minute timeout matches SC-003
    120_000,
  );
});
