/**
 * TypeScript round-trip tests for sensor fixtures.
 *
 * Validates JSON → TS deserialize → TS serialize → JSON for sensor data,
 * ensuring no field loss across the TypeScript leg of the round-trip pipeline.
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

import type { SensorContact, SensorData, MeasuredArrayPosition } from "../../src/generated/typescript/types";

const FIXTURES_DIR = path.resolve(__dirname, "../../src/fixtures/valid");

/** Load a JSON fixture as a typed object. */
function loadFixture<T>(filename: string): T {
  const raw = fs.readFileSync(path.join(FIXTURES_DIR, filename), "utf-8");
  return JSON.parse(raw) as T;
}

/** Round-trip: JSON string → parse → stringify → parse and compare. */
function roundTrip<T>(data: T): T {
  const serialized = JSON.stringify(data);
  return JSON.parse(serialized) as T;
}

interface TrackFeature {
  type: string;
  id: string;
  geometry: unknown;
  properties: {
    kind: string;
    sensors?: SensorData[];
    [key: string]: unknown;
  };
}

describe("Sensor TypeScript round-trip", () => {
  describe("comprehensive fixture (sensors-02)", () => {
    const fixture = loadFixture<TrackFeature>("track-feature-sensors-02.json");
    const sensor = fixture.properties.sensors![0]!;

    it("preserves SensorData fields through round-trip", () => {
      const result = roundTrip(sensor)!;
      expect(result.name).toBe(sensor.name);
      expect(result.base_frequency).toBe(sensor.base_frequency);
      expect(result.offset).toBe(sensor.offset);
      expect(result.array_centre_mode).toBe(sensor.array_centre_mode);
      expect(result.worm_in_hole).toBe(sensor.worm_in_hole);
      expect(result.color).toBe(sensor.color);
      expect(result.visible).toBe(sensor.visible);
      expect(result.line_thickness).toBe(sensor.line_thickness);
      expect(result.contacts).toHaveLength(sensor.contacts.length);
      expect(result.measured_positions).toEqual(sensor.measured_positions);
    });

    it("preserves SensorContact display properties", () => {
      const contact = sensor.contacts[0]!;
      const result = roundTrip(contact)!;
      expect(result.time).toBe(contact.time);
      expect(result.bearing).toBe(contact.bearing);
      expect(result.has_bearing).toBe(contact.has_bearing);
      expect(result.ambiguous_bearing).toBe(contact.ambiguous_bearing);
      expect(result.has_ambiguous).toBe(contact.has_ambiguous);
      expect(result.range).toBe(contact.range);
      expect(result.frequency).toBe(contact.frequency);
      expect(result.has_frequency).toBe(contact.has_frequency);
      expect(result.label).toBe(contact.label);
      expect(result.comment).toBe(contact.comment);
      expect(result.color).toBe(contact.color);
      expect(result.visible).toBe(contact.visible);
      expect(result.show_label).toBe(contact.show_label);
      expect(result.line_style).toBe(contact.line_style);
      expect(result.label_location).toBe(contact.label_location);
      expect(result.put_label_at).toBe(contact.put_label_at);
      expect(result.origin).toEqual(contact.origin);
    });

    it("preserves all contacts through round-trip", () => {
      const result = roundTrip(sensor)!;
      expect(result.contacts).toEqual(sensor!.contacts);
    });

    it("full feature round-trip preserves entire structure", () => {
      const result = roundTrip(fixture);
      expect(result).toEqual(fixture);
    });
  });

  describe("minimal fixture (sensors-minimal-01)", () => {
    const fixture = loadFixture<TrackFeature>("track-feature-sensors-minimal-01.json");
    const sensor = fixture.properties.sensors![0]!;

    it("preserves minimal SensorData", () => {
      const result = roundTrip(sensor)!;
      expect(result.name).toBe("HULL_SONAR");
      expect(result.contacts).toHaveLength(2);
      expect(result.base_frequency).toBeUndefined();
      expect(result.array_centre_mode).toBeUndefined();
      expect(result.color).toBeUndefined();
    });

    it("preserves minimal SensorContact (time + bearing only)", () => {
      const contact = sensor!.contacts[0]!;
      const result = roundTrip(contact)!;
      expect(result.time).toBe(contact.time);
      expect(result.bearing).toBe(contact.bearing);
      expect(result.has_bearing).toBeUndefined();
      expect(result.visible).toBeUndefined();
      expect(result.origin).toBeUndefined();
    });
  });

  describe("measured positions fixture (sensors-measured-01)", () => {
    const fixture = loadFixture<TrackFeature>("track-feature-sensors-measured-01.json");
    const sensor = fixture.properties.sensors![0]!;

    it("preserves measured_positions array", () => {
      const result = roundTrip(sensor)!;
      expect(result.measured_positions).toBeDefined();
      expect(result.measured_positions).toHaveLength(3);
    });

    it("preserves MeasuredArrayPosition fields", () => {
      const pos = sensor.measured_positions![0]!;
      const result = roundTrip(pos)!;
      expect(result.time).toBe(pos.time);
      expect(result.location).toEqual(pos.location);
      expect(result.location).toHaveLength(2);
    });

    it("preserves array_centre_mode=MEASURED", () => {
      const result = roundTrip(sensor)!;
      expect(result.array_centre_mode).toBe("MEASURED");
    });
  });

  describe("backward compatibility (sensors-01)", () => {
    const fixture = loadFixture<TrackFeature>("track-feature-sensors-01.json");

    it("existing fixture round-trips without loss", () => {
      const result = roundTrip(fixture);
      expect(result).toEqual(fixture);
    });

    it("existing contacts preserve original fields", () => {
      const sensor = fixture.properties.sensors![0]!;
      const result = roundTrip(sensor)!;
      expect(result.contacts).toEqual(sensor.contacts);
    });
  });
});
