# Feature Specification: Consolidate ResolvedPositionStyle and Align with Schema

**Feature Branch**: `201-position-style-consolidation`
**Created**: 2026-04-18
**Status**: Draft
**Input**: User description: "201 in BACKLOG.md — Consolidate ResolvedPositionStyle and align with schema. Two `ResolvedPositionStyle` interfaces with drifted shapes (`symbol: 'circle'|'square'|'triangle'` + `label` vs the 5-symbol components version + `labelText`). Canonicalise in `@debrief/utils`; symbol field uses the shape enum from `@debrief/schemas` (not a hand-typed union); field name `labelText`."

## Background *(context for reviewers)*

Two independent `ResolvedPositionStyle` interfaces currently exist in the codebase:

- `shared/utils/src/types.ts` — declares `symbol: 'circle' | 'square' | 'triangle'` and a field named `label: string | null`. Consumed by `shared/utils/src/interval.ts` (`resolvePositionStyle`, `computeAllPositionStyles`) and its tests.
- `shared/components/src/utils/time.ts` — declares `symbol: 'circle' | 'square' | 'triangle' | 'diamond' | 'cross'` and a field named `labelText: string | null`. Consumed by components that render position markers.

The components-local version matches the LinkML `PointShapeEnum` (the canonical schema enum for point marker shapes, with all 5 values). The utils version is out of date by two values (`diamond`, `cross`) and uses a different field name (`label` instead of `labelText`). On both sides, the symbol union is hand-typed, so it drifts from the schema whenever a shape is added or renamed in LinkML.

This work is a type-consolidation refactor. It changes no end-user behaviour and ships no new runtime features. Its audience is Debrief engineers who work on track/position rendering code across the utils and components packages.

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

### Edge Cases

- **Stale `.label` access outside the type system.** If any call site reads `.label` via a structural type (e.g., `Record<string, unknown>`, an `as any` cast, or a JSON blob deserialised without a type) rather than through `ResolvedPositionStyle`, TypeScript cannot flag the stale access. The migration must rely on an explicit repo-wide search to catch these rather than depending solely on `tsc`.
- **Third-party or contrib consumers.** If code under `contrib/` or a downstream package imports `ResolvedPositionStyle` and reads `.label`, renaming the field is a breaking change for them. Because nothing outside this repo is known to ship yet (pre-implementation phase), the migration treats the rename as non-breaking; if a downstream consumer is discovered during the refactor, it is updated in the same change.
- **Schema enum without a `symbol` subset.** If the schema enum used for the canonical `symbol` field ever grows values that are not valid for position markers (for example, a broader shape palette intended for other features), the `ResolvedPositionStyle.symbol` field would accept values the renderers cannot draw. The schema currently has a single `PointShapeEnum` dedicated to point markers; if that invariant changes in the future, this refactor must be revisited so the `symbol` field narrows to the correct subset.
- **Renderers that currently `switch` on only the 3-shape union.** Any renderer whose `switch (style.symbol)` previously covered only `circle | square | triangle` will, after this change, receive values from the 5-value enum and must have a default branch or exhaustive coverage. The migration must confirm no renderer silently drops `diamond` or `cross`.
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
- **FR-009**: The refactor MUST NOT modify any LinkML schema or any generated code under `shared/schemas/src/generated/`. It consumes the schema-generated enum as-is.
- **FR-010**: After the refactor, every exported symbol that was previously re-exported from either package under the name `ResolvedPositionStyle` MUST continue to be re-exported under that same name (no consumer-visible rename), so that `import { ResolvedPositionStyle } from '@debrief/utils'` and `import { ResolvedPositionStyle } from '@debrief/components'` both resolve to the same canonical type.
- **FR-011**: The full CI verification suite (lint, typecheck, unit tests, Playwright E2E as listed in `CLAUDE.md` §"Before Pushing") MUST pass on the refactor branch before it is considered complete.

### Key Entities

