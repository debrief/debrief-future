/**
 * TypeScript round-trip tests for Spec #258 SceneProperties additions.
 *
 * Validates JSON → typed object → JSON.stringify → JSON.parse preserves both
 * the new `display_mode` and `_polygon_source` slots (FR-001, FR-006), and
 * that legacy scenes without those slots survive a round-trip unchanged
 * (FR-003 — no implicit defaults injected).
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

import type {
  SceneFeature,
  DisplayMode,
  PolygonSource,
} from "../../src/generated/typescript/types";

const FIXTURES_DIR = path.resolve(__dirname, "../../fixtures");

function loadFixture<T>(filename: string): T {
  const raw = fs.readFileSync(path.join(FIXTURES_DIR, filename), "utf-8");
  return JSON.parse(raw) as T;
}

function roundTrip<T>(data: T): T {
  return JSON.parse(JSON.stringify(data)) as T;
}

describe("SceneProperties #258 round-trip", () => {
  it("preserves display_mode=trail and _polygon_source=bounds", () => {
    const fixture = loadFixture<SceneFeature>("scene-258-with-display-mode.json");
    const result = roundTrip(fixture);
    expect(result.properties.display_mode).toBe<DisplayMode>("trail");
    expect(result.properties._polygon_source).toBe<PolygonSource>("bounds");
    expect(result).toEqual(fixture);
  });

  it("legacy scene (no display_mode / no _polygon_source) round-trips unchanged", () => {
    const fixture = loadFixture<SceneFeature>("scene-258-legacy.json");
    const result = roundTrip(fixture);
    expect(result.properties.display_mode).toBeUndefined();
    expect(result.properties._polygon_source).toBeUndefined();
    expect(result).toEqual(fixture);
  });

  it("template-literal types reject unknown DisplayMode values at compile time", () => {
    // Compile-time check only — TypeScript catches this without runtime.
    // The cast forces the type assertion in case a string is passed.
    const valid: DisplayMode = "trail";
    const valid2: DisplayMode = "full";
    expect(valid).toBe("trail");
    expect(valid2).toBe("full");
    // @ts-expect-error - 'blink' is not a permissible DisplayMode value.
    const invalid: DisplayMode = "blink";
    void invalid;
  });

  it("template-literal types reject unknown PolygonSource values at compile time", () => {
    const valid: PolygonSource = "bounds";
    const valid2: PolygonSource = "placeholder";
    const valid3: PolygonSource = "manual";
    expect(valid).toBe("bounds");
    expect(valid2).toBe("placeholder");
    expect(valid3).toBe("manual");
    // @ts-expect-error - 'telemetry' is not a permissible PolygonSource value.
    const invalid: PolygonSource = "telemetry";
    void invalid;
  });
});
