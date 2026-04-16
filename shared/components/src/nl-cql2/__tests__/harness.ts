/**
 * Headless regression harness for the NL → CQL2 generator (#188 US2).
 *
 * Test-only: lives under `__tests__/` so it is not shipped in `dist/`
 * (decision 13A). Imports from the production module via the barrel.
 *
 * Loads the real sample catalog from
 * `${DEBRIEF_REPO_ROOT}/preview/workspace/samples/local-store/` so changes to
 * the catalog surface as harness failures (a desirable signal per the spec's
 * acknowledged maintenance cost).
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type {
  CorpusRecord,
  EnumBundle,
  HarnessFail,
  HarnessPass,
  HarnessReport,
  LLMClient,
  StacBrowserItem,
  RunHarnessDeps,
} from "../types";
import {
  filterByCql2Json,
  vesselClassTreeToTaxonomy,
} from "../../filter-engine";
import type { FilterEngineConfig } from "../../filter-engine";
import { buildPrompt } from "../buildPrompt";
import { generateCql2 } from "../generate";

interface CatalogLink {
  rel?: string;
  href?: string;
  type?: string;
}

interface Cql2JsonLike {
  [key: string]: unknown;
}

/** Resolve the repo root, preferring DEBRIEF_REPO_ROOT (set by globalSetup). */
export function repoRoot(): string {
  const envRoot = process.env.DEBRIEF_REPO_ROOT;
  if (!envRoot) {
    throw new Error(
      `[nl-cql2/harness] DEBRIEF_REPO_ROOT is not set. Vitest globalSetup ` +
        `should populate it.`,
    );
  }
  return envRoot;
}

/**
 * Parse a raw STAC item JSON into the `StacBrowserItem` shape the filter
 * engine expects. Keys are mapped from snake_case (STAC/Debrief extension) to
 * the camelCase the filter engine uses.
 */
function stacItemToBrowserItem(
  raw: Record<string, unknown>,
  itemPath: string,
): StacBrowserItem {
  const props = (raw.properties as Record<string, unknown>) ?? {};
  const platforms = Array.isArray(props["debrief:platforms"])
    ? (props["debrief:platforms"] as StacBrowserItem["platforms"])
    : [];
  const tags = Array.isArray(props["debrief:tags"])
    ? (props["debrief:tags"] as readonly string[])
    : [];
  const featureTags = Array.isArray(props["debrief:feature_tags"])
    ? (props["debrief:feature_tags"] as readonly string[])
    : [];
  const bboxValue = Array.isArray(raw.bbox) && raw.bbox.length === 4
    ? (raw.bbox as unknown as [number, number, number, number])
    : null;
  return {
    id: String(raw.id ?? ""),
    title: typeof props.title === "string" ? props.title : "",
    itemPath,
    bbox: bboxValue,
    datetime: typeof props.datetime === "string" ? props.datetime : null,
    startDatetime:
      typeof props.start_datetime === "string" ? props.start_datetime : null,
    endDatetime:
      typeof props.end_datetime === "string" ? props.end_datetime : null,
    platforms,
    tags,
    featureTags,
    author:
      typeof props["debrief:author"] === "string"
        ? (props["debrief:author"] as string)
        : null,
    collection:
      typeof raw.collection === "string" ? (raw.collection as string) : null,
    modified:
      typeof props.updated === "string" ? (props.updated as string) : null,
  };
}

/**
 * Load the sample catalog from `preview/workspace/samples/local-store/`.
 */
