import { describe, expect, it } from "vitest";
import { ALL_CHIP_COLOURS, colourFor } from "../lib/colour.mjs";

describe("colourFor", () => {
  it("maps every documented FilterType to a known palette colour", () => {
    const filterTypes = [
      "nationality",
      "vessel-class",
      "vessel_type",
      "vessel_role",
      "track-name",
      "domain",
      "exercise",
      "tag",
      "tags",
      "feature_tags",
      "year",
    ];
    for (const ft of filterTypes) {
      expect(ALL_CHIP_COLOURS).toContain(colourFor(ft));
    }
  });

  it("maps nationality → nationality (blue)", () => {
    expect(colourFor("nationality")).toBe("nationality");
  });

  it("maps vessel-class → vessel (green) — both kebab and snake variants", () => {
    expect(colourFor("vessel-class")).toBe("vessel");
    expect(colourFor("vessel_class")).toBe("vessel");
    expect(colourFor("vessel_type")).toBe("vessel");
  });

  it("maps tag, tags, feature_tags → tag (amber)", () => {
    expect(colourFor("tag")).toBe("tag");
    expect(colourFor("tags")).toBe("tag");
    expect(colourFor("feature_tags")).toBe("tag");
  });

  it("falls back to tag for unknown filter types (no crashes)", () => {
    expect(colourFor("totally-bogus")).toBe("tag");
    expect(colourFor("")).toBe("tag");
    expect(colourFor(undefined)).toBe("tag");
    expect(colourFor(null)).toBe("tag");
  });

  it("only emits values from the published palette", () => {
    for (const ft of ["nationality", "vessel-class", "domain", "exercise", "tag", "year"]) {
      expect(ALL_CHIP_COLOURS).toContain(colourFor(ft));
    }
  });
});
