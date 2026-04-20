# Feature Specification: Consolidate ResolvedPositionStyle and Align with Schema

**Feature Branch**: `201-position-style-consolidation`
**Created**: 2026-04-18
**Status**: Draft (expanded 2026-04-18 per `/speckit.review` outcome — original Low-complexity backlog item now rates ~Medium)
**Input**: User description: "201 in BACKLOG.md — Consolidate ResolvedPositionStyle and align with schema. Two `ResolvedPositionStyle` interfaces with drifted shapes (`symbol: 'circle'|'square'|'triangle'` + `label` vs the 5-symbol components version + `labelText`). Canonicalise in `@debrief/utils`; symbol field uses the shape enum from `@debrief/schemas` (not a hand-typed union); field name `labelText`."

## Background *(context for reviewers)*

Two independent `ResolvedPositionStyle` interfaces currently exist in the codebase:

- `shared/utils/src/types.ts` — declares `symbol: 'circle' | 'square' | 'triangle'` and a field named `label: string | null`. Consumed by `shared/utils/src/interval.ts` (`resolvePositionStyle`, `computeAllPositionStyles`) and its tests.
- `shared/components/src/utils/time.ts` — declares `symbol: 'circle' | 'square' | 'triangle' | 'diamond' | 'cross'` and a field named `labelText: string | null`. Consumed by components that render position markers.

The components-local version matches the LinkML `PointShapeEnum` (the canonical schema enum for point marker shapes, with all 5 values). The utils version is out of date by two values (`diamond`, `cross`) and uses a different field name (`label` instead of `labelText`). On both sides, the symbol union is hand-typed, so it drifts from the schema whenever a shape is added or renamed in LinkML.

This feature's core job is to collapse that drift. Following a `/speckit.review` pass (2026-04-18) the scope was expanded to also close adjacent sibling drifts that were found at the same time — three parallel hand-typed unions (one in the map renderer, one in a VS Code track-styling tool, and a redundant `MarkerSymbolEnum` in LinkML), two duplicated resolver implementations with subtly different override semantics, a pre-existing silent-fallback failure path when an unknown shape appears at runtime, and the generator-level `string` typing of schema enum attributes that made the hand-typed unions necessary in the first place. The original type consolidation remains the backbone; the extra items are folded in because they are all manifestations of the same underlying drift and could not be cleanly separated without leaving the refactor half-done.

Audience: Debrief engineers who work on track/position rendering code across the utils, components, and VS Code extension packages; and anyone touching the LinkML styling schema or its TypeScript generator output.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Single Canonical Type for Resolved Position Style (Priority: P1)

As a Debrief engineer writing or reviewing code that produces resolved position styles (interval utilities) or consumes them (map markers, timeline markers, Storybook stories), I can import `ResolvedPositionStyle` from a single canonical location and rely on one shape that matches the schema.

**Why this priority**: This is the core of the refactor. Without it, producers and consumers continue to traffic in incompatible types, and the `as` cast bridging them in `resolvePositionStyle` silently hides shape drift. Collapsing to one definition removes the drift surface entirely.

**Independent Test**: Verified when a codebase-wide search finds exactly one `interface ResolvedPositionStyle` declaration (in `@debrief/utils`), every other file referring to the type does so via an `import` from `@debrief/utils`, and `pnpm -r typecheck` passes across the monorepo.

**Acceptance Scenarios**:

1. **Given** the repository at the start of this feature, **When** I search for `interface ResolvedPositionStyle` in `shared/**/*.ts`, **Then** exactly one match is returned and it lives in `shared/utils/src/types.ts` (the `@debrief/utils` package).
2. **Given** a file under `shared/components/` that previously declared its own `ResolvedPositionStyle`, **When** I read that file after the refactor, **Then** the interface declaration is gone and the type is imported from `@debrief/utils`.
3. **Given** all packages that render position markers (components, VS Code webview, web-shell, Storybook), **When** `pnpm -r typecheck` runs, **Then** every call site compiles against the single canonical definition without any local re-declaration, shim, or structural duplicate.

---

### User Story 2 — Schema-Linked Symbol Field (Priority: P1)

As a Debrief engineer who edits the LinkML styling schema (for example, to add a new marker shape), I can rely on the TypeScript `ResolvedPositionStyle.symbol` type picking up the new value automatically after schema regeneration, without needing to hand-edit any union literal in `@debrief/utils`.

