/**
 * Evidence-capture helper (#188 T045).
 *
 * When `DEBRIEF_CAPTURE_SAMPLE_RESULT=1` is set, generates the
 * `GenerationResult` for the "UK submarines" corpus phrase and writes it to
 * `specs/188-nl-cql2-prompt/evidence/sample-generation-result.json`.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "vitest";
import { createRecordedLLMClient } from "../clients";
import { loadEnumBundle } from "./loadEnumBundle";
import { generateCql2 } from "../generate";
import type { ResponseMap } from "../types";
import { repoRoot } from "./harness";

const SHOULD_RUN = process.env.DEBRIEF_CAPTURE_SAMPLE_RESULT === "1";

describe("sample GenerationResult capture (T045)", () => {
  it.skipIf(!SHOULD_RUN)(
    "writes sample-generation-result.json",
    async () => {
      const root = repoRoot();
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
      const client = createRecordedLLMClient(responses);

      const result = await generateCql2("UK submarines", { enums, client });

      const outPath = resolve(
        root,
        "specs/188-nl-cql2-prompt/evidence/sample-generation-result.json",
      );
      writeFileSync(outPath, JSON.stringify(result, null, 2) + "\n", "utf-8");
      console.log(`wrote ${outPath}`);
    },
  );
});
