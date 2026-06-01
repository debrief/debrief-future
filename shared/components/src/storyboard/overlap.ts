/**
 * Time-range Scene overlap detection (#271).
 *
 * Pure, synchronous, side-effect-free — mirrors `ordering.ts` and
 * `missing-data.ts`. Computes, within a single Storyboard, every pair of
 * *time-range* Scenes whose `[start, end]` windows overlap, and returns a
 * map of `sceneId → partners it overlaps with`. Both the VS Code extension
 * and the web-shell consume this verbatim so the two surfaces cannot drift
 * in what they consider an overlap (spec #271 FR-011).
 *
 * Overlap is **strict interior** overlap (FR-002): windows A and B overlap
 * iff `aStart < bEnd && bStart < aEnd` on epoch-millisecond instants. Two
 * windows that merely touch at a single endpoint (`aEnd === bStart`) are a
 * contiguous handoff — the normal sequential-Scene case — and do NOT
 * overlap. Instant Scenes (`time_range == null`) never participate (FR-006).
 */

import { listScenesOrdered } from "./ordering";
import { isTimeRangeScene } from "./types";
import type { Plot } from "./types";

/** A Scene that a given Scene overlaps with — just what the warning renders. */
export interface OverlapPartner {
  /** The partner Scene's id (used for dismissal pair keys). */
  readonly sceneId: string;
  /** The partner's current title (display). */
  readonly title: string;
}

/**
 * Stable, order-independent key for an unordered Scene pair. Used by hosts
 * to track session-scoped dismissals: `overlapPairKey(a, b) === overlapPairKey(b, a)`.
 */
export function overlapPairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

interface OverlapEntry {
  readonly id: string;
  readonly title: string;
  readonly start: number;
  readonly end: number;
}

function addPartner(
  map: Map<string, OverlapPartner[]>,
  sceneId: string,
  partner: OverlapPartner,
): void {
  const existing = map.get(sceneId);
  if (existing !== undefined) {
    existing.push(partner);
  } else {
    map.set(sceneId, [partner]);
  }
}

/**
 * Pairwise overlap among the time-range Scenes of one Storyboard.
 *
 * @param plot          The plot FeatureCollection.
 * @param storyboardId  Detection is scoped to this Storyboard only (FR-007).
 * @param dismissedPairs Optional set of `overlapPairKey` values to suppress.
 *                       A pair in this set is dropped from both Scenes' lists;
 *                       a Scene whose every overlap is dismissed is absent.
 * @returns sceneId → partners it overlaps with (post-dismissal). A sceneId
 *          absent from the map, or mapped to `[]`, carries no warning.
 *          The result is symmetric: B ∈ result(A) ⇔ A ∈ result(B).
 */
export function detectSceneOverlaps(
  plot: Plot,
  storyboardId: string,
  dismissedPairs?: ReadonlySet<string>,
): ReadonlyMap<string, readonly OverlapPartner[]> {
  // `listScenesOrdered` already scopes to `storyboardId` and orders by
  // (anchor timestamp, creation_order) ascending — deterministic, so the
  // partner lists below come out in a stable order too.
  const entries: OverlapEntry[] = [];
  for (const scene of listScenesOrdered(plot, storyboardId)) {
    if (!isTimeRangeScene(scene)) continue; // instant Scenes excluded (FR-006)
    const start = Date.parse(scene.properties.time_range.start);
    const end = Date.parse(scene.properties.time_range.end);
    // A window we cannot parse to real instants cannot be compared; skip it
    // rather than emit a spurious or crashing comparison.
    if (Number.isNaN(start) || Number.isNaN(end)) continue;
    entries.push({ id: scene.properties.id, title: scene.properties.title, start, end });
  }

  const result = new Map<string, OverlapPartner[]>();
  for (let i = 0; i < entries.length; i += 1) {
    const a = entries[i];
    if (a === undefined) continue;
    for (let j = i + 1; j < entries.length; j += 1) {
      const b = entries[j];
      if (b === undefined) continue;
      // Strict interior overlap (FR-002) — touching endpoints do not count.
      if (a.start < b.end && b.start < a.end) {
        if (dismissedPairs?.has(overlapPairKey(a.id, b.id)) === true) continue;
        addPartner(result, a.id, { sceneId: b.id, title: b.title });
        addPartner(result, b.id, { sceneId: a.id, title: a.title });
      }
    }
  }
  return result;
}
