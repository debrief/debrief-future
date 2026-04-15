/**
 * One-shot harness runner that prints a formatted report to stdout.
 *
 * Captured output is committed to `specs/188-nl-cql2-prompt/evidence/harness-report.txt`
 * (T039). The report includes CQL2 on PASS per decision 12A so re-record
 * reviews can eyeball drift.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createRecordedLLMClient } from "../src/nl-cql2/clients";
import { loadEnumBundle } from "../src/nl-cql2/loadEnumBundle";
import { loadSampleCatalog, runHarness } from "../src/nl-cql2/__tests__/harness";
import type { CorpusRecord, ResponseMap } from "../src/nl-cql2/types";

function repoRoot(): string {
  if (process.env.DEBRIEF_REPO_ROOT) return process.env.DEBRIEF_REPO_ROOT;
  const here = new URL(import.meta.url).pathname.replace(/^\/([a-zA-Z]:)/, "$1");
  return resolve(here, "..", "..", "..", "..");
}

async function main(): Promise<void> {
  process.env.DEBRIEF_REPO_ROOT = repoRoot();

  const fixtureDir = resolve(
    repoRoot(),
    "shared",
    "components",
    "src",
    "nl-cql2",
    "__tests__",
    "fixtures",
  );
  const corpus = JSON.parse(
    readFileSync(resolve(fixtureDir, "corpus.json"), "utf-8"),
  ) as CorpusRecord[];
  const responses = JSON.parse(
    readFileSync(resolve(fixtureDir, "responses.json"), "utf-8"),
  ) as ResponseMap;

  const enums = loadEnumBundle();
  const catalog = loadSampleCatalog();
  const client = createRecordedLLMClient(responses);
  const report = await runHarness(corpus, client, enums, catalog);

  console.log("NL → CQL2 Harness Report");
  console.log("=========================");
  console.log(`corpus size     : ${corpus.length}`);
  console.log(`passed          : ${report.passed.length}`);
  console.log(`failed          : ${report.failed.length}`);
  console.log(`elapsedMs       : ${report.elapsedMs}`);
  console.log(`promptSizeBytes : ${report.promptSizeBytes} (ceiling 20480)`);
  console.log("");
  console.log("PASS");
  console.log("----");
  for (const p of report.passed) {
    console.log(`  ${p.id.padEnd(28)} matchCount=${p.matchCount}`);
    console.log(`    phrase : ${p.phrase}`);
    console.log(`    cql2   : ${JSON.stringify(p.cql2)}`);
  }
  if (report.failed.length > 0) {
    console.log("");
    console.log("FAIL");
    console.log("----");
    for (const f of report.failed) {
      console.log(`  ${f.id}  reason=${f.reason}`);
      console.log(`    expected: ${JSON.stringify(f.expected)}`);
      console.log(`    actual  : ${JSON.stringify(f.actual)}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
