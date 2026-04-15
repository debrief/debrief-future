/**
 * Generate interim hand-crafted fixtures for the NL → CQL2 corpus (#188).
 *
 * The final recording will come from #189's transport integration via the
 * `PassthroughLLMClient` + `record-nl-fixtures.ts`. For 188 the mechanism
 * ships with hand-crafted responses so the pipeline is exercised end-to-end
 * in CI. Each entry is schema-valid JSON that matches what a well-behaved
 * model would return.
 *
 * Run with: `pnpm --filter @debrief/components exec tsx scripts/generate-interim-fixtures.ts`
 */

import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildPrompt } from "../src/nl-cql2/buildPrompt";
import { canonicalisePhrase } from "../src/nl-cql2/clients";
import { loadEnumBundle } from "../src/nl-cql2/loadEnumBundle";

function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

interface Seed {
  id: string;
  phrase: string;
  rawResponse: string;
}

/**
 * Hand-crafted raw responses — one per corpus phrase. Each is the exact
 * string a well-behaved LLM would emit for the prompt built from the current
 * enum bundle. The responses are schema-valid and their CQL2 has been
 * authored to match the per-phrase `matchCount` expectation in corpus.json.
 */
const SEEDS: readonly Seed[] = [
  {
    id: "german-ships",
    phrase: "German ships",
    rawResponse: JSON.stringify({
      cql2: {
        op: "a_containedBy",
        args: [["DE"], { property: "debrief:platforms[*].nationality" }],
      },
      lozenges: [{ filterType: "nationality", value: "DE" }],
      unrecognisedTerms: [],
    }),
  },
  {
    id: "surface-fleet",
    phrase: "surface fleet",
    rawResponse: JSON.stringify({
      cql2: {
        op: "array_filter",
        args: [
          { property: "debrief:platforms" },
          { op: "=", args: [{ property: "domain" }, "surface"] },
        ],
      },
      lozenges: [{ filterType: "vessel-class", value: "surface" }],
      unrecognisedTerms: [],
    }),
  },
  {
    id: "carriers",
    phrase: "carriers",
    rawResponse: JSON.stringify({
      cql2: {
        op: "array_filter",
        args: [
          { property: "debrief:platforms" },
          { op: "=", args: [{ property: "vessel_role" }, "carrier"] },
        ],
      },
      lozenges: [{ filterType: "vessel-class", value: "carrier" }],
      unrecognisedTerms: [],
    }),
  },
  {
    id: "type-23-frigates",
    phrase: "Type 23 frigates",
    rawResponse: JSON.stringify({
      cql2: {
        op: "array_filter",
        args: [
          { property: "debrief:platforms" },
          { op: "=", args: [{ property: "vessel_type" }, "type23"] },
        ],
      },
      lozenges: [{ filterType: "vessel-class", value: "type23" }],
      unrecognisedTerms: [],
    }),
  },
  {
    id: "saxon-warrior-exercise",
    phrase: "Saxon Warrior exercise",
    rawResponse: JSON.stringify({
      cql2: {
        op: "like",
        args: [{ property: "title" }, "%Saxon Warrior%"],
      },
      lozenges: [{ filterType: "title", value: "Saxon Warrior" }],
      unrecognisedTerms: [],
    }),
  },
  {
    id: "asw-missions",
    phrase: "anti-submarine warfare",
    rawResponse: JSON.stringify({
      cql2: {
        op: "a_containedBy",
        args: [["ASW"], { property: "debrief:tags" }],
      },
      lozenges: [{ filterType: "tag", value: "ASW" }],
      unrecognisedTerms: [],
    }),
  },
  {
    id: "hms-nelson",
    phrase: "HMS Nelson",
    rawResponse: JSON.stringify({
      cql2: {
        op: "a_containedBy",
        args: [["HMS Nelson"], { property: "debrief:platforms[*].name" }],
      },
      lozenges: [{ filterType: "track-name", value: "HMS Nelson" }],
      unrecognisedTerms: [],
    }),
  },
  {
    id: "uk-frigates",
    phrase: "UK frigates",
    rawResponse: JSON.stringify({
      cql2: {
        op: "array_filter",
        args: [
          { property: "debrief:platforms" },
          {
            op: "and",
            args: [
              { op: "=", args: [{ property: "nationality" }, "GB"] },
              { op: "=", args: [{ property: "vessel_role" }, "frigate"] },
            ],
          },
        ],
      },
      lozenges: [
        { filterType: "nationality", value: "GB" },
        { filterType: "vessel-class", value: "frigate" },
      ],
      unrecognisedTerms: [],
    }),
  },
  {
    id: "klingon-warbirds",
    phrase: "Klingon warbirds",
    rawResponse: JSON.stringify({
      cql2: {},
      lozenges: [],
      unrecognisedTerms: ["klingon", "warbirds"],
    }),
  },
  {
    id: "ruritanian-navy",
    phrase: "Ruritanian navy",
    rawResponse: JSON.stringify({
      cql2: {},
      lozenges: [],
      unrecognisedTerms: ["ruritanian"],
    }),
  },
  {
    id: "uk-warbirds",
    phrase: "UK warbirds",
    rawResponse: JSON.stringify({
      cql2: {
        op: "a_containedBy",
        args: [["GB"], { property: "debrief:platforms[*].nationality" }],
      },
      lozenges: [{ filterType: "nationality", value: "GB" }],
      unrecognisedTerms: ["warbirds"],
    }),
  },
];

function main(): void {
  if (!process.env.DEBRIEF_REPO_ROOT) {
    // Derive from this script's path if the env var is unset outside vitest.
    const here = new URL(import.meta.url).pathname;
    // Strip leading Windows drive slash like /C:/...
    const normalised = here.replace(/^\/([a-zA-Z]:)/, "$1");
    const scriptsDir = resolve(normalised, "..");
    const componentsDir = resolve(scriptsDir, "..");
    const sharedDir = resolve(componentsDir, "..");
    process.env.DEBRIEF_REPO_ROOT = resolve(sharedDir, "..");
  }

  const enums = loadEnumBundle();
  const responses: Record<
    string,
    {
      rawResponse: string;
      promptHash: string;
      recordedAt: string;
      model: string;
    }
  > = {};
  const now = new Date().toISOString();

  for (const seed of SEEDS) {
    const prompt = buildPrompt(seed.phrase, enums);
    const promptHash = sha256(prompt);
    const key = canonicalisePhrase(seed.phrase);
    responses[key] = {
      rawResponse: seed.rawResponse,
      promptHash,
      recordedAt: now,
      model: "hand-crafted-interim-188",
    };
  }

  const outPath = resolve(
    process.env.DEBRIEF_REPO_ROOT,
    "shared",
    "components",
    "src",
    "nl-cql2",
    "__tests__",
    "fixtures",
    "responses.json",
  );
  writeFileSync(outPath, JSON.stringify(responses, null, 2) + "\n", "utf-8");
  console.log(`Wrote ${Object.keys(responses).length} responses to ${outPath}`);
}

main();
