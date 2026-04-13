import { describe, expect, it } from "vitest";
import { createFilterEngine } from "../engine";
import { parseTaxonomy } from "../taxonomy";
import type { FilterExpression, StacBrowserItem } from "../types";

const TAXONOMY = parseTaxonomy({
  surface: {
    label: "Surface",
    children: {
      warship: {
        label: "Warship",
        children: {
          frigate: {
            label: "Frigate",
            children: {
              type23: { label: "Type 23" },
              type26: { label: "Type 26" },
            },
          },
          destroyer: {
            label: "Destroyer",
            children: { type45: { label: "Type 45" } },
          },
        },
      },
    },
  },
});

const engine = createFilterEngine({ taxonomy: TAXONOMY });

function makeItem(
  id: string,
  overrides: Partial<StacBrowserItem> = {},
): StacBrowserItem {
  return {
    id,
    title: `Exercise ${id}`,
    itemPath: `/catalog/${id}/item.json`,
    bbox: null,
    datetime: null,
    startDatetime: "2025-06-01T00:00:00Z",
    endDatetime: "2025-06-01T12:00:00Z",
    platforms: [],
    tags: [],
    featureTags: [],
    author: null,
    collection: null,
    modified: null,
    ...overrides,
  };
}

const ITEMS: StacBrowserItem[] = [
  makeItem("1", {
    platforms: [{ id: "ARGYLL", vessel_class: "surface/warship/frigate/type23", nationality: "GB", domain: "surface" }],
    tags: ["ASW"],
  }),
  makeItem("2", {
    platforms: [{ id: "PORTER", vessel_class: "surface/warship/destroyer/type45", nationality: "US", domain: "surface" }],
    tags: ["training"],
  }),
  makeItem("3", {
    platforms: [{ id: "KENT", vessel_class: "surface/warship/frigate/type26", nationality: "GB", domain: "surface" }],
    tags: ["ASW", "multi-national"],
  }),
  makeItem("4", {
    platforms: [{ id: "FORBIN", vessel_class: "surface/warship/frigate/type-f70", nationality: "FR", domain: "surface" }],
    tags: [],
  }),
];

describe("AND logic", () => {
  it("returns all items for empty filter", () => {
    const expr: FilterExpression = { predicates: [], orGroups: [] };
    expect(engine.filter(ITEMS, expr)).toHaveLength(4);
  });

  it("filters by single predicate", () => {
    const expr: FilterExpression = {
      predicates: [{ type: "nationality", value: "GB" }],
      orGroups: [],
    };
    const result = engine.filter(ITEMS, expr);
    expect(result).toHaveLength(2);
    expect(result.map((i) => i.id)).toEqual(["1", "3"]);
  });

  it("combines multiple predicates with AND", () => {
    const expr: FilterExpression = {
      predicates: [
        { type: "nationality", value: "GB" },
        { type: "vessel-class", value: "type23" },
      ],
      orGroups: [],
    };
    const result = engine.filter(ITEMS, expr);
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe("1");
  });

  it("returns empty array when no items match", () => {
    const expr: FilterExpression = {
      predicates: [
        { type: "nationality", value: "GB" },
        { type: "vessel-class", value: "type45" },
      ],
      orGroups: [],
    };
    expect(engine.filter(ITEMS, expr)).toHaveLength(0);
  });

  it("matches hierarchically via vessel-class", () => {
    const expr: FilterExpression = {
      predicates: [{ type: "vessel-class", value: "warship" }],
      orGroups: [],
    };
    expect(engine.filter(ITEMS, expr)).toHaveLength(3);
  });

  it("matches() returns boolean for single item", () => {
    const expr: FilterExpression = {
      predicates: [{ type: "nationality", value: "GB" }],
      orGroups: [],
    };
    expect(engine.matches(ITEMS[0]!, expr)).toBe(true);
    expect(engine.matches(ITEMS[1]!, expr)).toBe(false);
  });
});

describe("OR logic", () => {
  it("matches items in OR group", () => {
    const expr: FilterExpression = {
      predicates: [],
      orGroups: [
        {
          predicates: [
            { type: "nationality", value: "GB" },
            { type: "nationality", value: "US" },
          ],
        },
      ],
    };
    const result = engine.filter(ITEMS, expr);
    expect(result).toHaveLength(3);
    expect(result.map((i) => i.id)).toEqual(["1", "2", "3"]);
  });

  it("AND'd top-level predicates with OR group", () => {
    const expr: FilterExpression = {
      predicates: [{ type: "tag", value: "ASW" }],
      orGroups: [
        {
          predicates: [
            { type: "vessel-class", value: "type23" },
            { type: "vessel-class", value: "type45" },
          ],
        },
      ],
    };
    // ASW AND (type23 OR type45) → only item 1 (ASW + type23)
    const result = engine.filter(ITEMS, expr);
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe("1");
  });

  it("handles single-predicate OR group (acts as AND)", () => {
    const expr: FilterExpression = {
      predicates: [{ type: "nationality", value: "GB" }],
      orGroups: [
        {
          predicates: [{ type: "tag", value: "ASW" }],
        },
      ],
    };
    const result = engine.filter(ITEMS, expr);
    expect(result).toHaveLength(2);
    expect(result.map((i) => i.id)).toEqual(["1", "3"]);
  });

  it("handles multiple OR groups (all AND'd)", () => {
    const expr: FilterExpression = {
      predicates: [],
      orGroups: [
        {
          predicates: [
            { type: "nationality", value: "GB" },
            { type: "nationality", value: "US" },
          ],
        },
        {
          predicates: [
            { type: "vessel-class", value: "frigate" },
          ],
        },
      ],
    };
    // (GB OR US) AND (frigate) → items 1 and 3
    const result = engine.filter(ITEMS, expr);
    expect(result).toHaveLength(2);
    expect(result.map((i) => i.id)).toEqual(["1", "3"]);
  });

  it("returns empty for OR group with no matches", () => {
    const expr: FilterExpression = {
      predicates: [],
      orGroups: [
        {
          predicates: [
            { type: "nationality", value: "DE" },
            { type: "nationality", value: "NO" },
          ],
        },
      ],
    };
    expect(engine.filter(ITEMS, expr)).toHaveLength(0);
  });

  it("negated predicate excludes matching items", () => {
    const expr: FilterExpression = {
      predicates: [{ type: "nationality", value: "GB", negated: true }],
      orGroups: [],
    };
    // Items 1, 3 have GB — negated excludes them; items 2 (US) and 4 (FR) remain
    const result = engine.filter(ITEMS, expr);
    expect(result).toHaveLength(2);
    expect(result.map((i) => i.id)).toEqual(["2", "4"]);
  });

  it("negated predicate in OR group inverts match", () => {
    const expr: FilterExpression = {
      predicates: [],
      orGroups: [
        {
          predicates: [
            { type: "nationality", value: "FR" },
            { type: "nationality", value: "US", negated: true },
          ],
        },
      ],
    };
    // FR matches item 4; NOT US matches items 1, 3, 4 → union = items 1, 3, 4
    const result = engine.filter(ITEMS, expr);
    expect(result).toHaveLength(3);
    expect(result.map((i) => i.id)).toEqual(["1", "3", "4"]);
  });
});
