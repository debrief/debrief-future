# Feature Specification: Schema-Rooted Playback & Display-Mode Enums

**Feature Branch**: `205-playback-enums-linkml`
**Created**: 2026-04-21
**Status**: Draft
**Input**: Backlog item #205 (Tech Debt) — Promote `DisplayMode` and `PlaybackState` to LinkML and eliminate hand-typed TypeScript duplicates. Source: `docs/ideas/205-displaymode-playbackstate-linkml.md`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Single schema-rooted vocabulary for each enum (Priority: P1)

A developer writing code that sets, reads, or renders the track display mode or the playback state imports a single, generated enum type from `@debrief/schemas` (TypeScript) / `debrief_schemas` (Python). Today they face a choice: the components vocabulary (`'full' | 'trail'` for display mode, `'playing' | 'paused'` for playback state) or the session-state vocabulary (`'normal' | 'snailTrail'` for display mode, `'stopped' | 'playing' | 'paused'` for playback state) — with no machine-enforceable guarantee that the two will stay aligned and with implicit, ad-hoc translations wherever code crosses between the packages. After this change there is exactly one vocabulary per concept, defined in the LinkML master schema, generated into Pydantic and TypeScript, and imported by every consumer.

**Why this priority**: This is the core outcome of the feature. Without a canonical vocabulary per enum, the consolidation has no target to migrate to and the two sides continue to drift. Every downstream story depends on the generated enums existing and being adopted.

**Independent Test**: Regenerate Pydantic + TypeScript from the updated LinkML schema and import `DisplayModeEnum` and `PlaybackStateEnum` from `@debrief/schemas`. Write a smoke test that assigns every permissible value to a variable of the generated type and confirms it compiles; assigns the same values to a Pydantic field and confirms they validate. No hand-typed enum definition is referenced anywhere in the test.

**Acceptance Scenarios**:

1. **Given** the updated LinkML schema and freshly regenerated artefacts, **When** a developer writes `import { DisplayModeEnum } from '@debrief/schemas'`, **Then** the type exists, is exported, and its permissible values are exactly the canonical set defined in the schema (no more, no less).
2. **Given** the updated LinkML schema and freshly regenerated artefacts, **When** a developer writes `import { PlaybackStateEnum } from '@debrief/schemas'`, **Then** the type exists, is exported, and its permissible values are exactly `stopped`, `playing`, `paused`.
3. **Given** the generated Pydantic `PlaybackStateEnum` and `DisplayModeEnum`, **When** Pydantic validates a canonical fixture using each permissible value, **Then** all values validate; validation rejects any string outside the permissible set.
4. **Given** a TypeScript file that previously declared `export type DisplayMode = 'full' | 'trail'` or `export type PlaybackState = ...`, **When** it is re-built after the migration, **Then** the hand-typed declaration is gone and the file imports the generated enum instead.

---

### User Story 2 — Clean deletion of drifted hand-typed duplicates (Priority: P2)

A maintainer reviewing `shared/components/src/utils/types.ts`, `shared/components/src/TimeController/types.ts`, and `services/session-state/src/types/temporal.ts` finds only one definition for each concept — the generated one, re-exported where ergonomic. The four hand-typed declarations (two `DisplayMode`, two `PlaybackState`) are gone. Every former consumer (VS Code extension, web-shell app, shared components — MapView, TemporalTrackLayer, SensorBearingLayer, TimeController, ActivityPanel — and session-state store) imports the generated enum. No implicit string-literal translations remain between the packages.

**Why this priority**: This is the tech-debt payoff — without deletion, the duplicates and their drift persist. Depends on Story 1 because consumers can only migrate after the canonical generated enum exists.

**Independent Test**: After the migration, run `grep -rE "^(export\s+)?type\s+(DisplayMode|PlaybackState)\s*=" shared/ services/ apps/` on the post-change tree and confirm zero matches outside the generated schema artefacts directory. Run `task verify` (lint + typecheck + unit tests + Playwright E2E) and confirm all packages build with no type errors attributable to the migration.

