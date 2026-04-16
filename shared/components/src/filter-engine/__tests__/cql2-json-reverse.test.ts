/**
 * Reverse-parser tests for `cql2JsonToFilterExpression` (#188 decision 1A) and
 * the `filterByCql2Json` convenience wrapper.
 *
 * Covers:
 *   - T009 happy-path round-trip (`filterExpressionToCql2Json` →
 *     `cql2JsonToFilterExpression`) across every `FilterType` and a compound
 *     `array_filter`.
 *   - T010 throw paths (unsupported operator, bad arg arity, unknown property)
 *     — these feed the `cql2-evaluation-failed` reason in parseResponse.
 *   - T011 integration — evaluate a CQL2 expression against `StacBrowserItem[]`
 *     via `filterByCql2Json` and assert the match aligns with the forward path.
 */

import { describe, expect, it } from "vitest";
import {
  createFilterEngine,
  filterByCql2Json,
} from "../engine";
import {
  cql2JsonToFilterExpression,
  filterExpressionToCql2Json,
  Cql2ReverseParseError,
  PROPERTY_MAP,
} from "../cql2-json";
import { parseTaxonomy } from "../taxonomy";
import type {
  FilterExpression,
  FilterType,
  StacBrowserItem,
} from "../types";

const TAXONOMY = parseTaxonomy({
  subsurface: {
    label: "Subsurface",
    children: {
      submarine: {
        label: "Submarine",
      },
    },
  },
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
    startDatetime: null,
    endDatetime: null,
    platforms: [],
    tags: [],
    featureTags: [],
    author: null,
    collection: null,
    modified: null,
    ...overrides,
  };
}