export function loadSampleCatalog(): StacBrowserItem[] {
  const storeDir = resolve(repoRoot(), "preview/workspace/samples/local-store");
  const catalogPath = resolve(storeDir, "catalog.json");
  const catalog = JSON.parse(readFileSync(catalogPath, "utf-8")) as {
    links?: CatalogLink[];
  };
  const links = catalog.links ?? [];
  const items: StacBrowserItem[] = [];
  for (const link of links) {
    if (link.rel !== "item" || typeof link.href !== "string") continue;
    const relHref = link.href.replace(/^\.\//, "");
    const itemPath = resolve(storeDir, relHref);
    let raw: Record<string, unknown>;
    try {
      raw = JSON.parse(readFileSync(itemPath, "utf-8")) as Record<string, unknown>;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(
        `[nl-cql2/harness] failed to load item at ${itemPath}: ${message}`,
      );
    }
    items.push(stacItemToBrowserItem(raw, itemPath));
  }
  return items;
}

/** Reports match counts and IDs from the filter-engine evaluation. */
function evaluateCql2(
  cql2: Cql2JsonLike,
  catalog: readonly StacBrowserItem[],
  config: FilterEngineConfig,
): { count: number; ids: string[] } {
  const filtered = filterByCql2Json(catalog, cql2, config);
  return {
    count: filtered.length,
    ids: filtered.map((i) => i.id),
  };
}

function setsEqual(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const aSet = new Set(a);
  for (const x of b) if (!aSet.has(x)) return false;
  return true;
}

/**
 * Run the harness against a corpus. Returns a typed report; never throws on
 * corpus failures (they populate `report.failed` instead). Transport-level
 * errors (e.g. RecordedLLMClient fixture miss) surface as a fail entry with a
 * `transport-error` reason rather than blowing up the whole run.
 */
export async function runHarness(
  depsOrCorpus:
    | RunHarnessDeps
    | readonly CorpusRecord[],
  client?: LLMClient,
  enums?: EnumBundle,
  catalog?: readonly StacBrowserItem[],
): Promise<HarnessReport> {
  const deps: RunHarnessDeps = Array.isArray(depsOrCorpus)
    ? {
        corpus: depsOrCorpus as readonly CorpusRecord[],
        client: client!,
        enums: enums!,
        catalog: catalog!,
      }
    : (depsOrCorpus as RunHarnessDeps);

  const filterConfig: FilterEngineConfig =
    deps.filterConfig ?? {
      taxonomy: vesselClassTreeToTaxonomy(deps.enums.vessel_class_tree),
    };

  const start = Date.now();
  const passed: HarnessPass[] = [];
  const failed: HarnessFail[] = [];

  // Capture prompt size once (for SC-004 assertion — it depends only on the
  // enum set, not on the phrase).
  const samplePrompt = buildPrompt("sample phrase", deps.enums);
  const promptSizeBytes = Buffer.byteLength(samplePrompt, "utf-8");

  for (const record of deps.corpus) {
    let result: Awaited<ReturnType<typeof generateCql2>>;
    try {
      result = await generateCql2(record.phrase, {
        enums: deps.enums,
        client: deps.client,
        promptVersion: deps.promptVersion,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      failed.push({
        id: record.id,
        phrase: record.phrase,
        reason: `transport-error: ${message}`,
        expected: record.expected,
        actual: {
          cql2: null,
          matchCount: null,
          unrecognisedTerms: [],
        },
      });
      continue;
    }

    if (result.error) {
      failed.push({
        id: record.id,
        phrase: record.phrase,
        reason: result.error.reason,
        expected: record.expected,
        actual: {
          cql2: null,
          matchCount: null,
          unrecognisedTerms: result.unrecognisedTerms,
        },
        rawResponse: result.error.rawResponse,
      });
      continue;
    }

    // Unrecognised-term assertion (decision 4A)
    if (record.expected.unrecognisedTerms !== undefined) {
      if (
        !setsEqual(result.unrecognisedTerms, record.expected.unrecognisedTerms)
      ) {
        failed.push({
          id: record.id,
          phrase: record.phrase,
          reason: "unrecognised-terms-mismatch",
          expected: record.expected,
          actual: {
            cql2: result.cql2,
            matchCount: null,
            unrecognisedTerms: result.unrecognisedTerms,
          },
        });
        continue;
      }
    }

    // Evaluate CQL2 against catalog
    let evaluation: { count: number; ids: string[] };
    try {
      evaluation = evaluateCql2(result.cql2, deps.catalog, filterConfig);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      failed.push({
        id: record.id,
        phrase: record.phrase,
        reason: `cql2-evaluation-failed: ${message}`,
        expected: record.expected,
        actual: {
          cql2: result.cql2,
          matchCount: null,
          unrecognisedTerms: result.unrecognisedTerms,
        },
      });
      continue;
    }

    // Match-count check (skipped when matchCount is null)
    if (record.expected.matchCount !== null) {
      if (evaluation.count !== record.expected.matchCount) {
        failed.push({
          id: record.id,
          phrase: record.phrase,
          reason: "match-count-mismatch",
          expected: record.expected,
          actual: {
            cql2: result.cql2,
            matchCount: evaluation.count,
            unrecognisedTerms: result.unrecognisedTerms,
          },
        });
        continue;
      }
    }

    // Optional matchIds set assertion
    if (record.expected.matchIds !== undefined) {
      if (!setsEqual(evaluation.ids, record.expected.matchIds)) {
        failed.push({
          id: record.id,
          phrase: record.phrase,
          reason: "match-ids-mismatch",
          expected: record.expected,
          actual: {
            cql2: result.cql2,
            matchCount: evaluation.count,
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
      matchCount: evaluation.count,
    });
  }

  return {
    passed,
    failed,
    elapsedMs: Date.now() - start,
    promptSizeBytes,
  };
}