**Acceptance Scenarios**:

1. **Given** the post-change codebase, **When** a reviewer searches for hand-written `type DisplayMode =` or `type PlaybackState =` declarations in `apps/`, `shared/`, and `services/`, **Then** no matches are found outside the generated schema artefacts file.
2. **Given** every former importer of the deleted symbols, **When** `pnpm -r typecheck` and `uv run pyright` run, **Then** both complete without errors attributable to the migration.
3. **Given** existing session-state store tests covering temporal-slice setters (`setPlaybackState`, `setDisplayMode`), **When** they are executed against the migrated code, **Then** all tests pass — only the imported type name/shape has changed, not runtime behaviour.
4. **Given** the existing Storybook stories that currently reference `DisplayMode` or `PlaybackState` (e.g., `TimeController.stories.tsx`, `SensorRendering.stories.tsx`, `ExerciseAlpha.stories.tsx`, `PositionStyling.stories.tsx`, `TemporalTrack.stories.tsx`), **When** they are run via Storybook after the migration, **Then** they render identically to before (no visual regression attributable to the type change).

---

### User Story 3 — Playback state widened at the UI boundary (Priority: P2)

A UI author who currently only toggles between `'playing'` and `'paused'` in the `TimeController` and `ActivityPanel` components now works against the canonical three-state `PlaybackStateEnum` (`stopped | playing | paused`). The UI treats `stopped` identically to `paused` in rendering (the play button is shown, the pause button is hidden), and the component contract is documented accordingly. No logic branches on "is this `stopped` or `paused`?" — they render identically by design.

**Why this priority**: Without this widening the components copy cannot be deleted in Story 2 — a narrower type cannot safely replace a wider one when the store writes the wider value. Widening to the superset is the minimal runtime change that unblocks deletion. Equal priority to Story 2 because the two must ship together: deleting the narrow copy without widening the component would break the type check.

**Independent Test**: Given a TimeController rendered with `playbackState='stopped'` and the same control rendered with `playbackState='paused'`, the two renders are pixel-identical (snapshot test or Storybook visual-regression story). The corresponding `onPlaybackStateChange` callback signature accepts the full three-state type.

**Acceptance Scenarios**:

1. **Given** the post-change `TimeController` component, **When** the parent passes `playbackState='stopped'`, **Then** it renders with the play button visible (equivalent to `paused`) and without any error, warning, or console log about an unknown value.
2. **Given** the post-change `ActivityPanel` component and its `temporal:playbackState` action payload, **When** the payload carries `'stopped'`, **Then** the panel dispatches the action without narrowing or error.
3. **Given** the post-change component prop types, **When** a consumer passes any of `'stopped' | 'playing' | 'paused'` to `playbackState` or `initialPlaybackState`, **Then** TypeScript accepts all three without casts or `@ts-expect-error` comments.

---

### User Story 4 — Wire contract migrated alongside the vocabulary change (Priority: P2)

A downstream consumer of the MCP session-state tools (`session.setDisplayMode`) or the SSE event stream (`temporal.displayMode`) sees exactly one DisplayMode vocabulary documented in the contract files (`specs/024-document-session-state/contracts/mcp-tools.yaml` and `contracts/sse-events.yaml`) and produced by the runtime server — matching the canonical LinkML vocabulary. If the canonical vocabulary differs from the previously-published one, the contract files are updated in the same change set so that documentation, runtime, and schema stay aligned.

**Why this priority**: The DisplayMode enum has an externally-visible surface (MCP tool arguments, SSE event payloads) that is documented in the session-state contracts. Changing the canonical vocabulary without updating those contracts would leave published documentation inconsistent with runtime behaviour. Equal priority to Stories 2 and 3 because the contract update is part of the same atomic migration.

**Independent Test**: `grep -nE "(normal|snailTrail|full|trail)" specs/024-document-session-state/contracts/*.yaml` reports only values from the canonical LinkML `DisplayModeEnum` — no off-vocabulary literals remain. A smoke test exercising the `session.setDisplayMode` MCP tool with each permissible value succeeds; with an off-vocabulary value fails validation.

