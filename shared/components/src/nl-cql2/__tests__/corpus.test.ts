/**
 * Corpus regression test (#188 T034).
 *
 * Runs every phrase in `fixtures/corpus.json` through the generator +
 * `RecordedLLMClient`, asserts the harness report contains zero failures,
 * and enforces the SC-003 / SC-004 ceilings. Failures are formatted into
 * the vitest error message so the CI log surfaces the offending phrase
 * without needing a re-run.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createRecordedLLMClient } from "../clients";
import { loadEnumBundle } from "../loadEnumBundle";
import type { CorpusRecord, ResponseMap } from "../types";
import { loadSampleCatalog, runHarness } from "./harness";

function fixturePath(name: string): string {
  const root = process.env.DEBRIEF_REPO_ROOT;
  if (!root) throw new Error("DEBRIEF_REPO_ROOT not set");
  return resolve(
    root,
    "shared",
    "components",
    "src",
    "nl-cql2",
    "__tests__",
    "fixtures",
    name,
  );
}

function loadCorpus(): readonly CorpusRecord[] {
  return JSON.parse(readFileSync(fixturePath("corpus.json"), "utf-8")) as CorpusRecord[];
}

function loadResponses(): ResponseMap {
  return JSON.parse(readFileSync(fixturePath("responses.json"), "utf-8")) as ResponseMap;
}

function formatFailures(failures: Readonly<unknown[]>): string {
  if (failures.length === 0) return "";
  return "\n" + JSON.stringify(failures, null, 2);
}

describe("NL → CQL2 corpus regression (T034 / SC-003 / SC-004)", () => {
  it("all corpus phrases pass; prompt size and wall time stay under the spec ceilings", async () => {
    const corpus = loadCorpus();
    const responses = loadResponses();
    const enums = loadEnumBundle();
    const catalog = loadSampleCatalog();
    const client = createRecordedLLMClient(responses);

    const report = await runHarness(corpus, client, enums, catalog);

    // Assertion block per decision 15A — include the failures in the message
    // so CI output grep-friendly.
    expect(
      report.failed.length,
      `harness failures:${formatFailures(report.failed)}`,
    ).toBe(0);

    // SC-004: prompt size ceiling
    expect(report.promptSizeBytes).toBeLessThan(20_480);

    // SC-003: wall time ceiling (120 seconds)
    expect(report.elapsedMs).toBeLessThan(120_000);

    // Sanity: every corpus phrase was reached
    expect(report.passed.length).toBe(corpus.length);
  });
});
