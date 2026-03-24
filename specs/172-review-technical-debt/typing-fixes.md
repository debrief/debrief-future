# Typing Fix List: Approach C — LinkML-Derived Types at Every Boundary

**Feature:** 172-review-technical-debt
**Date:** 2026-03-24
**Approach:** All domain data typed via LinkML-generated Pydantic (Python) and TypeScript interfaces. Hand-written duplicates replaced with imports from `@debrief/schemas` / `debrief_schemas`.

---

## Current State Summary

**LinkML schema:** 111 definitions (84 classes, 24 enums, 3 custom types) across 11 modules. The schema is closure-complete — every type reference resolves.

**Generated artifacts:**
- Python Pydantic: `shared/schemas/src/generated/python/debrief_schemas/__init__.py` (171 KB)
- JSON Schema: `shared/schemas/src/generated/json-schema/debrief.schema.json` (87 KB) + 18 per-entity schemas
- TypeScript: `shared/schemas/src/generated/typescript/types.ts` (42 KB) + `unions.ts` (companion)

**Gap:** Session-state types (`SessionState`, `TemporalSlice`, `SpatialSlice`, etc.) and tool-result dataset types (`DatasetEntry`, `DatasetMetadata`, `DatasetSeries`) exist in LinkML but are **not generated** into the TypeScript output. The TS generator currently only emits GeoJSON feature types and their dependencies.

---

## Part A: Types That Don't Exist in LinkML (Need New Schema or Intentional Exclusion)

These data shapes are used in the codebase but have no LinkML definition. For each, decide whether to add to LinkML or formally mark as "infrastructure-only".

### A1. `Plot` / STAC Item metadata wrapper
- **Used in:** `apps/vscode/src/types/plot.ts:19-49`
- **Shape:** `{ id, title, datetime, itemPath, catalogId, sourcePath, bbox, timeExtent, trackCount, locationCount }`
- **Assessment:** This is a STAC Item projection for UI display. It is **not domain data** — it's metadata about a STAC Item. The STAC spec itself defines Item structure. **Exclude from LinkML.** Keep as hand-written TS type.
- **Action:** None. Leave as-is but move to a shared location if used by more than one app.

### A2. `StacItemSummary` / `StacCollection` / `StacCatalog` / STAC infrastructure types
- **Used in:** `apps/vscode/src/types/stac.ts:1-261`
- **Assessment:** These are STAC specification types, not Debrief domain types. **Exclude from LinkML.** Consider using `@stac-ts/core` or a shared hand-written STAC types module.
- **Action:** None. These are legitimately hand-written.

### A3. `CatalogOverviewItem` / `StacBrowserItem`
- **Used in:** `shared/components/src/filter-engine/types.ts:15-93`
- **Shape:** Includes `vessel_classes`, `tags`, `nationalities`, `trackNames` — metadata from the `StacExtensionProperties` schema type.
- **Assessment:** These are UI projections of STAC extension metadata. The extension properties themselves are in LinkML (`stac-extension.yaml`). The wrapping structures are UI infrastructure.
- **Action:** None (intentional UI types), but ensure the embedded fields (vessel_classes etc.) reference the generated `StacExtensionProperties` field types rather than redefining them.

### A4. `ResultsSlice` / `BrowserFilterSlice`
- **Used in:** `services/session-state/src/types/results.ts`, `browser-filter.ts`
- **Assessment:** These are Zustand store slices added after the LinkML session-state schema was written. They represent tool result layer state and STAC browser filter state — UI concerns, not domain data.
- **Action:** If these stabilise, add to `session-state.yaml`. For now, leave as hand-written.

### A5. `DatasetEnvelope` (ChartRenderer)
- **Used in:** `shared/components/src/ChartRenderer/types.ts:31-42`
- **Nearest schema type:** `DatasetEntry` in `tool-result.yaml`
- **Divergence:** Schema `DatasetEntry.series[].data` is `float[]`, while TS `DatasetEnvelope.data` is `Record<string, unknown>[]` and `series[].data` is `Record<string, unknown>[]`. These are **structurally different**.
- **Action:** Reconcile `DatasetEntry` schema with actual runtime shape. The schema appears to predate the implementation. Update LinkML `tool-result.yaml` to match the actual data shape, then generate and import.

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