**Acceptance Scenarios**:

1. **Given** `specs/024-document-session-state/contracts/mcp-tools.yaml` after the migration, **When** a reviewer inspects the `session.setDisplayMode` tool definition and the `session.getState` response slice for `temporal.displayMode`, **Then** the documented enum values exactly match the canonical LinkML `DisplayModeEnum` permissible values.
2. **Given** `specs/024-document-session-state/contracts/sse-events.yaml` after the migration, **When** a reviewer inspects the `temporal.displayMode` event payload definition, **Then** the documented enum values exactly match the canonical LinkML `DisplayModeEnum` permissible values.
3. **Given** the runtime MCP server wiring in `services/session-state/src/server/tools/`, **When** the `setDisplayMode` tool is invoked with a value outside the canonical permissible set, **Then** the request is rejected with a validation error from the schema-rooted type (no silent coercion).

---

### User Story 5 — Guard rails prevent reintroduction (Priority: P3)

A future contributor who instinctively hand-writes a new `type DisplayMode = ...` or `type PlaybackState = ...` at a package boundary (because "we already use these strings everywhere") is redirected to the canonical generated enum. The generated enums carry schema-sourced descriptions on each permissible value (e.g., "stopped: playback is stopped; rendered identically to paused in the current UI"), and the commit deleting the old duplicates records the rationale in `docs/project_notes/decisions.md` so the decision is discoverable via the existing memory protocol.

**Why this priority**: Guard rails make the fix durable. Without them the drift will return the next time someone reaches for a local "just for this component" alias. Lower than P1/P2 because the immediate consolidation wins the lion's share of the value even without documentation guard rails.

**Independent Test**: Verify the generated TypeScript artefact file includes non-trivial JSDoc/descriptive comments on both `DisplayModeEnum` and `PlaybackStateEnum` covering their permissible-value semantics. Verify an ADR entry in `docs/project_notes/decisions.md` names the four deleted hand-typed declarations, names the canonical enums, and summarises the vocabulary-selection decision (including the components-widens rule for `PlaybackState`).

**Acceptance Scenarios**:

1. **Given** the regenerated TypeScript artefact `shared/schemas/src/generated/typescript/types.ts`, **When** a reader inspects the `DisplayModeEnum` and `PlaybackStateEnum` declarations, **Then** each permissible value carries a short description derived from the LinkML `description` field, and the enum itself carries a docstring describing its role.
2. **Given** `docs/project_notes/decisions.md` after merge, **When** a reviewer searches for entries relating to playback state, display mode, or LinkML enum consolidation, **Then** a dated ADR entry exists that names the four deleted hand-typed declarations, names the canonical enums and their permissible values, links to this spec, and records the "components widens to the canonical superset, `stopped` renders as `paused`" rule.
3. **Given** a subsequent review on a PR that reintroduces a local `type DisplayMode =` or `type PlaybackState =` at a package boundary, **When** the reviewer invokes the project's memory-aware protocol (CLAUDE.md), **Then** the ADR surfaces the established pattern and the reviewer can quote it.

---

### Edge Cases

