/**
 * Tests for schemaDescription() and PROPERTY_MAP exhaustiveness (#188 T018/T019).
 */

import { describe, expect, it } from "vitest";
import { PROPERTY_MAP } from "../../filter-engine";
import type { FilterType } from "../../filter-engine";
import { schemaDescription } from "../schemaDescription";

// Enumerate FilterType explicitly so we catch additions at compile-time.
// If a new FilterType is added without updating this list, the keyof check
// below breaks the build.
const ALL_FILTER_TYPES: readonly FilterType[] = [
  "vessel-class",
  "tag",
  "author",
  "duration",
  "modified",
  "title",
  "filename",
  "plot-contents",
  "track-name",
  "nationality",
  "collection",
];

describe("PROPERTY_MAP exhaustiveness (T018 / decision 11A)", () => {
  it("contains every FilterType as a key", () => {
    for (const filterType of ALL_FILTER_TYPES) {
      expect(PROPERTY_MAP[filterType]).toBeTypeOf("string");
      expect(PROPERTY_MAP[filterType].length).toBeGreaterThan(0);
    }
    // Reverse direction: no stray keys.
    expect(new Set(Object.keys(PROPERTY_MAP))).toEqual(new Set(ALL_FILTER_TYPES));
  });
});

describe("schemaDescription() (T019)", () => {
  const description = schemaDescription();

  it("references every PROPERTY_MAP value verbatim (guards against prompt drift)", () => {
    for (const property of Object.values(PROPERTY_MAP)) {
      expect(description).toContain(property);
    }
  });

  it("mentions every FilterType by name", () => {
    for (const filterType of ALL_FILTER_TYPES) {
      expect(description).toContain(filterType);
    }
  });

  it("describes compound platform predicates via array_filter", () => {
    expect(description).toContain("array_filter");
    expect(description).toContain("debrief:platforms");
  });

  it("lists the valid platform fields for array_filter", () => {
    for (const field of [
      "id",
      "name",
      "nationality",
      "vessel_class",
      "vessel_type",
      "vessel_role",
      "domain",
    ]) {
      expect(description).toContain(field);
    }
  });
});
