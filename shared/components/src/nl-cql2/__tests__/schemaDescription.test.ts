/**
 * Tests for `schemaDescription` (#188 T018 + T019).
 *
 * Asserts:
 *   - PROPERTY_MAP covers every value in the `FilterType` union (decision
 *     11A). Both a compile-time check (the exhaustiveness helper in
 *     schemaDescription.ts) and a runtime check here close the gap both ways.
 *   - `schemaDescription()` output references every `PROPERTY_MAP` value
 *     verbatim, so the prompt cannot drift from the evaluator at the
 *     assembly boundary.
 */

import { describe, expect, it } from "vitest";
import { schemaDescription } from "../schemaDescription";
import { PROPERTY_MAP } from "../../filter-engine";
import type { FilterType } from "../../filter-engine";

// The full FilterType union list; if a new FilterType is added upstream, the
// compile-time exhaustiveness helper in schemaDescription.ts will fail before
// this runtime check does — both serve as belt-and-braces.
const EXPECTED_FILTER_TYPES: readonly FilterType[] = [
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
  it("has one entry per FilterType union value", () => {
    for (const type of EXPECTED_FILTER_TYPES) {
      expect(PROPERTY_MAP[type]).toBeDefined();
      expect(typeof PROPERTY_MAP[type]).toBe("string");
      expect(PROPERTY_MAP[type].length).toBeGreaterThan(0);
    }
    expect(Object.keys(PROPERTY_MAP).sort()).toEqual(
      [...EXPECTED_FILTER_TYPES].sort(),
    );
  });

  it("distinct CQL2 property paths (bijection)", () => {
    const values = Object.values(PROPERTY_MAP);
    const unique = new Set(values);
    expect(unique.size).toBe(values.length);
  });
});

describe("schemaDescription (T019)", () => {
  it("references every PROPERTY_MAP value verbatim", () => {
    const desc = schemaDescription();
    for (const [filterType, property] of Object.entries(PROPERTY_MAP)) {
      expect(desc).toContain(filterType);
      expect(desc).toContain(property);
    }
  });

  it("describes the array_filter compound-predicate convention", () => {
    const desc = schemaDescription();
    expect(desc).toContain("array_filter");
    expect(desc).toContain("debrief:platforms");
  });

  it("names the allowed platform predicate body fields", () => {
    const desc = schemaDescription();
    for (const field of ["nationality", "domain", "vessel_type", "vessel_role", "vessel_class"]) {
      expect(desc).toContain(field);
    }
  });
});
