import { describe, expect, it } from "vitest";
import { getMatcher } from "../matchers";
import { buildDescendantMap, parseTaxonomy } from "../taxonomy";
import type { StacBrowserItem, VesselTaxonomyNode } from "../types";

const TAXONOMY: VesselTaxonomyNode[] = parseTaxonomy({
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
            children: {
              type45: { label: "Type 45" },
            },
          },
        },
      },
    },
  },
});

const DESC_MAP = buildDescendantMap(TAXONOMY);

function makeItem(overrides: Partial<StacBrowserItem> = {}): StacBrowserItem {
  return {
    id: "test-item",
    title: "Exercise Alpha",
    itemPath: "/catalog/test-item/item.json",
    bbox: [-10, 40, 5, 55],
    datetime: null,
    startDatetime: "2025-06-01T00:00:00Z",
    endDatetime: "2025-06-01T04:00:00Z",
    vesselClasses: ["surface/warship/frigate/type23"],
    tags: ["ASW", "training"],
    featureTags: ["sonar-contact"],
    author: "Lt Cmdr Smith",
    trackNames: ["HMS Argyll", "USS Porter"],
    nationalities: ["GB", "US"],
    collection: "exercises-2025",
    ...overrides,
  };
}

describe("vessel-class matcher", () => {
  const match = getMatcher("vessel-class");

  it("matches exact leaf node", () => {
    expect(match(makeItem(), "type23", DESC_MAP)).toBe(true);
  });

  it("matches parent node (hierarchical expansion)", () => {
    expect(match(makeItem(), "frigate", DESC_MAP)).toBe(true);
  });

  it("matches grandparent node", () => {
    expect(match(makeItem(), "warship", DESC_MAP)).toBe(true);
  });

  it("does not match sibling node", () => {
    expect(match(makeItem(), "type45", DESC_MAP)).toBe(false);
  });

  it("does not match unknown taxonomy path", () => {
    expect(match(makeItem(), "nonexistent", DESC_MAP)).toBe(false);
  });

  it("returns false for empty vesselClasses", () => {
    expect(match(makeItem({ vesselClasses: [] }), "frigate", DESC_MAP)).toBe(false);
  });
});

describe("tag matcher (merged plot-tag + feature-tag)", () => {
  const match = getMatcher("tag");

  it("matches plot tag (case-insensitive)", () => {
    expect(match(makeItem(), "asw", DESC_MAP)).toBe(true);
    expect(match(makeItem(), "ASW", DESC_MAP)).toBe(true);
  });

  it("matches feature tag (case-insensitive)", () => {
    expect(match(makeItem(), "Sonar-Contact", DESC_MAP)).toBe(true);
  });

  it("does not match absent tag", () => {
    expect(match(makeItem(), "convoy", DESC_MAP)).toBe(false);
  });

  it("returns false for empty tags and featureTags", () => {
    expect(match(makeItem({ tags: [], featureTags: [] }), "ASW", DESC_MAP)).toBe(false);
  });
});

describe("author matcher", () => {
  const match = getMatcher("author");

  it("matches case-insensitively", () => {
    expect(match(makeItem(), "lt cmdr smith", DESC_MAP)).toBe(true);
    expect(match(makeItem(), "LT CMDR SMITH", DESC_MAP)).toBe(true);
  });

  it("does not match partial string", () => {
    expect(match(makeItem(), "Smith", DESC_MAP)).toBe(false);
  });

  it("returns false for null author", () => {
    expect(match(makeItem({ author: null }), "Smith", DESC_MAP)).toBe(false);
  });
});

describe("duration matcher", () => {
  const match = getMatcher("duration");

  it("matches <6H for 4-hour exercise", () => {
    expect(match(makeItem(), "<6H", DESC_MAP)).toBe(true);
  });

  it("matches <24H for 4-hour exercise", () => {
    expect(match(makeItem(), "<24H", DESC_MAP)).toBe(true);
  });

  it("does not match >10D for 4-hour exercise", () => {
    expect(match(makeItem(), ">10D", DESC_MAP)).toBe(false);
  });

  it("treats zero duration for datetime-only items", () => {
    const item = makeItem({
      startDatetime: null,
      endDatetime: null,
      datetime: "2025-06-01T12:00:00Z",
    });
    expect(match(item, "<6H", DESC_MAP)).toBe(true);
    expect(match(item, ">10D", DESC_MAP)).toBe(false);
  });

  it("handles long duration exercise", () => {
    const item = makeItem({
      startDatetime: "2025-06-01T00:00:00Z",
      endDatetime: "2025-06-15T00:00:00Z", // 14 days
    });
    expect(match(item, ">10D", DESC_MAP)).toBe(true);
    expect(match(item, "<10D", DESC_MAP)).toBe(false);
  });

  it("returns false for unknown bucket", () => {
    expect(match(makeItem(), "INVALID", DESC_MAP)).toBe(false);
  });
});

describe("title matcher", () => {
  const match = getMatcher("title");

  it("matches case-insensitive substring", () => {
    expect(match(makeItem(), "alpha", DESC_MAP)).toBe(true);
    expect(match(makeItem(), "EXERCISE", DESC_MAP)).toBe(true);
  });

  it("does not match absent substring", () => {
    expect(match(makeItem(), "bravo", DESC_MAP)).toBe(false);
  });

  it("returns false for empty title", () => {
    expect(match(makeItem({ title: "" }), "alpha", DESC_MAP)).toBe(false);
  });
});

describe("track-name matcher", () => {
  const match = getMatcher("track-name");

  it("matches case-insensitively", () => {
    expect(match(makeItem(), "hms argyll", DESC_MAP)).toBe(true);
  });

  it("does not match absent track", () => {
    expect(match(makeItem(), "HMS Victory", DESC_MAP)).toBe(false);
  });
});

describe("nationality matcher", () => {
  const match = getMatcher("nationality");

  it("matches case-insensitively", () => {
    expect(match(makeItem(), "gb", DESC_MAP)).toBe(true);
    expect(match(makeItem(), "GB", DESC_MAP)).toBe(true);
  });

  it("does not match absent nationality", () => {
    expect(match(makeItem(), "FR", DESC_MAP)).toBe(false);
  });
});

describe("collection matcher", () => {
  const match = getMatcher("collection");

  it("matches exact collection ID", () => {
    expect(match(makeItem(), "exercises-2025", DESC_MAP)).toBe(true);
  });

  it("does not match wrong collection", () => {
    expect(match(makeItem(), "exercises-2024", DESC_MAP)).toBe(false);
  });

  it("is case-sensitive", () => {
    expect(match(makeItem(), "Exercises-2025", DESC_MAP)).toBe(false);
  });

  it("returns false for null collection", () => {
    expect(match(makeItem({ collection: null }), "exercises-2025", DESC_MAP)).toBe(false);
  });
});
