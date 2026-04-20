# Feature Specification: Replace hand-written `SafeFeature` / `GeoJSONFeature` with LinkML-generated equivalents

**Feature Branch**: `212-linkml-feature-types` (authored on harness branch `claude/start-speckit-212-o7QNg`)
**Created**: 2026-04-20
**Status**: Draft
**Input**: User description: "item 212 from the backlog — Replace hand-written `SafeFeature` / `GeoJSONFeature` with LinkML-generated equivalents. Two hand-written TypeScript feature types in `shared/utils/src/types.ts` (one with a required, typed `geometry`; one with `geometry: SafeGeometry | null` + `coordinates: unknown`). Pre-dates #200 but is an Article II tripwire — any 'schema-adjacent' in-tree type should be LinkML-generated. #200 widens `calculateBounds` to a structural minimum that sidesteps the smell; this item closes it. (predates #200; follow-up to #200)"

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Single schema-rooted type for the loose-GeoJSON boundary (Priority: P1)

A developer maintaining the platform searches the monorepo for the type that represents "a GeoJSON Feature whose shape hasn't yet been narrowed to a specific `DebriefFeature` subtype" — the shape used at JSON.parse boundaries, at MCP call boundaries, and in service signatures that haven't been discriminated. Today they find two hand-written interfaces in `shared/utils/src/types.ts` (`GeoJSONFeature` with typed coordinates + string-only id, and `SafeFeature` with `coordinates: unknown` + `string | number` id + nullable geometry) plus a third copy of `GeoJSONFeature` in `services/session-state/src/types/results.ts` that has drifted to its own shape. After this change, exactly one type represents this boundary, it is LinkML-generated, and every consumer imports it from `@debrief/schemas`.

**Why this priority**: This is the core intent of the backlog item and the constitutional requirement (Article II.1 — "LinkML master schemas define all data structures. Pydantic, JSON Schema, and TypeScript representations are derived, never hand-written"). Every additional day the hand-written types exist is another opportunity for a consumer to pin against the wrong shape, or for a fourth copy to appear.

**Independent Test**: Run a monorepo-wide search (excluding `generated/` and `node_modules/`) for `interface SafeFeature`, `interface SafeFeatureCollection`, `interface SafeGeometry`, `interface GeoJSONFeature`, and `interface GeoJSONFeatureCollection`. Each search returns zero matches outside LinkML-generated output and outside LinkML schema source. All current consumers type-check against the generated type.

**Acceptance Scenarios**:

1. **Given** the migrated codebase, **When** a developer greps for `interface SafeFeature\b` under `apps/`, `shared/` (excluding `shared/schemas/src/generated/`), and `services/`, **Then** zero matches are returned.
2. **Given** the migrated codebase, **When** a developer greps for `interface GeoJSONFeature\b` under `apps/`, `shared/` (excluding `shared/schemas/src/generated/` and `shared/schemas/src/linkml/`), and `services/`, **Then** zero matches are returned.
3. **Given** the migrated codebase, **When** a developer greps for `interface SafeGeometry\b`, `interface SafeFeatureCollection\b`, or `interface GeoJSONFeatureCollection\b` in the same scope, **Then** zero matches are returned.
4. **Given** the migrated codebase, **When** a consumer needs the boundary type, **Then** the import path is `@debrief/schemas` (not `@debrief/utils` and not a local `types.ts`).

### User Story 2 — Every existing consumer continues to compile and behave identically (Priority: P1)

A developer continues day-to-day work in any of the modules that use `SafeFeature` / `SafeFeatureCollection` / `SafeGeometry` / `GeoJSONFeature` today — importing REP files, loading plots, running the calc service, rendering the VS Code map panel, running the loader electron app, or running web-shell mock tools. After the migration, every one of those modules type-checks cleanly, runs its unit tests, and produces the same visible result as before. The user-facing workflows (open plot → map auto-zooms, import REP → features appear, run tool → results render) are byte-identical to the pre-change behaviour.

