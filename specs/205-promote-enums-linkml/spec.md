# Feature Specification: Promote DisplayMode and PlaybackState to LinkML

**Feature Branch**: `205-promote-enums-linkml`
**Created**: 2026-04-21
**Status**: Draft
**Input**: Backlog item [#205](../../BACKLOG.md) — Tech Debt, V:4 M:2 A:4 (Total 10), Complexity: Medium. Full problem statement at [`docs/ideas/205-displaymode-playbackstate-linkml.md`](../../docs/ideas/205-displaymode-playbackstate-linkml.md).

## Context

Two enum-style types — `DisplayMode` and `PlaybackState` — are each defined in two TypeScript packages, and the two copies have drifted to different value sets:

| Type | `shared/components` | `services/session-state` |
|------|---------------------|--------------------------|
| `DisplayMode` | `'full' \| 'trail'` | `'normal' \| 'snailTrail'` |
| `PlaybackState` | `'playing' \| 'paused'` | `'stopped' \| 'playing' \| 'paused'` |

Both types represent the same concepts across every consumer, but they require implicit vocabulary translation at every package boundary. Code that crosses between the packages today silently maps `'full'` ↔ `'normal'` and `'trail'` ↔ `'snailTrail'` — or simply coerces incorrectly.

The resolution is to promote both types into the LinkML master schema, generate them into Pydantic and TypeScript, and delete every hand-typed copy. The canonical vocabulary is:

- **DisplayMode**: `full`, `trail` (the clearer, user-facing terms from `shared/components` win).
- **PlaybackState**: `stopped`, `playing`, `paused` (the session-state superset wins; the component that previously only saw two values widens to treat `stopped` identically to `paused` in rendering).

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Single schema-rooted enum definitions (Priority: P1)

A developer working on display or playback behaviour needs to know the valid values for `DisplayMode` or `PlaybackState`. They import both enum types from the generated schema package and get a single, canonical definition backed by the LinkML master schema — no ambiguity about which copy to use, no vocabulary mismatch between packages.

**Why this priority**: This is the load-bearing outcome. Without generated enums that both packages can share, no hand-typed copy can be deleted. Every downstream story depends on the schema-rooted definitions existing first.

**Independent Test**: Generate Pydantic and TypeScript artefacts from the updated LinkML schema and import `DisplayModeEnum` and `PlaybackStateEnum` from the generated schema package (TypeScript and Python). Confirm each enum exposes the correct canonical values, and that the schema adherence tests pass with golden fixtures for both enums.

**Acceptance Scenarios**:

1. **Given** the updated LinkML schema and regenerated artefacts, **When** a developer imports `DisplayModeEnum` from the generated schema package, **Then** the type exists, is exported, and exposes exactly two values: `full` and `trail`.
2. **Given** the updated LinkML schema and regenerated artefacts, **When** a developer imports `PlaybackStateEnum` from the generated schema package, **Then** the type exists, is exported, and exposes exactly three values: `stopped`, `playing`, `paused`.
3. **Given** the regenerated Pydantic models, **When** the schema adherence test suite runs golden fixtures for both enums (valid values and invalid values), **Then** all fixture validations pass without errors.

---

### User Story 2 — Deletion of all hand-typed copies and vocabulary migration (Priority: P2)

A maintainer reviewing the post-change codebase finds no hand-typed `DisplayMode` or `PlaybackState` union literals in `apps/`, `shared/`, or `services/`. Every former consumer of either type imports the generated schema enum. The session-state package has migrated its `'normal' | 'snailTrail'` vocabulary to the canonical `full`/`trail` values. Components that previously only handled two-value `PlaybackState` now accept the third `stopped` value and render it identically to `paused`.

**Why this priority**: This is the tech-debt payoff. Deleting the hand-typed copies and migrating the divergent session-state vocabulary eliminates the silent translation layer between packages. Depends on Story 1 because consumers can only migrate after the generated enums exist.

**Independent Test**: Run a search for hand-written union literals matching the deleted patterns across `apps/`, `shared/`, and `services/`. Confirm zero matches outside of generated artefact directories. Run the full CI verify pipeline (lint + typecheck + tests) and confirm all packages build with no type errors after migration.

**Acceptance Scenarios**:

1. **Given** the post-change codebase, **When** a reviewer searches for hand-written `'full' | 'trail'`, `'normal' | 'snailTrail'`, `'playing' | 'paused'`, and `'stopped' | 'playing' | 'paused'` union type declarations in source files (excluding generated artefacts), **Then** no matches are found.
2. **Given** the post-change codebase and the session-state package, **When** any path that previously read or wrote the `'normal'` / `'snailTrail'` vocabulary is exercised by tests, **Then** the tests pass and the values produced are `'full'` or `'trail'` respectively.
3. **Given** the shared-components package whose `PlaybackState` consumer previously only handled two values, **When** a `stopped` value is passed, **Then** the component renders it identically to `paused` with no runtime error and no `unknown value` fallback path.
4. **Given** every former consumer of the deleted types, **When** `pnpm -r typecheck` and `uv run pyright` run, **Then** both complete without errors attributable to the migration.

---

### User Story 3 — Guard rails prevent reintroduction (Priority: P3)

A future contributor who instinctively hand-writes a new `DisplayMode` or `PlaybackState` union literal is redirected to the canonical generated enum. An Architectural Decision Record captures the vocabulary resolution (why `full`/`trail` beat `normal`/`snailTrail`, why the three-value `PlaybackState` is the superset) so the reasoning is discoverable through the project memory protocol.

**Why this priority**: Guard rails make the fix durable. Without them the drift will return the next time someone reaches for a quick inline literal. Lower than P1/P2 because the immediate consolidation wins the lion's share of the value even without documentation guard rails.

**Independent Test**: Verify an ADR entry exists in `docs/project_notes/decisions.md` naming the deleted hand-typed copies, the canonical replacements, and the vocabulary decisions. (Optional: a lint or test rule that fails on new `DisplayMode`-ish or `PlaybackState`-ish union literals — planned as a follow-up if inexpensive.)

**Acceptance Scenarios**:

1. **Given** `docs/project_notes/decisions.md` after merge, **When** a reviewer searches for entries relating to display mode or playback state typing, **Then** a dated ADR entry exists that names the four deleted hand-typed definitions, the two new generated enums, and the rationale for each vocabulary decision.
2. **Given** a subsequent code-review pass on a PR that reintroduces a hand-typed `'full' | 'trail'` or `'playing' | 'paused'` union, **When** the reviewer invokes the project memory-aware protocol (CLAUDE.md), **Then** the ADR surfaces the established pattern and the reviewer can quote it to the author.

---

### Edge Cases

- **Session-state fixtures containing `'normal'` or `'snailTrail'` values**: Any stored JSON fixtures (golden fixtures, test data, sample session-state blobs) that serialised the old vocabulary MUST be updated to `'full'` and `'trail'` respectively. Fixtures not updated will fail validation against the new generated schema.
- **Component that receives `stopped` for the first time**: The shared-components `PlaybackState` consumer previously only saw `'playing'` and `'paused'`. After widening it must not crash, render a blank UI, or log warnings when it receives `'stopped'`; it renders identically to `'paused'`.
- **Implicit string comparisons**: Any code that compares a `DisplayMode` value with a string literal (e.g., `mode === 'normal'`) rather than using the generated enum constant will silently break after migration. These MUST be found and replaced during migration.
- **Session-state persistence round-trip**: If session-state has ever persisted `DisplayMode` as `'normal'`/`'snailTrail'` to a file, loading that persisted file after migration must either (a) reject the old value with a clear error, or (b) migrate it transparently. The plan phase decides which; this spec requires the behaviour to be defined and tested.
- **Coordination with parallel LinkML items (#203, #204)**: All three features modify the LinkML schema and regenerate artefacts. If PRs land in sequence, the generated artefacts will conflict on merge. The developer sequencing the PRs must rebase regeneration off whichever PR lands last; this edge case is a merge concern, not a spec requirement.

## Requirements *(mandatory)*

### Functional Requirements

**Schema definition**

- **FR-001**: The LinkML master schema MUST define an enum named `DisplayModeEnum` with exactly two permissible values: `full` and `trail`.
- **FR-002**: The LinkML master schema MUST define an enum named `PlaybackStateEnum` with exactly three permissible values: `stopped`, `playing`, and `paused`.
- **FR-003**: Both enum definitions MUST carry a schema-level description that (a) names the concept each value represents in user-facing terms and (b) documents the vocabulary decision — why `full`/`trail` were chosen over `normal`/`snailTrail`, and why the three-value superset was adopted for `PlaybackState`.
- **FR-004**: The generated TypeScript and Pydantic artefacts for both enums MUST be regenerated and committed in the same change set that deletes the hand-typed copies, keeping the repository in a consistent schema ↔ generated state.

**Code generation and derived artefacts**

- **FR-005**: The Pydantic, JSON Schema, and TypeScript generators MUST emit `DisplayModeEnum` and `PlaybackStateEnum` from the updated schema without modification to generator code (use only existing generator capabilities).
- **FR-006**: The schema adherence test suite (golden fixtures, round-trip, structural comparison) MUST be extended to cover both new enums — at minimum one valid fixture per enum value and one invalid-value fixture per enum.

**Migration of existing consumers**

- **FR-007**: The hand-typed `DisplayMode` union (`'full' | 'trail'`) in `shared/components` MUST be deleted; its consumers MUST import the generated `DisplayModeEnum`.
- **FR-008**: The hand-typed `DisplayMode` union (`'normal' | 'snailTrail'`) in `services/session-state` MUST be deleted; its consumers MUST import the generated `DisplayModeEnum` and use the canonical `full`/`trail` values.
- **FR-009**: The hand-typed `PlaybackState` union (`'playing' | 'paused'`) in `shared/components` MUST be deleted; its consumers MUST import the generated `PlaybackStateEnum`.
- **FR-010**: The hand-typed `PlaybackState` union (`'stopped' | 'playing' | 'paused'`) in `services/session-state` MUST be deleted; its consumers MUST import the generated `PlaybackStateEnum`.
- **FR-011**: Every consumer of the deleted `DisplayMode` type in `services/session-state` that previously wrote or compared against `'normal'` or `'snailTrail'` MUST be updated to use `'full'` or `'trail'` respectively — no translation shims permitted.
- **FR-012**: Every consumer of the deleted two-value `PlaybackState` in `shared/components` MUST be updated to handle the three-value `PlaybackStateEnum`; the `stopped` value MUST be treated identically to `paused` in all rendering logic.
- **FR-013**: After migration, the codebase MUST contain zero hand-written type declarations that replicate either enum's value set anywhere under `apps/`, `shared/` (excluding `shared/schemas/src/generated/`), and `services/`.
- **FR-014**: Any stored JSON fixtures that contain the legacy `'normal'`/`'snailTrail'` vocabulary MUST be updated to the canonical `'full'`/`'trail'` values before merge.

**Governance and traceability**

- **FR-015**: The project MUST capture an Architectural Decision Record entry in `docs/project_notes/decisions.md` that names the four deleted hand-typed definitions, the two new generated enums, the chosen canonical vocabularies, and the rationale for each vocabulary decision.
- **FR-016**: The change MUST pass the CI verify pipeline (lint, typecheck, tests) on a single PR so that the schema change, regeneration diff, vocabulary migration, and consumer updates are reviewed atomically.

### Key Entities

- **DisplayModeEnum** *(new LinkML enum)*: Canonical representation of how a track is rendered temporally. Value `full` means the entire track is drawn at all times; value `trail` means only the portion up to the current time cursor is drawn (snail-trail effect). Replaces both hand-typed copies.
- **PlaybackStateEnum** *(new LinkML enum)*: Canonical representation of the animation playback lifecycle. Values: `stopped` (initialised but never started, or fully rewound), `playing` (advancing through time), `paused` (mid-sequence, holds position). The superset of all values used by any existing consumer. Replaces both hand-typed copies.
- **Deleted hand-typed `DisplayMode` (×2)**: The `'full' | 'trail'` union in `shared/components` and the `'normal' | 'snailTrail'` union in `services/session-state`. Both retired; the divergent `normal`/`snailTrail` vocabulary is permanently abandoned.
- **Deleted hand-typed `PlaybackState` (×2)**: The `'playing' | 'paused'` union in `shared/components` and the `'stopped' | 'playing' | 'paused'` union in `services/session-state`. Both retired; the three-value superset becomes canonical.

## Assumptions

- **`full`/`trail` is the canonical DisplayMode vocabulary**: The `shared/components` vocabulary is clearer to end users and already used in the existing rendering logic. The session-state `'normal'`/`'snailTrail'` vocabulary is a historical naming choice that is neither user-facing nor referenced externally; migrating it carries no backward-compatibility risk beyond stored fixtures.
- **Session-state does not persist enum values to external storage that cannot be updated**: Any fixture files or test data are under source control and can be migrated in the same PR. If session-state serialises these values to user-facing files (e.g., project files saved to disk), that migration path must be defined and tested during the plan phase.
- **LinkML supports string enums with the existing generator set**: `gen-pydantic`, `gen-typescript`, and `gen-json-schema` (LinkML ≥ 1.7.0) all support enum definitions. No generator upgrade is assumed; if a limitation is found, it is recorded in `research.md` during the plan phase.
- **No behavioural changes to runtime logic**: This is a type-level and schema-level consolidation. Display rendering, time-controller behaviour, and playback controls produce identical visual output after migration. Any test changes are import-path and vocabulary updates only.
- **`stopped` renders identically to `paused` in all existing component consumers**: This is stated in the idea doc and is the only UI-behaviour assumption. If any component has a visible difference between `stopped` and `paused` rendering (e.g., a "rewind" icon vs a "pause" icon), that distinction is preserved by the plan — but the spec assumes the existing shared-components implementation treats them equivalently.
- **Regeneration is idempotent**: Running the code generators twice on the same updated schema produces byte-identical output. This lets CI guard against committed-artefact drift.

## Out of Scope

- **`SafeFeature` / `SafeGeometry` and other hand-typed parse-boundary types**: Covered separately by backlog item #204 and the broader audit in #206.
- **Introducing a lint rule that forbids new hand-typed copies of these enums**: Valuable as a durable guard rail, but a new lint rule has its own review cycle. The immediate deletion already achieves the central goal; this spec records the intent and a follow-up item can implement the check.
- **Changing the on-wire format of tool results, STAC catalog files, or MCP messages**: This feature is type-level only. No JSON shapes on disk or on any wire boundary change (aside from fixture files that already contained the legacy vocabulary).
- **Renaming or consolidating any other hand-typed types**: The broader non-LinkML-type audit is backlog item #206. This spec is scoped to exactly `DisplayMode` and `PlaybackState`.
- **Coordinating the LinkML-regen PR sequence with #203 and #204**: Practical merge-order coordination is the responsibility of whoever opens the PRs, not a specification requirement.
- **Adding new enum values** (e.g., a future `'fastForward'` playback state): This spec defines the canonical starting vocabulary only; extensions are a future spec concern.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Exactly **zero** hand-written type declarations matching the `DisplayMode` or `PlaybackState` value sets exist under `apps/`, `shared/` (excluding `shared/schemas/src/generated/`), and `services/` after the change — verified by a grep check run as part of code review.
- **SC-002**: The generated schema package exports `DisplayModeEnum` and `PlaybackStateEnum` with the correct value sets (`full`/`trail` and `stopped`/`playing`/`paused`) in both TypeScript and Python — verified by importing the generated types and inspecting their values.
- **SC-003**: The schema adherence test suite reports **no failures** on the new enum fixtures (valid-value and invalid-value cases for both enums).
- **SC-004**: The full CI verify pipeline (lint + typecheck + tests) passes on the feature branch's PR with **no** failures attributable to the migration.
- **SC-005**: Time controller, track rendering (snail-trail display), and playback controls in the VS Code extension and web-shell behave **identically** to before migration — verified by the existing automated tests and a documented smoke-test checklist produced during the plan phase.
- **SC-006**: Every former consumer of the deleted `'normal'` / `'snailTrail'` vocabulary (inventoried during the plan phase) uses the canonical `'full'` / `'trail'` values after the change — measured by the inventory produced in `research.md` with a column marking each site "migrated".
- **SC-007**: The `docs/project_notes/decisions.md` file contains exactly one new ADR entry (dated, linked to this spec) naming the four deleted hand-typed definitions, the two new generated enums, and the vocabulary rationale — verified by reviewer inspection.
- **SC-008**: The change ships as a **single** atomic PR; reviewers can evaluate the schema change, regeneration diff, vocabulary migration, and consumer updates together in one pass.
