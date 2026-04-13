import { describe, expect, it } from "vitest";
import { filterExpressionToCql2Json } from "../cql2-json";
import type { FilterExpression } from "../types";

describe("CQL2 JSON serialisation", () => {
  it("returns empty object for empty expression", () => {
    const expr: FilterExpression = { predicates: [], orGroups: [] };
    expect(filterExpressionToCql2Json(expr)).toEqual({});
  });

  it("serialises single scalar predicate", () => {
    const expr: FilterExpression = {
      predicates: [{ type: "author", value: "Smith" }],
      orGroups: [],
    };
    expect(filterExpressionToCql2Json(expr)).toEqual({
      op: "=",
      args: [{ property: "debrief:author" }, "Smith"],
    });
  });

  it("serialises single array predicate with a_containedBy", () => {
    const expr: FilterExpression = {
      predicates: [{ type: "nationality", value: "GB" }],
      orGroups: [],
    };
    expect(filterExpressionToCql2Json(expr)).toEqual({
      op: "a_containedBy",
      args: [["GB"], { property: "debrief:platforms[*].nationality" }],
    });
  });

  it("serialises title predicate with LIKE", () => {
    const expr: FilterExpression = {
      predicates: [{ type: "title", value: "atlantic" }],
      orGroups: [],
    };
    expect(filterExpressionToCql2Json(expr)).toEqual({
      op: "like",
      args: [{ property: "title" }, "%atlantic%"],
    });
  });

  it("serialises duration predicate with equality", () => {
    const expr: FilterExpression = {
      predicates: [{ type: "duration", value: "<24H" }],
      orGroups: [],
    };
    expect(filterExpressionToCql2Json(expr)).toEqual({
      op: "=",
      args: [{ property: "duration" }, "<24H"],
    });
  });

  it("serialises AND with multiple predicates", () => {
    const expr: FilterExpression = {
      predicates: [
        { type: "nationality", value: "GB" },
        { type: "author", value: "Smith" },
      ],
      orGroups: [],
    };
    const cql2 = filterExpressionToCql2Json(expr);
    expect(cql2).toEqual({
      op: "and",
      args: [
        { op: "a_containedBy", args: [["GB"], { property: "debrief:platforms[*].nationality" }] },
        { op: "=", args: [{ property: "debrief:author" }, "Smith"] },
      ],
    });
  });

  it("serialises OR group", () => {
    const expr: FilterExpression = {
      predicates: [],
      orGroups: [
        {
          predicates: [
            { type: "vessel-class", value: "type23" },
            { type: "vessel-class", value: "type45" },
          ],
        },
      ],
    };
    const cql2 = filterExpressionToCql2Json(expr);
    expect(cql2).toEqual({
      op: "or",
      args: [
        { op: "a_containedBy", args: [["type23"], { property: "debrief:platforms[*].vessel_class" }] },
        { op: "a_containedBy", args: [["type45"], { property: "debrief:platforms[*].vessel_class" }] },
      ],
    });
  });

  it("serialises mixed AND + OR", () => {
    const expr: FilterExpression = {
      predicates: [{ type: "nationality", value: "GB" }],
      orGroups: [
        {
          predicates: [
            { type: "vessel-class", value: "type23" },
            { type: "vessel-class", value: "type45" },
          ],
        },
      ],
    };
    const cql2 = filterExpressionToCql2Json(expr);
    expect(cql2).toEqual({
      op: "and",
      args: [
        { op: "a_containedBy", args: [["GB"], { property: "debrief:platforms[*].nationality" }] },
        {
          op: "or",
          args: [
            { op: "a_containedBy", args: [["type23"], { property: "debrief:platforms[*].vessel_class" }] },
            { op: "a_containedBy", args: [["type45"], { property: "debrief:platforms[*].vessel_class" }] },
          ],
        },
      ],
    });
  });

  it("flattens single-predicate OR group", () => {
    const expr: FilterExpression = {
      predicates: [],
      orGroups: [
        {
          predicates: [{ type: "nationality", value: "GB" }],
        },
      ],
    };
    // Single OR predicate should not produce an "or" wrapper
    expect(filterExpressionToCql2Json(expr)).toEqual({
      op: "a_containedBy",
      args: [["GB"], { property: "debrief:platforms[*].nationality" }],
    });
  });

  it("serialises all array-valued filter types", () => {
    const arrayTypes = [
      { type: "vessel-class" as const, prop: "debrief:platforms[*].vessel_class" },
      { type: "tag" as const, prop: "debrief:tags" },
      { type: "track-name" as const, prop: "debrief:platforms[*].name" },
      { type: "nationality" as const, prop: "debrief:platforms[*].nationality" },
    ];

    for (const { type, prop } of arrayTypes) {
      const expr: FilterExpression = {
        predicates: [{ type, value: "test" }],
        orGroups: [],
      };
      const cql2 = filterExpressionToCql2Json(expr);
      expect(cql2).toEqual({
        op: "a_containedBy",
        args: [["test"], { property: prop }],
      });
    }
  });

  it("serialises collection as scalar equality", () => {
    const expr: FilterExpression = {
      predicates: [{ type: "collection", value: "exercises-2025" }],
      orGroups: [],
    };
    expect(filterExpressionToCql2Json(expr)).toEqual({
      op: "=",
      args: [{ property: "collection" }, "exercises-2025"],
    });
  });
});
