import { describe, expect, it } from "vitest";
import { createFilterEngine } from "../engine";
import { parseTaxonomy } from "../taxonomy";
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
              type26: { label: "Type 26" },
              fremm: { label: "FREMM" },
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
  subsurface: {
    label: "Subsurface",
    children: {
      submarine: {
        label: "Submarine",
        children: {
          astute: { label: "Astute" },
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

describe("array_filter — compound platform filtering (US1)", () => {
  // Spec Acceptance Scenario 1:
  // GB surface + DE subsurface — compound filter for GB+subsurface → NO match
  it("mixed platforms (GB surface + DE subsurface) with GB+subsurface filter returns no match", () => {
    const item = makeItem("mixed", {
      platforms: [
        { id: "HMS_ARGYLL", nationality: "GB", domain: "surface" },
        { id: "U31", nationality: "DE", domain: "subsurface" },
      ],
    });

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

    expect(engine.matches(item, expr)).toBe(false);
  });

  // Spec Acceptance Scenario 2:
  // Single GB subsurface platform → MATCH
  it("single platform (GB subsurface) with GB+subsurface filter returns match", () => {
    const item = makeItem("gb-sub", {
      platforms: [
        { id: "HMS_ASTUTE", nationality: "GB", domain: "subsurface", vessel_role: "submarine" },
      ],
    });

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

    expect(engine.matches(item, expr)).toBe(true);
  });

  // Spec Acceptance Scenario 3:
  // Two GB platforms (surface + subsurface) → MATCH via second element
  it("two GB platforms (surface + subsurface) with GB+subsurface filter matches via second element", () => {
    const item = makeItem("two-gb", {
      platforms: [
        { id: "HMS_ARGYLL", nationality: "GB", domain: "surface" },
        { id: "HMS_ASTUTE", nationality: "GB", domain: "subsurface" },
      ],
    });

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

    expect(engine.matches(item, expr)).toBe(true);
  });

  // Edge case: OR sub-predicate
  it("OR sub-predicate (nationality GB OR US) AND domain subsurface", () => {
    const item = makeItem("us-sub", {
      platforms: [
        { id: "USS_VIRGINIA", nationality: "US", domain: "subsurface" },
      ],
    });
    const itemNoMatch = makeItem("de-sub", {
      platforms: [
        { id: "U31", nationality: "DE", domain: "subsurface" },
      ],
    });

    const expr: FilterExpression = {
      predicates: [],
      orGroups: [],
      arrayFilters: [
        {
          array: "platforms",
          predicate: {
            kind: "and",
            children: [
              {
                kind: "or",
                children: [
                  { kind: "comparison", field: "nationality", value: "GB" },
                  { kind: "comparison", field: "nationality", value: "US" },
                ],
              },
              { kind: "comparison", field: "domain", value: "subsurface" },
            ],
          },
        },
      ],
    };

    expect(engine.matches(item, expr)).toBe(true);
    expect(engine.matches(itemNoMatch, expr)).toBe(false);
  });

  // Edge case: empty platforms array → false
  it("empty platforms array returns false", () => {
    const item = makeItem("empty", { platforms: [] });

    const expr: FilterExpression = {
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
        },
      ],
    };

    expect(engine.matches(item, expr)).toBe(false);
  });

  // Edge case: null/missing platform fields → false for that element
  it("null/missing platform fields return false for that element", () => {
    const item = makeItem("partial", {
      platforms: [
        { id: "UNKNOWN" }, // no nationality or domain
      ],
    });

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
              { kind: "comparison", field: "domain", value: "surface" },
            ],
          },
        },
      ],
    };

    expect(engine.matches(item, expr)).toBe(false);
  });

  // Multiple arrayFilters are AND'd together
  it("multiple arrayFilters in one expression are AND'd together", () => {
    const item = makeItem("multi", {
      platforms: [
        { id: "HMS_ARGYLL", nationality: "GB", domain: "surface" },
        { id: "USS_VIRGINIA", nationality: "US", domain: "subsurface" },
      ],
    });

    const expr: FilterExpression = {
      predicates: [],
      orGroups: [],
      arrayFilters: [
        {
          array: "platforms",
          predicate: { kind: "comparison", field: "nationality", value: "GB" },
        },
        {
          array: "platforms",
          predicate: { kind: "comparison", field: "nationality", value: "US" },
        },
      ],
    };

    // Both filters satisfied (one GB platform + one US platform)
    expect(engine.matches(item, expr)).toBe(true);

    // Item with only GB platforms — second arrayFilter (US) fails
    const gbOnly = makeItem("gb-only", {
      platforms: [
        { id: "HMS_ARGYLL", nationality: "GB", domain: "surface" },
      ],
    });
    expect(engine.matches(gbOnly, expr)).toBe(false);
  });

  // Empty arrayFilters matches all items (no-op)
  it("empty arrayFilters field matches all items", () => {
    const item = makeItem("any", {
      platforms: [{ id: "HMS_ARGYLL", nationality: "GB", domain: "surface" }],
    });

    const expr: FilterExpression = {
      predicates: [],
      orGroups: [],
      arrayFilters: [],
    };

    expect(engine.matches(item, expr)).toBe(true);
  });

  // Undefined arrayFilters matches all items (backward compatibility)
  it("undefined arrayFilters matches all items", () => {
    const item = makeItem("any", {
      platforms: [{ id: "HMS_ARGYLL", nationality: "GB", domain: "surface" }],
    });

    const expr: FilterExpression = {
      predicates: [],
      orGroups: [],
    };

    expect(engine.matches(item, expr)).toBe(true);
  });

  // Mixed expression with existing predicates + arrayFilters
  it("mixed expression with existing predicates + arrayFilters", () => {
    const items = [
      makeItem("1", {
        title: "Exercise Alpha",
        platforms: [{ id: "HMS_ARGYLL", nationality: "GB", domain: "surface" }],
        tags: ["ASW"],
      }),
      makeItem("2", {
        title: "Exercise Beta",
        platforms: [{ id: "HMS_ARGYLL", nationality: "GB", domain: "surface" }],
        tags: ["training"],
      }),
      makeItem("3", {
        title: "Exercise Gamma",
        platforms: [{ id: "USS_PORTER", nationality: "US", domain: "surface" }],
        tags: ["ASW"],
      }),
    ];

    const expr: FilterExpression = {
      predicates: [{ type: "tag", value: "ASW" }],
      orGroups: [],
      arrayFilters: [
        {
          array: "platforms",
          predicate: { kind: "comparison", field: "nationality", value: "GB" },
        },
      ],
    };

    const result = engine.filter(items, expr);
    // Only item 1 has ASW tag AND GB platform
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe("1");
  });

  // Case-insensitive matching
  it("comparison is case-insensitive for non-id fields", () => {
    const item = makeItem("ci", {
      platforms: [{ id: "HMS_ARGYLL", nationality: "gb", domain: "Surface" }],
    });

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
              { kind: "comparison", field: "domain", value: "surface" },
            ],
          },
        },
      ],
    };

    expect(engine.matches(item, expr)).toBe(true);
  });

  // ID field is case-sensitive
  it("id field comparison is case-sensitive", () => {
    const item = makeItem("cs", {
      platforms: [{ id: "HMS_ARGYLL", nationality: "GB", domain: "surface" }],
    });

    const matchExpr: FilterExpression = {
      predicates: [],
      orGroups: [],
      arrayFilters: [
        {
          array: "platforms",
          predicate: { kind: "comparison", field: "id", value: "HMS_ARGYLL" },
        },
      ],
    };

    const noMatchExpr: FilterExpression = {
      predicates: [],
      orGroups: [],
      arrayFilters: [
        {
          array: "platforms",
          predicate: { kind: "comparison", field: "id", value: "hms_argyll" },
        },
      ],
    };

    expect(engine.matches(item, matchExpr)).toBe(true);
    expect(engine.matches(item, noMatchExpr)).toBe(false);
  });
});