## Part E: Untyped / Weakly-Typed Boundaries (Runtime Validation Needed)

### E1. Python MCP `call_tool()` — arguments are untyped `dict`
- **File:** `services/calc/debrief_calc/mcp/server.py:99`
- **Current:** `async def call_tool(name: str, arguments: dict) -> list[TextContent]`
- **Issue:** `arguments` is an untyped dict. The `features` key contains GeoJSON features as raw dicts.
- **Action:** Parse `arguments["features"]` through `FEATURE_MODEL_MAP` validation (from `debrief_schemas.validation`) before passing to the executor. This already happens inside the executor (`_schema_validate_features`) but as warn-and-continue — promote to fail-fast at the MCP boundary.

### E2. Python tool functions return `list[dict[str, Any]]`
- **Files:** All 7 tool modules in `services/calc/debrief_calc/tools/`
- **Current:** Every tool handler returns `list[dict[str, Any]]`
- **Issue:** The executor does schema validation post-hoc (`_schema_validate_features` at line 125) but it's warn-and-continue
- **Action:** Change tool return type annotations to `list[TrackFeature | MultiPointFeature | ...]` or use a `DebriefFeature` union. Have the executor validate via Pydantic before returning. Gradual migration: start with the executor boundary, then tighten individual tools.

### E3. TypeScript `JSON.parse() as` casts — no runtime validation
- **Files:**
  - `calcService.ts:601` — `JSON.parse(stdout.trim()) as MCPToolDefinition[]`
  - `calcService.ts:650` — `JSON.parse(stdout.trim()) as Tool[]`
  - `calcService.ts:733,799` — `JSON.parse(stdout.trim()) as MCPToolResponse | MCPErrorResponse`
  - `calcService.ts:755,857` — `JSON.parse(item.resource.text) as SafeFeatureCollection['features'][number]`
  - `stacService.ts:656` — `JSON.parse(content) as StacCatalog`
  - `stacService.ts:680` — `JSON.parse(content) as StacItem`
  - `stacService.ts:700` — `JSON.parse(content) as SafeFeatureCollection`
  - `configService.ts:240` — `JSON.parse(content) as DebriefConfig`
- **Issue:** `as` is a compile-time assertion with zero runtime checking. Malformed JSON silently becomes a typed object.
- **Action:** Create a thin validation layer. For feature data: `JSON.parse` → `SafeFeature` → validate with type guards from `@debrief/schemas/unions.ts` → `DebriefFeature`. For MCP responses: add a Zod schema or manual shape check for `MCPToolResponse`.

### E4. Python `result_builder.py` — accepts `list[dict]`
- **File:** `services/calc/debrief_calc/result_builder.py:17-22`
- **Current:** `def build_mutation(features: list[dict], ...)` — features are untyped dicts
- **Action:** Change to `list[dict[str, Any]]` minimum, or better: accept Pydantic models and call `.model_dump()` internally.

### E5. Python `debrief_io/types.py` — `Feature = dict[str, Any]`
- **File:** `services/io/src/debrief_io/types.py:21`
- **Comment says:** "Runtime: validated against debrief-schemas Pydantic models at the parser output boundary (warn-and-continue)"
- **Action:** Change the type alias to a `TypeAlias` of the Pydantic `DebriefFeature` union (once one exists). The actual parsers can still return dicts internally but the public API should declare the validated type.

### E6. STAC service MCP server — returns `dict[str, Any]`
- **File:** `services/stac/src/debrief_stac/mcp_server.py`
- **Issue:** STAC operations return raw dicts for catalog/item/collection data
- **Action:** For feature collections read from STAC assets, validate through `FEATURE_MODEL_MAP` before returning. For STAC metadata (items, catalogs), keep as dicts (these follow the STAC spec, not Debrief schema).