- **Stored session-state JSON using the pre-migration DisplayMode vocabulary**: If the canonical vocabulary differs from what session-state has historically written (`'normal' | 'snailTrail'`), any already-persisted session file or on-disk snapshot that contains those values must either be migrated (one-time upgrade) or rejected with a clear message. The plan phase must choose between a silent upgrade, a strict rejection, and a compatibility shim — and must audit for any such persisted data (sample-catalog fixtures, preview-workspace files, user-created `.debrief.json` on-disk session snapshots) before executing.
- **Stored session-state JSON using the pre-migration PlaybackState vocabulary**: Current persistence already excludes `playbackState` from saved state (marked ephemeral in the partialize middleware), so no persisted file should contain the field. The migration MUST verify this by inspection — if any persisted file does contain `playbackState`, the same decision as the DisplayMode edge case applies.
- **MCP tool argument sent by an external client using the old DisplayMode vocabulary**: If the canonical vocabulary changes, an external client calling `session.setDisplayMode` with the old value will receive a validation error. The contract file update plus a short-lived compatibility note in the tool documentation MUST inform integrators; any compatibility shim is a plan-phase decision.
- **SSE consumer parsing `temporal.displayMode` events with the old vocabulary**: Same as above — if the canonical vocabulary changes, external SSE consumers will receive values outside their expected set. The contract file update is mandatory; a compatibility shim is optional and must be explicitly justified.
- **Existing `'full' | 'trail'` string-literal prop types outside the hand-typed `DisplayMode` aliases**: `ActivityPanel/types.ts` declares `mode: 'full' | 'trail'` inline on an action payload, and `PositionSymbolsLayer.tsx` types `displayMode?: 'full' | 'trail'` directly. These inline literal unions MUST be rewritten to reference the canonical enum; leaving them in place re-introduces the drift this feature exists to eliminate.
- **UI treatment of `stopped` vs `paused`**: The components layer MUST render the two states identically. Any conditional branch, accessibility label, or icon that differs between the two is a regression and MUST be rejected in review.
- **Round-trip from MCP / SSE back into the store**: A value produced by the store, emitted on SSE, round-tripped through a consumer, and passed back via `session.setDisplayMode` or `session.setPlaybackState` MUST be accepted unchanged (the canonical vocabulary is stable across the full loop).
- **Storybook stories currently constructing values by hand**: Stories that declare `useState<DisplayMode>('full')` or similar literal initialisers MUST be updated to use the canonical vocabulary (as a value from the imported enum or the equivalent literal). Leaving a hard-coded off-vocabulary literal in a story would silently break the story once the type is narrowed.
- **Regeneration churn in the generated artefacts file**: Changing the permissible values on an existing LinkML enum produces a substantial diff in `shared/schemas/src/generated/typescript/types.ts` and `shared/schemas/src/generated/python/debrief_schemas/__init__.py`. The plan MUST include the regenerated artefacts in the same PR so reviewers can see schema ↔ generated consistency in one pass.

## Requirements *(mandatory)*

### Functional Requirements

**Schema definition (LinkML)**

- **FR-001**: The LinkML master schema MUST define an enum named `PlaybackStateEnum` whose permissible values are exactly `stopped`, `playing`, `paused` (the superset already tracked by the session-state runtime).
- **FR-002**: The LinkML master schema MUST define an enum named `DisplayModeEnum` whose permissible values are exactly `full`, `trail` (the components-layer vocabulary, adopted as canonical per the source idea).
- **FR-003**: Each permissible value in both enums MUST carry a `description` in LinkML so that generated artefacts include readable per-value documentation. The `stopped` value MUST be documented as rendering identically to `paused` in the current UI, and `full` / `trail` MUST be documented with their visual intent ("entire track with marker" vs "snail-trail up to current time").
- **FR-004**: Each enum MUST carry an enum-level `description` in LinkML identifying it as the canonical, schema-rooted vocabulary for its concept (used by Pydantic, TypeScript, and JSON Schema consumers).
- **FR-005**: The existing `TemporalSlice` class in `shared/schemas/src/linkml/session-state.yaml` MUST continue to reference the updated `PlaybackStateEnum` and `DisplayModeEnum` ranges (no structural change other than the updated permissible-value set for DisplayMode).

**Code generation and derived artefacts**

- **FR-006**: The Pydantic, JSON Schema, and TypeScript generators MUST emit `PlaybackStateEnum` and `DisplayModeEnum` from the updated schema without modification to generator code (use only existing generator capabilities).
- **FR-007**: All generated derived artefacts committed to the repository (`shared/schemas/src/generated/python/debrief_schemas/__init__.py`, `shared/schemas/src/generated/typescript/types.ts`, and any JSON Schema outputs) MUST be regenerated in the same change set so that the repo remains in a consistent "schema ↔ generated" state.
- **FR-008**: The schema adherence test suite MUST include at least one golden fixture that validates each permissible value of `PlaybackStateEnum` and each permissible value of `DisplayModeEnum` round-trips Python → JSON → TypeScript → JSON → Python unchanged.
- **FR-009**: The schema adherence test suite MUST include at least one negative fixture per enum that asserts an off-vocabulary value (e.g., `'foo'`, or any pre-migration `'normal' | 'snailTrail'` / `'playing' | 'paused'` literal that is no longer canonical) is rejected by Pydantic validation.

