# Feature Specification: Schema-Rooted Raw GeoJSON Feature Type

**Feature Branch**: `204-rawgeojsonfeature-linkml`
**Created**: 2026-04-20
**Status**: Draft
**Input**: Backlog item #204 (Tech Debt) — Add `RawGeoJSONFeature` to LinkML and eliminate hand-typed `GeoJSONFeature` duplicates. Source: `docs/ideas/204-rawgeojsonfeature-linkml.md`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Single schema-rooted parse-boundary type (Priority: P1)

A developer writing code that reads a GeoJSON payload at an external boundary (a file import, an IPC message from the Electron main process, a web-shell tool response, a STAC catalog load) needs a well-defined TypeScript / Python type for "some GeoJSON Feature, not yet narrowed to a Debrief variant." Today they choose between two hand-written `GeoJSONFeature` interfaces (shared/utils vs services/session-state) that have drifted in both `id` typing and `coordinates` typing, or a third `SafeFeature`-aliased export, or they invent another local one. After this change they import a single, generated `RawGeoJSONFeature` type from `@debrief/schemas` (TypeScript) / `debrief_schemas` (Python) — backed by the LinkML master schema and therefore guaranteed to be stable across the three languages.

**Why this priority**: This is the core outcome of the feature — without a canonical schema-rooted type, the consolidation has nothing to migrate to. Every downstream story depends on this type existing.

**Independent Test**: Generate Pydantic + TypeScript from the updated LinkML schema and import `RawGeoJSONFeature` from `@debrief/schemas` and `RawGeoJSONFeature` (Pydantic model) from `debrief_schemas`. Construct a valid GeoJSON feature payload (with `id` as a string, with `id` as an integer, with `id` absent) and confirm both generated types accept it without casts. Schema round-trip fixture tests pass.

**Acceptance Scenarios**:

1. **Given** the updated LinkML schema and freshly regenerated artefacts, **When** a developer writes `import type { RawGeoJSONFeature } from '@debrief/schemas'`, **Then** the type exists, is exported, and its shape matches the GeoJSON spec minimum (discriminating `type`, optional string-or-integer `id`, required `geometry` with `type` + `coordinates`, optional `properties` object).
2. **Given** the generated Pydantic model `RawGeoJSONFeature`, **When** Pydantic validates a canonical valid-Feature fixture and a canonical valid-Feature-with-integer-id fixture, **Then** both validate successfully.
3. **Given** the generated type, **When** a developer tries to assign a `DebriefFeature` subtype (e.g., `TrackFeature`) to a `RawGeoJSONFeature` variable, **Then** assignment succeeds (the loose type is a valid supertype — `DebriefFeature` is strictly more specific).

### User Story 2 — Clean deletion of drifted hand-typed duplicates (Priority: P2)

A maintainer reviewing `shared/utils/src/types.ts` and `services/session-state/src/types/results.ts` finds only one definition of a loose GeoJSON Feature type — the generated one, re-exported where ergonomic. The two hand-typed `GeoJSONFeature` interfaces (and the `GeoJSONFeatureCollection` that depends on the shared/utils copy) are gone. Every former consumer (VS Code extension, Electron loader, web-shell tools, shared components, session-state store, service code) imports the generated type. No `any` casts, no re-introduced local duplicates, no lingering structural drift.

**Why this priority**: This is the tech-debt payoff — without deletion, the duplicates and their drift persist. It depends on Story 1 because consumers can only migrate after the generated type exists.

**Independent Test**: Run `grep -rE '^(export\s+)?interface\s+GeoJSONFeature\b' apps/ shared/ services/` on the post-change tree and confirm zero matches. Run the full `task verify` pipeline (lint + typecheck + tests) and confirm all packages build with no type errors after the migration.

**Acceptance Scenarios**:

1. **Given** the post-change codebase, **When** a reviewer searches for hand-written `interface GeoJSONFeature` declarations in `apps/`, `shared/`, and `services/`, **Then** no matches are found outside of the generated schema artefacts directory.
2. **Given** the post-change codebase, **When** a reviewer searches for hand-written `interface GeoJSONFeatureCollection` declarations that depend on the deleted `GeoJSONFeature`, **Then** no such declarations remain (consumers use `RawGeoJSONFeatureCollection` from the generated artefacts, or a re-export of it).
3. **Given** every former consumer of the deleted types, **When** `pnpm -r typecheck` and `uv run pyright` run, **Then** both complete without errors attributable to the migration.
4. **Given** the existing session-state Zustand store for result layers (`services/session-state/src/store/slices/results.ts`), **When** it is exercised by the current store tests, **Then** all tests pass without behavioural changes — only the imported type name/shape is different.

### User Story 3 — Guard rails prevent reintroduction (Priority: P3)

A future contributor who instinctively hand-writes a new `GeoJSONFeature`-ish interface at a parse boundary (because "I don't know which Debrief variant this is yet") is redirected to the canonical generated type. The generated type carries a prominent, schema-sourced usage-rule comment explaining that it is a parse-boundary type — and that code past the parse boundary should narrow to `DebriefFeature` (or a specific subtype) via the existing type guards. The commit that deletes the old duplicates records the rationale in `docs/project_notes/decisions.md` so that the decision is discoverable via the existing memory protocol.

**Why this priority**: Guard rails make the fix durable. Without them the drift will return the next time someone reaches for a "just for this parse boundary" type. Lower than P1/P2 because the immediate consolidation wins the lion's share of the value even without documentation guard rails.

**Independent Test**: Verify the generated TS type file includes a non-trivial JSDoc block on `RawGeoJSONFeature` describing its parse-boundary role and the `DebriefFeature` narrowing guidance. Verify an ADR entry exists in `docs/project_notes/decisions.md` linking to this spec and naming the deleted interfaces. (Optional extension: a lint check or test that fails when a new `interface GeoJSONFeature` is added — planned as a follow-up if inexpensive.)

**Acceptance Scenarios**:

1. **Given** the regenerated TypeScript artefact `shared/schemas/src/generated/typescript/types.ts`, **When** a reader looks at the `RawGeoJSONFeature` declaration, **Then** it is preceded by a docstring that (a) names it as a parse-boundary type, (b) directs the reader to narrow to `DebriefFeature` past the boundary, and (c) mentions the existing type-guard helpers by name or by location hint.
2. **Given** `docs/project_notes/decisions.md` after merge, **When** a reviewer searches for entries relating to GeoJSON typing or LinkML consolidation, **Then** a dated ADR entry exists that names the two deleted hand-typed duplicates, links to this spec, and summarises the decision.
3. **Given** a subsequent code-review pass on a PR that reintroduces a hand-typed `GeoJSONFeature`, **When** the reviewer invokes the project's memory-aware protocol (CLAUDE.md), **Then** the ADR surfaces the established pattern and the reviewer can quote it.

### Edge Cases

- **Feature with numeric `id`**: The generated type MUST accept integer `id` values. The existing `shared/utils` copy only allowed `string`; downstream code that currently receives numeric IDs (which `services/session-state/src/types/results.ts` already accepted) must continue to work without casts.
- **Feature with absent `id`**: GeoJSON treats `id` as optional. The generated type MUST make `id` optional; no consumer may assume its presence.
- **Feature with `null` properties**: GeoJSON permits `properties: null`. Today the two hand-typed copies use `Record<string, unknown> | null`. The generated type MUST admit `null` properties OR a missing `properties` key, matching the existing permissiveness so consumers do not need defensive rewrites.
- **Feature with an unrecognised `geometry.type`**: At the parse boundary we do not know whether the geometry matches a Debrief variant. The generated geometry type MUST accept any string `type` (not just the `Point|LineString|Polygon|...` enumerated in the existing `geojson.yaml` geometry classes). Validation against the Debrief-specific variants happens *past* the parse boundary via `DebriefFeature` narrowing — not at the raw-feature layer.
- **Existing (broken) `GeoJSONFeature` LinkML class in `session-state.yaml`**: Today `session-state.yaml` already defines a thin `GeoJSONFeature` (type-only discriminator, `id?: string`, `geometry: GeoJSONGeometry`, no `properties`, no `coordinates`). This class is **under-specified** and is the direct source of the generated `GeoJSONFeature` that `ResultsSlice.result_layers` currently references. The feature MUST resolve this by replacing or superseding that class so that a single loose-GeoJSON-Feature LinkML type exists post-change.
- **Downstream consumers that relied on the `shared/utils` typed-coordinate array shape**: The `shared/utils` copy typed `coordinates` as `number[] | number[][] | number[][][]`. Consumers that destructure coordinates under that assumption (e.g., `ExerciseListView/utils.ts#extractLineCoordinates`) must continue to work after the migration, even though the generated type treats coordinates as structurally loose at the raw boundary.
- **Roundtrip through JSON serialisation**: A value that passes `RawGeoJSONFeature` validation on one side (Python or TypeScript), when JSON-serialised and deserialised on the other side, MUST still pass validation — this is the existing schema round-trip test contract applied to the new class.
- **Stray `GeoJSONFeature` alias in `apps/vscode/src/types/import.ts`**: That file re-exports `SafeFeature as GeoJSONFeature`. The migration MUST update those importers to either (a) depend directly on `SafeFeature` from `@debrief/utils` (if that is the intent), or (b) depend on the new generated `RawGeoJSONFeature` — and remove the re-export so that the name `GeoJSONFeature` has a single source per consuming package.

