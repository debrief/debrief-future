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

<!-- TODO: fill in -->

### Key Entities

<!-- TODO: fill in -->

## Success Criteria *(mandatory)*

### Measurable Outcomes

<!-- TODO: fill in -->

## Assumptions

<!-- TODO: fill in -->

## Out of Scope

<!-- TODO: fill in -->

## Notes

<!-- TODO: fill in -->
