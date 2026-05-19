/**
 * TypeScript adherence tests for Spec #263 Scene flavour XOR.
 *
 * Validates that the generated TS types include the new `TimeRange` class
 * and the `viewport_end` slot on `SceneProperties`, and that round-trips
 * of both Scene flavours (instant + time-range) are byte-equivalent.
 *
 * The XOR cross-field rule is enforced by `flavourCheck` in
 * `shared/components/src/storyboard/validate.ts` (and on the JSON-Schema
 * boundary via the generated if/then rules). This file pins the type
 * surface so any future schema change that drops a slot surfaces here.
 */
import { describe, it, expect, expectTypeOf } from "vitest";
import * as fs from "fs";
import * as path from "path";

import type {
  SceneFeature,
  TimeRange,
  Viewport,
} from "../../src/generated/typescript/types";

const FIXTURES_DIR = path.resolve(__dirname, "../../fixtures");

function loadFixture<T>(filename: string): T {
  const raw = fs.readFileSync(path.join(FIXTURES_DIR, filename), "utf-8");
  return JSON.parse(raw) as T;
}

function roundTrip<T>(data: T): T {
  return JSON.parse(JSON.stringify(data)) as T;
}

describe("Storyboard Scene flavour #263 — generated TS types", () => {
  it("exposes TimeRange interface with start + end string fields", () => {
    const tr: TimeRange = {
      start: "2026-05-15T12:00:00Z",
      end: "2026-05-15T12:01:30Z",
    };
    expectTypeOf(tr.start).toBeString();
    expectTypeOf(tr.end).toBeString();
  });

  it("SceneProperties carries optional time_range and viewport_end slots", () => {
    const fixture =
      loadFixture<SceneFeature>("scene-263-time-range-valid.json");
    expectTypeOf(fixture.properties.time_range).toEqualTypeOf<
      TimeRange | undefined
    >();
    expectTypeOf(fixture.properties.viewport_end).toEqualTypeOf<
      Viewport | undefined
    >();
  });

  it("round-trips a time-range Scene preserving both flavour slots", () => {
    const fixture =
      loadFixture<SceneFeature>("scene-263-time-range-valid.json");
    const result = roundTrip(fixture);
    expect(result.properties.time_range).toBeDefined();
    expect(result.properties.viewport_end).toBeDefined();
    expect(result.properties.time_range?.start).toBe(
      fixture.properties.time_range?.start,
    );
    expect(result.properties.time_range?.end).toBe(
      fixture.properties.time_range?.end,
    );
    expect(result.properties.viewport_end?.center).toEqual(
      fixture.properties.viewport_end?.center,
    );
    expect(result).toEqual(fixture);
  });

  it("instant Scene (no time_range, no viewport_end) round-trips unchanged", () => {
    const fixture = loadFixture<SceneFeature>(
      "scene-258-with-display-mode.json",
    );
    const result = roundTrip(fixture);
    expect(result.properties.time_range).toBeUndefined();
    expect(result.properties.viewport_end).toBeUndefined();
    expect(result).toEqual(fixture);
  });
});
