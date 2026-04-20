import { describe, expect, it } from "vitest";

import {
  canonicaliseVisibleFeatureIds,
  computeFeatureSetHash,
} from "../hash";
import { ReservedSlotViolationError } from "../errors";

describe("canonicaliseVisibleFeatureIds", () => {
  it("trims whitespace", () => {
    expect(canonicaliseVisibleFeatureIds(["  foo  "])).toEqual(["foo"]);
  });

  it("dedupes and sorts lexicographically", () => {
    expect(canonicaliseVisibleFeatureIds(["b", "a", "a", "c"])).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("rejects empty-after-trim with ReservedSlotViolationError", () => {
    expect(() => canonicaliseVisibleFeatureIds(["   "])).toThrow(
      ReservedSlotViolationError,
    );
  });

  it("rejects empty string with ReservedSlotViolationError", () => {
    expect(() => canonicaliseVisibleFeatureIds(["a", ""])).toThrow(
      ReservedSlotViolationError,
    );
  });

  it("returns a new array (input not mutated)", () => {
    const input = ["b", "a"];
    const output = canonicaliseVisibleFeatureIds(input);
    expect(input).toEqual(["b", "a"]);
    expect(output).not.toBe(input);
  });

  it("is idempotent: canonicalise(canonicalise(x)) === canonicalise(x)", () => {
    const x = ["zulu", "alpha", "bravo"];
    const once = canonicaliseVisibleFeatureIds(x);
    const twice = canonicaliseVisibleFeatureIds(once);
    expect(twice).toEqual(once);
  });
});

describe("computeFeatureSetHash", () => {
  it("returns SHA-256 hex (lowercase, 64 chars)", async () => {
    const hash = await computeFeatureSetHash(["a"]);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("matches the known vector for an empty list", async () => {
    expect(await computeFeatureSetHash([])).toBe(
      "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
    );
  });

  it("produces the same hash for reordered + duplicated + whitespace-padded inputs", async () => {
    const a = await computeFeatureSetHash(["alpha", "bravo", "charlie"]);
    const b = await computeFeatureSetHash([
      "  charlie",
      "alpha ",
      "bravo",
      "alpha",
    ]);
    expect(a).toBe(b);
  });

  it("rejects empty-string IDs", async () => {
    await expect(
      computeFeatureSetHash(["alpha", ""]),
    ).rejects.toThrow(ReservedSlotViolationError);
  });
});
