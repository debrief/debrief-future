/**
 * Plot-open migration hook.
 *
 * Storyboard `schema_version` starts at 1; the v1 migration is a no-op. The
 * hook is wired so future schema versions can register migrations without
 * touching the load path (FR-MODULE-019 / SC-007).
 *
 * Migrations chain by target version. A registry is `Map<number, MigrationFn>`
 * keyed by the target `schema_version`. Each migration takes a plot at version
 * N-1 and returns one at version N.
 */

import { SchemaMigrationFailedError } from "./errors";
import type { Plot } from "./types";
import { isStoryboardFeature } from "./types";

export type MigrationFn = (plot: Plot) => Plot;

export const V1_MIGRATIONS: ReadonlyMap<number, MigrationFn> = new Map<number, MigrationFn>(
  [[1, (plot) => plot]],
);

function currentMaxStoryboardVersion(plot: Plot): number {
  let max = 1; // A plot with no Storyboards is treated as v1 by convention.
  for (const f of plot.features) {
    if (!isStoryboardFeature(f)) continue;
    const v = f.properties.schema_version;
    if (typeof v === "number" && v > max) max = v;
  }
  return max;
}

export function runPlotOpenMigrations(
  plot: Plot,
  registry: ReadonlyMap<number, MigrationFn>,
): Plot {
  const startVersion = currentMaxStoryboardVersion(plot);
  const sortedTargets = Array.from(registry.keys()).sort((a, b) => a - b);
  let current: Plot = plot;
  for (const target of sortedTargets) {
    if (target <= startVersion) {
      // Even for matching or earlier versions, we still invoke the hook —
      // the v1 no-op fires here, which is the SC-007 contract (invoked on
      // 100% of plot-opens).
      const fn = registry.get(target);
      if (fn === undefined) continue;
      try {
        current = fn(current);
      } catch (err) {
        throw new SchemaMigrationFailedError(
          startVersion,
          target,
          err,
        );
      }
      continue;
    }
    const fn = registry.get(target);
    if (fn === undefined) continue;
    try {
      current = fn(current);
    } catch (err) {
      throw new SchemaMigrationFailedError(
        startVersion,
        target,
        err,
      );
    }
  }
  return current;
}
