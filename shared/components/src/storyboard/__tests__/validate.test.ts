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

  it("AT-001 (FR-001) accepts the tied-timestamp fixture (three Scenes sharing a timestamp)", () => {
    const plot = loadFixture("valid", "storyboard-tied-timestamps.json");
    expect(() => validatePlot(plot)).not.toThrow();
  });

  it("AT-013 (FC-I4) rejects the duplicate-creation_order fixture", () => {
    const plot = loadFixture(
      "invalid",
      "storyboard-scene-duplicate-creation-order.json",
    );
    expect(() => validatePlot(plot)).toThrowError(
      expect.objectContaining({ code: "DuplicateCreationOrder" }),
    );
  });

  it("AT-015 (FC-V1) rejects a pre-#259 plot with UnsupportedSchemaVersion before FC-I5 fires", () => {
    const plot = loadFixture(
      "invalid",
      "storyboard-scene-missing-creation-order.json",
    );
    expect(() => validatePlot(plot)).toThrowError(
      expect.objectContaining({ code: "UnsupportedSchemaVersion" }),
    );
  });

  it("AT-010 (FC-I5) rejects a hand-edited plot whose Scenes lack creation_order even when schema_version is current", () => {
    // Force-bump schema_version so FC-V1 passes, exposing the FC-I5 gate.
    const plot = loadFixture(
      "invalid",
      "storyboard-scene-missing-creation-order.json",
    );
    for (const f of plot.features) {
      if (
        (f as { properties?: { kind?: string } }).properties?.kind === "STORYBOARD"
      ) {
        (f as { properties: { schema_version: number } }).properties.schema_version = 2;
      }
    }
    expect(() => validatePlot(plot)).toThrowError(
      expect.objectContaining({ code: "MissingCreationOrder" }),
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
    // FeatureCollection so validatePlot can scan it. Storyboard's
    // schema_version is bumped to 2 so FC-V1 passes and FC-I3 / I5 / I4 /
    // ReservedSlot can run.
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
            schema_version: 2,
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
            schema_version: 2,
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
