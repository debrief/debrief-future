/**
 * Fixture-maintenance script for the NL → CQL2 corpus (#188 T038).
 *
 * Re-computes the `promptHash` for every entry in
 * `src/nl-cql2/__tests__/fixtures/responses.json` using the current prompt
 * template + enum bundle. `rawResponse` bodies are left untouched — this
 * script only updates the hash so fixtures stay valid across prompt-template
 * tweaks.
 *
 * Usage (from `shared/components/`):
 *
 *   npx tsx scripts/rehash-nl-fixtures.ts
 *
 * Or from the repo root:
 *
 *   pnpm --filter @debrief/components exec tsx scripts/rehash-nl-fixtures.ts
 *
 * The script is idempotent: running it when hashes are already current is a
 * no-op (it rewrites the file with the same content).
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildPrompt } from "../src/nl-cql2/buildPrompt.ts";
import { loadEnumBundle } from "../src/nl-cql2/__tests__/loadEnumBundle.ts";
import { sha256Hex } from "../src/nl-cql2/hash.ts";
import type { CorpusRecord, RecordedResponse } from "../src/nl-cql2/types.ts";

function findRepoRoot(startDir: string): string {
  const fs = require("node:fs") as typeof import("node:fs");
  let current = resolve(startDir);
  for (let i = 0; i < 10; i++) {
    if (fs.existsSync(resolve(current, "pnpm-workspace.yaml"))) {
      return current;
    }
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  throw new Error(`Could not find pnpm-workspace.yaml starting from ${startDir}`);
}

async function main(): Promise<void> {
  const scriptDir = dirname(fileURLToPath(import.meta.url));
  const repoRoot = findRepoRoot(scriptDir);
  process.env.DEBRIEF_REPO_ROOT = repoRoot;

  const fixturesDir = resolve(
    repoRoot,
    "shared/components/src/nl-cql2/__tests__/fixtures",
  );
  const corpusPath = resolve(fixturesDir, "corpus.json");
  const responsesPath = resolve(fixturesDir, "responses.json");

  const corpus = JSON.parse(readFileSync(corpusPath, "utf-8")) as CorpusRecord[];
  const responses = JSON.parse(readFileSync(responsesPath, "utf-8")) as Record<
    string,
    RecordedResponse
  >;

  const enums = loadEnumBundle(repoRoot);

  let updated = 0;
  const missing: string[] = [];
  for (const record of corpus) {
    const key = record.phrase.trim().toLowerCase().replace(/\s+/g, " ");
    const entry = responses[key];
    if (!entry) {
      missing.push(`missing response for phrase "${record.phrase}" (key: "${key}")`);
      continue;
    }
    const prompt = buildPrompt(record.phrase, enums);
    const hash = await sha256Hex(prompt);
    if (entry.promptHash !== hash) {
      responses[key] = { ...entry, promptHash: hash };
      updated += 1;
      console.log(`  updated hash for "${record.phrase}" → ${hash.slice(0, 12)}…`);
    }
  }

  if (missing.length > 0) {
    console.error("Missing responses:");
    for (const m of missing) console.error(`  - ${m}`);
    process.exitCode = 1;
    return;
  }

  writeFileSync(responsesPath, JSON.stringify(responses, null, 2) + "\n", "utf-8");
  console.log(
    `Done. ${updated} entries updated. Wrote ${responsesPath}.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
