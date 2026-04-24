## What We're Building

The original plan for feature 062 was to add seven new top-level feature kinds to the GeoJSON schema: sensors, TMA segments, track segments, TUAs, frequency residuals, lightweight tracks, and zones. Sixty-three tool specifications reference these types. It seemed obvious -- each concept gets its own feature class.

Design review changed our minds.

A sensor contact has no independent spatial existence. It's a bearing line originating from the host track's interpolated position at contact time, extending to the viewport edge. If you represent it as a standalone GeoJSON feature, you either duplicate the host track's position data into the sensor, or you require the parent track to always be present. Both options make the data harder to work with, not easier.

The same reasoning applies to TMA segments (they compose the track itself -- a multi-source track is inherently multi-segment) and TUAs (time-indexed ellipsoidal estimates derived from the host track's position). These aren't peers of the track. They're children of it.

So instead of seven new `FeatureKindEnum` values, we're adding zero. TrackFeature evolves to carry compound geometry and embedded child arrays.

## How It Fits

This is a schema change, which means it follows the project's schema-first pipeline: the definition goes into LinkML, then Pydantic models, JSON Schema, and TypeScript types are all generated from it. The compound model is purely additive -- existing simple tracks with LineString geometry remain valid. Nothing breaks.

The change unlocks implementation of 30+ tools that depend on sensor data, TMA segments, and TUA solutions. It also connects directly to the nested child selection model from feature 053 -- once tracks have embedded children, the `TRACK.SENSOR` and `TRACK.SEGMENT` hierarchical kind paths give tools a way to target them.

## Key Decisions

- **Zero new enum values.** The original plan assumed each concept needed top-level representation. Domain modelling showed otherwise. Sensors, segments, and TUAs are structurally part of the track.

- **TrackFeature.geometry becomes a union.** LineString for simple tracks, MultiLineString for compound. Each LineString within the multi corresponds to one segment. A parallel `segments` metadata array carries per-segment type, temporal extent, and type-specific properties (TMA course/speed, relative offsets, infill leg references).

- **Sensors embedded in TrackProperties.** A `sensors` array holds named sensor entries, each with a contacts array. Each contact has a required time and bearing, optional range, frequency, and ambiguous bearing. No geometry -- rendering is a presentation concern.

- **TUAs embedded in TrackProperties.** A `tuas` array holds named TUA collections. Each solution has a time, positioning (absolute lat/lon or relative bearing/range from the host), and optional ellipse parameters. Again, no independent geometry.

- **Four segment types.** `SegmentTypeEnum` discriminates between `TRACK` (plain recorded data), `ABSOLUTE_TMA`, `RELATIVE_TMA`, and `DYNAMIC_INFILL`. Type-specific properties (host track ID for relative, leg references for infill) are optional fields on a single `SegmentMetadata` class rather than a class hierarchy.

- **Frequency residuals become STAC assets.** They're analysis artefacts, not spatial features. A separate STAC asset management spec will handle them.

- **Lightweight tracks dropped.** The concept saw limited adoption in legacy Debrief. If the need resurfaces, it'll be a simpler UI-focused approach.

- **Zones already covered.** Existing CIRCLE and RECTANGLE annotation types handle this without a new enum value.
