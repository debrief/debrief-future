import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { validatePlot } from "../validate";
import type { Plot } from "../types";

const FIXTURES_ROOT = resolve(
  __dirname,
  "..",
  "..",
  "..",
  "..",
  "schemas",
  "src",
  "fixtures",
);

function loadFixture(sub: "valid" | "invalid", name: string): Plot {
  const path = resolve(FIXTURES_ROOT, sub, name);
  return JSON.parse(readFileSync(path, "utf8")) as Plot;
}

describe("validatePlot", () => {
  it("accepts the full-featured valid fixture", () => {
    const plot = loadFixture("valid", "storyboard-full-featured.json");
    expect(() => validatePlot(plot)).not.toThrow();
  });

  it("accepts the minimal valid FeatureCollection", () => {
    const plot = loadFixture("valid", "storyboard-scene-minimal.json");
    expect(() => validatePlot(plot)).not.toThrow();
  });

  it("rejects the duplicate-timestamp invalid fixture with DuplicateTimestamp", () => {
    const plot = loadFixture(
      "invalid",
      "storyboard-scene-duplicate-timestamp.json",
    );
    expect(() => validatePlot(plot)).toThrowError(
      expect.objectContaining({ code: "DuplicateTimestamp" }),
    );
  });

  it("rejects the orphan-scene invalid fixture with OrphanScene", () => {
    const plot = loadFixture("invalid", "storyboard-scene-orphan.json");
    expect(() => validatePlot(plot)).toThrowError(
      expect.objectContaining({ code: "OrphanScene" }),
    );
  });

  it("rejects a bearing-nonzero Scene with ReservedSlotViolation", () => {
    const bad = loadFixture("invalid", "storyboard-scene-bearing-nonzero.json");
    // Single-Feature fixture — wrap in a one-Scene + one-matching-Storyboard
    // FeatureCollection so validatePlot can scan it.
    const asCollection: Plot = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          id: (bad.properties as { storyboard_id: string }).storyboard_id,
          geometry: { type: "Polygon", coordinates: [] },
          properties: {
            kind: "STORYBOARD",
            id: (bad.properties as { storyboard_id: string }).storyboard_id,
            name: "Wrapper",
            schema_version: 1,
          },
        },
        bad as unknown as Plot["features"][number],
      ],
    };
    expect(() => validatePlot(asCollection)).toThrowError(
      expect.objectContaining({ code: "ReservedSlotViolation" }),
    );
  });

  it("rejects a non-null time_range Scene with ReservedSlotViolation", () => {
    const bad = loadFixture(
      "invalid",
      "storyboard-scene-non-null-time-range.json",
    );
    const asCollection: Plot = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          id: (bad.properties as { storyboard_id: string }).storyboard_id,
          geometry: { type: "Polygon", coordinates: [] },
          properties: {
            kind: "STORYBOARD",
            id: (bad.properties as { storyboard_id: string }).storyboard_id,
            name: "Wrapper",
            schema_version: 1,
          },
        },
        bad as unknown as Plot["features"][number],
      ],
    };
    expect(() => validatePlot(asCollection)).toThrowError(
      expect.objectContaining({ code: "ReservedSlotViolation" }),
    );
  });
});
