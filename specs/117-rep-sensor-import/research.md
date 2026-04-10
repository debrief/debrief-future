# Research: REP Sensor Import (#117)

**Date**: 2026-04-10
**Feature**: 117-rep-sensor-import

## Research Questions & Findings

### RQ-1: How does the existing annotation system currently handle SENSOR/SENSOR2 lines?

**Decision**: Refactor away from standalone annotation features; adopt the DSF handler's `pending_sensor_data` pattern instead.

**Rationale**: The current annotation builders (`build_sensor`, `build_sensor2` in `services/io/src/debrief_io/handlers/annotations/builders.py`) produce standalone GeoJSON features with `kind: "SENSOR"` or `kind: "SENSOR_CONTACT"`. This contradicts the architectural decision that sensors are embedded under `track.properties.sensors[]`. The DSF handler (`services/io/src/debrief_io/handlers/dsf.py`) already implements the correct pattern: parse sensor lines into intermediate `_SensorContactRecord` objects, group them by parent track and sensor name via `_group_contacts()`, then return them in `ParseResult.pending_sensor_data`. The import pipeline (`import_catalog.py` lines 338-352) merges these into companion track features.

**Alternatives considered**:
- Keep standalone features and merge post-hoc: Rejected -- adds complexity, produces schema-invalid intermediate features, and the import pipeline already supports `pending_sensor_data`.
- Create a separate sensor handler (like DSF): Rejected -- sensor lines are interleaved with track position lines in REP files, so they must be handled within the REP handler's parsing loop.

### RQ-2: What is the gap between the current LinkML SensorContact/SensorData schema and the #116 target schema?

**Decision**: Implement against the current schema (which has `time`, `bearing`, `range`, `frequency`, `ambiguous_bearing`, `label`, `comment`) and plan for the #116 additions. Use plain dict fields for the few fields not yet in the schema (`has_bearing`, `has_ambiguous`, `has_frequency`, `origin`, `color` on SensorData).

**Rationale**: The current generated Pydantic `SensorContact` class (at `shared/schemas/src/generated/python/debrief_schemas/__init__.py:1247`) has the core fields but lacks the boolean presence flags (`has_bearing`, `has_ambiguous`, `has_frequency`), `origin`, and `color`/`visible`/`line_style` display properties. Since #116 is not yet merged, #117 must work with the current schema. The `pending_sensor_data` mechanism uses plain dicts (not Pydantic models), so extra fields can be included without schema validation failures. When #116 lands, the dicts will already conform to the expanded schema.

**Alternatives considered**:
- Block on #116 completion: Rejected -- the user story explicitly says this feature "requires #116", but the dict-based approach allows parallel development. The dicts carry the same field names that #116 will formalise.
- Use Pydantic models directly: Rejected for now -- the current schema doesn't have all needed fields, and `pending_sensor_data` already uses plain dicts (established pattern from DSF handler).

### RQ-3: How should SENSOR v1 line parsing handle quoted vs unquoted track names and DMS coordinates vs NULL location?

**Decision**: Reuse the existing parsing logic from the annotation builder's `build_sensor()` function but refactor it to produce intermediate records instead of GeoJSON features.

