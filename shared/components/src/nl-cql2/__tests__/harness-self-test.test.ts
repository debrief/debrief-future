/**
 * Harness self-test (#188 T037, decision 9A).
 *
 * Proves the regression signal works: when the LLM returns garbage, the
 * harness reports at least one failure with a readable reason. Without this
 * test the claim "the harness detects broken prompts" is unverified — SC-006.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { loadEnumBundle } from "./loadEnumBundle";
import type { CorpusRecord } from "../types";
import { createBadLLMClient } from "./badClient";
import { loadSampleCatalog, repoRoot, runHarness } from "./harness";

function loadCorpus(): readonly CorpusRecord[] {
  return JSON.parse(
    readFileSync(
      resolve(
        repoRoot(),
        "shared/components/src/nl-cql2/__tests__/fixtures/corpus.json",
      ),
      "utf-8",
    ),
  ) as CorpusRecord[];
}

describe("harness self-test (T037 / SC-006)", () => {
  it("flags malformed JSON responses as failures", async () => {
    const corpus = loadCorpus();
    const enums = loadEnumBundle();
    const catalog = loadSampleCatalog();
    const badClient = createBadLLMClient("this is not JSON at all {{");

    const report = await runHarness({
      corpus,
      client: badClient,
      enums,
      catalog,
    });

    expect(report.failed.length).toBeGreaterThan(0);
    const hasMalformed = report.failed.some(
      (f) => f.reason === "malformed-json",
    );
    expect(hasMalformed).toBe(true);
    // No passes when every response is garbage
    expect(report.passed).toHaveLength(0);
  });

  it("flags schema violations when the response is valid JSON but wrong shape", async () => {
    const corpus = loadCorpus();
    const enums = loadEnumBundle();
    const catalog = loadSampleCatalog();
    // Valid JSON, but missing required `lozenges` + `unrecognised_terms`.
    const badClient = createBadLLMClient(JSON.stringify({ cql2: {} }));

    const report = await runHarness({
      corpus,
      client: badClient,
      enums,
      catalog,
    });

    expect(report.failed.length).toBeGreaterThan(0);
    const hasSchema = report.failed.some(
      (f) => f.reason === "schema-violation",
    );
    expect(hasSchema).toBe(true);
  });

  it("flags cql2-evaluation-failed when CQL2 uses an unsupported operator", async () => {
    const corpus = loadCorpus();
    const enums = loadEnumBundle();
    const catalog = loadSampleCatalog();
    const badClient = createBadLLMClient(
      JSON.stringify({
        cql2: { op: "unsupported_op", args: [] },
        lozenges: [],
        unrecognised_terms: [],
      }),
    );

    const report = await runHarness({
      corpus,
      client: badClient,
      enums,
      catalog,
    });

    expect(report.failed.length).toBeGreaterThan(0);
    const hasCql2Failure = report.failed.some(
      (f) => f.reason === "cql2-evaluation-failed",
    );
    expect(hasCql2Failure).toBe(true);
  });
});
