import { describe, expect, it } from "vitest";
import { cql2FromChips } from "../lib/recompute.mjs";
import { filterByCql2Json } from "../../../shared/components/src/filter-engine/index.ts";

describe("cql2FromChips", () => {
  it("returns null when no chips remain", () => {
    expect(cql2FromChips([])).toBeNull();
    expect(cql2FromChips(undefined)).toBeNull();
  });

  it("emits a top-level a_containedBy for one nationality chip", () => {
    const out = cql2FromChips([
      { filterType: "nationality", value: "GB" },
    ]);
    expect(out).toEqual({
      op: "a_containedBy",
      args: [["GB"], { property: "debrief:platforms[*].nationality" }],
    });
  });

  it("emits an array_filter for a domain (per-platform compound) chip", () => {
    const out = cql2FromChips([
      { filterType: "domain", value: "subsurface" },
    ]);
    expect(out).toEqual({
      op: "array_filter",
      args: [
        { property: "debrief:platforms" },
        { op: "=", args: [{ property: "domain" }, "subsurface"] },
      ],
    });
  });

  it("emits an AND of multiple chips", () => {
    const out = cql2FromChips([
      { filterType: "nationality", value: "GB" },
      { filterType: "domain", value: "subsurface" },
    ]);
    expect(out.op).toBe("and");
    expect(out.args).toHaveLength(2);
  });
});

// Round-trip integration: turn LozengeSeed[] into chips, then back into CQL2,
// and verify it filters the catalog the same way the original LLM-produced
// CQL2 does. This is the spec requirement (T031): "round-trip a LozengeSeed[]
// through chips and back to CQL2; assert filterByCql2Json returns the same
// items as the original".
describe("cql2FromChips round-trip with filterByCql2Json", () => {
  // Three sample plots: a UK frigate, a French frigate, and a UK submarine.
  const items = [
    {
      id: "uk-frigate",
      title: "UK Frigate",
      itemPath: "uk-frigate.json",
      bbox: null,
      datetime: null,
      startDatetime: null,
      endDatetime: null,
      platforms: [
        {
          id: "FR1",
          name: "HMS Frigate",
          nationality: "GB",
          vessel_class: "surface/warship/frigate/type23",
          vessel_type: "type23",
          vessel_role: "frigate",
          domain: "surface",
        },
      ],
      tags: [],
      featureTags: [],
      author: null,
      collection: null,
      modified: null,
    },
    {
      id: "fr-frigate",
      title: "French Frigate",
      itemPath: "fr-frigate.json",
      bbox: null,
      datetime: null,
      startDatetime: null,
      endDatetime: null,
      platforms: [
        {
          id: "FR2",
          name: "FS Aquitaine",
          nationality: "FR",
          vessel_class: "surface/warship/frigate/aquitaine",
          vessel_type: "aquitaine",
          vessel_role: "frigate",
          domain: "surface",
        },
      ],
      tags: [],
      featureTags: [],
      author: null,
      collection: null,
      modified: null,
    },
    {
      id: "uk-sub",
      title: "UK Submarine",
      itemPath: "uk-sub.json",
      bbox: null,
      datetime: null,
      startDatetime: null,
      endDatetime: null,
      platforms: [
        {
          id: "S1",
          name: "HMS Astute",
          nationality: "GB",
          vessel_class: "subsurface/submarine/ssn/astute",
          vessel_type: "astute",
          vessel_role: "submarine",
          domain: "subsurface",
        },
      ],
      tags: [],
      featureTags: [],
      author: null,
      collection: null,
      modified: null,
    },
  ];

  it("nationality=GB chip filters the same plots as the original CQL2", () => {
    const originalCql2 = {
      op: "array_filter",
      args: [
        { property: "debrief:platforms" },
        { op: "=", args: [{ property: "nationality" }, "GB"] },
      ],
    };
    const chips = [{ filterType: "nationality", value: "GB" }];
    const recomputed = cql2FromChips(chips);

    const a = filterByCql2Json(items, originalCql2).map((i) => i.id).sort();
    const b = filterByCql2Json(items, recomputed).map((i) => i.id).sort();
    expect(b).toEqual(a);
    expect(b).toEqual(["uk-frigate", "uk-sub"]);
  });

  it("nationality=GB AND domain=subsurface chips match exactly the UK submarine", () => {
    const chips = [
      { filterType: "nationality", value: "GB" },
      { filterType: "domain", value: "subsurface" },
    ];
    const recomputed = cql2FromChips(chips);
    const result = filterByCql2Json(items, recomputed).map((i) => i.id);
    expect(result).toEqual(["uk-sub"]);
  });
});