**Why this priority**: The hand-written types are consumed by ~30+ files across `apps/vscode`, `apps/loader`, `apps/web-shell`, `shared/components`, `shared/utils`, `services/calc`, `services/session-state`, and `services/stac`. If any of those consumers regresses on the type migration, a production workflow breaks. This story gates the PR — the refactor is worthless if it silently breaks the map panel or the import pipeline.

**Independent Test**: Run the full repository CI gate (lint, type-check, unit tests, Playwright E2E) against the change. All checks pass with no new errors or warnings. A manual smoke test confirms: (a) opening a plot in the VS Code extension zooms the map to the feature extent; (b) importing a REP file produces the same feature count as before; (c) running a calc tool on a selection produces the same result layer(s).

**Acceptance Scenarios**:

1. **Given** the migrated codebase, **When** `pnpm -r typecheck` runs, **Then** it passes with no new errors compared to the pre-change baseline.
2. **Given** the migrated codebase, **When** `pnpm -r test` and `uv run pytest` run, **Then** every unit-test suite that previously passed continues to pass, with no test file deleted except where the file's sole purpose was to test the removed hand-written interface shape (if any).
3. **Given** a feature collection where some features have a missing or `null` geometry (shape historically accepted by `SafeFeature` but rejected by `GeoJSONFeature`), **When** consumers that previously used `SafeFeature` pass that collection through the generated type, **Then** the collection type-checks and the downstream consumer (e.g. `calculateBounds`) produces the same result it did before.
4. **Given** a feature with a numeric `id` field (shape historically accepted by `SafeFeature` but rejected by the strict LinkML `GeoJSONFeature`), **When** consumers that previously used `SafeFeature` read that feature's id, **Then** the value is preserved with its original type (numeric-ness is not silently stringified except where the application explicitly chose to do so before the migration).

### User Story 3 — No `as`-casts are introduced at call sites by the migration (Priority: P2)

A developer reviewing the migration diff sees that the substitution of `SafeFeature` / `GeoJSONFeature` with the LinkML-generated type does not introduce new `as`-casts at call sites. Wherever the old hand-written type was assignable to a consumer, the new generated type is either directly assignable or the type-reconciliation happens once at a named, reviewable boundary (not smeared across dozens of call sites). The migration reduces type-safety surface; it does not add new "trust me" escape hatches.

**Why this priority**: Adding `as`-casts across every call site to make the types compile would trade one form of drift (two hand-written interfaces) for another (dozens of casts that the type-checker can no longer help maintain). That would defeat the point of Article II's schema-rooted-types rule. This story is what keeps the migration faithful to its motivation. It is P2 (not P1) because the migration itself — the shape change — is the primary deliverable; reviewability of the diff is the quality bar that follows.

**Independent Test**: `git diff` the PR restricted to call-site files (excluding LinkML schema source and the hand-written types being deleted) and count new `as` occurrences. The count is zero, or every new `as` is either (a) at a JSON.parse / MCP / file-read boundary where typed data enters the system from outside, or (b) at a single named reconciliation point clearly visible in the diff.

**Acceptance Scenarios**:

1. **Given** the migration diff, **When** a reviewer counts new `as` tokens in call-site files (not the deleted `types.ts` and not the LinkML schema), **Then** the count is zero or every new `as` is at a data-entry boundary (JSON.parse, MCP result, file read).
2. **Given** the migration diff, **When** a reviewer inspects any file that imports the generated type, **Then** the file either (a) uses the type directly, or (b) narrows it through an explicit, reviewable gate — never through a `as unknown as X` chain.
3. **Given** the migration diff, **When** a reviewer inspects `shared/utils/src/bounds.ts`, **Then** the private `BoundsInputFeature` structural type either remains unchanged (it is wider than every input) or is replaced with an import from `@debrief/schemas` — in either case, no new `as`-cast is introduced at `calculateBounds` call sites.

### User Story 4 — The single LinkML class covers the boundary shape without fragmenting it (Priority: P2)