**Migration of TypeScript consumers**

- **FR-010**: The hand-typed `type DisplayMode = 'full' | 'trail'` declaration in `shared/components/src/utils/types.ts` MUST be deleted.
- **FR-011**: The hand-typed `type DisplayMode = 'normal' | 'snailTrail'` declaration in `services/session-state/src/types/temporal.ts` MUST be deleted.
- **FR-012**: The hand-typed `type PlaybackState = 'playing' | 'paused'` declaration in `shared/components/src/TimeController/types.ts` MUST be deleted.
- **FR-013**: The hand-typed `type PlaybackState = 'stopped' | 'playing' | 'paused'` declaration in `services/session-state/src/types/temporal.ts` MUST be deleted.
- **FR-014**: Every former importer of the four deleted type aliases (across `apps/vscode`, `apps/web-shell`, `shared/components`, `services/session-state`, and any other workspace package) MUST import `DisplayModeEnum` / `PlaybackStateEnum` from `@debrief/schemas` — either directly or through a thin re-export from the existing workspace package that already serves as the consumer's type source (e.g., a `DisplayMode` / `PlaybackState` re-alias from `@debrief/components` for ergonomic access).
- **FR-015**: Inline literal unions using the pre-migration vocabularies MUST be rewritten to reference the canonical enum. At minimum, this covers `shared/components/src/ActivityPanel/types.ts` (the `'temporal:displayMode'` action payload `mode: 'full' | 'trail'` and the `displayMode?: 'full' | 'trail'`, `playbackState?: 'playing' | 'paused'` UI-state fields) and `shared/components/src/MapView/PositionSymbolsLayer.tsx` (`displayMode?: 'full' | 'trail'`).
- **FR-016**: The session-state store (default state, setters, persistence code, SSE broadcast wiring, MCP tool wrappers) MUST be updated to write and read the canonical `DisplayModeEnum` values (`full` / `trail`). The `DEFAULT_TEMPORAL_SLICE` constant in `services/session-state/src/types/temporal.ts` MUST be updated so `displayMode` defaults to the semantic equivalent in the canonical vocabulary (`full`, replacing the pre-migration `'normal'`).
- **FR-017**: Components that previously consumed only the narrow `PlaybackState = 'playing' | 'paused'` (`TimeController`, `ActivityPanel`, and their prop surfaces including `playbackState` and `initialPlaybackState`) MUST widen to accept the canonical three-state enum. The widened code MUST render `stopped` identically to `paused` at every call site (same icon, same accessibility label, same click handler).
- **FR-018**: After migration, the post-change codebase MUST contain zero hand-written `type DisplayMode` or `type PlaybackState` declarations, and zero inline `'full' | 'trail'` / `'normal' | 'snailTrail'` / `'playing' | 'paused'` / `'stopped' | 'playing' | 'paused'` literal unions that refer to these concepts, anywhere under `apps/`, `shared/`, or `services/` (the generated artefacts files in `shared/schemas/src/generated/` are explicitly excluded, as are string literals that happen to coincide with these values but mean something unrelated — e.g., CSS `fontWeight: 'normal'`).

**Wire-contract synchronisation**