## Requirements *(mandatory)*

### Functional Requirements

**Schema definition**

- **FR-001**: The LinkML master schema MUST define a class named `RawGeoJSONFeature` that represents the loose, parse-boundary shape of any GeoJSON Feature prior to narrowing to a Debrief variant.
- **FR-002**: `RawGeoJSONFeature` MUST carry a `type` attribute fixed to the string literal `"Feature"` (discriminator for downstream type guards).
- **FR-003**: `RawGeoJSONFeature` MUST expose an optional `id` attribute that accepts either a string or an integer value (to cover both GeoJSON-spec forms and both existing hand-typed copies).
- **FR-004**: `RawGeoJSONFeature` MUST expose a required `geometry` attribute that references a schema-rooted loose-geometry type (either a new `RawGeoJSONGeometry` class or an equivalent) whose `type` attribute is a free-form string and whose `coordinates` attribute is permitted (not required to be narrowed to the existing `GeoJSONPoint|...` variants).
- **FR-005**: `RawGeoJSONFeature` MUST expose a `properties` attribute that accepts an arbitrary JSON object or `null` (matching the GeoJSON spec's "properties member MAY be a JSON object or null" rule).
- **FR-006**: The LinkML schema MUST also define `RawGeoJSONFeatureCollection` — a GeoJSON FeatureCollection whose `features` array element type is `RawGeoJSONFeature` — to replace the hand-typed `GeoJSONFeatureCollection` declarations.
- **FR-007**: The existing thin `GeoJSONFeature` class in `shared/schemas/src/linkml/session-state.yaml` MUST be removed or merged into `RawGeoJSONFeature` so that only one loose-Feature class exists after the change; `ResultsSlice.result_layers` MUST reference the consolidated class.
- **FR-008**: The LinkML class for `RawGeoJSONFeature` MUST carry a description (documentation) that, after code generation, lands in the generated TypeScript and Python types as a leading docstring and (a) identifies it as a parse-boundary type and (b) instructs consumers to narrow to `DebriefFeature` past the boundary.

**Code generation and derived artefacts**

- **FR-009**: The Pydantic, JSON Schema, and TypeScript generators MUST emit `RawGeoJSONFeature` and `RawGeoJSONFeatureCollection` from the updated schema without modification to generator code (use only existing generator capabilities).
- **FR-010**: The schema adherence test suite (golden fixtures, round-trip, structural comparison) MUST be extended to cover `RawGeoJSONFeature` and `RawGeoJSONFeatureCollection` — at minimum a canonical-valid fixture, a null-properties fixture, and an integer-id fixture on the valid side; a missing-geometry fixture and a wrong-`type` fixture on the invalid side.
- **FR-011**: All generated derived artefacts committed to the repository MUST be regenerated in the same change set so that the repo remains in a consistent "schema ↔ generated" state.

**Migration of existing consumers**

- **FR-012**: The hand-typed interface `GeoJSONFeature` in `shared/utils/src/types.ts` MUST be deleted.
- **FR-013**: The hand-typed interface `GeoJSONFeature` in `services/session-state/src/types/results.ts` MUST be deleted.
- **FR-014**: The hand-typed interface `GeoJSONFeatureCollection` in `shared/utils/src/types.ts` MUST be deleted (replaced by the generated `RawGeoJSONFeatureCollection`, re-exported from `@debrief/utils` for ergonomic access if needed).
- **FR-015**: Every former importer of the deleted symbols (across `apps/vscode`, `apps/loader`, `apps/web-shell`, `shared/components`, `shared/utils` itself, `services/session-state`, `services/stac`) MUST be updated to import `RawGeoJSONFeature` / `RawGeoJSONFeatureCollection` from `@debrief/schemas` (TypeScript) or `debrief_schemas` (Python), either directly or through a thin re-export from the existing workspace package that already serves as the consumer's type source (see FR-016).
- **FR-016**: Where a package currently re-exports GeoJSON types from `@debrief/utils` for its own consumers (for example `@debrief/components/ExerciseListView/types.ts` re-exporting `GeoJSONFeature` and `GeoJSONFeatureCollection`), the re-export MUST continue to provide the name `RawGeoJSONFeature` / `RawGeoJSONFeatureCollection` (or a deliberately-chosen local alias documented in the package) so that consumer code does not need to change its import origin more than once.
- **FR-017**: The `GeoJSONFeature` re-export in `apps/vscode/src/types/import.ts` (`export type { SafeFeature as GeoJSONFeature } from '@debrief/utils'`) MUST be removed; affected call sites MUST import either `SafeFeature` directly from `@debrief/utils` or `RawGeoJSONFeature` from `@debrief/schemas`, based on which matches the actual usage.
- **FR-018**: After migration, the post-change codebase MUST contain zero hand-written `interface GeoJSONFeature` or `interface GeoJSONFeatureCollection` declarations anywhere under `apps/`, `shared/`, or `services/` (the generated artefacts file in `shared/schemas/src/generated/typescript/types.ts` is explicitly excluded).

**Governance and traceability**

- **FR-019**: The project MUST capture an Architectural Decision Record entry in `docs/project_notes/decisions.md` that (a) names the deleted hand-typed duplicates, (b) names the new `RawGeoJSONFeature` / `RawGeoJSONFeatureCollection` classes, (c) links to this spec, and (d) records the parse-boundary usage rule.
- **FR-020**: The change MUST pass the CI verify pipeline (lint, typecheck, tests — including schema adherence tests and Playwright E2E where applicable) on a single PR, so that the migration is reviewed and merged atomically.

### Key Entities

- **RawGeoJSONFeature** *(new LinkML class)*: A GeoJSON Feature in its loosest, schema-rooted form — used only at parse boundaries where a payload has not yet been narrowed to a `DebriefFeature` variant. Attributes: `type = "Feature"` literal; optional `id` accepting string or integer; required `geometry` referencing the loose geometry class; optional `properties` (nullable JSON object). Exists for one purpose only: to name the boundary. Once past the boundary, code narrows via existing `DebriefFeature` type guards.
- **RawGeoJSONGeometry** *(new LinkML class, or equivalent existing class extended)*: A GeoJSON geometry in its loosest, schema-rooted form. Attributes: free-form string `type` (not restricted to `Point|LineString|...`); `coordinates` permitted but not narrowed. Needed because the existing `geojson.yaml` geometry classes (`GeoJSONPoint`, `GeoJSONLineString`, etc.) are strictly typed by geometry kind — too narrow for raw boundary use.
- **RawGeoJSONFeatureCollection** *(new LinkML class)*: A GeoJSON FeatureCollection whose `features` array contains `RawGeoJSONFeature` elements. Replaces the hand-typed `GeoJSONFeatureCollection` in `shared/utils/src/types.ts` and `apps/vscode/src/types/import.ts`.
- **DebriefFeature** *(existing, unchanged)*: The existing discriminated union (`TrackFeature | ReferenceLocation | SystemState | MultiPointFeature | MultiPolygonFeature | ...`) that defines the Debrief-specific variants. Remains the canonical, narrowed type for all code past parse boundaries. This feature does **not** change `DebriefFeature`.
- **SafeFeature / SafeGeometry / SafeFeatureCollection** *(existing hand-typed, unchanged in scope)*: Exist in `shared/utils/src/types.ts` as a different "permissive boundary" type used at MCP / service call boundaries. This spec's scope does **not** consolidate them into `RawGeoJSONFeature`; see Out of Scope.
- **Deleted hand-typed `GeoJSONFeature` (×2)**: The two interfaces in `shared/utils/src/types.ts` and `services/session-state/src/types/results.ts` being retired. Their consumers are redirected to the new generated type.
- **Deleted hand-typed `GeoJSONFeatureCollection` (×N)**: The collection interfaces in `shared/utils/src/types.ts` and `apps/vscode/src/types/import.ts` being retired. Their consumers are redirected to the new generated `RawGeoJSONFeatureCollection`.
- **Existing thin `GeoJSONFeature` LinkML class** *(in `session-state.yaml`, to be removed/merged)*: The under-specified class currently referenced by `ResultsSlice.result_layers`. Superseded by `RawGeoJSONFeature`.

## Assumptions

- **The existing thin LinkML `GeoJSONFeature` class is replaced, not paralleled**: Rather than adding `RawGeoJSONFeature` alongside the existing thin `GeoJSONFeature` class in `session-state.yaml`, the thin class is removed (or renamed / upgraded into) `RawGeoJSONFeature`. Paralleling two near-identical "loose Feature" LinkML classes would replicate the very drift this feature exists to eliminate. The generated `GeoJSONFeature` interface in `shared/schemas/src/generated/typescript/types.ts` therefore disappears in the same change.
- **LinkML supports `string | integer` for the `id` attribute**: The idea doc explicitly calls for `id?: string | integer`. LinkML provides this via per-attribute `any_of`/`exactly_one_of` range declarations or equivalent; the plan phase will pick the exact mechanism. If the chosen mechanism requires a generator upgrade, the plan will note it.
- **LinkML supports a `Record<string, Any>`-equivalent for `properties`**: Either via `range: string` with a JSON-object convention, via an `Any`/`AnyValue` class, or via a dedicated `RawGeoJSONFeatureProperties` class of unrestricted shape. The exact mechanism is a plan-phase decision; the spec requires only that the generated TypeScript / Python types accept arbitrary JSON-object payloads (and `null`) in `properties`.
- **No behavioural changes to runtime code**: This is purely a type-level and schema-level consolidation. Runtime control flow, persistence formats, STAC catalog formats, and wire formats on IPC / MCP boundaries are unchanged. Consumer tests that pass today pass unchanged (any test changes are type-import updates only).
- **`camelCase` vs `snake_case` field-name drift is accepted, not consolidated here**: The existing generated TypeScript type uses `snake_case` (`result_layers`, `last_tool_execution`, `tool_id`) whereas the hand-typed session-state copy uses `camelCase`. This drift is a *separate* concern already flagged in `services/session-state/src/types/results.ts` comments. This feature does not attempt to unify naming conventions — it only unifies the shape of the Feature type. Any remaining camelCase shims stay where they are; a follow-up may propose a separate consolidation.
- **Generator versions and toolchain**: The existing `gen-pydantic`, `gen-typescript`, `gen-json-schema` generators (LinkML ≥ 1.7.0) are assumed to emit the new class without tooling upgrade. If a generator limitation forces a workaround, it is recorded in `research.md` during the plan phase rather than blocking the spec.
- **Idempotent regeneration**: Regenerating Pydantic and TypeScript from the updated LinkML schema is deterministic — two runs on the same input produce byte-identical output. This lets CI guard against drift between the checked-in artefact and the source schema.

## Out of Scope

- **`SafeFeature` / `SafeGeometry` / `SafeFeatureCollection` consolidation**: These are a *different* permissive type family used specifically at MCP / service-call boundaries, with their own established usage. They may ultimately belong under `RawGeoJSONFeature` too, but that is a judgement call that belongs in the broader non-LinkML-types audit (backlog item #206) rather than being smuggled into this spec. This feature leaves them untouched.
- **Renaming or unifying `snake_case` vs `camelCase` field names on existing slice types**: The drift comment in `services/session-state/src/types/results.ts` (and the matching comment on `LastToolExecution`) is not resolved here. Tracked as a separate concern.
- **Introducing a lint rule or CI check that forbids hand-written `interface GeoJSONFeature`**: Useful as a durable guard rail (User Story 3's optional extension), but introducing a new lint rule has its own review cycle and the immediate deletion already achieves the central goal. This spec records the intent; a follow-up item can implement the check.
- **Deprecating or renaming the entire `@debrief/utils#Safe*` type family**: Out of scope for the same reason as bullet 1 above.
- **Changing the wire format of tool results, STAC catalog files, or session-state persistence**: This feature is type-level only. No JSON shape on disk or on the wire changes.
- **Changing the existing strictly-typed geometry classes (`GeoJSONPoint`, `GeoJSONLineString`, `GeoJSONPolygon`, `GeoJSONMultiPoint`, `GeoJSONMultiLineString`, `GeoJSONMultiPolygon`, `GeoJSONEmptyPoint`) in `geojson.yaml`**: These remain as-is; they describe the *narrow* geometry variants consumed by `DebriefFeature` subtypes. The new `RawGeoJSONGeometry` sits alongside, not in place of.
- **Extending `DebriefFeature` to new variants**: The `TrackFeature | ReferenceLocation | SystemState | MultiPointFeature | MultiPolygonFeature | ...` union is unchanged.
- **Coordinating the LinkML-regen PR sequencing with backlog items #203 and #205**: Item #204 can ship independently; the parallel-work coordination (who regenerates first, how to avoid rebase churn on the generated artefacts) is a practical concern for whoever opens PRs in parallel — it is not a spec requirement.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Exactly **zero** hand-written `interface GeoJSONFeature` declarations exist under `apps/`, `shared/` (excluding `shared/schemas/src/generated/`), and `services/` after the change. Verified by a simple grep check run as part of code review.
- **SC-002**: Exactly **zero** hand-written `interface GeoJSONFeatureCollection` declarations exist under the same paths after the change. Verified by the same grep check.
- **SC-003**: The generated TypeScript artefact `shared/schemas/src/generated/typescript/types.ts` exports a `RawGeoJSONFeature` type whose shape is accepted by 100% of the former consumer sites (no callsite requires an `as` cast or `@ts-expect-error` to compile).
- **SC-004**: The generated Pydantic model `RawGeoJSONFeature` accepts 100% of the valid GeoJSON Feature fixtures in the extended schema adherence fixture set (`shared/schemas/fixtures/` or equivalent) and rejects 100% of the invalid ones — i.e., the adherence test suite reports no failures on the new class.
- **SC-005**: The full CI verify pipeline (lint + typecheck + tests + Playwright E2E) passes on the feature branch's PR with **no** failures attributable to the migration.
- **SC-006**: Every former importer of the deleted types (inventoried during the plan phase; ≥ 20 TypeScript files and the Python `services/stac/` fixtures) imports a schema-rooted replacement after the change — measured by the inventory produced in `research.md` with a column marking each site "migrated".
- **SC-007**: The `docs/project_notes/decisions.md` file contains exactly one new ADR entry (dated, linked to this spec) naming the deleted interfaces and the new classes — verified by reviewer inspection.
- **SC-008**: Schema round-trip fixtures for `RawGeoJSONFeature` produce byte-identical JSON on Python → JSON → TypeScript → JSON → Python cycles (three canonical fixtures minimum: string-id, integer-id, null-properties).
- **SC-009**: The change ships as a **single** atomic PR; reviewers can review the schema change, regeneration diff, and migration together in one pass rather than reasoning across sequenced PRs.
- **SC-010**: The generated `RawGeoJSONFeature` TypeScript declaration carries a non-empty docstring (minimum: parse-boundary role + pointer to `DebriefFeature` narrowing), verified by inspection of the generated file.