describe("cql2JsonToFilterExpression — happy-path round trips (T009)", () => {
  it("empty object yields an empty FilterExpression", () => {
    const expr = cql2JsonToFilterExpression({});
    expect(expr.predicates).toEqual([]);
    expect(expr.orGroups).toEqual([]);
    expect(expr.arrayFilters).toEqual([]);
  });

  const filterTypeSamples: Array<{
    type: FilterType;
    value: string;
  }> = [
    { type: "vessel-class", value: "type23" },
    { type: "tag", value: "ASW" },
    { type: "author", value: "Smith" },
    { type: "duration", value: "<24H" },
    { type: "modified", value: "<7D" },
    { type: "title", value: "atlantic" },
    { type: "filename", value: "sample" },
    { type: "plot-contents", value: "contact" },
    { type: "track-name", value: "HMS Nelson" },
    { type: "nationality", value: "GB" },
    { type: "collection", value: "exercises-2025" },
  ];

  for (const sample of filterTypeSamples) {
    it(`round-trips ${sample.type} via forward + reverse`, () => {
      const forward: FilterExpression = {
        predicates: [{ type: sample.type, value: sample.value }],
        orGroups: [],
      };
      const cql2 = filterExpressionToCql2Json(forward);
      const reversed = cql2JsonToFilterExpression(cql2);
      expect(reversed.predicates).toHaveLength(1);
      expect(reversed.predicates[0]!.type).toBe(sample.type);
      expect(reversed.predicates[0]!.value).toBe(sample.value);
      expect(reversed.orGroups).toEqual([]);
      expect(reversed.arrayFilters).toEqual([]);
    });
  }

  it("round-trips a compound array_filter (UK subsurface)", () => {
    const forward: FilterExpression = {
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
    const cql2 = filterExpressionToCql2Json(forward);
    const reversed = cql2JsonToFilterExpression(cql2);
    expect(reversed.arrayFilters).toHaveLength(1);
    const af = reversed.arrayFilters![0]!;
    expect(af.array).toBe("platforms");
    expect(af.negated).toBe(false);
    expect(af.predicate.kind).toBe("and");
  });

  it("round-trips AND of leaf + array_filter", () => {
    const forward: FilterExpression = {
      predicates: [{ type: "title", value: "exercise" }],
      orGroups: [],
      arrayFilters: [
        {
          array: "platforms",
          predicate: {
            kind: "comparison",
            field: "nationality",
            value: "GB",
          },
        },
      ],
    };
    const cql2 = filterExpressionToCql2Json(forward);
    const reversed = cql2JsonToFilterExpression(cql2);
    expect(reversed.predicates).toHaveLength(1);
    expect(reversed.predicates[0]!.type).toBe("title");
    expect(reversed.arrayFilters).toHaveLength(1);
  });

  it("round-trips a negated array_filter", () => {
    const forward: FilterExpression = {
      predicates: [],
      orGroups: [],
      arrayFilters: [
        {
          array: "platforms",
          predicate: {
            kind: "comparison",
            field: "nationality",
            value: "GB",
          },
          negated: true,
        },
      ],
    };
    const cql2 = filterExpressionToCql2Json(forward);
    const reversed = cql2JsonToFilterExpression(cql2);
    expect(reversed.arrayFilters).toHaveLength(1);
    expect(reversed.arrayFilters![0]!.negated).toBe(true);
  });

  it("round-trips an OR group with multiple leaf predicates", () => {
    const forward: FilterExpression = {
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
    const cql2 = filterExpressionToCql2Json(forward);
    const reversed = cql2JsonToFilterExpression(cql2);
    expect(reversed.orGroups).toHaveLength(1);
    expect(reversed.orGroups[0]!.predicates).toHaveLength(2);
  });

  it("round-trips a negated top-level predicate", () => {
    const forward: FilterExpression = {
      predicates: [{ type: "nationality", value: "GB", negated: true }],
      orGroups: [],
    };
    const cql2 = filterExpressionToCql2Json(forward);
    const reversed = cql2JsonToFilterExpression(cql2);
    expect(reversed.predicates).toHaveLength(1);
    expect(reversed.predicates[0]!.negated).toBe(true);
    expect(reversed.predicates[0]!.value).toBe("GB");
  });
});

describe("cql2JsonToFilterExpression — throw paths (T010)", () => {
  it("throws unsupported-operator for an unknown op", () => {
    expect(() =>
      cql2JsonToFilterExpression({ op: "contains_weirdly", args: [] }),
    ).toThrow(Cql2ReverseParseError);
    try {
      cql2JsonToFilterExpression({ op: "contains_weirdly", args: [] });
    } catch (err) {
      expect((err as Cql2ReverseParseError).code).toBe("unsupported-operator");
    }
  });

  it("throws bad-arg-arity for a `=` with wrong arg count", () => {
    try {
      cql2JsonToFilterExpression({ op: "=", args: [{ property: "collection" }] });
      expect.fail("expected a throw");
    } catch (err) {
      expect(err).toBeInstanceOf(Cql2ReverseParseError);
      expect((err as Cql2ReverseParseError).code).toBe("bad-arg-arity");
    }
  });

  it("throws unknown-property for a path outside PROPERTY_MAP", () => {
    try {
      cql2JsonToFilterExpression({
        op: "=",
        args: [{ property: "debrief:fabricated" }, "value"],
      });
      expect.fail("expected a throw");
    } catch (err) {
      expect(err).toBeInstanceOf(Cql2ReverseParseError);
      expect((err as Cql2ReverseParseError).code).toBe("unknown-property");
    }
  });

  it("throws bad-arg-arity for array_filter with a single arg", () => {
    try {
      cql2JsonToFilterExpression({
        op: "array_filter",
        args: [{ property: "debrief:platforms" }],
      });
      expect.fail("expected a throw");
    } catch (err) {
      expect(err).toBeInstanceOf(Cql2ReverseParseError);
      expect((err as Cql2ReverseParseError).code).toBe("bad-arg-arity");
    }
  });

  it("throws malformed-node for array_filter over a wrong array", () => {
    try {
      cql2JsonToFilterExpression({
        op: "array_filter",
        args: [
          { property: "debrief:not_platforms" },
          { op: "=", args: [{ property: "nationality" }, "GB"] },
        ],
      });
      expect.fail("expected a throw");
    } catch (err) {
      expect(err).toBeInstanceOf(Cql2ReverseParseError);
      expect((err as Cql2ReverseParseError).code).toBe("malformed-node");
    }
  });
});

describe("filterByCql2Json — integration (T011)", () => {
  it("evaluates a CQL2 expression against StacBrowserItem[]", () => {
    const items: StacBrowserItem[] = [
      makeItem("gb-subsurface", {
        platforms: [
          {
            id: "ASTUTE",
            name: "HMS Astute",
            nationality: "GB",
            domain: "subsurface",
            vessel_class: "subsurface/submarine",
          },
        ],
      }),
      makeItem("us-surface", {
        platforms: [
          {
            id: "ARLEIGH",
            name: "USS Arleigh Burke",
            nationality: "US",
            domain: "surface",
            vessel_class: "surface/warship/destroyer",
          },
        ],
      }),
      makeItem("gb-surface", {
        platforms: [
          {
            id: "ARGYLL",
            name: "HMS Argyll",
            nationality: "GB",
            domain: "surface",
            vessel_class: "surface/warship/frigate/type23",
          },
        ],
      }),
    ];

    const cql2 = filterExpressionToCql2Json({
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
    });

    const filtered = filterByCql2Json(items, cql2, { taxonomy: TAXONOMY });
    expect(filtered).toHaveLength(1);
    expect(filtered[0]!.id).toBe("gb-subsurface");
  });

  it("result matches forward-path filtering (semantic equivalence)", () => {
    const items: StacBrowserItem[] = [
      makeItem("a", {
        platforms: [{ id: "1", nationality: "GB" }],
      }),
      makeItem("b", {
        platforms: [{ id: "2", nationality: "US" }],
      }),
    ];

    const expr: FilterExpression = {
      predicates: [{ type: "nationality", value: "GB" }],
      orGroups: [],
    };
    const forwardEngine = createFilterEngine({ taxonomy: TAXONOMY });
    const forwardResult = forwardEngine.filter(items, expr);
    const reverseResult = filterByCql2Json(
      items,
      filterExpressionToCql2Json(expr),
      { taxonomy: TAXONOMY },
    );
    expect(reverseResult.map((i) => i.id)).toEqual(
      forwardResult.map((i) => i.id),
    );
  });

  it("PROPERTY_MAP covers the whole FilterType union", () => {
    // Compile-time check via cast + runtime check for belt-and-braces.
    const keys = Object.keys(PROPERTY_MAP);
    expect(keys).toContain("vessel-class");
    expect(keys).toContain("tag");
    expect(keys).toContain("author");
    expect(keys).toContain("duration");
    expect(keys).toContain("modified");
    expect(keys).toContain("title");
    expect(keys).toContain("filename");
    expect(keys).toContain("plot-contents");
    expect(keys).toContain("track-name");
    expect(keys).toContain("nationality");
    expect(keys).toContain("collection");
    expect(keys).toHaveLength(11);
  });
});
