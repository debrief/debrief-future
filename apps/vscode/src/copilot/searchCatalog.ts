/**
 * Client-side STAC catalog search for the Copilot spike (#284, R3).
 *
 * Enumerates the workspace's stores → catalogs → items via the existing
 * `stacService`/`configService`, applies the four optional, AND-combined
 * criteria (free-text, time-interval overlap, platform membership, bbox
 * intersection — FR-004), and projects matches to `PlotMatch` (FR-005). No
 * new Python search API: the extension already reads every field the criteria
 * need, so TS-side filtering is the smallest diff for a spike.
 */

import type { StacItemSummary } from '../types/stac';
import type {
  CopilotToolDeps,
  ConfigStoresLike,
  StacCatalogLike,
} from './deps';
import type { PlotMatch, SearchPlotsInput, TimeSpan } from './types';

/** Cap on list-all / result size so a large catalog never blows context. */
export const SEARCH_RESULT_CAP = 50;

/** Case-insensitive substring test that tolerates undefined haystacks. */
function includesText(haystack: string | undefined, needle: string): boolean {
  return (haystack ?? '').toLowerCase().includes(needle.toLowerCase());
}

/** The searchable free-text blob for an item: title + tags + feature tags. */
function searchableText(item: StacItemSummary): string {
  return [
    item.title,
    ...(item.tags ?? []),
    ...(item.featureTags ?? []),
  ].join(' ');
}

/** Platform display strings for an item (names + ids + types). */
function platformStrings(item: StacItemSummary): string[] {
  const out: string[] = [];
  for (const p of item.platforms ?? []) {
    if (p.name) {
      out.push(p.name);
    }
    if (p.id) {
      out.push(p.id);
    }
    if (p.vessel_type) {
      out.push(p.vessel_type);
    }
    if (p.vessel_role) {
      out.push(p.vessel_role);
    }
  }
  return out;
}

/** The item's time span, preferring the range bounds over the point datetime. */
function itemTimeSpan(item: StacItemSummary): TimeSpan | null {
  const start = item.startDatetime ?? item.datetime ?? null;
  const end = item.endDatetime ?? item.datetime ?? null;
  if (!start || !end) {
    return null;
  }
  return { start, end };
}

/** True when two closed intervals overlap. Open bounds are treated as ±∞. */
function intervalsOverlap(
  aStart: number | null,
  aEnd: number | null,
  bStart: number,
  bEnd: number,
): boolean {
  const lo = aStart ?? Number.NEGATIVE_INFINITY;
  const hi = aEnd ?? Number.POSITIVE_INFINITY;
  return lo <= bEnd && hi >= bStart;
}

/** True when two bboxes `[w, s, e, n]` intersect. */
function bboxesIntersect(
  a: [number, number, number, number],
  b: [number, number, number, number],
): boolean {
  const [aw, as, ae, an] = a;
  const [bw, bs, be, bn] = b;
  return aw <= be && ae >= bw && as <= bn && an >= bs;
}

/** Apply the four criteria to a single item (AND-combination). */
function matchesCriteria(
  item: StacItemSummary,
  input: SearchPlotsInput,
): boolean {
  if (input.text && input.text.trim() !== '') {
    if (!includesText(searchableText(item), input.text.trim())) {
      return false;
    }
  }

  if (input.startTime !== undefined || input.endTime !== undefined) {
    const span = itemTimeSpan(item);
    const itemStart = span ? new Date(span.start).getTime() : null;
    const itemEnd = span ? new Date(span.end).getTime() : null;
    const qStart = input.startTime
      ? new Date(input.startTime).getTime()
      : Number.NEGATIVE_INFINITY;
    const qEnd = input.endTime
      ? new Date(input.endTime).getTime()
      : Number.POSITIVE_INFINITY;
    if (!intervalsOverlap(itemStart, itemEnd, qStart, qEnd)) {
      return false;
    }
  }

  if (input.platforms && input.platforms.length > 0) {
    const haystack = platformStrings(item).map((s) => s.toLowerCase());
    const anyMatch = input.platforms.some((wanted) =>
      haystack.some((p) => p.includes(wanted.toLowerCase())),
    );
    if (!anyMatch) {
      return false;
    }
  }

  if (input.bbox) {
    if (!item.bbox || !bboxesIntersect(item.bbox, input.bbox)) {
      return false;
    }
  }

  return true;
}

/** Project a matching item to the chat-facing `PlotMatch`. */
function toPlotMatch(item: StacItemSummary): PlotMatch {
  return {
    plotId: `stac://${item.storeId}/${item.itemPath}`,
    title: item.title,
    timeSpan: itemTimeSpan(item),
    platforms: platformStrings(item),
    bbox: item.bbox ?? null,
  };
}

/** The applied-criteria description surfaced with an empty result (US1 AC-3). */
export function describeCriteria(input: SearchPlotsInput): string[] {
  const parts: string[] = [];
  if (input.text) {
    parts.push(`text ~ "${input.text}"`);
  }
  if (input.startTime || input.endTime) {
    parts.push(`time ∈ [${input.startTime ?? '−∞'}, ${input.endTime ?? '+∞'}]`);
  }
  if (input.platforms && input.platforms.length > 0) {
    parts.push(`platform ∈ {${input.platforms.join(', ')}}`);
  }
  if (input.bbox) {
    parts.push(`bbox ∩ [${input.bbox.join(', ')}]`);
  }
  if (parts.length === 0) {
    parts.push('none (list all)');
  }
  return parts;
}

/** Enumerate every item across every available store/catalog. */
async function enumerateItems(deps: {
  configService: ConfigStoresLike;
  stacService: StacCatalogLike;
}): Promise<StacItemSummary[]> {
  const all: StacItemSummary[] = [];
  for (const store of deps.configService.getStores()) {
    if (store.status === 'unavailable') {
      continue;
    }
    let catalogs;
    try {
      catalogs = await deps.stacService.listCatalogs(store);
    } catch {
      continue;
    }
    for (const catalog of catalogs) {
      try {
        const items = await deps.stacService.listItems(store, catalog);
        all.push(...items);
      } catch {
        // Skip unreadable catalogs — never fail the whole search.
      }
    }
  }
  return all;
}

/**
 * Run the 4-criteria search over the workspace catalog.
 *
 * @param deps  - injected `configService` + `stacService` seams.
 * @param input - the validated search input (all criteria optional).
 * @returns matching plots, capped at {@link SEARCH_RESULT_CAP}.
 */
export async function searchCatalog(
  deps: Pick<CopilotToolDeps, 'configService' | 'stacService'>,
  input: SearchPlotsInput,
): Promise<PlotMatch[]> {
  const items = await enumerateItems(deps);
  const matches = items
    .filter((item) => matchesCriteria(item, input))
    .map(toPlotMatch);
  return matches.slice(0, SEARCH_RESULT_CAP);
}
