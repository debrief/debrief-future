/**
 * Test-only harness and sample-catalog loader for the NL → CQL2 corpus
 * regression suite (#188 T030 / T031).
 *
 * Lives under `__tests__/` per decision 13A — not exported from the public
 * barrel, not shipped in dist/.
 */

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { buildPrompt } from "../buildPrompt";
import { filterByCql2Json } from "../../filter-engine";
import { generateCql2 } from "../generate";
import type {
  CorpusRecord,
  EnumBundle,
  HarnessFail,
  HarnessPass,
  HarnessReport,
  LLMClient,
  StacBrowserItem,
} from "../types";
import type { PlatformRecord } from "../../filter-engine";

interface RawStacItem {
  readonly id: string;
  readonly properties: {
    readonly title: string;
    readonly datetime: string | null;
    readonly start_datetime?: string | null;
    readonly end_datetime?: string | null;
    readonly "debrief:platforms"?: readonly PlatformRecord[];
    readonly "debrief:tags"?: readonly string[];
    readonly "debrief:feature_tags"?: readonly string[];
    readonly "debrief:author"?: string | null;
  };
  readonly bbox: readonly [number, number, number, number] | null;
  readonly collection?: string;
}

interface RawCatalog {
  readonly links: readonly { readonly rel: string; readonly href: string }[];
}

function repoRoot(): string {
  const root = process.env.DEBRIEF_REPO_ROOT;
  if (!root) {
    throw new Error(
      "DEBRIEF_REPO_ROOT not set — vitest globalSetup must run before harness.ts",
    );
  }
  return root;
}

function itemFromJson(raw: RawStacItem): StacBrowserItem {
  const p = raw.properties;
  return {
    id: raw.id,
    title: p.title,
    itemPath: `${raw.id}/item.json`,
    bbox: raw.bbox ? [raw.bbox[0], raw.bbox[1], raw.bbox[2], raw.bbox[3]] : null,
    datetime: p.datetime,
    startDatetime: p.start_datetime ?? null,
    endDatetime: p.end_datetime ?? null,
    platforms: p["debrief:platforms"] ?? [],
    tags: p["debrief:tags"] ?? [],
    featureTags: p["debrief:feature_tags"] ?? [],
    author: p["debrief:author"] ?? null,
    collection: raw.collection ?? null,
    modified: null,
  };
}

/**
 * Load the sample catalog at `${DEBRIEF_REPO_ROOT}/preview/workspace/samples/local-store/`.
 * Returns every item referenced by the root `catalog.json`, parsed into
 * `StacBrowserItem[]` shape. Cached for the test-run lifetime.
 */
let cachedCatalog: readonly StacBrowserItem[] | null = null;
export function loadSampleCatalog(): readonly StacBrowserItem[] {
  if (cachedCatalog) return cachedCatalog;
  const catalogPath = resolve(
    repoRoot(),
    "preview",
    "workspace",
    "samples",
    "local-store",
    "catalog.json",
  );
  const root = JSON.parse(readFileSync(catalogPath, "utf-8")) as RawCatalog;
  const baseDir = dirname(catalogPath);
  const items: StacBrowserItem[] = [];
  for (const link of root.links) {
    if (link.rel !== "item") continue;
    const itemPath = resolve(baseDir, link.href);
    const raw = JSON.parse(readFileSync(itemPath, "utf-8")) as RawStacItem;
    items.push(itemFromJson(raw));
  }
  cachedCatalog = items;
  return items;
}

// -----------------------------------------------------------------------------
// runHarness
// -----------------------------------------------------------------------------

function sameSet(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(a.map((s) => s.toLowerCase()));
  for (const v of b) if (!set.has(v.toLowerCase())) return false;
  return true;
}

/**
 * Per-phrase harness: call `generateCql2`, filter the catalog via the
 * generated CQL2, and compare against the corpus expectation.
 *
 * Returns a typed `HarnessReport`. CQL2 is retained on PASS (decision 12A)
 * so re-record reviews can eyeball drift even when counts still match.
 */
export async function runHarness(
  corpus: readonly CorpusRecord[],
  client: LLMClient,
  enums: EnumBundle,
  catalog: readonly StacBrowserItem[],
): Promise<HarnessReport> {
  const start = Date.now();
  const passed: HarnessPass[] = [];
  const failed: HarnessFail[] = [];
  let promptSizeBytes = 0;

  for (let i = 0; i < corpus.length; i += 1) {
    const record = corpus[i];
    if (!record) continue;

    // Measure prompt size once, on the first phrase (SC-004 reference).
    if (i === 0) {
      promptSizeBytes = Buffer.byteLength(buildPrompt(record.phrase, enums), "utf-8");
    }

    let result;
    try {
      result = await generateCql2(record.phrase, { enums, client });
    } catch (e) {
      failed.push({
        id: record.id,
        phrase: record.phrase,
        reason: `client-threw: ${(e as Error).message}`,
        expected: record.expected,
        actual: { cql2: null, matchCount: null, unrecognisedTerms: [] },
      });
      continue;
    }

    // Generator-reported errors are always failures.
    if (result.error) {
      failed.push({
        id: record.id,
        phrase: record.phrase,
        reason: result.error.reason,
        expected: record.expected,
        actual: {
          cql2: result.cql2,
          matchCount: null,
          unrecognisedTerms: result.unrecognisedTerms,
        },
        rawResponse: result.error.rawResponse,
      });
      continue;
    }

    // Compare matchCount against the catalog when expected is non-null.
    let matchCount: number | null = null;
    let matchedIds: string[] = [];
    try {
      const matched = filterByCql2Json(catalog, result.cql2);
      matchCount = matched.length;
      matchedIds = matched.map((m) => m.id);
    } catch (e) {
      failed.push({
        id: record.id,
        phrase: record.phrase,
        reason: `filter-threw: ${(e as Error).message}`,
        expected: record.expected,
        actual: {
          cql2: result.cql2,
          matchCount: null,
          unrecognisedTerms: result.unrecognisedTerms,
        },
      });
      continue;
    }

    const expected = record.expected;

    // Unrecognised-term expectation
    if (expected.unrecognisedTerms !== undefined) {
      if (!sameSet(result.unrecognisedTerms, expected.unrecognisedTerms)) {
        failed.push({
          id: record.id,
          phrase: record.phrase,
          reason: "unrecognised-terms-mismatch",
          expected,
          actual: {
            cql2: result.cql2,
            matchCount,
            unrecognisedTerms: result.unrecognisedTerms,
          },
        });
        continue;
      }
    }

    // matchCount expectation (null means "do not assert on count")
    if (expected.matchCount !== null) {
      if (matchCount !== expected.matchCount) {
        failed.push({
          id: record.id,
          phrase: record.phrase,
          reason: "match-count-mismatch",
          expected,
          actual: {
            cql2: result.cql2,
            matchCount,
            unrecognisedTerms: result.unrecognisedTerms,
          },
        });
        continue;
      }
    }

    // matchIds expectation (set equality)
    if (expected.matchIds !== undefined) {
      if (!sameSet(matchedIds, expected.matchIds)) {
        failed.push({
          id: record.id,
          phrase: record.phrase,
          reason: "match-ids-mismatch",
          expected,
          actual: {
            cql2: result.cql2,
            matchCount,
            unrecognisedTerms: result.unrecognisedTerms,
          },
        });
        continue;
      }
    }

    passed.push({
      id: record.id,
      phrase: record.phrase,
      cql2: result.cql2,
      matchCount: matchCount ?? 0,
    });
  }

  return {
    passed,
    failed,
    elapsedMs: Date.now() - start,
    promptSizeBytes,
  };
}
