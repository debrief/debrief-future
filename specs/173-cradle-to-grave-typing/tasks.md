# Tasks: Cradle-to-Grave Typing

**Input**: Design documents from `/specs/173-cradle-to-grave-typing/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/README.md, quickstart.md

**Tests**: No separate test tasks — this feature modifies type signatures only. Existing tests (pytest, vitest, Playwright E2E) serve as regression gates. pyright and tsc strict mode are the primary verification tools.

**Organization**: Tasks follow the 6-phase execution order from plan.md (Phases 0-5), mapping to spec.md Parts A-F.

---

## Evidence Requirements

**Evidence Directory**: `specs/173-cradle-to-grave-typing/evidence/`
**Media Directory**: `specs/173-cradle-to-grave-typing/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | pytest + vitest + pyright + tsc results | After all phases pass |
| usage-example.md | Before/after code showing typed vs untyped patterns | After Phase 3 complete |
| round-trip-evidence.md | Python Pydantic -> JSON -> TypeScript type guard -> JSON round-trip proof | After Phase 1 (generator) complete |
| prohibited-patterns.txt | Output of quickstart.md grep checks showing zero violations | After Phase 5 complete |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| media/planning-post.md | Blog post announcing the feature | Already created during /speckit.plan |
| media/linkedin-planning.md | LinkedIn summary for planning | Already created during /speckit.plan |
| media/shipped-post.md | Blog post celebrating completion | During Polish phase |
| media/linkedin-shipped.md | LinkedIn summary for shipped | During Polish phase |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR in debrief-future with evidence | Final task in Polish phase |
| Blog PR | PR in debrief.github.io with post | Triggered by /speckit.pr |

---

## Phase 1: Schema Completeness — LinkML Additions (Spec Parts A1-A5)

**Purpose**: Add missing domain types to LinkML so they can be generated into both Python and TypeScript. This phase BLOCKS all downstream work.

- [x] T001 Add `PlotSummary` class to LinkML schema `shared/schemas/src/linkml/stac-extension.yaml`
- [x] T002 [P] Add `StacItemSummary` class to LinkML schema (unify with A3 `CatalogOverviewItem`) `shared/schemas/src/linkml/stac-extension.yaml`
- [x] T003 [P] Add `ResultsSlice` and `BrowserFilterSlice` to session-state schema `shared/schemas/src/linkml/session-state.yaml`
- [x] T004 [P] Reconcile `DatasetEntry` with `DatasetEnvelope` implementation — update schema to match runtime shape `shared/schemas/src/linkml/tool-result.yaml`
- [x] T005 Regenerate Python Pydantic models `shared/schemas/src/generated/python/debrief_schemas/__init__.py`
- [x] T006 Add `DebriefFeature` Python union type to debrief_schemas `shared/schemas/src/generated/python/debrief_schemas/unions.py`
- [x] T007 Run pyright and pytest to verify schema generation is clean

**Checkpoint**: All domain types now exist in LinkML. Pydantic models include `DebriefFeature` union.

---

## Phase 2: TypeScript Generator Extension (Spec Parts B1-B4)

**Purpose**: Extend the TypeScript generator to emit session-state, tool-result, and newly added types. No runtime changes.

- [x] T008 Add `session-state` import to master schema `shared/schemas/src/linkml/debrief.yaml`
- [x] T009 [P] Add `tool-result` import to master schema `shared/schemas/src/linkml/debrief.yaml`
- [x] T010 Regenerate TypeScript types (session-state, tool-result, new A-types now included) `shared/schemas/src/generated/typescript/types.ts`
- [x] T011 Add type guards for new session-state types if needed `shared/schemas/src/generated/typescript/unions.ts`
- [x] T012 Verify provenance types (LogEntry, ParameterValue, InputFeatureState) are present in generated TS output
- [x] T013 Run pnpm typecheck and pnpm test to verify TS generation is clean

**Checkpoint**: `@debrief/schemas` now exports all domain types. Round-trip evidence can be captured.

---

## Phase 3: Delete TypeScript Duplicates (Spec Parts C1-C4)

**Purpose**: Replace hand-written TypeScript types with imports from `@debrief/schemas`. Compile-time only — no runtime behaviour change.

### C1: Feature type duplicates in plot.ts

