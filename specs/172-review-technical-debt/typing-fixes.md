# Typing Fix List: Approach C — LinkML-Derived Types from Cradle to Grave

**Feature:** 172-review-technical-debt
**Date:** 2026-03-24
**Approach:** All domain data strongly typed via LinkML-generated Pydantic (Python) and TypeScript interfaces throughout its entire lifecycle — not just at service boundaries. Every function that creates, transforms, reads from, or writes to a domain object must use the generated type. `dict[str, Any]`, `Record<string, unknown>`, and `as` casts on domain data are defects, not conveniences.

**Motivation:** We have experienced multiple serious defects from reading or writing invalid object properties. These bugs survive because data spends most of its life as untyped dicts or `unknown` records. The compiler and Pydantic can only catch what they can see — if domain data is typed as `dict[str, Any]`, a misspelled property name, a missing field, or a wrong type is invisible until it causes a runtime failure downstream.

---

## Current State Summary

**LinkML schema:** 111 definitions (84 classes, 24 enums, 3 custom types) across 11 modules. The schema is closure-complete — every type reference resolves.

**Generated artifacts:**
- Python Pydantic: `shared/schemas/src/generated/python/debrief_schemas/__init__.py` (171 KB)
- JSON Schema: `shared/schemas/src/generated/json-schema/debrief.schema.json` (87 KB) + 18 per-entity schemas
- TypeScript: `shared/schemas/src/generated/typescript/types.ts` (42 KB) + `unions.ts` (companion)

**Gap:** Session-state types (`SessionState`, `TemporalSlice`, `SpatialSlice`, etc.) and tool-result dataset types (`DatasetEntry`, `DatasetMetadata`, `DatasetSeries`) exist in LinkML but are **not generated** into the TypeScript output. The TS generator currently only emits GeoJSON feature types and their dependencies.

---

## Part A: Types That Don't Exist in LinkML (Need Adding)

These data shapes are used in the codebase and cross service/serialization boundaries, but have no LinkML definition. Under Approach C, if data crosses a boundary it needs a schema. The only exception is types that follow an external specification (STAC base types).

### A1. `Plot` / STAC Item metadata wrapper — **Add to LinkML**
- **Used in:** `apps/vscode/src/types/plot.ts:19-49`
- **Shape:** `{ id, title, datetime, itemPath, catalogId, sourcePath, bbox, timeExtent, trackCount, locationCount }`
- **Crosses:** stacService → VS Code UI, stacService → webview, persisted to workspace state
- **Assessment:** This is our projection of a STAC Item — our fields, our shape, our boundary. It should be schema-defined.
- **Action:** Add `PlotSummary` (or similar) to LinkML. Generate into both Python and TypeScript. Replace hand-written type.

### A2. STAC base types (`StacCatalog`, `StacCollection`, `StacItem`) — **Exclude from LinkML**
- **Used in:** `apps/vscode/src/types/stac.ts:1-261`
- **Assessment:** These follow the external STAC specification. Defining them in LinkML would create a maintenance burden tracking upstream spec changes. Use `@stac-ts/core` or a shared hand-written STAC types module.
- **Action:** Keep as hand-written. Consider adopting a published STAC type package.

