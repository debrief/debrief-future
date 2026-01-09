/**
 * TypeScript type usage demonstration and compile-time verification.
 *
 * This file demonstrates how to use the generated TypeScript interfaces
 * with actual fixture data, ensuring type safety at compile time.
 */

import {
  TrackFeature,
  SensorContact,
  ReferenceLocation,
  PlotMetadata,
  ToolMetadata,
  TrackTypeEnum,
  SensorTypeEnum,
  LocationTypeEnum,
  ToolCategoryEnum,
  SelectionContextEnum,
  TimestampedPosition,
  GeoJSONPoint,
  GeoJSONLineString,
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
    source_file: "example.rep",
    color: "#0000FF",
  },
  bbox: [-4.1256, 50.3456, -4.1234, 50.3478],
};

// ============================================================================
// SensorContact Usage
// ============================================================================

const contactGeometry: GeoJSONPoint = {
  type: "Point",
  coordinates: [-4.5678, 50.1234],
};

const sensorContact: SensorContact = {
  type: "Feature",
  id: "contact-001",
  geometry: contactGeometry,
  properties: {
    parent_track_id: "track-001",
    sensor_type: SensorTypeEnum.SONAR_PASSIVE,
    time: "2024-03-15T10:15:00Z",
    bearing: 45,
    bearing_error: 2.5,
    frequency: 150,
    label: "Contact Alpha",
    color: "#FF0000",
  },
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
// PlotMetadata Usage
// ============================================================================

const plotMetadata: PlotMetadata = {
  id: "plot-001",
  title: "Exercise Alpha - Day 1",
  description: "First day of Exercise Alpha operations",
  start_datetime: "2024-03-15T00:00:00Z",
  end_datetime: "2024-03-15T23:59:59Z",
  created: "2024-03-15T08:00:00Z",
  updated: "2024-03-15T12:00:00Z",
  source_files: [
    {
      filename: "track_data.rep",
      format: "REP",
      loaded_at: "2024-03-15T08:00:00Z",
      sha256: "a".repeat(64),
      asset_href: "./assets/track_data.rep",
    },
  ],
  platform_ids: ["HMS-EXAMPLE", "HMS-OTHER"],
  exercise_name: "Exercise Alpha",
  classification: "UNCLASSIFIED",
};

// ============================================================================
// ToolMetadata Usage
// ============================================================================

const toolMetadata: ToolMetadata = {
  id: "calc-range-bearing",
  name: "Range & Bearing Calculator",
  description: "Calculate range and bearing between two points",
  version: "1.0.0",
  category: ToolCategoryEnum.GEOMETRY,
  selection_context: SelectionContextEnum.MULTIPLE_TRACKS,
  icon: "compass",
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

function isSensorContact(obj: unknown): obj is SensorContact {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "type" in obj &&
    (obj as SensorContact).type === "Feature" &&
    "properties" in obj &&
    "sensor_type" in (obj as SensorContact).properties
  );
}

// ============================================================================
// Verification
// ============================================================================

console.log("TypeScript Type Usage Verification");
console.log("==================================\n");

console.log("TrackFeature:");
console.log(`  ID: ${trackFeature.id}`);
console.log(`  Platform: ${trackFeature.properties.platform_name}`);
console.log(`  Type: ${trackFeature.properties.track_type}`);
console.log(`  Positions: ${trackFeature.properties.positions.length}`);

console.log("\nSensorContact:");
console.log(`  ID: ${sensorContact.id}`);
console.log(`  Parent: ${sensorContact.properties.parent_track_id}`);
console.log(`  Sensor: ${sensorContact.properties.sensor_type}`);
console.log(`  Bearing: ${sensorContact.properties.bearing}°`);

console.log("\nReferenceLocation:");
console.log(`  ID: ${referenceLocation.id}`);
console.log(`  Name: ${referenceLocation.properties.name}`);
console.log(`  Type: ${referenceLocation.properties.location_type}`);

console.log("\nPlotMetadata:");
console.log(`  ID: ${plotMetadata.id}`);
console.log(`  Title: ${plotMetadata.title}`);
console.log(`  Sources: ${plotMetadata.source_files.length}`);

console.log("\nToolMetadata:");
console.log(`  ID: ${toolMetadata.id}`);
console.log(`  Name: ${toolMetadata.name}`);
console.log(`  Category: ${toolMetadata.category}`);

console.log("\n✓ All types compile and work correctly");