- [x] T014 Delete `TrackFeature`, `LocationFeature`, `PlotFeatureCollection` from plot.ts — import from `@debrief/schemas` `apps/vscode/src/types/plot.ts`
- [x] T015 [P] Delete `LineString`, `Point` geometry types from plot.ts — import `GeoJSONLineString`, `GeoJSONPoint` from `@debrief/schemas` `apps/vscode/src/types/plot.ts`
- [x] T016 [P] Delete `PositionStyle`, `PositionStyleOverride` from plot.ts — import from `@debrief/schemas` `apps/vscode/src/types/plot.ts`
- [x] T017 [P] Delete `TimestampedPosition` from plot.ts — import from `@debrief/schemas` `apps/vscode/src/types/plot.ts`
- [x] T018 Rename `Track` to `TrackViewModel` in plot.ts and update consumers `apps/vscode/src/types/plot.ts`
- [x] T019 Update consumers of deleted plot.ts types: `outlineProvider.ts`, `sessionManager.ts`, `stacService.ts`

### C2: Style duplicates in shared/utils

- [x] T020 Delete `PositionStyle`, `PositionStyleOverride` from shared utils — import from `@debrief/schemas` `shared/utils/src/types.ts`
- [x] T021 Update consumers of shared/utils style types

### C3: Provenance duplicates in LogPanel