### E7. `featureProps.ts` double-cast escape hatch
- **File:** `apps/vscode/src/utils/featureProps.ts:21`
- **Pattern:** `(feature as unknown as Record<string, unknown>)` — bypasses type safety to access nested properties
- **Used by:** 4+ files for accessing `feature.properties.X`
- **Action:** Replace with proper type narrowing. After validation, the feature should be typed as `TrackFeature` etc., making `.properties.platform_name` directly accessible without casts.

### E8. VS Code webview message passing
- **Files:** `apps/vscode/src/webview/messages.ts`
- **Pattern:** Messages carry `SafeFeatureCollection` payloads with `unknown` coordinates
- **Action:** The webview boundary is internal to the extension process (no serialization across processes). Lower priority. But the message types should reference `DebriefFeature[]` rather than `SafeFeature[]` once the extension host validates features on load.

### E9. Layout persistence — JSON.parse without validation
- **File:** `apps/vscode/src/services/layoutPersistence.ts:132` (approx)
- **Issue:** Reads persisted layout JSON without validation
- **Action:** Add Zod or manual validation for the small layout schema. Not a schema-derived type issue (layout is infrastructure).

---

## Part F: snake_case / camelCase Boundary Friction

### F1. STAC service property key conversion
- **File:** `apps/vscode/src/services/stacService.ts:127-145` (approx)
- **Issue:** Manual key mapping between Python snake_case (`track_type`, `start_time`) and TypeScript camelCase (`trackType`, `startTime`)
- **Action:** Standardise: LinkML schemas use snake_case. Generated TypeScript types preserve snake_case (matching the JSON wire format). The conversion happens only at the UI rendering layer if needed. This is consistent with the existing generated types which already use snake_case.

---

## Execution Order (Recommended)

### Phase 1: Foundation (no runtime changes)
1. **Extend TS generator** to emit session-state and tool-result types (B1, B2)
2. **Reconcile** `DatasetEntry` schema vs `DatasetEnvelope` implementation (A5)
3. **Verify** provenance types are generated in TS (B4)

### Phase 2: Delete duplicates (low risk, compile-time only)
4. **Delete** `plot.ts` feature types → import from `@debrief/schemas` (C1)
5. **Delete** `utils/types.ts` duplicates → import from `@debrief/schemas` (C2)
6. **Delete** `LogPanel/types.ts` duplicates → import from `@debrief/schemas` (C3)
7. **Delete** `toolService.ts` LogEntry → import from `@debrief/schemas` (C4)
8. **Delete** Python calc `models.py` provenance duplicates → import from `debrief_schemas` (D1, D2)

### Phase 3: Tighten boundaries (runtime validation changes)
9. **Promote** executor schema validation from warn-and-continue to fail-fast (E1, E2)
10. **Add** TS validation layer between `JSON.parse` and typed consumption (E3)
11. **Tighten** `result_builder.py` signatures (E4)
12. **Replace** `Feature = dict[str, Any]` alias (E5)
13. **Eliminate** `featureProps.ts` double-cast (E7)

### Phase 4: Migration (larger changes)
14. **Migrate** `services/session-state/src/types/` to generated types (B1 consumer)
15. **Migrate** `services/session-state-py/` to generated types (D3)
16. **Migrate** `ChartRenderer/types.ts` to generated `DatasetEntry` (A5 consumer)

---

## Summary Statistics

| Category | Count | Risk |
|----------|-------|------|
| A. Missing from LinkML (intentional) | 5 | Low — keep as infrastructure types |
| B. In LinkML, not generated to TS | 4 | High — blocks Phase 2 |
| C. TS duplicates of generated types | 4 groups | Medium — straightforward delete-and-import |
| D. Python duplicates of generated types | 3 groups | Medium — straightforward delete-and-import |
| E. Untyped/weakly-typed boundaries | 9 | High — runtime validation gaps |
| F. Case convention friction | 1 | Low — standardise on snake_case |

**Total distinct fixes:** 30+
**Estimated items that change runtime behaviour:** 9 (all in Part E)
**Estimated items that are compile-time only:** 21+ (Parts B, C, D)