- **FR-019**: `specs/024-document-session-state/contracts/mcp-tools.yaml` MUST be updated so that every documented enum for `displayMode` (input to `session.setDisplayMode`, output from `session.getState`) matches the canonical `DisplayModeEnum` permissible values exactly.
- **FR-020**: `specs/024-document-session-state/contracts/sse-events.yaml` MUST be updated so that the `temporal.displayMode` event payload's `value` enum and any embedded `full-state` payload documentation reference the canonical `DisplayModeEnum` permissible values exactly.
- **FR-021**: The runtime MCP server tool implementations in `services/session-state/src/server/tools/` MUST validate `displayMode` arguments against the canonical enum. A request carrying an off-vocabulary value MUST be rejected with a validation error from the schema-rooted type (no silent coercion or fallback).
- **FR-022**: The SSE broadcaster in `services/session-state/src/server/sse.ts` MUST emit `temporal.displayMode` events whose `value` field carries only canonical vocabulary values (direct consequence of the store writing canonical values per FR-016).

**Governance and traceability**

- **FR-023**: An Architectural Decision Record entry MUST be added to `docs/project_notes/decisions.md` that (a) names the four deleted hand-typed declarations with their file paths, (b) names the canonical `DisplayModeEnum` and `PlaybackStateEnum` and their permissible values, (c) records the "components widens to the canonical superset; `stopped` renders identically to `paused`" rule, (d) records the DisplayMode vocabulary selection (`full` / `trail` over `normal` / `snailTrail`) with its rationale, and (e) links to this spec.
- **FR-024**: The change MUST pass the full CI verify pipeline (lint, typecheck, schema adherence tests, unit tests, Playwright E2E) on the feature branch's PR so that the migration is reviewed and merged atomically.

### Key Entities

- **`PlaybackStateEnum`** *(LinkML enum, already exists — permissible values unchanged)*: The canonical vocabulary for time-playback lifecycle state. Permissible values: `stopped` (playback halted at the beginning or explicitly stopped), `playing` (advancing through time), `paused` (held at the current time — rendered identically to `stopped` in the UI). Consumed by the `TemporalSlice.playbackState` attribute in the session-state schema and, transitively, by every TimeController / ActivityPanel / store surface.
- **`DisplayModeEnum`** *(LinkML enum, already exists — permissible values **change** from `normal | snailTrail` to `full | trail`)*: The canonical vocabulary for track-rendering mode. Permissible values: `full` (entire track rendered, with a marker at the current time), `trail` (snail-trail path from start up to the current time). Consumed by the `TemporalSlice.displayMode` attribute in the session-state schema and by the MapView / TemporalTrackLayer / SensorBearingLayer rendering paths.
- **Deleted hand-typed `DisplayMode` (×2)**: The aliases in `shared/components/src/utils/types.ts` (`'full' | 'trail'`) and `services/session-state/src/types/temporal.ts` (`'normal' | 'snailTrail'`) are retired. Former consumers import `DisplayModeEnum` from `@debrief/schemas`.
- **Deleted hand-typed `PlaybackState` (×2)**: The aliases in `shared/components/src/TimeController/types.ts` (`'playing' | 'paused'`) and `services/session-state/src/types/temporal.ts` (`'stopped' | 'playing' | 'paused'`) are retired. Former consumers import `PlaybackStateEnum` from `@debrief/schemas`.
- **`TemporalSlice` LinkML class** *(existing, unchanged structurally)*: The class whose `playbackState` and `displayMode` attributes reference the two enums. This feature does not change the class shape — only the permissible values of the `DisplayModeEnum` range change.
- **MCP session-state tool contract** *(`specs/024-document-session-state/contracts/mcp-tools.yaml`)*: The published contract describing the `session.setDisplayMode` tool and the `displayMode` field of the `session.getState` response. Updated in the same change set so documented enum values match the canonical vocabulary.
- **SSE event contract** *(`specs/024-document-session-state/contracts/sse-events.yaml`)*: The published contract describing the `temporal.displayMode` event payload and its embedded full-state snapshot. Updated in the same change set for the same reason.

## Assumptions