A schema author editing LinkML adds or modifies the boundary-feature class without introducing fragmentation. There is one class (and its supporting geometry class) that captures the loose-parse-boundary shape, and it coexists cleanly with the existing strict `GeoJSONFeature` class in `session-state.yaml` (or supersedes it cleanly — see "Notes" on relationship with #204). The documentation comment on the generated type is explicit about the usage rule: loose-boundary only; narrow to `DebriefFeature` past the parse boundary.

**Why this priority**: Adding two new classes (one for each hand-written type) would recreate in LinkML the same split that exists in TypeScript today — just with a better stamp on it. The goal is one boundary shape, not two. P2 (not P1) because the exact class naming and its relationship to the existing strict `GeoJSONFeature` are editorial decisions that do not gate the migration; P1 covers the "generated-from-schema" guarantee independent of how the schema is organised.

**Independent Test**: Inspect `shared/schemas/src/linkml/session-state.yaml` (or whichever LinkML file hosts the boundary class). Exactly one class represents the loose-parse-boundary shape. Its generated TypeScript output (in `shared/schemas/src/generated/typescript/`) carries a documentation comment stating the usage rule.

**Acceptance Scenarios**:

1. **Given** the migrated LinkML schema, **When** a schema author searches for classes whose name contains `Feature` and whose shape is "loose GeoJSON" (nullable or permissive geometry, string-or-integer id), **Then** exactly one class matches.
2. **Given** the generated TypeScript output, **When** a developer reads the documentation comment on the boundary-feature type, **Then** the comment states: "Use this only at parse boundaries. Code past the parse boundary should narrow to `DebriefFeature` (or a specific subtype) via the existing type guards."
3. **Given** the migrated LinkML schema, **When** schema round-trip tests run (golden fixtures, round-trip Python ↔ JSON ↔ TypeScript ↔ JSON ↔ Python, and schema-comparison tests), **Then** all tests pass.

### Edge Cases

- A feature with `geometry: null` (previously allowed by `SafeFeature`) — must remain allowed by the generated type; no consumer may regress to rejecting it.
- A feature with `id: 42` (numeric, previously allowed by `SafeFeature`) — must remain allowed. The generated type MUST permit `string | integer` on `id`, matching the GeoJSON specification.
- A feature whose `properties` is `null` (valid per the GeoJSON spec and accepted by both hand-written types) — must remain allowed.
- A feature whose `properties` is absent (also valid per GeoJSON) — must remain allowed.
- A feature whose `geometry.coordinates` is not numeric (e.g. typed as `unknown` at parse time because the source JSON is untrusted) — must be representable by the generated type. Consumers that need typed coordinates must narrow explicitly, exactly as they do today with `SafeFeature`.
- A feature whose geometry is `GeometryCollection` (valid GeoJSON but not branched on by any current in-tree consumer) — the generated type must not reject it at the parse boundary even if no consumer currently handles it; the existing `GeoJSONGeometry` class's `type: string` field already accommodates this by not enumerating geometry types.
- A feature whose `id` is `undefined` / absent — must remain allowed (both hand-written types mark `id` optional).
- An existing consumer that was relying on the stricter `GeoJSONFeature` shape (typed coordinates, string-only id) — after migration, that consumer either (a) keeps working because its usage happens to satisfy the stricter view of the generated type, or (b) gains a single, reviewable narrowing step to recover the stricter invariant. It must not regress to accepting shapes it used to reject, unless the pre-migration narrowing was itself incorrect.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A LinkML class MUST exist in `shared/schemas/src/linkml/` that represents the loose-parse-boundary GeoJSON feature shape. That class MUST be generated into both Pydantic (Python) and TypeScript outputs. All downstream consumers of the "loose GeoJSON Feature" shape MUST import the generated class, never a hand-written equivalent.
- **FR-002**: The generated boundary-feature type MUST admit, at minimum: (a) `type: "Feature"` as a literal or a required string matching that value; (b) `id` as an optional `string | integer` field; (c) `geometry` as a nullable field whose range is a loose GeoJSON geometry class (see FR-003); (d) `properties` as a nullable, open-ended object (LinkML equivalent of `Record<string, unknown>`). This shape MUST accept every feature shape that `SafeFeature` accepts today.
- **FR-003**: A LinkML class MUST exist representing the loose GeoJSON geometry shape — `type: string` (not enum-restricted) and `coordinates: <loose coordinate tree>` — that the boundary-feature type's `geometry` field references. Consumers that need a typed geometry MUST narrow from this class via existing LinkML-generated typed geometries (`GeoJSONPoint`, `GeoJSONLineString`, etc.), not via hand-written re-declarations.
- **FR-004**: The hand-written types `SafeFeature`, `SafeFeatureCollection`, `SafeGeometry`, `GeoJSONFeature`, and `GeoJSONFeatureCollection` in `shared/utils/src/types.ts` MUST be deleted. No replacement hand-written equivalent MUST be introduced elsewhere in the repository (outside `shared/schemas/src/linkml/` schema source and `shared/schemas/src/generated/` generator output).
- **FR-005**: The hand-written `GeoJSONFeature` interface in `services/session-state/src/types/results.ts` (the third drifted copy) MUST also be deleted. All consumers of that symbol MUST import from `@debrief/schemas`. (This folds the scope of backlog item #204 into the present work — see Notes for the rationale.)
- **FR-006**: A LinkML-generated FeatureCollection class MUST exist corresponding to the boundary-feature class, so that consumers that need a `{ type: "FeatureCollection"; features: [...] }` shape at the parse boundary have a single schema-rooted source. Consumers of the hand-written `SafeFeatureCollection` and `GeoJSONFeatureCollection` MUST migrate to this generated class.
- **FR-007**: All in-tree consumers of the deleted types (currently ~30+ files across `apps/vscode`, `apps/loader`, `apps/web-shell`, `shared/components`, `shared/utils`, `services/calc`, `services/session-state`, and `services/stac`) MUST migrate to import the generated types from `@debrief/schemas`. Any transitional alias (e.g. a temporary re-export of the old names from `@debrief/utils`) MUST be removed in the same PR; the migration MUST NOT leave stale re-exports behind.
- **FR-008**: The generated TypeScript output for the boundary-feature type MUST carry a documentation comment stating: *"Use this only at parse boundaries. Code past the parse boundary should narrow to `DebriefFeature` (or a specific subtype) via the existing type guards."* The comment MAY be sourced from the LinkML `description` field on the class.
- **FR-009**: The migration MUST NOT introduce new `as`-cast tokens at call sites. Every new `as` that appears in the migration diff MUST be either (a) at a data-entry boundary where typed data enters the system from an external source (JSON.parse of a file, MCP tool result, webview message, etc.), or (b) at a single named reconciliation point clearly identifiable in review. Double-cast patterns (`as unknown as X`) MUST NOT be introduced by this change.
- **FR-010**: The private `BoundsInputFeature` structural type in `shared/utils/src/bounds.ts` (introduced by #200 as the widened input minimum for `calculateBounds`) MAY remain unchanged. If the generated boundary-feature type happens to be assignable to `ReadonlyArray<BoundsInputFeature>` via structural subtyping, no change to `bounds.ts` is required. If the generated type is narrower than the private minimum, `bounds.ts` MUST be updated to accept the generated type directly; the widened private type MUST NOT become a laundering boundary for the migration.
- **FR-011**: The repository's lint, type-check, unit-test, and Playwright E2E test suites MUST pass on the change with no new errors or warnings introduced.
- **FR-012**: Schema-adherence tests MUST pass — including golden fixtures covering the boundary-feature shape, round-trip (Python → JSON → TypeScript → JSON → Python) for a feature with nullable geometry and a numeric id, and the structural-comparison test between LinkML-generated JSON Schema and Pydantic-generated JSON Schema for the boundary class.
- **FR-013**: The change MUST NOT alter the publicly observable behaviour of any in-tree workflow (open plot, import REP, run tool, render map, render layers panel, render timeline). Behaviour parity MUST be established by the existing integration test gate (user story 2) — this requirement is what makes the migration a pure refactor.
- **FR-014**: Any existing LinkML `GeoJSONFeature` class whose shape is incompatible with FR-002 (for example, the current `session-state.yaml#GeoJSONFeature` that marks `geometry` required and restricts `id` to `string`) MUST be either (a) widened to match FR-002, or (b) superseded by the new boundary-feature class with all its consumers migrated. The migration MUST NOT leave two LinkML classes that both claim to represent "a GeoJSON Feature" with different shapes.

### Key Entities

- **Boundary-feature type (new, LinkML-generated)**: A single LinkML class representing "any GeoJSON Feature at a parse / MCP / file-read boundary, before discrimination to a specific `DebriefFeature` subtype". Attributes: `type` (literal `"Feature"`), optional `id` (`string | integer`), nullable `geometry` (range: loose-geometry class), nullable `properties` (open-ended object). Generated into both Pydantic and TypeScript. The single schema-rooted replacement for the two hand-written types being deleted.
- **Boundary-geometry type (new, LinkML-generated)**: A single LinkML class representing "any GeoJSON geometry at a parse boundary, before discrimination". Attributes: `type` (string, not enum-restricted), `coordinates` (loose coordinate shape). Used as the range of the boundary-feature type's `geometry` field. Replaces the hand-written `SafeGeometry` interface.
- **Boundary-feature-collection type (new, LinkML-generated)**: A LinkML class representing `{ type: "FeatureCollection"; features: [BoundaryFeature] }`. Replaces the hand-written `SafeFeatureCollection` and `GeoJSONFeatureCollection` interfaces.
- **`SafeFeature` / `SafeFeatureCollection` / `SafeGeometry` (hand-written, to be deleted)**: Currently in `shared/utils/src/types.ts`. The more permissive of the two hand-written shapes: `id?: string | number`, `geometry: SafeGeometry | null`, `coordinates: unknown`, `properties: Record<string, unknown> | null`. Used across `apps/vscode`, `apps/loader`, and `services/stac` at JSON.parse / MCP boundaries.
- **`GeoJSONFeature` / `GeoJSONFeatureCollection` (hand-written, to be deleted)**: Currently in `shared/utils/src/types.ts`. The stricter of the two hand-written shapes: `id?: string`, `geometry` required with typed coordinates (`number[] | number[][] | number[][][]`). Used by `shared/utils/src/bounds.ts` (pre-#200), `apps/loader/src/main/ipc/`, `apps/web-shell/src/tools/`, and several others.
- **`services/session-state/src/types/results.ts#GeoJSONFeature` (hand-written, drifted, to be deleted)**: A third hand-written copy with its own shape (`id?: string | number`, `coordinates: unknown`). Deleted as part of FR-005; was the subject of backlog item #204 in isolation, now folded into this work.
- **`DebriefFeature` (existing, out of scope for this change)**: The LinkML-typed discriminated union in `shared/schemas/src/generated/typescript/unions.ts` (`TrackFeature | ReferenceLocation | MultiPointFeature | MultiPolygonFeature | SchemaAnnotationFeature`). Represents the feature shape *past* the parse boundary, after discrimination. This work does not alter `DebriefFeature` or its type guards; it only adds the loose pre-discrimination type that feeds into them.
- **`BoundsInputFeature` (existing, private, potentially unchanged)**: The private structural minimum in `shared/utils/src/bounds.ts` introduced by #200 so that `calculateBounds` accepts every in-tree feature type via structural subtyping. Every in-tree feature type (including the new generated boundary-feature type) is expected to be assignable to `ReadonlyArray<BoundsInputFeature>` by design; FR-010 preserves this private type unless the generated shape makes it redundant.
- **Existing LinkML `GeoJSONFeature` in `session-state.yaml`**: A schema class that predates this work, defined at `session-state.yaml:270` with a strict shape (`type` required string, `id?` string-only, `geometry` required with `GeoJSONGeometry` range, no `properties` field). Used only as the range of `ResultsSlice.result_layers`. FR-014 requires this class to be either widened to match the new boundary-feature shape or superseded by the new class; two LinkML classes both claiming to represent "a GeoJSON Feature" MUST NOT coexist after this change.

## Success Criteria *(mandatory)*

### Measurable Outcomes

<!-- TODO: fill in -->

## Assumptions

<!-- TODO: fill in -->

## Out of Scope

<!-- TODO: fill in -->

## Notes

<!-- TODO: fill in -->
