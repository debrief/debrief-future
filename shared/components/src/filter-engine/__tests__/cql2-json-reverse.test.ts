/**
 * Tests for the CQL2-JSON → FilterExpression reverse parser (#188 T009/T010/T011).
 *
 * Round-trips every FilterType through filterExpressionToCql2Json →
 * cql2JsonToFilterExpression, asserts the throw paths the generator relies on
 * (unsupported op, bad arity, unknown property), and verifies the
 * filterByCql2Json convenience wrapper matches the forward-path engine.
 */

import { describe, expect, it } from "vitest";
import {
  Cql2ParseError,
  cql2JsonToFilterExpression,
  filterExpressionToCql2Json,
} from "../cql2-json";
import { createFilterEngine, filterByCql2Json } from "../engine";
import { loadMockItems, loadTaxonomy } from "./fixtures";
import type {
  ArrayFilterPredicate,
  FilterExpression,
  FilterType,
  Predicate,
} from "../types";

function roundTrip(expr: FilterExpression): FilterExpression {
  const cql2 = filterExpressionToCql2Json(expr);
  return cql2JsonToFilterExpression(cql2);
}

describe("cql2JsonToFilterExpression (reverse parser)", () => {
  it("returns empty expression for {}", () => {
    expect(cql2JsonToFilterExpression({})).toEqual({
      predicates: [],
      orGroups: [],
      arrayFilters: [],
    });
  });

  // Every FilterType value, with its canonical sample value.
  const samples: Record<FilterType, string> = {
    "vessel-class": "submarine",
    tag: "exercise-saxon",
    author: "Smith",
    duration: "<24H",
    modified: "<7D",
    title: "atlantic",
    filename: "report.rep",
    "plot-contents": "narrative",
    "track-name": "HMS Victory",
    nationality: "GB",
    collection: "exercises",
  };

  for (const [filterType, value] of Object.entries(samples) as [
    FilterType,
    string,
  ][]) {
    it(`round-trips single ${filterType} predicate`, () => {
      const expr: FilterExpression = {
        predicates: [{ type: filterType, value }],
        orGroups: [],
      };
      const parsed = roundTrip(expr);
      expect(parsed.predicates).toHaveLength(1);
      expect(parsed.predicates[0]).toMatchObject({ type: filterType, value });
    });
  }

  it("round-trips negated scalar predicate", () => {
    const expr: FilterExpression = {
      predicates: [{ type: "author", value: "Smith", negated: true }],
      orGroups: [],
    };
    const parsed = roundTrip(expr);
    expect(parsed.predicates[0]).toEqual({
      type: "author",
      value: "Smith",
      negated: true,
    });
  });

  it("round-trips negated array-valued predicate", () => {
    const expr: FilterExpression = {
      predicates: [{ type: "nationality", value: "GB", negated: true }],
      orGroups: [],
    };
    const parsed = roundTrip(expr);
    expect(parsed.predicates[0]).toEqual({
      type: "nationality",
      value: "GB",
      negated: true,
    });
  });

  it("round-trips multiple predicates under AND", () => {
    const expr: FilterExpression = {
      predicates: [
        { type: "nationality", value: "GB" },
        { type: "author", value: "Smith" },
      ],
      orGroups: [],
    };
    const parsed = roundTrip(expr);
    expect(parsed.predicates).toHaveLength(2);
    expect(parsed.predicates.map((p: Predicate) => p.type).sort()).toEqual([
      "author",
      "nationality",
    ]);
  });

  it("round-trips an OR group", () => {
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
    const parsed = roundTrip(expr);
    expect(parsed.orGroups).toHaveLength(1);
    expect(parsed.orGroups[0]?.predicates).toHaveLength(2);
  });

  it("round-trips a compound array_filter", () => {
    const af: ArrayFilterPredicate = {
      array: "platforms",
      predicate: {
        kind: "and",
        children: [
          { kind: "comparison", field: "nationality", value: "GB" },
          { kind: "comparison", field: "domain", value: "sub-surface" },
        ],
      },
    };
    const expr: FilterExpression = {
      predicates: [],
      orGroups: [],
      arrayFilters: [af],
    };
    const parsed = roundTrip(expr);
    expect(parsed.arrayFilters).toHaveLength(1);
    expect(parsed.arrayFilters?.[0]?.array).toBe("platforms");
    expect(parsed.arrayFilters?.[0]?.negated).toBe(false);
  });

  it("round-trips a negated array_filter", () => {
    const af: ArrayFilterPredicate = {
      array: "platforms",
      negated: true,
      predicate: { kind: "comparison", field: "nationality", value: "GB" },
    };
    const expr: FilterExpression = {
      predicates: [],
      orGroups: [],
      arrayFilters: [af],
    };
    const parsed = roundTrip(expr);
    expect(parsed.arrayFilters?.[0]?.negated).toBe(true);
  });

  describe("throw paths (decision 10A)", () => {
    it("throws on unknown operator", () => {
      expect(() =>
        cql2JsonToFilterExpression({ op: "between", args: [] }),
      ).toThrow(Cql2ParseError);
    });

    it("throws on unknown property path", () => {
      expect(() =>
        cql2JsonToFilterExpression({
          op: "=",
          args: [{ property: "debrief:not-a-real-field" }, "x"],
        }),
      ).toThrow(/PROPERTY_MAP/);
    });

    it("throws on bad arg arity for =", () => {
      expect(() =>
        cql2JsonToFilterExpression({ op: "=", args: [{ property: "title" }] }),
      ).toThrow(/requires exactly 2 args/);
    });

    it("throws on bad arg arity for a_containedBy value array", () => {
      expect(() =>
        cql2JsonToFilterExpression({
          op: "a_containedBy",
          args: [["GB", "US"], { property: "debrief:platforms[*].nationality" }],
        }),
      ).toThrow(/single-element/);
    });

    it("throws when = gets a non-property first arg", () => {
      expect(() =>
        cql2JsonToFilterExpression({ op: "=", args: ["x", "y"] }),
      ).toThrow(/property ref/);
    });

    it("throws on malformed array_filter first arg", () => {
      expect(() =>
        cql2JsonToFilterExpression({
          op: "array_filter",
          args: [
            { property: "debrief:tags" },
            { op: "=", args: [{ property: "nationality" }, "GB"] },
          ],
        }),
      ).toThrow(/debrief:platforms/);
    });
  });
});

describe("filterByCql2Json (T011 integration)", () => {
  it("evaluates CQL2 expressions against StacBrowserItem[] with counts matching the forward path", () => {
    const items = loadMockItems();
    const taxonomy = loadTaxonomy();

    const expr: FilterExpression = {
      predicates: [{ type: "nationality", value: "GB" }],
      orGroups: [],
    };
    const cql2 = filterExpressionToCql2Json(expr);

    // Forward path using a taxonomy-aware engine (no descendant expansion needed
    // for nationality). filterByCql2Json uses empty taxonomy — counts should
    // still match for non-taxonomy filter types.
    const forwardCount = createFilterEngine({ taxonomy })
      .filter(items, expr)
      .length;
    const reverseCount = filterByCql2Json(items, cql2).length;
    expect(reverseCount).toBe(forwardCount);
    expect(reverseCount).toBeGreaterThan(0);
  });

  it("returns all items for empty filter", () => {
    const items = loadMockItems();
    expect(filterByCql2Json(items, {}).length).toBe(items.length);
  });
});
