/**
 * Print one corpus phrase's full `GenerationResult` as JSON for evidence
 * inspection (T045). Output is captured into
 * `specs/188-nl-cql2-prompt/evidence/sample-generation-result.json`.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createRecordedLLMClient } from "../src/nl-cql2/clients";
import { generateCql2 } from "../src/nl-cql2/generate";
import { loadEnumBundle } from "../src/nl-cql2/loadEnumBundle";
import type { ResponseMap } from "../src/nl-cql2/types";

function repoRoot(): string {
  if (process.env.DEBRIEF_REPO_ROOT) return process.env.DEBRIEF_REPO_ROOT;
  const here = new URL(import.meta.url).pathname.replace(/^\/([a-zA-Z]:)/, "$1");
  return resolve(here, "..", "..", "..", "..");
}

async function main(): Promise<void> {
  process.env.DEBRIEF_REPO_ROOT = repoRoot();
  const responses = JSON.parse(
    readFileSync(
      resolve(
        repoRoot(),
        "shared",
        "components",
        "src",
        "nl-cql2",
        "__tests__",
        "fixtures",
        "responses.json",
      ),
      "utf-8",
    ),
  ) as ResponseMap;

  const enums = loadEnumBundle();
  const client = createRecordedLLMClient(responses);
  const result = await generateCql2("UK frigates", { enums, client });
  console.log(JSON.stringify(result, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
