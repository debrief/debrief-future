import { describe, expect, it, vi } from "vitest";

import {
  type MigrationFn,
  V1_MIGRATIONS,
  runPlotOpenMigrations,
} from "../migration";
import { createStoryboard } from "../crud";
import type { Plot } from "../types";

const EMPTY_PLOT: Plot = { type: "FeatureCollection", features: [] };

describe("V1_MIGRATIONS", () => {
  it("is a Map keyed by target schema_version", () => {
    expect(V1_MIGRATIONS.has(1)).toBe(true);
  });

  it("v1 migration is a no-op (returns same reference)", () => {
    const fn = V1_MIGRATIONS.get(1) as MigrationFn;
    expect(fn(EMPTY_PLOT)).toBe(EMPTY_PLOT);
  });
});

describe("runPlotOpenMigrations", () => {
  it("invokes the v1 no-op hook for an empty plot (SC-007)", () => {
    const spy = vi.fn((p: Plot) => p);
    const registry = new Map<number, MigrationFn>([[1, spy]]);
    const result = runPlotOpenMigrations(EMPTY_PLOT, registry);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(result).toBe(EMPTY_PLOT);
  });

  it("invokes the v1 hook on a plot containing at least one Storyboard", async () => {
    const { plot } = await createStoryboard(EMPTY_PLOT, {
      name: "A",
      actor: "alice",
      now: "2026-04-20T09:00:00Z",
      idOverride: "01JSTORYBOARDMIGAAAAAAAAAA",
      activityIdOverride: "00000000-0000-4000-8000-000000000001",
    });
    const spy = vi.fn((p: Plot) => p);
    const registry = new Map<number, MigrationFn>([[1, spy]]);
    runPlotOpenMigrations(plot, registry);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("chains migrations in ascending target-version order", () => {
    const order: number[] = [];
    const registry = new Map<number, MigrationFn>([
      [
        2,
        (p) => {
          order.push(2);
          return p;
        },
      ],
      [
        3,
        (p) => {
          order.push(3);
          return p;
        },
      ],
      [
        1,
        (p) => {
          order.push(1);
          return p;
        },
      ],
    ]);
    runPlotOpenMigrations(EMPTY_PLOT, registry);
    expect(order).toEqual([1, 2, 3]);
  });

  it("wraps migration failures in SchemaMigrationFailed", () => {
    const registry = new Map<number, MigrationFn>([
      [
        1,
        () => {
          throw new Error("boom");
        },
      ],
    ]);
    expect(() => runPlotOpenMigrations(EMPTY_PLOT, registry)).toThrowError(
      expect.objectContaining({ code: "SchemaMigrationFailed" }),
    );
  });
});
