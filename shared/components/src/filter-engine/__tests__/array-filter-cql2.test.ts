import { describe, expect, it } from "vitest";
import { createFilterEngine } from "../engine";
import { parseTaxonomy } from "../taxonomy";
import { filterExpressionToCql2Json, cql2JsonToArrayFilters } from "../cql2-json";
import type { ArrayFilterPredicate, FilterExpression, StacBrowserItem } from "../types";

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
            },
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

describe("array_filter — CQL2 JSON serialization (US2)", () => {
  it("serialize compound AND to CQL2 JSON with correct structure", () => {
    const expr: FilterExpression = {
      predicates: [],
      orGroups: [],
      arrayFilters: [
        {
          array: "platforms",
          predicate: {
            kind: "and",
            children: [
              { kind: "comparison", field: "nationality", value: "GB" },
              { kind: "comparison", field: "domain", value: "subsurface" },
            ],
          },
        },
      ],
    };

    const cql2 = filterExpressionToCql2Json(expr);
    expect(cql2).toEqual({
      op: "array_filter",
      args: [
        { property: "debrief:platforms" },
        {
          op: "and",
          args: [
            { op: "=", args: [{ property: "nationality" }, "GB"] },
            { op: "=", args: [{ property: "domain" }, "subsurface"] },
          ],
        },
      ],
    });
  });

  it("serialize compound OR to CQL2 JSON", () => {
    const expr: FilterExpression = {
      predicates: [],
      orGroups: [],
      arrayFilters: [
        {
          array: "platforms",
          predicate: {
            kind: "or",
            children: [
              { kind: "comparison", field: "nationality", value: "GB" },
              { kind: "comparison", field: "nationality", value: "US" },
            ],
          },
        },
      ],
    };

    const cql2 = filterExpressionToCql2Json(expr);
    expect(cql2).toEqual({
      op: "array_filter",
      args: [
        { property: "debrief:platforms" },
        {
          op: "or",
          args: [
            { op: "=", args: [{ property: "nationality" }, "GB"] },
            { op: "=", args: [{ property: "nationality" }, "US"] },
          ],
        },
      ],
    });
  });

  it("serialize mixed expression (predicates + arrayFilters)", () => {
    const expr: FilterExpression = {
      predicates: [{ type: "title", value: "exercise" }],
      orGroups: [],
      arrayFilters: [
        {
          array: "platforms",
          predicate: {
            kind: "and",
            children: [
              { kind: "comparison", field: "nationality", value: "GB" },
              { kind: "comparison", field: "vessel_role", value: "frigate" },
            ],
          },
        },
      ],
    };

    const cql2 = filterExpressionToCql2Json(expr);
    expect(cql2).toEqual({
      op: "and",
      args: [
        { op: "like", args: [{ property: "title" }, "%exercise%"] },
        {
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
      ],
    });
  });

  it("serialize single-child compound reduces to single comparison", () => {
    const expr: FilterExpression = {
      predicates: [],
      orGroups: [],
      arrayFilters: [
        {
          array: "platforms",
          predicate: {
            kind: "and",
            children: [
              { kind: "comparison", field: "nationality", value: "GB" },
            ],
          },
        },
      ],
    };

    const cql2 = filterExpressionToCql2Json(expr);
    expect(cql2).toEqual({
      op: "array_filter",
      args: [
        { property: "debrief:platforms" },
        { op: "=", args: [{ property: "nationality" }, "GB"] },
      ],
    });
  });
});

describe("array_filter — CQL2 JSON deserialization (US2)", () => {
  it("deserialize CQL2 JSON array_filter to ArrayFilterPredicate[]", () => {
    const cql2 = {
      op: "array_filter",
      args: [
        { property: "debrief:platforms" },
        {
          op: "and",
          args: [
            { op: "=", args: [{ property: "nationality" }, "GB"] },
            { op: "=", args: [{ property: "domain" }, "subsurface"] },
          ],
        },
      ],
    };

    const result = cql2JsonToArrayFilters(cql2);
    expect(result).toEqual([
      {
        array: "platforms",
        predicate: {
          kind: "and",
          children: [
            { kind: "comparison", field: "nationality", value: "GB" },
            { kind: "comparison", field: "domain", value: "subsurface" },
          ],
        },
        negated: false,
      },
    ]);
  });

  it("deserialize nested AND/OR compound predicate", () => {
    const cql2 = {
      op: "array_filter",
      args: [
        { property: "debrief:platforms" },
        {
          op: "and",
          args: [
            {
              op: "or",
              args: [
                { op: "=", args: [{ property: "nationality" }, "GB"] },
                { op: "=", args: [{ property: "nationality" }, "US"] },
              ],
            },
            { op: "=", args: [{ property: "domain" }, "subsurface"] },
          ],
        },
      ],
    };

    const result = cql2JsonToArrayFilters(cql2);
    expect(result).toHaveLength(1);
    const pred = result[0]!.predicate;
    expect(pred.kind).toBe("and");
    if (pred.kind === "and") {
      expect(pred.children).toHaveLength(2);
      expect(pred.children[0]!.kind).toBe("or");
    }
  });

  it("round-trip serialize → deserialize → evaluate produces same results", () => {
    const expr: FilterExpression = {
      predicates: [],
      orGroups: [],
      arrayFilters: [
        {
          array: "platforms",
          predicate: {
            kind: "and",
            children: [
              { kind: "comparison", field: "nationality", value: "GB" },
              { kind: "comparison", field: "domain", value: "subsurface" },
            ],
          },
        },
      ],
    };

    const item = makeItem("gb-sub", {
      platforms: [{ id: "HMS_ASTUTE", nationality: "GB", domain: "subsurface" }],
    });
    const itemNoMatch = makeItem("mixed", {
      platforms: [
        { id: "HMS_ARGYLL", nationality: "GB", domain: "surface" },
        { id: "U31", nationality: "DE", domain: "subsurface" },
      ],
    });

    // Direct evaluation
    const directMatch = engine.matches(item, expr);
    const directNoMatch = engine.matches(itemNoMatch, expr);

    // Serialize → deserialize → evaluate
    const cql2 = filterExpressionToCql2Json(expr);
    const roundTripped = cql2JsonToArrayFilters(cql2);
    const rtExpr: FilterExpression = {
      predicates: [],
      orGroups: [],
      arrayFilters: roundTripped,
    };
    const rtMatch = engine.matches(item, rtExpr);
    const rtNoMatch = engine.matches(itemNoMatch, rtExpr);

    expect(rtMatch).toBe(directMatch);
    expect(rtNoMatch).toBe(directNoMatch);
    expect(rtMatch).toBe(true);
    expect(rtNoMatch).toBe(false);
  });

  it("deserialize CQL2 JSON with no array_filter returns empty array", () => {
    const cql2 = {
      op: "=",
      args: [{ property: "title" }, "exercise"],
    };

    const result = cql2JsonToArrayFilters(cql2);
    expect(result).toEqual([]);
  });

  it("deserialize empty CQL2 JSON returns empty array", () => {
    const result = cql2JsonToArrayFilters({});
    expect(result).toEqual([]);
  });

  it("deserialize array_filter embedded in AND root", () => {
    const cql2 = {
      op: "and",
      args: [
        { op: "like", args: [{ property: "title" }, "%exercise%"] },
        {
          op: "array_filter",
          args: [
            { property: "debrief:platforms" },
            { op: "=", args: [{ property: "nationality" }, "GB"] },
          ],
        },
      ],
    };

    const result = cql2JsonToArrayFilters(cql2);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      array: "platforms",
      predicate: { kind: "comparison", field: "nationality", value: "GB" },
      negated: false,
    });
  });
});

