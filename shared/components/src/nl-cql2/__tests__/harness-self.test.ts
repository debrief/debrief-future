/**
 * Harness self-test (#188 T037 / SC-006 / decision 9A).
 *
 * Injects a deliberately malformed response via `createBadLLMClient` and
 * asserts the harness surfaces it as a structured FAIL with reason
 * `malformed-json`. This is the regression signal that protects against a
 * harness that silently passes broken LLM output.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { loadEnumBundle } from "../loadEnumBundle";
import type { CorpusRecord } from "../types";
import { createBadLLMClient } from "./badClient";
import { loadSampleCatalog, runHarness } from "./harness";

function loadCorpus(): readonly CorpusRecord[] {
  const root = process.env.DEBRIEF_REPO_ROOT!;
  return JSON.parse(
    readFileSync(
      resolve(
        root,
        "shared",
        "components",
        "src",
        "nl-cql2",
        "__tests__",
        "fixtures",
        "corpus.json",
      ),
      "utf-8",
    ),
  ) as CorpusRecord[];
}

describe("harness self-test (T037 / SC-006)", () => {
  it("surfaces malformed-json as a structured failure for every phrase when the LLM is broken", async () => {
    const corpus = loadCorpus();
    const enums = loadEnumBundle();
    const catalog = loadSampleCatalog();
    const client = createBadLLMClient("not-valid-json {{{");

    const report = await runHarness(corpus, client, enums, catalog);

    // Every phrase should fail under a bad client.
    expect(report.failed.length).toBe(corpus.length);
    expect(report.passed.length).toBe(0);

    // Failure reason should be `malformed-json` for every phrase (the
    // bad-client response is the same for all).
    for (const f of report.failed) {
      expect(f.reason).toBe("malformed-json");
    }

    // The prompt-size measurement must still happen even when all phrases fail.
    expect(report.promptSizeBytes).toBeGreaterThan(0);
    expect(report.promptSizeBytes).toBeLessThan(20_480);
  });
});