**Rationale**: The existing `build_sensor()` in `builders.py` (lines 1459-1635) already handles both quoted track names (e.g., `"NEL STYLE"`) and unquoted track names, NULL location vs DMS coordinates, and quoted sensor type names. This parsing logic is correct and tested. Rather than rewriting it, extract the field-parsing logic into a reusable function that returns an intermediate record (similar to DSF's `_SensorContactRecord`), then add the fields specific to #117's requirements: `has_bearing`, `origin`, color from symbology, yards-to-metres conversion.

**Alternatives considered**:
- Write entirely new parsing logic: Rejected -- duplicates tested code, increases maintenance burden.
- Keep using the annotation builder directly and transform the output: Rejected -- the annotation builder produces GeoJSON features with geometry calculations (observer-to-contact LineString) that are incorrect for the embedded sensor model.

### RQ-4: How should range unit conversion (yards to metres) work?

**Decision**: Convert all SENSOR v1/v2/v3 range values from yards to metres using the standard conversion factor (1 yard = 0.9144 metres). SENSORARC range values are already in metres per legacy convention.

**Rationale**: The spec states "Range values in `;SENSOR:` (v1) lines are in yards, matching the legacy ImportSensor.java implementation. `;SENSOR2:` and `;SENSOR3:` range values are also in yards." and "The `;SENSORARC` range values (inner/outer) are in metres, matching the legacy ImportSensorArc.java implementation." The #116 schema uses metres as the canonical unit. The conversion factor 0.9144 is exact (by international agreement since 1959).

**Alternatives considered**:
- Store in yards and convert at render time: Rejected -- the schema convention is metres, and converting at parse time ensures consistency with DSF-imported data.

### RQ-5: How should SENSOR3 accuracy fields be handled?

**Decision**: Parse the bearing accuracy and frequency accuracy fields from SENSOR3 lines to advance the token pointer past them, but do not store the values. This matches the legacy Debrief behaviour and the #116 decision to defer accuracy fields.

**Rationale**: The spec explicitly states "SENSOR3 accuracy fields are parsed but discarded per #116 decision." The legacy ImportSensor3.java parses these fields but marks them as TODO for future use. The current schema has no fields for accuracy. Parsing without storing ensures the parser correctly handles SENSOR3 lines without choking on extra fields.

**Alternatives considered**:
- Ignore SENSOR3 entirely: Rejected -- SENSOR3 lines exist in real datasets (e.g., `multistatics_buoyfield.rep`), and ignoring them would lose the bearing/frequency data they carry.
- Store accuracy in an extension dict: Rejected -- premature; adds schema debt without a consumer.

### RQ-6: How should SENSORARC lines be stored?

**Decision**: Parse SENSORARC lines into DynamicTrackCoverage annotation features (standalone GeoJSON features with `kind: "DYNAMIC_TRACK_COVERAGE"`), not as SensorContact entries.

**Rationale**: The spec states "SENSORARC defines a time-bounded arc coverage area around a track, with left/right angular bounds and inner/outer range bounds. After import, these are stored as DynamicTrackCoverage annotations associated with the parent track, not as SensorContact entries." This is fundamentally different data from bearing contacts -- it's a coverage zone, not a point observation. The existing annotation system already handles DYNAMIC_CIRCLE and DYNAMIC_RECT as standalone features, and SENSORARC follows the same pattern.

**Alternatives considered**:
- Embed in track.properties: Rejected -- coverage zones are annotations, not sensor measurements. Embedding would overload the SensorData model.

### RQ-7: Where should the new sensor parsing code live within the codebase?

**Decision**: Create a new module `services/io/src/debrief_io/handlers/sensor_parser.py` containing the sensor line parsing functions, shared between the REP handler and potentially the annotation system. The REP handler (`rep.py`) will import and call these functions during its main parse loop.

**Rationale**: The sensor parsing logic (4 formats) is substantial (~300-400 lines). Placing it in a separate module keeps the REP handler focused on track position parsing and maintains separation of concerns. The DSF handler already has its own parsing functions inline, but its scope is smaller. A shared module also allows the annotation parser to delegate to the same code in future.

**Alternatives considered**:
- Inline in rep.py: Rejected -- would make rep.py too large (~700+ lines) and harder to test independently.
- Add to annotations/builders.py: Rejected -- builders.py already has ~1700 lines and the new code serves a different purpose (embedded data vs standalone features).
- Add to DSF handler: Rejected -- DSF handles its own file format; shared code should be in a neutral location.

### RQ-8: How should the annotation parser be updated to stop producing standalone SENSOR features from REP files?

**Decision**: Remove `SENSOR` and `SENSOR2` from the annotation parser's `ANNOTATION_PREFIXES` set and `builders_map`. Add `;SENSOR3:` and `;SENSORARC` to the set. The REP handler will check for sensor line prefixes before delegating to the annotation parser, so sensor lines never reach the annotation system.

**Rationale**: Currently, `is_annotation_line()` in `parser.py` recognises `;SENSOR:` and `;SENSOR2:` as annotation prefixes. The REP handler collects these lines and passes them to `parse_annotations()`, which calls `build_sensor()`/`build_sensor2()` to produce standalone features. After #117, the REP handler will intercept sensor lines during its main loop, parse them into `pending_sensor_data`, and never pass them to the annotation parser. The prefixes should be removed from the annotation system to prevent accidental standalone feature creation.

**Alternatives considered**:
- Keep prefixes in annotation system and skip in REP handler: Introduces risk of dual processing if ordering changes.
- Keep `build_sensor`/`build_sensor2` as fallbacks: Contradicts the goal of eliminating standalone sensor features.

### RQ-9: How should the system handle sensor lines referencing tracks not in the file?

**Decision**: Emit a warning with code `ORPHANED_SENSOR` and retain the sensor data in `pending_sensor_data` under the referenced track name. The import pipeline may find the track in a companion file (e.g., a separately loaded REP file).

**Rationale**: The spec says "a warning is emitted indicating the orphaned sensor data and the contacts are not silently discarded." The DSF handler already demonstrates this pattern -- DSF files contain sensor data for tracks defined in companion REP files. The import pipeline merges `pending_sensor_data` across all parsed files. If no track is found after all files are processed, the import pipeline emits a final warning.

**Alternatives considered**:
- Discard orphaned data: Rejected -- violates the spec and loses data.
- Auto-create minimal track entries: Rejected -- creates tracks with no position data, which violates TrackFeature schema requirements (LineString geometry requires at least 2 coordinates).