- [x] T022 Delete `ParameterValue`, `InputFeatureState` from LogPanel types — import from `@debrief/schemas` `shared/components/src/LogPanel/types.ts`
- [x] T023 [P] Keep `TimelineEntry` as UI display type (add comment noting it's a UI projection)

### C4: LogEntry duplicate in toolService

- [x] T024 Delete `LogEntry` from toolService — import from `@debrief/schemas` `apps/web-shell/src/services/toolService.ts`

- [x] T025 Run pnpm typecheck and pnpm test to verify all TS duplicate elimination is clean

**Checkpoint**: No hand-written TS types duplicate generated schemas. All imports flow from `@debrief/schemas`.

---

## Phase 4: Delete Python Duplicates (Spec Parts D1-D3)

**Purpose**: Replace hand-written Python Pydantic models with imports from `debrief_schemas`. No runtime behaviour change.

### D1: Provenance duplicates in calc/models.py

- [x] T026 Delete `ParameterValue`, `InputFeatureState`, `TuneAnnotation`, `WasGeneratedBy`, `LogEntry` from calc models — import from `debrief_schemas` `services/calc/debrief_calc/models.py`
- [x] T027 Update all calc internal imports that reference deleted models

### D2: Snapshot/branch duplicates in calc/models.py

- [x] T028 Delete `SnapshotRef`, `SnapshotLinks`, `BranchRecord`, `FileProvEntry`, `SystemRecordProperties` from calc models — import from `debrief_schemas` `services/calc/debrief_calc/models.py`

### D3: Session-state duplicates in session-state-py

- [x] T029 Delete `TimeInstant`, `TimeRange`, `TimeFilter`, `TimeStep`, `Coordinate`, `ViewportPolygon`, `FeatureSelection`, `TemporalSlice` from session-state-py types — import from `debrief_schemas` `services/session-state-py/src/debrief_session/types.py`
- [x] T030 Update session-state-py client and consumers to use new import paths

- [x] T031 Run pyright and pytest to verify all Python duplicate elimination is clean

**Checkpoint**: No hand-written Python models duplicate generated schemas. All imports flow from `debrief_schemas`.

---

## Phase 5: Strongly Type Python Internal Logic (Spec Parts E1-E4)

**Purpose**: Replace `dict[str, Any]` with Pydantic models throughout Python services. This is the highest-value phase — it catches property-access bugs at compile time.

### E1: Kill the root cause — Feature = dict[str, Any]

- [x] T032 Replace `Feature = dict[str, Any]` alias with `DebriefFeature` union type `services/io/src/debrief_io/types.py`
- [x] T033 Update debrief_io parser public APIs to return Pydantic models (validate at output boundary)
- [x] T034 Run pyright on debrief_io — fix cascading type errors

### E2-E3: Retype calc tool functions (14 tools)

- [x] T035 Retype `track_stats.py` — accept/return typed features `services/calc/debrief_calc/tools/track_stats.py`
- [x] T036 [P] Retype `range_bearing.py` — accept/return typed features `services/calc/debrief_calc/tools/range_bearing.py`
- [x] T037 [P] Retype `area_summary.py` — accept/return typed features `services/calc/debrief_calc/tools/area_summary.py`
- [x] T038 [P] Retype `set_track_color.py` — accept/return typed features `services/calc/debrief_calc/tools/track/styling/set_track_color.py`
- [x] T039 [P] Retype `apply_symbol_style.py` — accept/return typed features `services/calc/debrief_calc/tools/track/styling/apply_symbol_style.py`
- [x] T040 [P] Retype `symbol_interval.py` — accept/return typed features `services/calc/debrief_calc/tools/track/styling/symbol_interval.py`
- [x] T041 [P] Retype `label_interval.py` — accept/return typed features `services/calc/debrief_calc/tools/track/styling/label_interval.py`
- [x] T042 [P] Retype `generate_courses_speeds.py` — accept/return typed features `services/calc/debrief_calc/tools/track/manipulation/generate_courses_speeds.py`
- [x] T043 [P] Retype `move_shape.py` — accept/return typed features `services/calc/debrief_calc/tools/shape/manipulation/move_shape.py`
- [x] T044 [P] Retype `enlarge_shape.py` — accept/return typed features `services/calc/debrief_calc/tools/shape/manipulation/enlarge_shape.py`
- [x] T045 [P] Retype `generation.py` (4 reference generation entry points) — accept/return typed features `services/calc/debrief_calc/tools/reference/generation.py`
- [x] T046 [P] Retype `classification.py` — accept/return typed features `services/calc/debrief_calc/tools/reference/classification.py`
- [x] T047 [P] Retype `buffer_zone_generator.py` — accept/return typed features `services/calc/debrief_calc/tools/sensor/detection/buffer_zone_generator.py`

### E3: Replace dict.get() access patterns

- [x] T048 Replace `feature.get("properties")` patterns in `validation.py` with typed attribute access `services/calc/debrief_calc/validation.py`
- [x] T049 [P] Replace `feature.get("properties")` patterns in `provenance.py` with typed attribute access `services/calc/debrief_calc/provenance.py`
- [x] T050 [P] Replace `feature.get("properties")` patterns in `executor.py` with typed attribute access `services/calc/debrief_calc/executor.py`

### E4: Retype result_builder.py

- [x] T051 Change `build_mutation`, `build_addition`, `build_artifact`, `build_response` to accept Pydantic models and call `.model_dump()` internally `services/calc/debrief_calc/result_builder.py`

- [x] T052 Run pyright and pytest on calc service — fix all type errors and test failures

### E9: STAC features — validate on read

- [x] T053 Add Pydantic validation on feature read in STAC features module (currently only validates on write) `services/stac/src/debrief_stac/features.py`

### E10-E11: MCP/CLI handler retyping

- [x] T054 Retype calc MCP server handler to use Pydantic request/response models `services/calc/debrief_calc/mcp/server.py`
- [x] T055 [P] Retype calc CLI handler to use typed parameters `services/calc/debrief_calc/cli.py`
- [x] T056 [P] Retype io CLI handlers to use typed parameters `services/io/src/debrief_io/cli.py`
- [x] T057 [P] Retype STAC MCP server handlers to return typed models `services/stac/src/debrief_stac/mcp_server.py`
- [x] T058 [P] Retype session-state-py client to return Pydantic session-state models `services/session-state-py/src/debrief_session/client.py`

- [x] T059 Run pyright and pytest across all Python services — full regression check

**Checkpoint**: All Python domain data is typed. `dict[str, Any]` eliminated from tool functions, result builder, MCP handlers, and CLI handlers.

---

## Phase 6: Strongly Type TypeScript Internal Logic (Spec Parts E5-E8, E12)

**Purpose**: Eliminate `propsRecord` escape hatch, `as unknown as` casts, and unvalidated `JSON.parse` across TypeScript codebase.

### E5: Eliminate featureProps.ts escape hatch

- [x] T060 Refactor `calcService.ts` — replace `propsRecord` with type-narrowed guards `apps/vscode/src/services/calcService.ts`
- [x] T061 [P] Refactor `setTrackColor.ts` — declare `TrackFeature` parameter, use typed properties `apps/vscode/src/tools/setTrackColor.ts`
- [x] T062 [P] Refactor `applySymbolStyle.ts` — declare `TrackFeature` parameter, use typed properties `apps/vscode/src/tools/applySymbolStyle.ts`
- [x] T063 [P] Refactor `labelInterval.ts` — declare `TrackFeature` parameter, use typed properties `apps/vscode/src/tools/labelInterval.ts`
- [x] T064 [P] Refactor `symbolInterval.ts` — declare `TrackFeature` parameter, use typed properties `apps/vscode/src/tools/symbolInterval.ts`
- [x] T065 [P] Refactor `moveShape.ts` — declare specific annotation type parameter `apps/vscode/src/tools/moveShape.ts`
- [x] T066 [P] Refactor `enlargeShape.ts` — declare specific annotation type parameter `apps/vscode/src/tools/enlargeShape.ts`
- [x] T067 [P] Refactor `mapPanel.ts` — replace `propsRecord` with type-narrowed guards `apps/vscode/src/webview/mapPanel.ts`
- [x] T068 [P] Refactor `openPlot.ts` — replace `propsRecord` with type-narrowed guards `apps/vscode/src/commands/openPlot.ts`
- [x] T069 [P] Refactor `executeTool.ts` — replace `propsRecord` with type-narrowed guards `apps/vscode/src/tools/executeTool.ts`
- [x] T070 Delete `featureProps.ts` escape hatch (all consumers migrated) `apps/vscode/src/utils/featureProps.ts`

### E6: Retype TypeScript tool functions

- [x] T071 Retype `generateReferencePoints.ts` — declare specific feature types `apps/vscode/src/tools/generateReferencePoints.ts`
- [x] T072 [P] Retype `pointInZoneClassifier.ts` — declare specific feature types `apps/vscode/src/tools/pointInZoneClassifier.ts`
- [x] T073 [P] Retype `bufferZoneGenerator.ts` — add type guard narrowing `apps/vscode/src/tools/bufferZoneGenerator.ts`
- [x] T074 Retype web-shell tool counterparts (same patterns as VS Code tools) `apps/web-shell/src/tools/`

### E7: Add validation after JSON.parse

- [x] T075 Add type-guard validation after `JSON.parse` in `calcService.ts` (4 parse sites) `apps/vscode/src/services/calcService.ts`
- [x] T076 [P] Add type-guard validation after `JSON.parse` in `stacService.ts` (3 parse sites) `apps/vscode/src/services/stacService.ts`
- [x] T077 [P] Add type-guard validation after `JSON.parse` in `configService.ts` `apps/vscode/src/services/configService.ts`

### E8: Eliminate `as unknown as` casts on domain data

- [x] T078 Remove `as unknown as DebriefFeature` casts in `mapPanel.ts` — trace data flow, type from origin `apps/vscode/src/webview/mapPanel.ts`
- [x] T079 [P] Remove `as unknown as` casts in `stacService.ts` `apps/vscode/src/services/stacService.ts`
- [x] T080 [P] Remove `as unknown as` casts in `logService.ts` `apps/vscode/src/services/logService.ts`
- [x] T081 [P] Remove `as unknown as` casts in `entryBuilder.ts` `apps/vscode/src/provenance/entryBuilder.ts`
- [x] T082 [P] Remove `as Record<string, unknown>` cast in `web/mapView.tsx` `apps/web-shell/src/web/mapView.tsx`

### E12: Retype webview message payloads

- [x] T083 Change webview message types from `SafeFeatureCollection` to `DebriefFeature[]` where features are pre-validated `apps/vscode/src/webview/messages.ts`

### F1: snake_case convention

- [x] T084 Remove manual key mapping in stacService — standardise on snake_case from schema `apps/vscode/src/services/stacService.ts`

- [x] T085 Run pnpm typecheck and pnpm test — full TypeScript regression check

**Checkpoint**: All TypeScript domain data is typed. `propsRecord` eliminated, `as unknown as` casts removed, `JSON.parse` validated.

---

## Phase 7: Remaining Migrations (Spec Part B1 consumers, A2a/A3/A5 consumers)

**Purpose**: Migrate remaining hand-written types to generated schema imports.

- [x] T086 Migrate `services/session-state/src/types/*.ts` to import from `@debrief/schemas` (all session-state slices)
- [x] T087 [P] Migrate `ChartRenderer/types.ts` — replace `DatasetEnvelope` with generated type from `@debrief/schemas` `shared/components/src/ChartRenderer/types.ts`
- [x] T088 [P] Replace hand-written `StacItemSummary` / `CatalogOverviewItem` in filter-engine with generated types `shared/components/src/filter-engine/types.ts`
- [x] T089 [P] Replace hand-written `StacItemSummary` in VS Code stac types with generated type `apps/vscode/src/types/stac.ts`

- [x] T090 Run full CI suite: `task verify`

**Checkpoint**: All domain types flow from LinkML. No hand-written duplicates remain.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, evidence collection, media content, and PR creation.

### Validation

- [x] T091 Run quickstart.md prohibited-pattern checks — verify zero violations
- [x] T092 Run `task verify` — full lint + typecheck + test suite

### Evidence Collection

- [x] T093 Capture test results using template (.specify/templates/evidence/test-summary-template.md) in `specs/173-cradle-to-grave-typing/evidence/test-summary.md`
- [x] T094 Create usage demonstration (before/after typed patterns) in `specs/173-cradle-to-grave-typing/evidence/usage-example.md`
- [x] T095 [P] Capture round-trip evidence (Python Pydantic -> JSON -> TS type guard -> JSON) in `specs/173-cradle-to-grave-typing/evidence/round-trip-evidence.md`
- [x] T096 [P] Capture prohibited-pattern grep output (zero matches) in `specs/173-cradle-to-grave-typing/evidence/prohibited-patterns.txt`

### Media Content

- [x] T097 Create shipped blog post in `specs/173-cradle-to-grave-typing/media/shipped-post.md`
- [x] T098 [P] Create LinkedIn shipped summary in `specs/173-cradle-to-grave-typing/media/linkedin-shipped.md`

### PR Creation

- [x] T099 Create PR and publish blog: run /speckit.pr

**Task T099 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1** (Schema): No dependencies — can start immediately. BLOCKS all other phases.
- **Phase 2** (TS Generator): Depends on Phase 1 completion. BLOCKS Phases 3, 6, 7.
- **Phase 3** (Delete TS Duplicates): Depends on Phase 2 (generated types must exist).
- **Phase 4** (Delete Python Duplicates): Depends on Phase 1 (Pydantic models must exist). Can run in PARALLEL with Phases 2-3.
- **Phase 5** (Python Retyping): Depends on Phase 4 (duplicate elimination first).
- **Phase 6** (TS Retyping): Depends on Phase 3 (duplicate elimination first).
- **Phase 7** (Remaining Migrations): Depends on Phases 2, 5, 6.
- **Phase 8** (Polish): Depends on all previous phases.

### Parallel Opportunities

```
Phase 1 (Schema)
    |
    +---> Phase 2 (TS Gen) ---> Phase 3 (TS Dupes) ---> Phase 6 (TS Retyping) ---+
    |                                                                              |
    +---> Phase 4 (Py Dupes) ---> Phase 5 (Py Retyping) -------------------------+--> Phase 7 --> Phase 8
```

- Phases 2+3 and Phase 4 can run in parallel (TS and Python tracks)
- Phases 5 and 6 can run in parallel (Python and TypeScript retyping)
- Within Phase 5: All 14 tool retypings (T035-T047) are [P] parallel
- Within Phase 6: All 10 featureProps consumers (T060-T069) are [P] parallel

### Within Each Phase

- Schema additions before regeneration
- Regeneration before consumer migration
- Duplicate deletion before retyping (cleaner diff)
- Individual tool retypings are independent (different files)

---

## Implementation Strategy

### Incremental Delivery

1. **Phase 1**: Schema additions + Python union type -> Foundation ready
2. **Phase 2**: TS generator extension -> All types available in both languages
3. **Phases 3-4**: Delete duplicates -> Clean import graph (low-risk, compile-time only)
4. **Phases 5-6**: Retype internal logic -> Property-access bugs become compile errors (the big win)
5. **Phase 7**: Final migrations -> No hand-written domain types remain
6. **Phase 8**: Evidence + PR -> Ship it

### Risk Mitigation

- Each phase produces a compilable, testable codebase
- `task verify` run at every checkpoint
- Tool retypings are independent — a failing tool can be reverted without affecting others
- `featureProps.ts` consumers can be migrated one at a time — delete the file only after all consumers are migrated

---

## Notes

- [P] tasks = different files, no dependencies
- No new dependencies introduced — uses existing `debrief_schemas` and `@debrief/schemas`
- Runtime behaviour is unchanged — only type annotations and validation strictness change
- All 14 Python tool functions listed individually for progress tracking
- All 10 `propsRecord` consumers listed individually for progress tracking
- Run `task verify` after completing each phase (not just at the end)
- Commit after each phase or logical group of tasks
