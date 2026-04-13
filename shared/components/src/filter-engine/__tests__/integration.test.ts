import { describe, expect, it, beforeAll } from "vitest";
import { createFilterEngine } from "../engine";
import type { FilterEngine, FilterExpression, StacBrowserItem } from "../types";
import { loadMockItems, loadTaxonomy } from "./fixtures";

let engine: FilterEngine;
let items: StacBrowserItem[];

beforeAll(() => {
  const taxonomy = loadTaxonomy();
  engine = createFilterEngine({ taxonomy });
  items = loadMockItems();
});

describe("integration: mock data set", () => {
  it("loads 100 mock items", () => {
    expect(items.length).toBe(100);
  });

  it("empty filter returns all items", () => {
    const expr: FilterExpression = { predicates: [], orGroups: [] };
    expect(engine.filter(items, expr)).toHaveLength(100);
  });
});

describe("integration: vessel-class (hierarchical)", () => {
  it("filtering on leaf type returns matching items", () => {
    const expr: FilterExpression = {
      predicates: [{ type: "vessel-class", value: "type23" }],
      orGroups: [],
    };
    const result = engine.filter(items, expr);
    expect(result.length).toBeGreaterThan(0);
    for (const item of result) {
      expect(
        item.platforms.some((p) => p.vessel_class?.includes("type23")),
      ).toBe(true);
    }
  });

  it("filtering on parent 'warship' returns superset of 'frigate'", () => {
    const frigExpr: FilterExpression = {
      predicates: [{ type: "vessel-class", value: "frigate" }],
      orGroups: [],
    };
    const warExpr: FilterExpression = {
      predicates: [{ type: "vessel-class", value: "warship" }],
      orGroups: [],
    };
    const frigates = engine.filter(items, frigExpr);
    const warships = engine.filter(items, warExpr);
    expect(warships.length).toBeGreaterThanOrEqual(frigates.length);
    const warshipIds = new Set(warships.map((i) => i.id));
    for (const f of frigates) {
      expect(warshipIds.has(f.id)).toBe(true);
    }
  });

  it("unknown taxonomy node returns no matches", () => {
    const expr: FilterExpression = {
      predicates: [{ type: "vessel-class", value: "nonexistent-class" }],
      orGroups: [],
    };
    expect(engine.filter(items, expr)).toHaveLength(0);
  });
});

describe("integration: nationality", () => {
  it("filters by GB nationality", () => {
    const expr: FilterExpression = {
      predicates: [{ type: "nationality", value: "GB" }],
      orGroups: [],
    };
    const result = engine.filter(items, expr);
    expect(result.length).toBeGreaterThan(0);
    for (const item of result) {
      expect(
        item.platforms.some((p) => p.nationality?.toUpperCase() === "GB"),
      ).toBe(true);
    }
  });
});

describe("integration: tag", () => {
  it("filters by ASW tag (matches tags or featureTags)", () => {
    const expr: FilterExpression = {
      predicates: [{ type: "tag", value: "ASW" }],
      orGroups: [],
    };
    const result = engine.filter(items, expr);
    expect(result.length).toBeGreaterThan(0);
    for (const item of result) {
      const hasTag = item.tags.some((t) => t.toLowerCase() === "asw") ||
        item.featureTags.some((t) => t.toLowerCase() === "asw");
      expect(hasTag).toBe(true);
    }
  });
});

describe("integration: title", () => {
  it("filters by title substring", () => {
    const expr: FilterExpression = {
      predicates: [{ type: "title", value: "exercise" }],
      orGroups: [],
    };
    const result = engine.filter(items, expr);
    // All fixtures have "Exercise" in the title
    expect(result.length).toBe(100);
  });
});

describe("integration: duration buckets", () => {
  it("all items match at least one duration bucket", () => {
    const buckets = ["<6H", "<24H", "<72H", "<10D", ">10D"] as const;
    const matched = new Set<string>();

    for (const bucket of buckets) {
      const expr: FilterExpression = {
        predicates: [{ type: "duration", value: bucket }],
        orGroups: [],
      };
      const result = engine.filter(items, expr);
      for (const item of result) {
        matched.add(item.id);
      }
    }

    expect(matched.size).toBe(100);
  });

  it("<6H returns fewer items than <24H", () => {
    const short: FilterExpression = {
      predicates: [{ type: "duration", value: "<6H" }],
      orGroups: [],
    };
    const medium: FilterExpression = {
      predicates: [{ type: "duration", value: "<24H" }],
      orGroups: [],
    };
    const shortCount = engine.filter(items, short).length;
    const mediumCount = engine.filter(items, medium).length;
    expect(mediumCount).toBeGreaterThanOrEqual(shortCount);
  });
});

describe("integration: combined AND + OR", () => {
  it("nationality AND (vessel OR vessel)", () => {
    const expr: FilterExpression = {
      predicates: [{ type: "nationality", value: "GB" }],
      orGroups: [
        {
          predicates: [
            { type: "vessel-class", value: "frigate" },
            { type: "vessel-class", value: "destroyer" },
          ],
        },
      ],
    };
    const result = engine.filter(items, expr);
    for (const item of result) {
      expect(
        item.platforms.some((p) => p.nationality?.toUpperCase() === "GB"),
      ).toBe(true);
      const hasFrigOrDest = item.platforms.some(
        (p) => p.vessel_class?.includes("frigate") || p.vessel_class?.includes("destroyer"),
      );
      expect(hasFrigOrDest).toBe(true);
    }
  });
});

describe("integration: edge cases", () => {
  it("handles items with missing properties gracefully", () => {
    // Items with empty platforms should not match vessel-class filter
    const expr: FilterExpression = {
      predicates: [{ type: "vessel-class", value: "warship" }],
      orGroups: [],
    };
    const result = engine.filter(items, expr);
    for (const item of result) {
      expect(item.platforms.some((p) => p.vessel_class)).toBe(true);
    }
  });
});