describe("array_filter — taxonomy expansion in compound predicates (US3)", () => {
  // GB nationality + vessel_class=frigate matches type23
  it("GB + vessel_class=frigate matches platform with vessel_class=surface/warship/frigate/type23", () => {
    const item = makeItem("gb-t23", {
      platforms: [
        { id: "HMS_ARGYLL", nationality: "GB", vessel_class: "surface/warship/frigate/type23" },
      ],
    });

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
              { kind: "comparison", field: "vessel_class", value: "frigate" },
            ],
          },
        },
      ],
    };

    expect(engine.matches(item, expr)).toBe(true);
  });

  // DE nationality + vessel_class=frigate does NOT match GB type23
  it("DE + vessel_class=frigate does NOT match GB type23 platform", () => {
    const item = makeItem("gb-t23", {
      platforms: [
        { id: "HMS_ARGYLL", nationality: "GB", vessel_class: "surface/warship/frigate/type23" },
      ],
    });

    const expr: FilterExpression = {
      predicates: [],
      orGroups: [],
      arrayFilters: [
        {
          array: "platforms",
          predicate: {
            kind: "and",
            children: [
              { kind: "comparison", field: "nationality", value: "DE" },
              { kind: "comparison", field: "vessel_class", value: "frigate" },
            ],
          },
        },
      ],
    };

    expect(engine.matches(item, expr)).toBe(false);
  });

  // vessel_class=warship expands to match all warship descendants
  it("vessel_class=warship expands to match all warship descendants", () => {
    const items = [
      makeItem("frigate", {
        platforms: [{ id: "P1", vessel_class: "surface/warship/frigate/type23" }],
      }),
      makeItem("destroyer", {
        platforms: [{ id: "P2", vessel_class: "surface/warship/destroyer/type45" }],
      }),
      makeItem("submarine", {
        platforms: [{ id: "P3", vessel_class: "subsurface/submarine/astute" }],
      }),
    ];

    const expr: FilterExpression = {
      predicates: [],
      orGroups: [],
      arrayFilters: [
        {
          array: "platforms",
          predicate: { kind: "comparison", field: "vessel_class", value: "warship" },
        },
      ],
    };

    const result = engine.filter(items, expr);
    expect(result).toHaveLength(2);
    expect(result.map((i) => i.id)).toEqual(["frigate", "destroyer"]);
  });

  // Unknown taxonomy node returns false
  it("vessel_class with unknown taxonomy node returns false", () => {
    const item = makeItem("unknown", {
      platforms: [{ id: "P1", vessel_class: "surface/warship/frigate/type23" }],
    });

    const expr: FilterExpression = {
      predicates: [],
      orGroups: [],
      arrayFilters: [
        {
          array: "platforms",
          predicate: { kind: "comparison", field: "vessel_class", value: "carrier" },
        },
      ],
    };

    expect(engine.matches(item, expr)).toBe(false);
  });
});

describe("array_filter — negated compound predicates (US4)", () => {
  // Negated GB+subsurface excludes item with British submarine
  it("negated GB+subsurface filter excludes item with British submarine", () => {
    const item = makeItem("gb-sub", {
      platforms: [
        { id: "HMS_ASTUTE", nationality: "GB", domain: "subsurface" },
      ],
    });

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

    expect(engine.matches(item, expr)).toBe(false);
  });

  // Negated GB+subsurface includes item with only surface platforms
  it("negated GB+subsurface filter includes item with only surface platforms", () => {
    const item = makeItem("surface-only", {
      platforms: [
        { id: "HMS_ARGYLL", nationality: "GB", domain: "surface" },
      ],
    });

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

    expect(engine.matches(item, expr)).toBe(true);
  });

  // Negated with empty platforms → true (no element to match, negated no-match = true)
  it("negated array_filter with empty platforms returns true", () => {
    const item = makeItem("empty", { platforms: [] });

    const expr: FilterExpression = {
      predicates: [],
      orGroups: [],
      arrayFilters: [
        {
          array: "platforms",
          predicate: { kind: "comparison", field: "nationality", value: "GB" },
          negated: true,
        },
      ],
    };

    expect(engine.matches(item, expr)).toBe(true);
  });
});
