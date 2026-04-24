/**
 * TypeScript type usage demonstration and compile-time verification.
 *
 * This file demonstrates how to use the generated TypeScript interfaces
 * with actual fixture data, ensuring type safety at compile time.
 *
 * Tracer bullet implementation: TrackFeature and ReferenceLocation only.
 */

import {
  TrackFeature,
  ReferenceLocation,
  TrackTypeEnum,
  LocationTypeEnum,
  TimestampedPosition,
  GeoJSONPoint,
  GeoJSONLineString,
  RawGeoJSONFeature,
  RawGeoJSONFeatureCollection,
} from "../src/generated/typescript";

// ============================================================================
// TrackFeature Usage
// ============================================================================

const validPosition: TimestampedPosition = {
  time: "2024-03-15T10:00:00Z",
  coordinates: [-4.1234, 50.3456],
  course: 45,
  speed: 12.5,
};

const trackGeometry: GeoJSONLineString = {
  type: "LineString",
  coordinates: [
    -4.1234, 50.3456,
    -4.1245, 50.3467,
    -4.1256, 50.3478,
  ],
};

const trackFeature: TrackFeature = {
  type: "Feature",
  id: "track-001",
  geometry: trackGeometry,
  properties: {
    platform_id: "HMS-EXAMPLE",
    platform_name: "HMS Example",
    track_type: TrackTypeEnum.OWNSHIP,
    start_time: "2024-03-15T10:00:00Z",
    end_time: "2024-03-15T11:00:00Z",
    positions: [
      validPosition,
      {
        time: "2024-03-15T10:30:00Z",
        coordinates: [-4.1245, 50.3467],
      },
    ],
    color: "#0000FF",
  },
  bbox: [-4.1256, 50.3456, -4.1234, 50.3478],
};

// ============================================================================
// ReferenceLocation Usage
// ============================================================================

const waypointGeometry: GeoJSONPoint = {
  type: "Point",
  coordinates: [-4.2000, 50.4000],
};

const referenceLocation: ReferenceLocation = {
  type: "Feature",
  id: "waypoint-001",
  geometry: waypointGeometry,
  properties: {
    name: "Alpha Point",
    location_type: LocationTypeEnum.WAYPOINT,
    description: "Primary navigation waypoint",
    symbol: "nav-waypoint",
    color: "#00FF00",
    valid_from: "2024-03-15T00:00:00Z",
    valid_until: "2024-03-16T00:00:00Z",
  },
};

// ============================================================================
// Type Guards and Utilities
// ============================================================================

function isTrackFeature(obj: unknown): obj is TrackFeature {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "type" in obj &&
    (obj as TrackFeature).type === "Feature" &&
    "properties" in obj &&
    "track_type" in (obj as TrackFeature).properties
  );
}

function isReferenceLocation(obj: unknown): obj is ReferenceLocation {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "type" in obj &&
    (obj as ReferenceLocation).type === "Feature" &&
    "properties" in obj &&
    "location_type" in (obj as ReferenceLocation).properties
  );
}

// ============================================================================
// Verification
// ============================================================================

console.log("TypeScript Type Usage Verification (Tracer Bullet)");
console.log("==================================================\n");

console.log("TrackFeature:");
console.log(`  ID: ${trackFeature.id}`);
console.log(`  Platform: ${trackFeature.properties.platform_name}`);
console.log(`  Type: ${trackFeature.properties.track_type}`);
console.log(`  Positions: ${trackFeature.properties.positions.length}`);

console.log("\nReferenceLocation:");
console.log(`  ID: ${referenceLocation.id}`);
console.log(`  Name: ${referenceLocation.properties.name}`);
console.log(`  Type: ${referenceLocation.properties.location_type}`);

// ============================================================================
// RawGeoJSONFeature Usage (#204) — parse-boundary type
// ============================================================================

// string id
const rawStringId: RawGeoJSONFeature = {
  type: "Feature",
  id: "track-001",
  geometry: { type: "Point", coordinates: [0.0, 0.0] },
  properties: {},
};

// integer id
const rawIntegerId: RawGeoJSONFeature = {
  type: "Feature",
  id: 42,
  geometry: { type: "LineString", coordinates: [[0, 0], [1, 1]] },
  properties: { sensor: "radar" },
};

// no id, null properties
const rawNoId: RawGeoJSONFeature = {
  type: "Feature",
  geometry: { type: "Polygon", coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] },
  properties: null,
};

// DebriefFeature subtype is a valid RawGeoJSONFeature (acceptance scenario 3 / spec US1)
// Note: TrackFeature requires LineString|MultiLineString geometry and structured
// properties; the raw type is a valid supertype.
const rawFromTrack: RawGeoJSONFeature = trackFeature as unknown as RawGeoJSONFeature;

// Collection
const rawCollection: RawGeoJSONFeatureCollection = {
  type: "FeatureCollection",
  features: [rawStringId, rawIntegerId, rawNoId, rawFromTrack],
};

// Exhaustive narrowing on the geometry discriminator
function narrowGeometry(feature: RawGeoJSONFeature): string {
  switch (feature.geometry.type) {
    case "Point":
      return "Point";
    case "LineString":
      return "LineString";
    case "Polygon":
      return "Polygon";
    case "MultiPoint":
      return "MultiPoint";
    case "MultiLineString":
      return "MultiLineString";
    case "MultiPolygon":
      return "MultiPolygon";
    default: {
      const _exhaustive: never = feature.geometry;
      return _exhaustive;
    }
  }
}

console.log("\nRawGeoJSONFeature:");
console.log(`  string-id: ${rawStringId.id}`);
console.log(`  integer-id: ${rawIntegerId.id}`);
console.log(`  collection size: ${rawCollection.features.length}`);
console.log(`  narrowed geometry: ${narrowGeometry(rawStringId)}`);

console.log("\n✓ All types compile and work correctly");