### A2a. `StacItemSummary` / Debrief-specific STAC projections — **Add to LinkML**
- **Used in:** `apps/vscode/src/types/stac.ts:56-98`
- **Shape:** Includes `vessel_classes`, `tags`, `featureTags`, `nationalities`, `trackNames` — fields from our `StacExtensionProperties` schema, plus UI metadata (`id`, `title`, `datetime`, `featureCount`).
- **Crosses:** stacService → tree view, stacService → filter engine, stacService → exercise list
- **Assessment:** This is our domain vocabulary projected for UI consumption. The embedded fields already exist in LinkML (`stac-extension.yaml`), but the wrapping structure doesn't. It should.
- **Action:** Add `StacItemSummary` to LinkML (possibly alongside A1's `PlotSummary` in a new `stac-views.yaml` module). Generate and replace hand-written versions.

### A3. `CatalogOverviewItem` / `StacBrowserItem` — **Add to LinkML**
- **Used in:** `shared/components/src/filter-engine/types.ts:15-93`
- **Shape:** Includes `vessel_classes`, `tags`, `nationalities`, `trackNames` — metadata from `StacExtensionProperties`.
- **Crosses:** filter-engine boundary (used by FilterBar, ExerciseListView, STAC browser)
- **Assessment:** These carry domain metadata across component boundaries. They should derive from the same schema as `StacExtensionProperties`.
- **Action:** Add to LinkML. These may unify with A2a (`StacItemSummary`) — investigate whether one schema type can serve both.

### A4. `ResultsSlice` / `BrowserFilterSlice` — **Add to LinkML**
- **Used in:** `services/session-state/src/types/results.ts`, `browser-filter.ts`
- **Assessment:** The other session-state slices (temporal, spatial, features, document) are already in `session-state.yaml`. These two were added later and just never got schema definitions. There's no principled reason for the gap — it's an oversight.
- **Action:** Add to `session-state.yaml`. Generate alongside the other slices.

### A5. `DatasetEnvelope` (ChartRenderer) — **Reconcile with LinkML**
- **Used in:** `shared/components/src/ChartRenderer/types.ts:31-42`
- **Nearest schema type:** `DatasetEntry` in `tool-result.yaml`
- **Divergence:** Schema `DatasetEntry.series[].data` is `float[]`, while TS `DatasetEnvelope.data` is `Record<string, unknown>[]` and `series[].data` is `Record<string, unknown>[]`. These are **structurally different**.
- **Assessment:** The schema predates the implementation and has drifted. The implementation is the truth — update the schema to match.
- **Action:** Update `DatasetEntry` in `tool-result.yaml` to match the actual runtime shape. Rename to `DatasetEnvelope` for consistency. Generate and replace hand-written version.

---

## Part B: Types That Exist in LinkML but Are Not Generated into TypeScript

### B1. Session-state types
- **In LinkML:** `session-state.yaml` defines `SessionState`, `TemporalSlice`, `SpatialSlice`, `FeaturesSlice`, `DocumentSlice`, `SessionFile`, `TimeInstant`, `TimeRange`, `TimeFilter`, `TimeStep`, `Coordinate`, `ViewportPolygon`, `FeatureSelection`, `PlaybackStateEnum`, `DisplayModeEnum`, `TimeUnitEnum`, `AddressingMode`, `LevelDefinition`
- **In generated TS:** None of these appear in `types.ts`
- **Hand-written TS:** `services/session-state/src/types/` defines all these independently
- **Action:** Either (a) extend the TypeScript generator to emit session-state types, or (b) formally decide that session-state types are "Zustand-native" and remove them from LinkML. **Recommendation: option (a)** — generate them, then migrate `services/session-state/src/types/` to import from `@debrief/schemas`. This is a large change.

### B2. Tool-result types
- **In LinkML:** `tool-result.yaml` defines `ToolResultAnnotations`, `ResultTypePath`, `DatasetEntry`, `DatasetMetadata`, `DatasetAxisMetadata`, `DatasetSeries`, `ResultTopType`, `ErrorCategory`
- **In generated TS:** None of these appear
- **Hand-written TS:** `shared/components/src/ChartRenderer/types.ts`, `apps/vscode/src/types/tool.ts`
- **Action:** Extend TS generator to emit these, then replace hand-written versions.

### B3. Tool metadata types
- **In LinkML:** `tool.yaml` defines `Tool`, `ToolParameter`, `SelectionRequirement`, `OutputKindEnum`, `ResultCategoryEnum`, `ParameterTypeEnum`
- **In generated TS:** `Tool`, `ToolParameter`, `SelectionRequirement` ARE generated
- **Hand-written TS:** `apps/vscode/src/types/tool.ts` extends `Tool` with extra fields (`minFeatures`, local `parameters`)
- **Action:** The extension is intentional. Keep but ensure the base type is imported from schemas (it already is for `SelectionRequirement`).

### B4. Provenance types
- **In LinkML:** `log-entry.yaml` defines `LogEntry`, `WasGeneratedBy`, `ParameterValue`, `InputFeatureState`, `TuneAnnotation`
- **In generated TS:** Not verified (likely generated but not imported)
- **Hand-written TS:** `shared/components/src/LogPanel/types.ts`, `apps/web-shell/src/services/toolService.ts`
- **Hand-written Python:** `services/calc/debrief_calc/models.py` (canonical Python version)
- **Action:** Verify generated TS includes these. If so, replace hand-written TS versions with imports. If not, extend generator.

---

## Part C: Hand-Written TypeScript Types That Duplicate Generated Schemas

### C1. `apps/vscode/src/types/plot.ts` — Feature types (CRITICAL)
**Lines 254-297: `TrackFeature`, `LocationFeature`, `PlotFeatureCollection`**
- `TrackFeature` (lines 254-265): Defines `{ type, id, geometry: LineString, properties: { kind, platform_name, track_type, start_time, end_time, positions, style, ... } }`
- `LocationFeature` (lines 270-278): Defines `{ type, id, geometry: Point, properties: { kind, name, location_type, ... } }`
- **Canonical:** `@debrief/schemas` exports `TrackFeature` and `ReferenceLocation` with full properties
- **Action:** Delete these hand-written types. Import `TrackFeature` and `ReferenceLocation` from `@debrief/schemas`. Update the 3 consumers: `outlineProvider.ts`, `sessionManager.ts`, `stacService.ts`.

**Lines 6-14: `LineString`, `Point` (self-contained GeoJSON geometry)**
- **Canonical:** `@debrief/schemas` exports `GeoJSONLineString` and `GeoJSONPoint`
- **Action:** Replace with imports from `@debrief/schemas`.

**Lines 54-80: `PositionStyle`, `PositionStyleOverride`**
- Also duplicated in `shared/utils/src/types.ts:62-76`
- **Canonical:** `@debrief/schemas` exports both
- **Divergence:** Hand-written uses `symbol: 'circle' | 'square' | 'triangle'` (3 values). Schema uses `PointShapeEnum` with 5 values (+ diamond, cross).
- **Action:** Delete hand-written versions from both files. Import from `@debrief/schemas`. This widens the type (5 symbols vs 3) — verify no consumers break.

**Lines 85-97: `TimestampedPosition`**
- **Canonical:** `@debrief/schemas` exports `TimestampedPosition` with `{ time, depth, course, speed }`
- Hand-written version has same fields
- **Action:** Replace with import from `@debrief/schemas`.

**Lines 102-149: `Track`**
- This is a UI-oriented projection of track data (flattened properties). Not the same shape as `TrackFeature`.
- **Action:** Keep, but add a comment noting this is a UI projection, not a schema type. Consider renaming to `TrackViewModel` for clarity.

### C2. `shared/utils/src/types.ts` — Safe boundary types
**Lines 34-57: `SafeGeometry`, `SafeFeature`, `SafeFeatureCollection`**
- `SafeGeometry.coordinates: unknown` — maximally permissive
- Used at JSON.parse boundaries throughout VS Code extension
- **Assessment:** These exist precisely because the generated types are too strict for `JSON.parse()` output. They serve as the "unvalidated" step before narrowing.
- **Action:** Keep, but add a runtime validation step between `SafeFeature` and the generated schema types. Every `SafeFeature` should be narrowed to a `DebriefFeature` (or specific subtype) via `validation.ts` type guards before use.

**Lines 62-86: `PositionStyle`, `PositionStyleOverride`, `ResolvedPositionStyle`**
- Duplicates of `@debrief/schemas` types
- **Action:** Delete `PositionStyle` and `PositionStyleOverride`. Import from `@debrief/schemas`. Keep `ResolvedPositionStyle` (it's a rendering-specific derived type with camelCase fields, not in schema).

### C3. `shared/components/src/LogPanel/types.ts` — Provenance display types
**Lines 25-58: `ParameterValue`, `InputFeatureState`, `TimelineEntry`**
- `ParameterValue` and `InputFeatureState` duplicate schema types
- `TimelineEntry` is a display-oriented projection (not in schema)
- **Action:** Import `ParameterValue` and `InputFeatureState` from `@debrief/schemas`. Keep `TimelineEntry` as a UI type.

### C4. `apps/web-shell/src/services/toolService.ts` — LogEntry
**Lines 144-157: `LogEntry`**
- Mirrors the Python/schema `LogEntry` (PROV-aligned provenance)
- **Action:** Import from `@debrief/schemas` instead of hand-writing.

---

## Part D: Python Hand-Written Types That Duplicate Generated Schemas

### D1. `services/calc/debrief_calc/models.py` — Provenance models
**Lines 71-204: `ParameterValue`, `InputFeatureState`, `TuneAnnotation`, `WasGeneratedBy`, `LogEntry`**
- These are Pydantic models that mirror the LinkML `log-entry.yaml` schema
- **Canonical:** `debrief_schemas` generates `LogEntry`, `WasGeneratedBy`, `ParameterValue`, `InputFeatureState`, `TuneAnnotation`
- **Action:** Import from `debrief_schemas` instead of redefining. Verify field-level compatibility first (especially: does the generated model use `model_config = ConfigDict(...)` that could conflict with calc's usage?).

### D2. `services/calc/debrief_calc/models.py` — Snapshot/branch models
**Lines 564+: `SnapshotRef`, `SnapshotLinks`, `BranchRecord`, `FileProvEntry`, `SystemRecordProperties`**
- These mirror `system-record.yaml` schema types
- **Action:** Import from `debrief_schemas`.

### D3. `services/session-state-py/src/debrief_session/types.py` — Session state models
**Lines 11-100+: `TimeInstant`, `TimeRange`, `TimeFilter`, `TimeStep`, `Coordinate`, `ViewportPolygon`, `FeatureSelection`, `TemporalSlice`**
- These mirror `session-state.yaml` schema types
- **Action:** Import from `debrief_schemas`. This is a downstream consequence of generating session-state types (see B1).

---

## Part E: Untyped Domain Data Throughout Lifecycle

The problem is not just at boundaries. Domain data spends most of its life as `dict[str, Any]`, `Record<string, unknown>`, or `unknown` — meaning the compiler and Pydantic are blind to misspelled property names, missing fields, and wrong types. The bugs we've experienced come from *internal logic* reading or writing invalid properties, not just from malformed data crossing a wire.

### E1. Root Cause: `Feature = dict[str, Any]` type alias
- **File:** `services/io/src/debrief_io/types.py:21`
- **Impact:** This alias is the canonical return type for all parsed features. Every downstream consumer (calc tools, STAC storage, provenance) inherits the weakness.
- **Action:** Replace with a `DebriefFeature` union type from `debrief_schemas`. Parsers can build dicts internally but must validate and return Pydantic models at their public API.

### E2. All 14 calc tool functions return `list[dict[str, Any]]`
Every tool handler in `services/calc/debrief_calc/tools/` returns untyped dicts:
- `area_summary.py`, `range_bearing.py`, `track_stats.py`
- `track/styling/symbol_interval.py`, `label_interval.py`, `apply_symbol_style.py`, `set_track_color.py`
- `track/manipulation/generate_courses_speeds.py`
- `shape/manipulation/move_shape.py`, `enlarge_shape.py`
- `reference/generation.py` (4 entry points), `reference/classification.py`
- `sensor/detection/buffer_zone_generator.py`

**Impact:** A tool can return `{"properties": {"knid": "TRACK"}}` (note typo) and no checker catches it until a downstream consumer reads the wrong key at runtime.
**Action:** Each tool returns typed Pydantic models. The `@tool` decorator or executor validates the return.

### E3. 30+ untyped `feature.get("properties", {}).get(...)` access patterns
Internal logic throughout the calc service reads feature data via dict access instead of typed attribute access:
- `validation.py:58,119,189` — `feature.get("properties")`
- `provenance.py:160` — `feature.get("properties", {})`
- `executor.py:249` — same pattern
- `tools/reference/classification.py:79,101,104` — `props.get("pointMetadata", [])`, `zone_feature.get("properties", {}).get("zones", [])`
- `tools/track/styling/symbol_interval.py:42-43`, `label_interval.py:42`, `apply_symbol_style.py:72`, `set_track_color.py:44`
- `tools/track/manipulation/generate_courses_speeds.py:72`
- `tools/shape/manipulation/move_shape.py:128`, `enlarge_shape.py:146`
- `tools/track_stats.py:179`
- `tools/sensor/detection/buffer_zone_generator.py:192`
- `tools/range_bearing.py:54,108`

**Impact:** Every `.get()` returns `Any`. A misspelled key returns `None` silently. No IDE autocomplete, no type checker help.
**Action:** Once tools receive and return Pydantic models, these become `feature.properties.platform_name` — typed, autocompleted, and checked.

### E4. `result_builder.py` accepts and returns bare dicts
- **File:** `services/calc/debrief_calc/result_builder.py`
- `build_mutation(features: list[dict], ...)` — lines 18, 22
- `build_addition(features: list[dict], ...)` — lines 50, 54
- `build_artifact(...)` returns `dict` — lines 86, 114
- `build_response(...)` returns `list[dict]` — lines 156, 171
- **Action:** Accept Pydantic models, call `.model_dump()` for JSON serialization internally.

### E5. `featureProps.ts` — deliberate escape hatch used everywhere
- **File:** `apps/vscode/src/utils/featureProps.ts:21`
- `propsRecord = (f: DebriefFeature) => f.properties as unknown as Record<string, unknown>`
- Used by `stacService.ts`, `mapPanel.ts`, and indirectly by all tools
- **Impact:** This exists *because* feature properties are typed as a union — accessing `.platform_name` requires narrowing to `TrackFeature` first, which nobody does. So instead they cast to `Record<string, unknown>` and lose all type safety.
- **Action:** Eliminate. Callers must narrow via `isTrackFeature(f)` / `isReferenceLocation(f)` type guards before accessing properties. The type guards already exist in `@debrief/schemas/unions.ts`.

### E6. TypeScript tools mutate properties without type narrowing
Throughout `apps/vscode/src/tools/` and `apps/web-shell/src/tools/`:
- **Track styling:** `applySymbolStyle.ts:60-121` — `delete feature.properties.style...` without narrowing
- **Track styling:** `labelInterval.ts:50-105` — mutates `feature.properties.default_position_style`
- **Track styling:** `setTrackColor.ts:43-73` — accesses `feature.properties.style` and `feature.properties.platform_id`
- **Track styling:** `symbolInterval.ts` — same pattern
- **Reference tools:** `generateReferencePoints.ts:134-135` — `feature.properties.name as string`
- **Reference tools:** `pointInZoneClassifier.ts:96` — `const props = feature.properties` (implicitly untyped)
- **Sensor tools:** `bufferZoneGenerator.ts:246` — `feature.properties.kind === 'TRACK'` without narrowing
- **Shape tools:** `moveShape.ts:118,188` — `const props = feature.properties ?? {}`

**Impact:** A renamed or restructured property in the schema won't produce a compile error here.
**Action:** Every tool function signature declares the specific feature type it accepts (`TrackFeature`, `ReferenceLocation`, etc.). The compiler then checks all property access.

### E7. TypeScript `JSON.parse() as` casts — zero runtime checking
- `calcService.ts:601` — `JSON.parse(stdout) as MCPToolDefinition[]`
- `calcService.ts:650` — `JSON.parse(stdout) as Tool[]`
- `calcService.ts:733,799` — `JSON.parse(stdout) as MCPToolResponse | MCPErrorResponse`
- `calcService.ts:755,857` — `JSON.parse(item.resource.text) as SafeFeature`
- `stacService.ts:656` — `JSON.parse(content) as StacCatalog`
- `stacService.ts:680` — `JSON.parse(content) as StacItem`
- `stacService.ts:700` — `JSON.parse(content) as SafeFeatureCollection`
- `configService.ts:240` — `JSON.parse(content) as DebriefConfig`

**Impact:** `as` is a compile-time lie. Malformed data silently becomes a typed object.
**Action:** `JSON.parse` → validate with type guard or Zod → typed result. For features: use `isTrackFeature()` etc. from `@debrief/schemas`.

### E8. TypeScript `unknown` → domain data casts in internal logic
These are not boundary crossings — they are internal logic using casts instead of types:
- `mapPanel.ts:286` — `f as unknown as DebriefFeature`
- `mapPanel.ts:833` — `allFeatures.push(f as unknown as DebriefFeature)`
- `mapPanel.ts:986` — `drawnFeatureObj as unknown as DebriefFeature`
- `mapPanel.ts:1021` — `geometry: feature.geometry as { type: string; coordinates: unknown }`
- `stacService.ts:1215` — `(feature as unknown as Record<string, unknown>).properties = {}`
- `logService.ts:293,303` — `fc as unknown as GeoJsonFeatureCollection`
- `logService.ts:330` — `fid(f as unknown as Record<string, unknown>)`
- `entryBuilder.ts:110` — `params as unknown as Record<string, ParameterValue>`
- `web/mapView.tsx:255` — `feature.properties as Record<string, unknown>`

**Impact:** Each cast is a place where the actual data shape may not match the asserted type. These are the locations where our property-access bugs originate.
**Action:** Trace data flow back to its origin. If data is properly typed from creation, these casts become unnecessary. The few remaining deserialization points should use validation, not casts.

### E9. STAC features module — unvalidated read from disk
- **File:** `services/stac/src/debrief_stac/features.py:71`
- `fc: GeoJSONFeatureCollection = json.load(f)` — raw JSON into a type alias for `dict[str, Any]`
- `_calculate_bbox(fc["features"])` — unvalidated list access
- Validation exists on write (`_validate_feature()` at line 57-58) but not on read
- **Impact:** Corrupted or hand-edited JSON files are loaded as valid data.
- **Action:** Validate on read through `FEATURE_MODEL_MAP`. Fail-fast on invalid features.

### E10. MCP server functions return `dict[str, Any]` (both calc and STAC)
- `services/calc/debrief_calc/mcp/server.py:99` — `call_tool(name: str, arguments: dict)`
- `services/stac/src/debrief_stac/mcp_server.py` — 16+ handler functions all return `dict[str, Any]`
- `services/calc/debrief_calc/cli.py:64` — `params: dict = request.get("params", {})`
- `services/io/src/debrief_io/cli.py:28,66` — all CLI handlers
- **Action:** MCP handlers should receive validated Pydantic models and return typed responses.

### E11. Python session-state client returns bare dicts
- `services/session-state-py/src/debrief_session/client.py:51,126` — `_call_tool()` returns bare `dict`
- Lines 137, 158 — input data created as dict with untyped key-value pairs
- **Action:** Return typed Pydantic session-state models.

### E12. VS Code webview message payloads
- `apps/vscode/src/webview/messages.ts` — messages carry `SafeFeatureCollection` with `unknown` coordinates
- `messages.ts:239` — `coordinates: unknown`
- `messages.ts:383` — `trackData: unknown` (actually a GeoJSON FeatureCollection)
- **Action:** Once the extension host validates features on load, message types should use `DebriefFeature[]` not `SafeFeature[]`.

---

## Part F: snake_case / camelCase Convention

### F1. STAC service property key conversion
- **File:** `apps/vscode/src/services/stacService.ts:127-145` (approx)
- **Issue:** Manual key mapping between Python snake_case (`track_type`, `start_time`) and TypeScript camelCase (`trackType`, `startTime`)
- **Action:** Standardise: LinkML schemas use snake_case. Generated TypeScript types preserve snake_case (matching the JSON wire format). The conversion happens only at the UI rendering layer if needed. This is consistent with the existing generated types which already use snake_case.

---

## Execution Order (Recommended)

### Phase 0: Schema completeness (LinkML additions)
1. **Add** `PlotSummary` to LinkML (A1)
2. **Add** `StacItemSummary` and related Debrief-specific STAC projections (A2a, A3)
3. **Add** `ResultsSlice` / `BrowserFilterSlice` to `session-state.yaml` (A4)
4. **Reconcile** `DatasetEntry` schema with `DatasetEnvelope` implementation (A5)

### Phase 1: Generator (no runtime changes)
5. **Extend TS generator** to emit session-state, tool-result, and new A-types (B1, B2)
6. **Verify** provenance types are generated in TS (B4)

### Phase 2: Delete duplicates (low risk, compile-time only)
7. **Delete** `plot.ts` feature types → import from `@debrief/schemas` (C1)
8. **Delete** `utils/types.ts` duplicates → import from `@debrief/schemas` (C2)
9. **Delete** `LogPanel/types.ts` duplicates → import from `@debrief/schemas` (C3)
10. **Delete** `toolService.ts` LogEntry → import from `@debrief/schemas` (C4)
11. **Delete** Python calc `models.py` provenance duplicates → import from `debrief_schemas` (D1, D2)

### Phase 3: Strongly type internal logic (the big win)
12. **Kill** `Feature = dict[str, Any]` — replace with `DebriefFeature` union (E1)
13. **Retype** all 14 calc tool functions to return Pydantic models (E2)
14. **Retype** all tool function parameters to accept specific feature types (E2, E3)
15. **Retype** `result_builder.py` to accept Pydantic models (E4)
16. **Retype** TS tool functions to declare specific feature types, not `DebriefFeature` (E6)
17. **Eliminate** `featureProps.ts` escape hatch — require type narrowing via `isTrackFeature()` etc. (E5)
18. **Eliminate** `as unknown as` casts on domain data throughout TS (E8)
19. **Retype** STAC features module to validate on read, not just write (E9)

### Phase 4: Validate at entry points
20. **Add** TS validation after `JSON.parse` — type guards or Zod before domain data enters the type system (E7)
21. **Promote** executor schema validation from warn-and-continue to fail-fast (E10)
22. **Retype** MCP/CLI handler signatures to use Pydantic request/response models (E10)
23. **Retype** session-state client to return Pydantic models (E11)
24. **Retype** webview message payloads to use `DebriefFeature[]` (E12)

### Phase 5: Remaining migrations
25. **Migrate** `services/session-state/src/types/` to generated types (B1 consumer)
26. **Migrate** `services/session-state-py/` to generated types (D3)
27. **Migrate** `ChartRenderer/types.ts` to generated `DatasetEnvelope` (A5 consumer)
28. **Replace** hand-written `StacItemSummary` / `CatalogOverviewItem` with generated types (A2a, A3 consumers)

---

## Summary Statistics

| Category | Count | Locations | Risk |
|----------|-------|-----------|------|
| A. Missing from LinkML (need adding) | 5 (1 excluded: STAC base types) | 6 files | High — blocks everything downstream |
| B. In LinkML, not generated to TS | 4 | generator config | High — blocks Phase 2 |
| C. TS duplicates of generated types | 4 groups | ~10 files | Medium — straightforward delete-and-import |
| D. Python duplicates of generated types | 3 groups | ~5 files | Medium — straightforward delete-and-import |
| E. Untyped domain data throughout lifecycle | 12 categories | **~150 locations** | **Critical — source of property-access bugs** |
| F. Case convention friction | 1 | ~3 files | Low — standardise on snake_case |

**Total distinct fixes:** ~150+ locations across 28 work items
**Part E alone:** ~100 locations in Python (tool functions, executor, provenance, STAC, CLI) + ~50 locations in TypeScript (services, tools, webview, map panel)
**Root cause:** `dict[str, Any]` / `Record<string, unknown>` used for domain data, making the type system blind to invalid property access