- **Canonical DisplayMode vocabulary is `full | trail`, not `normal | snailTrail`**: The source idea explicitly chose the components-layer vocabulary (`full`, `trail`) as canonical. This spec accepts that choice. The trade-off is a larger migration (session-state code and wire contracts change) than the alternative (keep `normal | snailTrail`, migrate components); the upside is the vocabulary that visually describes the rendering mode survives, which is more useful to future readers than an abstract `normal | snailTrail` pair. `/speckit.clarify` can reverse this decision if the trade-off is judged wrong at planning time; the spec's structural requirements are unchanged either way (only the permissible-value strings would swap).
- **LinkML supports per-value `description` fields and enum-level `description` fields that flow through to generated artefacts**: `gen-typescript` currently emits enum entries without per-value JSDoc; `gen-pydantic` emits enum descriptions as docstrings on the Python enum class. If `gen-typescript` cannot surface per-value descriptions, FR-003 is satisfied by enum-level documentation alone and a plan-phase note records the generator limitation.
- **No persisted on-disk JSON currently contains the pre-migration `displayMode` or `playbackState` values**: A repo-wide search found no `.json` / `.yaml` fixture or sample-catalog file containing these string values. The plan phase MUST re-run that search against the latest code before executing the migration; if any persisted file is found, the fixture-migration choice (silent upgrade vs strict rejection) is a plan-phase decision governed by the corresponding Edge Case.
- **`playbackState` remains ephemeral in persistence**: The existing `partialize` middleware already excludes `playbackState` from persisted session state. This feature does not change that — no persisted file will ever contain the `playbackState` field, regardless of vocabulary.
- **External MCP / SSE clients are considered internal during this migration window**: No publicly-documented third-party integrator currently consumes `session.setDisplayMode` or `temporal.displayMode` outside this repository. The migration therefore treats the wire-contract update as a coordinated change rather than a breaking public API change; no deprecation window, compatibility shim, or client-side migration tooling is required. If a third-party integrator is later discovered, the ADR entry (FR-023) documents the change precisely enough for them to react.
- **Regenerating Pydantic + TypeScript from the updated schema is deterministic**: Two runs on the same input produce byte-identical output. This lets CI guard against drift between the checked-in artefacts and the source schema (as it already does for other generated files).
- **No behavioural changes to runtime code beyond the documented widening**: Apart from (a) widening `TimeController` / `ActivityPanel` to accept `stopped` and (b) swapping `'normal' | 'snailTrail'` literals for `'full' | 'trail'` at session-state writers/readers, runtime control flow, persistence formats, and STAC catalog formats are unchanged. Consumer tests that pass today pass unchanged (any test changes are type-import updates or vocabulary-string updates only).
- **Generator toolchain unchanged**: The existing `gen-pydantic`, `gen-typescript`, `gen-json-schema` generators (LinkML ≥ 1.7.0) are assumed to emit the updated enums without any tooling upgrade. If a generator limitation forces a workaround, it is recorded in `research.md` during the plan phase rather than blocking the spec.

## Out of Scope

