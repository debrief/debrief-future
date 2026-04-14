/**
 * Tests for buildPrompt() (#188 T017).
 *
 * Verifies the prompt contains every FilterType property path, the two
 * worked examples, ends with the phrase suffix, and stays under SC-004's
 * 20_480-byte ceiling for the current enum bundle.
 */

import { describe, expect, it } from "vitest";
import { PROPERTY_MAP } from "../../filter-engine";
import { buildPrompt } from "../buildPrompt";
import { loadEnumBundle } from "../loadEnumBundle";

describe("buildPrompt()", () => {
  const enums = loadEnumBundle();
  const phrase = "UK submarines";
  const prompt = buildPrompt(phrase, enums);

  it("contains every FilterType property path", () => {
    for (const property of Object.values(PROPERTY_MAP)) {
      expect(prompt).toContain(property);
    }
  });

  it("includes both worked examples", () => {
    expect(prompt).toContain("Example 1");
    expect(prompt).toContain("Example 2");
    expect(prompt).toContain("array_filter");
  });

  it("includes the enum bundle content", () => {
    expect(prompt).toContain("nationalities");
    expect(prompt).toContain("exercise_names");
    expect(prompt).toContain("tags");
    expect(prompt).toContain("feature_tags");
    expect(prompt).toContain("vessel_class_tree");
  });

  it("ends with the phrase suffix", () => {
    expect(prompt.endsWith(`Phrase: ${phrase}`)).toBe(true);
  });

  it("stays under the 20_480 byte ceiling (SC-004 / decision 15A)", () => {
    const size = Buffer.byteLength(prompt, "utf-8");
    expect(size).toBeLessThan(20_480);
  });

  it("canonicalises whitespace within the phrase by echoing it verbatim", () => {
    // The generator canonicalises before fixture lookup; buildPrompt itself
    // must echo the input exactly so a round-trip through the pipeline
    // preserves intent.
    const raw = "  multiple   spaces  ";
    expect(buildPrompt(raw, enums).endsWith(`Phrase: ${raw}`)).toBe(true);
  });
});