**Why this priority**: Equal-priority with Story 1. A single type that still uses a hand-typed union preserves the root cause of drift — the only reason the two original interfaces diverged is that the hand-typed unions were never kept in sync with the schema. Linking to the generated schema enum closes that feedback loop permanently.

**Independent Test**: Verified by inspection of the canonical interface (the `symbol` field's type references the generated schema enum rather than a string-literal union) and by a thought experiment: adding a new permissible value to `PointShapeEnum` in `shared/schemas/src/linkml/common.yaml` and regenerating types causes the new value to become assignable to `ResolvedPositionStyle.symbol` with no hand-edit to `@debrief/utils`.

**Acceptance Scenarios**:

1. **Given** the canonical `ResolvedPositionStyle` after this feature, **When** I inspect the `symbol` field's type, **Then** it resolves to the schema's marker-shape enum type exported from `@debrief/schemas` — not a hand-typed union of string literals.
2. **Given** the schema is regenerated with an additional permissible shape (e.g., `star`), **When** I assign `{ ..., symbol: 'star', ... }` to a `ResolvedPositionStyle` value, **Then** TypeScript accepts the assignment without any edit to `shared/utils/src/types.ts`.
3. **Given** the current permissible shapes in the schema, **When** I assign a non-permissible value (e.g., `symbol: 'hexagon'`), **Then** TypeScript rejects the assignment.

---

### User Story 3 — Consistent `labelText` Field Across All Call Sites (Priority: P1)

As a Debrief engineer reading or writing code that displays a position's label, I find a single, consistent property name (`labelText`) everywhere — in the resolver, its tests, and every renderer — with no residual references to the old `label` field on `ResolvedPositionStyle`.

**Why this priority**: Equal-priority with Stories 1 and 2. Two names for the same concept is the second axis of drift between the interfaces. Picking `labelText` (already used by the components side) and migrating the utils producer + its tests gives every caller one vocabulary.

**Independent Test**: Verified by a codebase-wide search that finds zero `ResolvedPositionStyle`-typed values being read or written via `.label`, and that every producer of `ResolvedPositionStyle` sets `labelText`.

**Acceptance Scenarios**:

1. **Given** the canonical `ResolvedPositionStyle` after this feature, **When** I inspect its fields, **Then** the label field is named `labelText: string | null` and there is no `label` field.
2. **Given** `shared/utils/src/interval.ts` (the resolver) after this feature, **When** I read `resolvePositionStyle`, **Then** it writes the label value into a property named `labelText` (renamed from `label`).
3. **Given** `shared/utils/tests/interval.test.ts` after this feature, **When** I run the unit tests, **Then** every assertion about the resolved label refers to `result.labelText` and not `result.label`, and all tests pass.
4. **Given** any component previously reading `resolved.labelText` (e.g., under `shared/components/src/`), **When** the refactor is complete, **Then** that component continues to work without change to its own source — it now reads from the single canonical type, still under the name `labelText`.

---

### User Story 4 — Single Resolver Implementation (Priority: P2)

As a Debrief engineer fixing a bug or adding a feature in the position-style cascade, I find one authoritative implementation of `resolvePositionStyle` / `computeAllPositionStyles` — not two near-duplicates whose edge-case behaviours differ subtly.

**Why this priority**: Same motivation as Story 1 but one layer deeper. The two interfaces exist because the two implementations exist; collapsing the type without collapsing the implementation leaves behind the same drift surface in function form. The duplicates currently disagree on how to treat runtime `null` values in an override (`!= undefined` vs `!= undefined && !== null`) — a behavioural divergence, not a cosmetic one. This feature picks one semantics deliberately and deletes the other.

**Independent Test**: Verified when `resolvePositionStyle` and `computeAllPositionStyles` are declared in exactly one file (`shared/utils/src/interval.ts`) and every other module imports them from `@debrief/utils` (directly or via `@debrief/components`'s re-export), and a new unit test pins the chosen null-override semantics.

**Acceptance Scenarios**:

1. **Given** the codebase after this feature, **When** I grep for `export function resolvePositionStyle`, **Then** I get exactly **1** match (in `shared/utils/src/interval.ts`). The same holds for `computeAllPositionStyles`.
2. **Given** a `PositionStyleOverride` with `show_symbol: null`, **When** the resolver processes it, **Then** the default's `show_symbol` is preserved (treating `null` as "no override") — matching the LinkML attribute's documented semantics *"null = use default/interval"*.
3. **Given** the existing `PositionSymbolsLayer` rendering the sample catalog, **When** I render before and after the resolver consolidation, **Then** every position's marker is drawn identically (SC-004).

---

### User Story 5 — Exhaustive-Switch Coverage of Marker Shapes (Priority: P2)

As a Debrief engineer who adds a new marker shape to the LinkML schema, when I regenerate types, the build fails in any renderer whose `switch (symbol)` does not yet handle the new value — I am not allowed to forget.

**Why this priority**: Without this, SC-006 (adding a shape is one schema edit + regen) is a partial win: the *type* updates but the *renderer* silently falls through to a default `CircleMarker`. Constitution Article I.3 (no silent failures) requires the build to refuse the PR.

**Independent Test**: Verified by a unit test that mocks a widened `PointShape` (or uses a TypeScript `// @ts-expect-error` fixture) asserting that `svgPathForShape` and the render-loop switch in `PositionSymbolsLayer.tsx` trigger an `assertNever` branch — and by inspection of the renderer switches for an explicit `assertNever(shape)` default.

**Acceptance Scenarios**:

1. **Given** `svgPathForShape` in `PositionSymbolsLayer.tsx`, **When** I inspect its default branch, **Then** it calls `assertNever(shape)` (or equivalent exhaustive-check helper) rather than silently returning an empty path string.
2. **Given** the render-loop switch that selects between `<CircleMarker>` and SVG-path `<Marker>`, **When** I inspect its default branch, **Then** it calls `assertNever(shape)` rather than silently falling through to `CircleMarker`.
3. **Given** a test fixture that simulates adding a 6th shape to `PointShape`, **When** I run `pnpm -r typecheck`, **Then** the renderer files fail to type-check.

---

### User Story 6 — Schema-Typed Override Inputs (Priority: P2)

As a Debrief engineer reading `PositionStyleOverride`'s `symbol` field (or `PositionStyle`'s `symbol` field) in TypeScript, I see the narrow `PointShape` union — not a bare `string` — so `tsc` catches any call site that tries to assign `'star'`.

**Why this priority**: The generator's current behaviour (emit `string` for enum-ranged attributes) is the *root cause* of the hand-typed unions this feature is killing. Without narrowing the input types, every producer of an override must either (a) trust callers, (b) run the new runtime guard (Story 9), or (c) hand-type its own union — which is exactly what we're trying to stop. This story removes the need for (c) going forward. It does not remove the runtime guard, because runtime JSON can still violate the type.

**Independent Test**: Verified by inspection of the generated types file and by a new compile-time check: assigning a non-shape string to `PositionStyleOverride.symbol` must be a `tsc` error.

**Acceptance Scenarios**:

1. **Given** the generated TypeScript output in `shared/schemas/src/generated/typescript/types.ts`, **When** I inspect the `PositionStyle.symbol` and `PositionStyleOverride.symbol` fields, **Then** both are typed as `PointShape` (imported from `@debrief/utils`) — not as `string`.
2. **Given** a caller attempting `const o: PositionStyleOverride = { symbol: 'star' }`, **When** I run `pnpm -r typecheck`, **Then** tsc rejects the assignment.
3. **Given** the LinkML schema regeneration pipeline, **When** I run the schema build, **Then** the narrowing step happens automatically (no manual post-edit required on each regen).

---

### User Story 7 — Explicit Failure on Invalid Runtime Shape (Priority: P2)

As an end user importing or loading a track whose JSON payload contains a mis-typed or legacy symbol value, I see a clear error — not a silently-drawn circle that hides the data-integrity problem.

**Why this priority**: Constitution Article I.3 forbids silent failures. Today, if an override JSON has `symbol: "star"`, the resolver accepts it and the renderer falls through to `CircleMarker`. Users never learn their data is broken. This story adds a runtime guard at the resolver boundary that throws a typed error the renderer can catch and surface.

**Independent Test**: Verified by a new unit test that calls `resolvePositionStyle` with an override containing an unknown symbol and asserts that a typed error (e.g., `InvalidPointShapeError`) is thrown.

**Acceptance Scenarios**:

1. **Given** a `PositionStyleOverride` with `symbol: "star"` (not in `PointShape`), **When** `resolvePositionStyle` is called with that override, **Then** it throws a typed error containing the offending value and the list of valid shapes.
2. **Given** the renderer (`PositionSymbolsLayer.tsx`) calling `computeAllPositionStyles` with a track whose overrides include an invalid shape, **When** the invalid value is encountered, **Then** the renderer catches the error and surfaces it to the user via the established error-reporting path (e.g., logs via `LogService` and does not silently fall back to a default shape on that position).
3. **Given** the validation set, **When** a new shape is added to `PointShapeEnum` and types are regenerated, **Then** the runtime-valid set updates automatically without hand-editing the resolver (it's built from `Object.values(PointShapeEnum)`).

---

### User Story 8 — Pin Shape-Enum Equality at Schema Level (Priority: P3)

As a Debrief engineer editing the LinkML schema to add a marker shape, I find that the schema adherence tests refuse to pass if I add the shape to `PointShapeEnum` without also adding it to `MarkerSymbolEnum` (or vice versa) — so the two enums cannot silently drift apart again.

**Why this priority**: Lower priority than Stories 1–7 because the two enums happen to have identical values today; no behaviour is broken. Per R-012 the chosen resolution is 17B (keep both enums, respect feature #091's ADR on their semantic separation, pin equality via an adherence test) rather than 17A (delete `MarkerSymbolEnum`).

**Independent Test**: Verified by running the new schema adherence test: it asserts `PointShapeEnum.permissible_values.keys() == MarkerSymbolEnum.permissible_values.keys()` (or equivalent). Deliberately mutating either enum to add a value the other lacks causes the test to fail.

**Acceptance Scenarios**:

1. **Given** the schema adherence tests after this feature, **When** I run them against the current schema, **Then** they pass.
2. **Given** a local edit that adds a permissible value to `PointShapeEnum` but not to `MarkerSymbolEnum`, **When** I run the adherence tests, **Then** they fail with a message naming the mismatched values.
3. **Given** the existing schema adherence tests (`shared/schemas/tests/`) for round-trip, golden fixtures, and structural comparison, **When** I run them, **Then** they all still pass (the new test is additive).

---

### Edge Cases

- **Stale `.label` access outside the type system.** If any call site reads `.label` via a structural type (e.g., `Record<string, unknown>`, an `as any` cast, or a JSON blob deserialised without a type) rather than through `ResolvedPositionStyle`, TypeScript cannot flag the stale access. The migration must rely on an explicit repo-wide search to catch these rather than depending solely on `tsc`.
- **Third-party or contrib consumers.** If code under `contrib/` or a downstream package imports `ResolvedPositionStyle` and reads `.label`, renaming the field is a breaking change for them. Because nothing outside this repo is known to ship yet (pre-implementation phase), the migration treats the rename as non-breaking; if a downstream consumer is discovered during the refactor, it is updated in the same change.
- **Schema enum without a `symbol` subset.** If the schema enum used for the canonical `symbol` field ever grows values that are not valid for position markers (for example, a broader shape palette intended for other features), the `ResolvedPositionStyle.symbol` field would accept values the renderers cannot draw. The schema currently has a single `PointShapeEnum` dedicated to point markers; if that invariant changes in the future, this refactor must be revisited so the `symbol` field narrows to the correct subset.
- **Renderers that currently `switch` on only the 3-shape union.** Any renderer whose `switch (style.symbol)` previously covered only `circle | square | triangle` will, after this change, receive values from the 5-value enum and must have a default branch or exhaustive coverage. FR-016 mandates `assertNever(shape)` default branches in `PositionSymbolsLayer.tsx` specifically; the migration must confirm no renderer silently drops `diamond` or `cross`. Storybook renderers and timeline renderers outside `PositionSymbolsLayer.tsx` are caught by type-check rather than by behaviour test — if any other switch exists on `symbol` it is updated in the same PR.
- **Invalid symbol values at runtime (new codepath — FR-015).** When a JSON payload contains `{"symbol": "star"}` and the resolver is called on that override, the resolver throws `InvalidPointShapeError`. The renderer (FR-018) catches it, logs via `LogService`, and does not crash the rest of the track's rendering. The per-position error surface (how the user sees "this position is broken") is itself an edge case whose UX is deferred to follow-up — what matters here is that the behaviour is not silent.
- **Schema regen without post-process (FR-014).** If a developer runs `gen-typescript` alone without the post-process step, the narrowing is lost and `PositionStyleOverride.symbol` reverts to `string`. The schemas build pipeline must ensure the post-process step runs as part of the committed "regenerate schemas" workflow, not as an optional follow-up.
- **Legacy data with `symbol: "waypoint-circle"` or other pre-schema values.** The STAC fixture at `shared/schemas/src/fixtures/valid/reference-location-valid-01.json:13` uses `"symbol": "waypoint-circle"`, which is not in `PointShapeEnum`. That fixture is on a `ReferenceLocation`, not a track position — and `PointShapeEnum` is specifically for `PositionStyle.symbol` / `PositionStyleOverride.symbol`. Reference-location symbols are a separate range. This feature MUST NOT break the reference-location fixture; if any schema change in FR-017 has that effect, the fix is revisited.
- **Imports from the components-local module.** Any file that imports `ResolvedPositionStyle` from `shared/components/src/utils/time` (as opposed to the package barrel) must be updated; otherwise after the local declaration is removed, its import will break.
- **Generated-code coupling.** The canonical type depends on a generated enum from `@debrief/schemas`. If `@debrief/schemas` has not yet been generated in a fresh clone, `@debrief/utils` will fail to type-check. This is an existing property of the monorepo (the schemas package is a prerequisite for most others) and is acceptable, but the refactor must not introduce a new circular or build-order dependency.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The repository MUST contain exactly one declaration of `interface ResolvedPositionStyle`, and it MUST be in the `@debrief/utils` package (`shared/utils/src/types.ts`).
- **FR-002**: The components-local declaration of `ResolvedPositionStyle` in `shared/components/src/utils/time.ts` MUST be removed, and that file (along with any other components-side consumer) MUST import `ResolvedPositionStyle` from `@debrief/utils`.
- **FR-003**: The canonical `ResolvedPositionStyle.symbol` field MUST be typed using the generated marker-shape enum exported from `@debrief/schemas` (`PointShapeEnum`), not a hand-typed union of string literals.
- **FR-004**: The canonical `ResolvedPositionStyle` MUST expose the label field under the name `labelText: string | null`. No field named `label` MUST remain on this interface.
- **FR-005**: The resolver in `@debrief/utils` (`resolvePositionStyle` in `shared/utils/src/interval.ts`) MUST write the label value into `labelText` (not `label`) and MUST continue to support the same cascade semantics (default → interval rules → per-position override, with fallback to a formatted timestamp when the label is to be shown but no custom text is supplied).
- **FR-006**: The unit tests for the resolver (`shared/utils/tests/interval.test.ts`) MUST be updated to assert on `labelText` and MUST all pass after the rename.
- **FR-007**: No file in the repository MAY contain a reference of the form `<resolved-style-value>.label` where the left-hand side is typed (explicitly or by inference) as `ResolvedPositionStyle`. All such reads MUST use `.labelText`.
- **FR-008**: The refactor MUST be behaviour-preserving for end users: position markers on the map and timeline MUST render with identical symbols and label text on the shipped sample catalog both before and after the change.
- **FR-009**: The refactor's schema-side changes are scoped to (a) FR-017 per R-012 option 17B — keep both `PointShapeEnum` and `MarkerSymbolEnum`, add a schema adherence test that asserts their permissible-value sets are equal; and (b) FR-014 — narrow `PositionStyle.symbol` / `PositionStyleOverride.symbol` in the generator output via a post-process step that runs after `gen-typescript`. Neither path modifies existing LinkML YAML content or the `gen-typescript` tool itself — it only adds a test file, a post-process step, and (as a side-effect of re-running the build) regenerated output files.
- **FR-010**: After the refactor, every exported symbol that was previously re-exported from either package under the name `ResolvedPositionStyle` MUST continue to be re-exported under that same name (no consumer-visible rename), so that `import { ResolvedPositionStyle } from '@debrief/utils'` and `import { ResolvedPositionStyle } from '@debrief/components'` both resolve to the same canonical type.
- **FR-011**: The full CI verification suite (lint, typecheck, unit tests, Playwright E2E as listed in `CLAUDE.md` §"Before Pushing") MUST pass on the refactor branch before it is considered complete.
- **FR-012** (*resolver consolidation*): The repository MUST contain exactly **one** implementation of `resolvePositionStyle` and exactly **one** implementation of `computeAllPositionStyles`, both in `shared/utils/src/interval.ts`. The components-side duplicates in `shared/components/src/utils/time.ts` MUST be deleted; re-exports from `@debrief/components` MUST point to `@debrief/utils`. A new unit test MUST pin the chosen override-null semantics (see FR-013).
- **FR-013** (*override null semantics*): The consolidated resolver MUST treat a `null` value on any override field (`show_symbol`, `symbol`, `show_label`, `label`) as "no override — use the cascaded default". That is, the resolver applies an override field only when it is neither `undefined` nor `null`. This matches the LinkML attribute description *"null = use default/interval"* and is the semantics the components-side resolver currently uses.
- **FR-014** (*schema-typed enum attributes*): The TypeScript-generated output for `PositionStyle.symbol` and `PositionStyleOverride.symbol` MUST resolve to the `PointShape` union (not `string`). This is enforced by a post-processing step in the schemas build pipeline that runs after `gen-typescript`; the exact mechanism is a research/implementation concern. The pipeline MUST be deterministic and re-runnable (regenerating from clean state MUST produce the narrowed types every time).
- **FR-015** (*runtime guard on invalid shape*): The resolver MUST validate `override.symbol` against the runtime-valid set (`Object.values(PointShapeEnum)`) before applying it, and MUST throw a typed `InvalidPointShapeError` when the value is not valid. The error MUST include the offending value and the list of permissible shapes. The valid set MUST be cached at module-load time (not recomputed per call).
- **FR-016** (*exhaustive renderer switches*): Every `switch (symbol)` in the map renderer (`shared/components/src/MapView/PositionSymbolsLayer.tsx` — both `svgPathForShape` and the render-loop switch) MUST have an `assertNever(shape)` default branch so that adding a new value to `PointShapeEnum` causes `pnpm -r typecheck` to fail until every renderer handles the new value. A new unit test MUST verify the `assertNever` helper throws when given an unreachable value.
- **FR-017** (*enum reconciliation, with prior-art caveat*): `MarkerSymbolEnum` (defined in `shared/schemas/src/linkml/common.yaml`, documented as *"superset of PointShapeEnum"* but carrying identical permissible values today) MUST be addressed by one of two deterministic actions: **(17A)** remove it from the LinkML schema and redirect every reference to `PointShapeEnum`; **OR** **(17B)** keep both enums, document the semantic distinction originally made in feature #091 (styling context vs tool-parameter context), and add an invariant assertion in the schema adherence tests that their permissible-value sets must match. The choice between 17A and 17B MUST be made explicitly (with rationale recorded in `research.md` R-012) before implementation — it cannot be left ambiguous. Schema adherence tests MUST pass against whichever form is chosen.
- **FR-018** (*renderer error surfacing*): The map renderer (`PositionSymbolsLayer.tsx`) MUST catch `InvalidPointShapeError` thrown by the resolver and surface it via the established error-reporting path (logs via `LogService` or equivalent; no silent default-shape substitution for the offending position). The renderer MUST NOT crash the map view for the rest of the track when one position's override is invalid.

### Key Entities

- **ResolvedPositionStyle** (TypeScript interface, shared): The rendering-ready style for a single position on a track, after applying the default-style → interval-rules → per-position-override cascade. Fields: `showSymbol: boolean`, `symbol: PointShape`, `showLabel: boolean`, `labelText: string | null` (null when no label should be displayed; a formatted timestamp when the label should be shown but no custom text was supplied).
- **PointShape** (TypeScript type alias, authored in `@debrief/utils`): The template-literal derivation `` `${PointShapeEnum}` `` that resolves to the string union of permissible shape values. The single place where a TypeScript union over shapes is named. Re-exported from `@debrief/components`. Used as the `symbol` field's type on `ResolvedPositionStyle`, on the (newly narrowed) `PositionStyle.symbol` / `PositionStyleOverride.symbol`, on the map renderer's internal `SymbolShape` aliases (renamed), and on the VS Code `apply-symbol-style` tool's parameter.
- **PointShapeEnum** (schema-generated TypeScript enum, consumed, not authored here): The canonical list of permissible marker shapes defined in LinkML (`shared/schemas/src/linkml/common.yaml`) and emitted by the TypeScript generator into `@debrief/schemas`. Currently: `circle`, `square`, `triangle`, `diamond`, `cross`. The sole source of truth for the `symbol` field's value space. After this feature it is also the sole marker-shape enum in the schema (`MarkerSymbolEnum` is deleted — FR-017).
- **InvalidPointShapeError** (TypeScript error class, authored in `@debrief/utils`): Thrown by `resolvePositionStyle` when a runtime `override.symbol` value is not in the `PointShape` union. Carries the offending value and the list of permissible shapes.
- **assertNever** (TypeScript helper, shared): Standard TypeScript exhaustiveness helper of the form `function assertNever(x: never): never { throw new Error(...) }`. Used as the default branch in every renderer `switch (symbol)` to turn "new shape not handled" into a compile-time error (FR-016). May already exist somewhere in `@debrief/utils`; if not, introduced by this feature.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001** (*Uniqueness*): A repository-wide search for `interface ResolvedPositionStyle` in `shared/**` returns exactly **1** match after the refactor (down from 2 before).
- **SC-002** (*Schema linkage*): **0** hand-typed string-literal unions for the `symbol` field remain on the canonical `ResolvedPositionStyle`; the field's type resolves via `@debrief/schemas` to the schema-defined enum. Verified by inspection of `shared/utils/src/types.ts`.
- **SC-003** (*Field-name consistency*): **0** references to `.label` on any value typed as `ResolvedPositionStyle` remain anywhere in `shared/**`, `apps/**`, or `services/**`. Verified by a targeted grep after the refactor.
- **SC-004** (*Behaviour preservation*): Rendering the shipped sample catalog before and after the refactor produces identical position markers (same shape and same label text at the same positions). Verified by spot-checking the map and timeline views on the sample catalog, and by the existing resolver unit tests passing after their field-name update.
- **SC-005** (*CI gate*): The full CI pipeline (lint + typecheck + unit tests + Playwright E2E) passes on the refactor branch with **0** new failures compared to the baseline on `main`.
- **SC-006** (*Drift resistance*): Adding a new permissible value to the schema marker-shape enum and regenerating `@debrief/schemas` is sufficient — with **0** lines edited in `@debrief/utils` — for the new value to be assignable to `ResolvedPositionStyle.symbol`. Verified by a one-off generator dry-run during implementation (need not be a committed test).
- **SC-007** (*Single resolver implementation*): Grep for `export function resolvePositionStyle` across `shared/**` returns exactly **1** match (same for `computeAllPositionStyles`). Down from 2 before.
- **SC-008** (*Exhaustive-switch enforcement*): Adding a mocked 6th value to `PointShape` in a test fixture causes `tsc --noEmit` to report an error in every renderer file that switches on `symbol` (currently `PositionSymbolsLayer.tsx`). Verified by a dedicated negative-typecheck test or a one-off implementation dry-run.
- **SC-009** (*No silent failures on invalid shape*): A runtime override with `symbol: "star"` causes `resolvePositionStyle` to throw `InvalidPointShapeError` with the offending value in its message. Verified by unit test. The map renderer catches the error and surfaces it via `LogService` (verified by test or manual).
- **SC-010** (*Schema-level enum reconciliation*): Either (a) `MarkerSymbolEnum` no longer exists in `shared/schemas/src/linkml/**/*.yaml` (17A chosen), or (b) both enums continue to exist AND a schema adherence test asserts that their permissible-value sets are identical (17B chosen). The choice is visible in `research.md` R-012.

## Assumptions

- **A-001**: The canonical schema enum for the `symbol` field is `PointShapeEnum` (defined in `shared/schemas/src/linkml/common.yaml`), which the backlog and idea docs refer to informally as "PositionStyleSymbolEnum". The actual generated TypeScript export name from `@debrief/schemas` is `PointShapeEnum`. This spec uses the actual name.
- **A-002**: `labelText` is the correct chosen field name (per the idea doc). The components side already uses it; the utils side is being migrated to match, not the other way round.
- **A-003**: The refactor is strictly shape-level: no rendering logic, no style cascade semantics, and no schema content change. Any behavioural divergence uncovered during the work is logged and deferred to a separate item rather than fixed in this change.
- **A-004**: No consumers exist outside this monorepo that depend on the current `label` field name on `ResolvedPositionStyle`. If one is discovered during implementation, it is updated in the same PR.
- **A-005** (*superseded by FR-012 on 2026-04-18*): Originally "implementation consolidation is out of scope". The `/speckit.review` pass overturned this — the two implementations differ subtly on override null-handling, and leaving both in place perpetuates the drift we are trying to remove. Resolver consolidation is now in-scope (FR-012) with an explicit semantics choice (FR-013).
- **A-006**: `MarkerSymbolEnum` and `PointShapeEnum` currently have identical permissible values (`circle`, `square`, `triangle`, `diamond`, `cross`). Feature #091 (`specs/091-tool-parameter-context-menus/research.md` RQ-7) deliberately created `MarkerSymbolEnum` as a semantically distinct enum for the tool-parameter context, separate from `PointShapeEnum`'s styling-attribute context. **FR-017 overturns or reaffirms that decision, whichever option (17A or 17B) is chosen in R-012.** If 17A (remove `MarkerSymbolEnum`): tool parameters previously typed `MarkerSymbolEnum` must be retyped `PointShapeEnum`, which is a minor taxonomy change. If 17B (keep both): a schema adherence test pins their equality going forward. Either way, leaving the current drift-waiting-to-happen state is not acceptable.
- **A-007**: The TypeScript generator (`gen-typescript`) currently emits `string` for enum-ranged attributes (verified: `shared/schemas/src/generated/typescript/types.ts:576` shows `symbol: string` despite the LinkML `range: PointShapeEnum`). FR-014 commits to narrowing these at the schemas-build boundary — the exact mechanism (post-process script, generator config, template override) is a research/implementation item, but the outcome is a deterministic, re-runnable pipeline step. If no tractable mechanism is found, FR-014 is renegotiated before tasks.md is generated.
- **A-008**: The `@debrief/utils` package is an acceptable home for the `assertNever` helper and the `InvalidPointShapeError` class, because they are rendering-layer infrastructure used by the resolver and by consuming components. If a generic `assertNever` already exists elsewhere (e.g., in `@debrief/schemas` or in a `shared/types/` location), the feature reuses it rather than declaring a new one.

## Dependencies

- **D-001**: `@debrief/schemas` must export a TypeScript symbol for the marker-shape enum (`PointShapeEnum`). This is already the case — confirmed via `shared/schemas/src/generated/typescript/types.ts` — so no prerequisite work is required.
- **D-002**: `@debrief/utils` must remain a workspace dep of `@debrief/components` so that the components barrel can re-export the canonical type + functions. Already the case (`shared/components/package.json:88`).
- **D-003** (*introduced by FR-014*): The schemas build pipeline must have a hook after `gen-typescript` runs where a post-processing step can narrow enum-ranged attributes. Whether this hook currently exists or is added as part of this feature is a research item (see research.md R-011). If it does not exist, introducing it counts as prerequisite work inside this feature, not a blocker.
- **D-004**: With resolver consolidation (FR-012), `@debrief/components` imports `resolvePositionStyle` / `computeAllPositionStyles` at build time from `@debrief/utils`. The components package must re-export under the same name to preserve backward compatibility for any consumer that imports from `@debrief/components` directly.
- **D-005**: No ordering dependency on other in-flight items. The idea doc (`docs/ideas/201-resolvedpositionstyle-consolidation.md`) listed this as fully parallel with #199, #200, #202, #206, E11, E12. The expanded scope (item C in particular) now touches LinkML, so this feature is no longer parallel with #203 / #204 / #205 if any of them also edit `shared/schemas/src/linkml/common.yaml` — a merge-conflict watch, not a hard block.

## Out of Scope

- Adding, removing, or renaming values in `PointShapeEnum` itself.
- Modifying the `gen-typescript` generator tool (upstream LinkML). FR-014 is satisfied by a post-process step in this repo's schemas build, not by changing the generator.
- Widening the hand-typed-union audit to other LinkML enums beyond `PointShapeEnum` / `MarkerSymbolEnum` (backlog #206 continues to track the broader sweep across `NamedColorEnum`, `LineCapEnum`, `LineJoinEnum`, etc.).
- Changing rendering logic in map, timeline, or Storybook components beyond what is mechanically required to accommodate the renamed field, the widened `symbol` type, and the `assertNever` default branches.
- Changing the behavioural contract of `resolvePositionStyle` beyond the override null-handling clarification (FR-013) and the invalid-symbol guard (FR-015).
- Error-recovery UX for invalid-shape errors (e.g., per-position "broken" indicator on the map). FR-018 requires the error to be logged and not silently swallowed, but the specific user-facing presentation is out of scope.
- Wider JSON-boundary validation for other attributes that are typed as `string` in generated output but narrow to an enum in LinkML (again, backlog #206).