- **ResolvedPositionStyle** (TypeScript interface, shared): The rendering-ready style for a single position on a track, after applying the default-style → interval-rules → per-position-override cascade. Fields: `showSymbol: boolean`, `symbol` (value drawn from the schema's marker-shape enum), `showLabel: boolean`, `labelText: string | null` (null when no label should be displayed; a formatted timestamp when the label should be shown but no custom text was supplied).
- **PointShapeEnum** (schema-generated TypeScript enum/type, consumed, not authored here): The canonical list of permissible marker shapes defined in LinkML (`shared/schemas/src/linkml/common.yaml`) and emitted by the TypeScript generator into `@debrief/schemas`. Currently: `circle`, `square`, `triangle`, `diamond`, `cross`. The sole source of truth for the `symbol` field's value space.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001** (*Uniqueness*): A repository-wide search for `interface ResolvedPositionStyle` in `shared/**` returns exactly **1** match after the refactor (down from 2 before).
- **SC-002** (*Schema linkage*): **0** hand-typed string-literal unions for the `symbol` field remain on the canonical `ResolvedPositionStyle`; the field's type resolves via `@debrief/schemas` to the schema-defined enum. Verified by inspection of `shared/utils/src/types.ts`.
- **SC-003** (*Field-name consistency*): **0** references to `.label` on any value typed as `ResolvedPositionStyle` remain anywhere in `shared/**`, `apps/**`, or `services/**`. Verified by a targeted grep after the refactor.
- **SC-004** (*Behaviour preservation*): Rendering the shipped sample catalog before and after the refactor produces identical position markers (same shape and same label text at the same positions). Verified by spot-checking the map and timeline views on the sample catalog, and by the existing resolver unit tests passing after their field-name update.
- **SC-005** (*CI gate*): The full CI pipeline (lint + typecheck + unit tests + Playwright E2E) passes on the refactor branch with **0** new failures compared to the baseline on `main`.
- **SC-006** (*Drift resistance*): Adding a new permissible value to the schema marker-shape enum and regenerating `@debrief/schemas` is sufficient — with **0** lines edited in `@debrief/utils` — for the new value to be assignable to `ResolvedPositionStyle.symbol`. Verified by a one-off generator dry-run during implementation (need not be a committed test).

## Assumptions

- **A-001**: The canonical schema enum for the `symbol` field is `PointShapeEnum` (defined in `shared/schemas/src/linkml/common.yaml`), which the backlog and idea docs refer to informally as "PositionStyleSymbolEnum". The actual generated TypeScript export name from `@debrief/schemas` is `PointShapeEnum`. This spec uses the actual name.
- **A-002**: `labelText` is the correct chosen field name (per the idea doc). The components side already uses it; the utils side is being migrated to match, not the other way round.
- **A-003**: The refactor is strictly shape-level: no rendering logic, no style cascade semantics, and no schema content change. Any behavioural divergence uncovered during the work is logged and deferred to a separate item rather than fixed in this change.
- **A-004**: No consumers exist outside this monorepo that depend on the current `label` field name on `ResolvedPositionStyle`. If one is discovered during implementation, it is updated in the same PR.
- **A-005**: The two `computeAllPositionStyles` / `resolvePositionStyle` implementations (one in `shared/utils/src/interval.ts`, a near-duplicate in `shared/components/src/utils/time.ts`) may themselves be candidates for de-duplication, but that is out of scope for this feature. This spec only requires the type to be canonicalised; implementation consolidation is a separate tech-debt item if still warranted afterwards.

## Dependencies

- **D-001**: `@debrief/schemas` must export a TypeScript symbol for the marker-shape enum (`PointShapeEnum`). This is already the case — confirmed via `shared/schemas/src/generated/typescript/types.ts` — so no prerequisite work is required.
- **D-002**: No ordering dependency on other in-flight items. The idea doc (`docs/ideas/201-resolvedpositionstyle-consolidation.md`) lists this as fully parallel with #199, #200, #202, #206, E11, E12, and schema-free so also parallel with #203 / #204 / #205.

## Out of Scope

- Adding, removing, or renaming values in the marker-shape enum.
- De-duplicating the `resolvePositionStyle` / `computeAllPositionStyles` implementations themselves (only the type is consolidated here).
- Changing anything about the `PositionStyle` or `PositionStyleOverride` input shapes — these are already imported from `@debrief/schemas`.
- Modifying rendering logic in map, timeline, or Storybook components beyond what is mechanically required to accommodate the renamed field and the widened `symbol` type.
- Any LinkML schema edits or regeneration config changes.