- **Consolidating other enum-style types defined in hand-typed TypeScript**: The broader non-LinkML-types audit is backlog item #206 (and individual items like #203, #204). This spec addresses `DisplayMode` and `PlaybackState` only. Other duplicated or drifted enums (if any) are out of scope.
- **Renaming the enum classes**: The LinkML enum names `PlaybackStateEnum` and `DisplayModeEnum` are kept exactly as they are today. This spec does not rename them to, e.g., `PlaybackState` / `DisplayMode` even though that would match the idiomatic TS convention, because doing so would collide with the soon-to-be-deleted hand-typed aliases during the transition and complicate review. Renaming can be a follow-up if desired.
- **Introducing a lint rule or CI check that forbids hand-written `type DisplayMode =` or `type PlaybackState =`**: Useful as a durable guard rail (User Story 5's optional extension), but introducing a new lint rule has its own review cycle and the immediate deletion already achieves the central goal. This spec records the intent; a follow-up item can implement the check.
- **Redesigning the TimeController UI for the `stopped` state**: The canonical widening makes `stopped` a valid prop value, and this spec fixes its visual treatment as "identical to `paused`". Any future UI design that distinguishes the two states (e.g., a dedicated stop icon, a timeline rewind affordance) is a separate product decision and is out of scope here.
- **Changing the wire format of unrelated session-state fields**: This feature is vocabulary-level only for `displayMode` and type-level only for `playbackState`. No other slice, tool, or event is touched.
- **Coordinating the LinkML-regen PR sequencing with backlog items #203 and #204**: Item #205 can ship independently; the parallel-work coordination (who regenerates first, how to avoid rebase churn on the generated artefacts) is a practical concern for whoever opens PRs in parallel — it is not a spec requirement. The source idea's "Parallelisation" note is acknowledged but the mitigation is operational, not specified here.
- **Extending the TemporalSlice class with new fields (e.g., `playbackSpeed`, `loopMode`)**: Structural changes to `TemporalSlice` are out of scope. Only the `DisplayModeEnum` permissible-value set changes.
- **Migrating other session-state slices (results, selection, viewport) to use schema-rooted enums**: Those slices have their own duplicated-type histories covered elsewhere. This feature's scope is exactly the two named enums.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Exactly **zero** hand-written `type DisplayMode =` or `type PlaybackState =` declarations exist under `apps/`, `shared/` (excluding `shared/schemas/src/generated/`), and `services/` after the change. Verified by a grep check run as part of code review and enforced by the CI typecheck (which will fail if a stale declaration is re-introduced and shadows the canonical enum).
- **SC-002**: Exactly **zero** inline `'full' | 'trail'` or `'normal' | 'snailTrail'` display-mode literal unions remain in the codebase under the same paths; exactly **zero** inline `'playing' | 'paused'` or `'stopped' | 'playing' | 'paused'` playback-state literal unions remain. Verified by the same grep check. (CSS `fontWeight: 'normal'` and unrelated string coincidences are excluded.)
- **SC-003**: The generated TypeScript artefact exports `DisplayModeEnum` with permissible values exactly `{ full, trail }` and `PlaybackStateEnum` with permissible values exactly `{ stopped, playing, paused }`, with no additional entries and no missing entries. The generated Pydantic enums match byte-for-byte in their permissible-value set.
- **SC-004**: Every former consumer site (every file that imports `DisplayMode` or `PlaybackState` today) imports the schema-rooted replacement after the change — measured by an inventory produced in `research.md` with a column marking each site "migrated". The inventory MUST cover at least the 15 TypeScript importers currently found via `grep -rnE "import.*\b(DisplayMode|PlaybackState)\b" shared/ services/ apps/`.
- **SC-005**: The full CI verify pipeline (lint + typecheck + schema adherence tests + unit tests + Playwright E2E) passes on the feature branch's PR with **no** failures attributable to the migration.
- **SC-006**: Schema round-trip fixtures for `TemporalSlice` produce byte-identical JSON on Python → JSON → TypeScript → JSON → Python cycles for at least one fixture per permissible value of each enum (i.e., ≥ 3 fixtures for `PlaybackStateEnum` and ≥ 2 fixtures for `DisplayModeEnum`, 5 total).
- **SC-007**: `specs/024-document-session-state/contracts/mcp-tools.yaml` and `contracts/sse-events.yaml` reference exactly the canonical DisplayMode vocabulary — verified by `grep -nE "enum:\s*\[(normal|snailTrail)" contracts/` returning zero matches and `grep -nE "enum:\s*\[(full|trail)" contracts/` returning at least one match per affected definition.
- **SC-008**: The `TimeController` component, rendered with `playbackState='stopped'`, produces the same DOM (modulo data-attribute labelling of the state itself) as with `playbackState='paused'` — confirmed by a unit/snapshot test or Storybook visual-regression story added as part of the change.
- **SC-009**: `docs/project_notes/decisions.md` contains exactly one new ADR entry (dated `2026-04-21` or later, linked to this spec) covering the enum consolidation, the vocabulary selection for DisplayMode, and the "components widens, `stopped` renders as `paused`" rule — verified by reviewer inspection.
- **SC-010**: The change ships as a **single** atomic PR; reviewers can review the schema change, regeneration diff, migration, wire-contract updates, and ADR together in one pass rather than reasoning across sequenced PRs.