describe("array_filter — negated CQL2 serialization (US4)", () => {
  it("serialization of negated array_filter wraps in NOT operator", () => {
    const expr: FilterExpression = {
      predicates: [],
      orGroups: [],
      arrayFilters: [
        {
          array: "platforms",
          predicate: {
            kind: "and",
            children: [
              { kind: "comparison", field: "nationality", value: "GB" },
              { kind: "comparison", field: "domain", value: "subsurface" },
            ],
          },
          negated: true,
        },
      ],
    };

    const cql2 = filterExpressionToCql2Json(expr);
    expect(cql2).toEqual({
      op: "not",
      args: [
        {
          op: "array_filter",
          args: [
            { property: "debrief:platforms" },
            {
              op: "and",
              args: [
                { op: "=", args: [{ property: "nationality" }, "GB"] },
                { op: "=", args: [{ property: "domain" }, "subsurface"] },
              ],
            },
          ],
        },
      ],
    });
  });

  it("deserialization of NOT-wrapped array_filter sets negated=true", () => {
    const cql2 = {
      op: "not",
      args: [
        {
          op: "array_filter",
          args: [
            { property: "debrief:platforms" },
            {
              op: "and",
              args: [
                { op: "=", args: [{ property: "nationality" }, "GB"] },
                { op: "=", args: [{ property: "domain" }, "subsurface"] },
              ],
            },
          ],
        },
      ],
    };

    const result = cql2JsonToArrayFilters(cql2);
    expect(result).toHaveLength(1);
    expect(result[0]!.negated).toBe(true);
    expect(result[0]!.predicate.kind).toBe("and");
  });

  it("negated round-trip preserves evaluation semantics", () => {
    const expr: FilterExpression = {
      predicates: [],
      orGroups: [],
      arrayFilters: [
        {
          array: "platforms",
          predicate: {
            kind: "and",
            children: [
              { kind: "comparison", field: "nationality", value: "GB" },
              { kind: "comparison", field: "domain", value: "subsurface" },
            ],
          },
          negated: true,
        },
      ],
    };

    const itemMatches = makeItem("surface-only", {
      platforms: [{ id: "HMS_ARGYLL", nationality: "GB", domain: "surface" }],
    });
    const itemExcluded = makeItem("gb-sub", {
      platforms: [{ id: "HMS_ASTUTE", nationality: "GB", domain: "subsurface" }],
    });

    // Direct
    expect(engine.matches(itemMatches, expr)).toBe(true);
    expect(engine.matches(itemExcluded, expr)).toBe(false);

    // Round-trip
    const cql2 = filterExpressionToCql2Json(expr);
    const rt = cql2JsonToArrayFilters(cql2);
    const rtExpr: FilterExpression = { predicates: [], orGroups: [], arrayFilters: rt };

    expect(engine.matches(itemMatches, rtExpr)).toBe(true);
    expect(engine.matches(itemExcluded, rtExpr)).toBe(false);
  });
});
