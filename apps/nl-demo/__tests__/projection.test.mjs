import { describe, expect, it } from "vitest";
import {
  buildVesselTypeIndex,
  projectCard,
  resolveNationality,
  resolveVesselType,
  truncateDescription,
} from "../lib/projection.mjs";

describe("truncateDescription", () => {
  it("returns short text unchanged", () => {
    expect(truncateDescription("hello world")).toBe("hello world");
  });

  it("truncates at the nearest word boundary and appends ellipsis", () => {
    const text = "alpha beta gamma delta epsilon";
    const out = truncateDescription(text, 12); // forces a cut inside the word "delta"
    expect(out.endsWith("…")).toBe(true);
    expect(out).not.toMatch(/del…/); // mid-word truncation is forbidden
    expect(out.length).toBeLessThanOrEqual(13);
  });

  it("never produces trailing whitespace before the ellipsis", () => {
    const text = "alpha beta gamma";
    const out = truncateDescription(text, 6);
    expect(out).toMatch(/\S…$/);
  });

  it("handles empty / non-string inputs without throwing", () => {
    expect(truncateDescription(undefined)).toBe("");
    expect(truncateDescription(null)).toBe("");
    expect(truncateDescription(123)).toBe("");
  });
});

describe("resolveNationality", () => {
  it("rewrites GB to UK (stakeholder-facing alias)", () => {
    expect(resolveNationality("GB")).toBe("UK");
    expect(resolveNationality("gb")).toBe("UK");
  });

  it("uppercases other ISO codes verbatim", () => {
    expect(resolveNationality("us")).toBe("US");
    expect(resolveNationality("FR")).toBe("FR");
  });

  it("returns empty string for missing values", () => {
    expect(resolveNationality(null)).toBe("");
    expect(resolveNationality(undefined)).toBe("");
    expect(resolveNationality("")).toBe("");
  });
});

describe("buildVesselTypeIndex + resolveVesselType", () => {
  const registry = {
    vessel_classes: {
      surface: {
        _class: { full_name: "Surface Vessel" },
        warship: {
          _class: { full_name: "Warship" },
          frigate: {
            _class: { full_name: "Frigate" },
            type23: { _class: { full_name: "Type 23 (Duke-class)" } },
          },
        },
      },
    },
  };

  it("indexes every node that has a _class.full_name entry", () => {
    const idx = buildVesselTypeIndex(registry);
    expect(idx.get("type23")).toBe("Type 23 (Duke-class)");
    expect(idx.get("frigate")).toBe("Frigate");
    expect(idx.get("warship")).toBe("Warship");
    expect(idx.get("surface")).toBe("Surface Vessel");
  });

  it("falls back to the raw code when not indexed", () => {
    const idx = buildVesselTypeIndex(registry);
    expect(resolveVesselType("type23", idx)).toBe("Type 23 (Duke-class)");
    expect(resolveVesselType("never-heard-of-it", idx)).toBe("never-heard-of-it");
  });
});

describe("projectCard", () => {
  const registry = {
    vesselTypeIndex: new Map([["type23", "Type 23 (Duke-class)"]]),
  };

  function makeItem(overrides = {}) {
    return {
      id: "core--boat1",
      title: "Saxon Warrior: Boat1",
      bbox: null,
      datetime: null,
      startDatetime: "1995-12-12T05:00:00+00:00",
      endDatetime: "1995-12-12T11:41:00+00:00",
      platforms: [
        {
          id: "NELSON",
          name: "HMS Nelson",
          nationality: "GB",
          vessel_class: "surface/warship/frigate/type23",
          vessel_type: "type23",
          vessel_role: "frigate",
          domain: "surface",
        },
      ],
      tags: ["EW", "mine-clearance", "training"],
      featureTags: ["helicopter-ops"],
      author: null,
      collection: null,
      modified: null,
      properties: {
        description: "Royal Navy training exercise in the English Channel.",
      },
      ...overrides,
    };
  }

  it("extracts title, year, description, and dedup'd badges", () => {
    const p = projectCard(makeItem(), registry);
    expect(p.title).toBe("Saxon Warrior: Boat1");
    expect(p.year).toBe("1995");
    expect(p.description).toContain("Royal Navy training exercise");
    expect(p.nationalityBadges).toEqual(["UK"]);
    expect(p.vesselBadges).toEqual(["Type 23 (Duke-class)"]);
  });

  it("caps tag badges at 3 and merges feature_tags after debrief tags", () => {
    const p = projectCard(
      makeItem({
        tags: ["alpha", "beta", "gamma", "delta"],
        featureTags: ["epsilon", "zeta"],
      }),
      registry,
    );
    expect(p.tagBadges).toHaveLength(3);
    expect(p.tagBadges[0]).toBe("alpha");
  });

  it("de-duplicates badges across multiple platforms with the same nationality", () => {
    const p = projectCard(
      makeItem({
        platforms: [
          { nationality: "GB", vessel_type: "type23" },
          { nationality: "GB", vessel_type: "type23" },
          { nationality: "GB", vessel_type: "type23" },
        ],
      }),
      registry,
    );
    expect(p.nationalityBadges).toEqual(["UK"]);
    expect(p.vesselBadges).toEqual(["Type 23 (Duke-class)"]);
  });

  it("handles missing description / dates gracefully", () => {
    const p = projectCard(
      makeItem({
        startDatetime: null,
        datetime: null,
        properties: {},
      }),
      registry,
    );
    expect(p.year).toBe("");
    expect(p.description).toBe("");
  });
});
