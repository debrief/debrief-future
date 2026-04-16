/**
 * Evidence-capture helper (#188 T039).
 *
 * When `DEBRIEF_CAPTURE_HARNESS_REPORT=1` is set, writes the full harness
 * report (including generated CQL2 per pass — decision 12A) to
 * `specs/188-nl-cql2-prompt/evidence/harness-report.txt`.
 *
 * Skipped under normal test runs; only the evidence-capture workflow sets
 * the env var. The captured file is committed alongside the spec as the
 * reviewable artefact.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "vitest";
import { createRecordedLLMClient } from "../clients";
import { loadEnumBundle } from "./loadEnumBundle";
import type { CorpusRecord, ResponseMap } from "../types";
import { loadSampleCatalog, runHarness, repoRoot } from "./harness";

const SHOULD_RUN = process.env.DEBRIEF_CAPTURE_HARNESS_REPORT === "1";

describe("harness report evidence capture (T039)", () => {
  it.skipIf(!SHOULD_RUN)(
    "writes harness-report.txt to specs/188-nl-cql2-prompt/evidence/",
    async () => {
      const root = repoRoot();
      const corpus = JSON.parse(
        readFileSync(
          resolve(
            root,
            "shared/components/src/nl-cql2/__tests__/fixtures/corpus.json",
          ),
          "utf-8",
        ),
      ) as CorpusRecord[];
      const responses = JSON.parse(
        readFileSync(
          resolve(
            root,
            "shared/components/src/nl-cql2/__tests__/fixtures/responses.json",
          ),
          "utf-8",
        ),
      ) as ResponseMap;
      const enums = loadEnumBundle();
      const catalog = loadSampleCatalog();
      const client = createRecordedLLMClient(responses);

      const report = await runHarness({ corpus, client, enums, catalog });

      const lines: string[] = [];
      lines.push("NL → CQL2 Harness Report");
      lines.push("========================");
      lines.push(`Generated at: ${new Date().toISOString()}`);
      lines.push(`Corpus size: ${corpus.length}`);
      lines.push(`Catalog items: ${catalog.length}`);
      lines.push(`Prompt size: ${report.promptSizeBytes} bytes`);
      lines.push(`Elapsed:     ${report.elapsedMs} ms`);
      lines.push(`Passed:      ${report.passed.length}`);
      lines.push(`Failed:      ${report.failed.length}`);
      lines.push("");
      lines.push("Passes (CQL2 captured per decision 12A)");
      lines.push("----------------------------------------");
      for (const pass of report.passed) {
        lines.push("");
        lines.push(`[${pass.id}] "${pass.phrase}"`);
        lines.push(`  matchCount: ${pass.matchCount}`);
        lines.push(`  cql2: ${JSON.stringify(pass.cql2, null, 2).split("\n").join("\n        ")}`);
      }
      if (report.failed.length > 0) {
        lines.push("");
        lines.push("Failures");
        lines.push("--------");
        for (const fail of report.failed) {
          lines.push("");
          lines.push(`[${fail.id}] "${fail.phrase}"`);
          lines.push(`  reason: ${fail.reason}`);
          lines.push(`  expected: ${JSON.stringify(fail.expected)}`);
          lines.push(
            `  actual: matchCount=${fail.actual.matchCount}, unrec=${JSON.stringify(fail.actual.unrecognisedTerms)}`,
          );
        }
      }
      lines.push("");

      const path = resolve(
        root,
        "specs/188-nl-cql2-prompt/evidence/harness-report.txt",
      );
      writeFileSync(path, lines.join("\n"), "utf-8");
      console.log(`wrote ${path}`);
    },
  );
});
