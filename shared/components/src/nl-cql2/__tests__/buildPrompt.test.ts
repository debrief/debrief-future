/**
 * Tests for `buildPrompt` (#188 T017).
 *
 * Asserts:
 *   - every `FilterType` property path from `PROPERTY_MAP` appears in the
 *     prompt (guards against schema-description drift);
 *   - the worked-example phrases are present (they teach the LLM the
 *     `array_filter` pattern);
 *   - the prompt ends with the phrase suffix;
 *   - prompt size < 20 KB for the current enum bundle (SC-004 / decision
 *     15A).
 */

import { describe, expect, it } from "vitest";
import { buildPrompt } from "../buildPrompt";
import { loadEnumBundle } from "./loadEnumBundle";
import { PROPERTY_MAP } from "../../filter-engine";

describe("buildPrompt (T017)", () => {
  it("contains every FilterType property path from PROPERTY_MAP", () => {
    const enums = loadEnumBundle();
    const prompt = buildPrompt("UK submarines", enums);
    for (const property of Object.values(PROPERTY_MAP)) {
      expect(prompt).toContain(property);
    }
  });

  it("contains both worked examples", () => {
    const enums = loadEnumBundle();
    const prompt = buildPrompt("UK submarines", enums);
    expect(prompt).toMatch(/Example 1:.*British author Smith/);
    expect(prompt).toMatch(/Example 2:.*French frigates on ASW operations/);
    // The compound example must mention array_filter
    expect(prompt).toContain("array_filter");
  });

  it("ends with the phrase suffix", () => {
    const enums = loadEnumBundle();
    const prompt = buildPrompt("UK submarines", enums);
    expect(prompt.trimEnd().endsWith("Phrase: UK submarines")).toBe(true);
  });

  it("includes every nationality, exercise name, tag, and feature tag", () => {
    const enums = loadEnumBundle();
    const prompt = buildPrompt("test", enums);
    for (const nat of enums.nationalities) expect(prompt).toContain(nat);
    for (const ex of enums.exercise_names) expect(prompt).toContain(ex);
    for (const tag of enums.tags) expect(prompt).toContain(tag);
    for (const tag of enums.feature_tags) expect(prompt).toContain(tag);
  });

  it("renders the vessel-class taxonomy with labels and paths", () => {
    const enums = loadEnumBundle();
    const prompt = buildPrompt("test", enums);
    expect(prompt).toContain("Submarine");
    expect(prompt).toContain("subsurface/submarine");
    expect(prompt).toContain("Type 23 (Duke-class)");
    expect(prompt).toContain("surface/warship/frigate/type23");
  });

  it("prompt size is under 20 KB (SC-004 / decision 15A)", () => {
    const enums = loadEnumBundle();
    const prompt = buildPrompt("UK submarines", enums);
    const bytes = Buffer.byteLength(prompt, "utf-8");
    expect(bytes).toBeLessThan(20_480);
  });

  it("prompt size is independent of the phrase length", () => {
    const enums = loadEnumBundle();
    const short = buildPrompt("UK", enums);
    const longer = buildPrompt("UK submarines in the Northern Approaches", enums);
    // The delta is exactly the phrase length difference.
    const delta =
      Buffer.byteLength(longer, "utf-8") - Buffer.byteLength(short, "utf-8");
    expect(delta).toBe("UK submarines in the Northern Approaches".length - "UK".length);
  });
});
