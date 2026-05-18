# Phase 0 — Research: Relax Scene Timestamp Uniqueness

**Feature**: 259-relax-scene-time
**Date**: 2026-05-18

## R-001: Representation of the creation-order indicator

**Decision**: Add `creation_order: integer (required, minimum 0)` to `SceneProperties`. Per-Storyboard scope; monotonically assigned at capture time as `max(creation_order over Scenes in same Storyboard) + 1` (first Scene = 0).

**Rationale**:
- Scene IDs are already ULIDs (Crockford base-32, time-encoded). ULIDs *would* provide an implicit creation-order tiebreaker for free — but FR-007 requires manual reorder within a tied group, which means the indicator MUST be mutable. ULIDs are immutable (Article III source-preservation and the existing schema comment "Immutable after create"). Therefore a separate, mutable integer field is required.
- An integer is the smallest typed unit that satisfies (a) totally-ordered, (b) mutable, (c) trivially serialisable, (d) Article XV strict-typing compliant. No need for a fractional or sparse scheme — reorder within a tied group rewrites all `creation_order` values in that group (small N, typically ≤ 5; FR-007 + Assumption "tied groups are small").
- Per-Storyboard scope (not per-plot, not global) — matches the existing `storyboard_id` foreign-key scope and avoids cross-Storyboard renumbering when a Scene is duplicated to another Storyboard.

**Alternatives considered**:
- *Use ULID as the implicit tiebreaker*: rejected — ULIDs are immutable, so reorder (FR-007) becomes impossible without re-issuing IDs, which breaks asset references (thumbnail asset keys are `scene-thumbnail-{ULID}` per #216).
- *Sparse numbering (10, 20, 30…)*: rejected — over-engineered for tied groups of ≤ 5 Scenes. Re-sequencing is O(group size); no need for sparse gaps.
- *Fractional `creation_order: float`*: rejected — invites NaN/precision footguns and Article XV warns against `float` where `int` suffices.
- *Two separate fields (`captured_at_seq: int` for assignment, never mutated, plus `display_order: int` for reorder)*: rejected — adds a second invariant for no behavioural gain. The mutable single field captures both roles.

## R-002: Sort key extension

**Decision**: `ordering.ts` exports `listScenesOrdered(plot, storyboardId)` which sorts by `(timestamp ASC, creation_order ASC)`. This is the **single source of truth** for Scene order; all consumers (VS Code panel, playback service, thumbnail strip) MUST call it.

**Rationale**:
- A single sort site is already the existing pattern (see `shared/components/src/storyboard/ordering.ts:15-32`). Today two consumers in `apps/vscode/` re-implement the sort inline (`storyboardPanelView.ts:465`, `storyboardPlayback.ts:798`). Those inline sorts predate `listScenesOrdered()` and are technical debt; this feature is the right moment to fold them in (FR-006).
- TypeScript's `Array.prototype.sort` is stable — relying on stability would *almost* work as a fallback for tied timestamps, but only across consumers that happen to receive Scenes in capture order. The Playwright workflow test would pass; a reader that loads Scenes from disk in a non-deterministic order would not. An explicit secondary sort key removes this dependence.

**Alternatives considered**:
- *Rely on `Array.prototype.sort` stability + capture-order array insertion*: rejected — does not survive serialisation round-trips when the on-disk Feature array order is rewritten by other tooling.
- *Sort at write time only*: rejected — violates Article III (source preservation); the on-disk order is whatever the writer produces, and readers compute the canonical order.

## R-003: Pre-#259 plots are rejected, not migrated

**Decision**: No migration helper, no backfill, no compatibility shim. The validator (`validate.ts`) gains a hard invariant **FC-I5**: every `SceneProperties` in a loaded plot MUST carry `creation_order`. Any Scene missing the field causes `MissingCreationOrderError` with the offending Storyboard ID and Scene ID in the error payload. The reader fails fast and explicitly; the user is told *what* is missing and *which* Storyboard contains the bad Scene.

**Rationale**:
- Article XIV grants full pre-4.0 freedom; no shipped user data exists that this change could regress. A migration shim would be carrying complexity for a hypothetical.
- The previous draft (backfill from ULID on read, persist on save) was deliberately discarded in favour of a hard fail. The user (planning conversation, 2026-05-18) confirmed: "we're still in dev, and do not need any backward support."
- A hard fail is strictly easier to reason about than a silent migration: the runtime never holds a `creation_order: number | undefined` shape, the typed surface (Article XV) is uniformly `creation_order: integer (required)`, and there is no "first save rewrites the file" surprise for the user.
- Cost to legacy fixtures already on disk in the dev-only sample catalog: those fixtures (if any reference pre-#259 storyboards) get re-emitted by the regeneration script (`scripts/enrich-legacy-catalog.py` per #184). No user action required outside dev.

**Alternatives considered**:
- *Backfill on read, persist on save* (the previous draft of this section): rejected — over-engineered for a pre-release project; commits the type system to optional handling for no user benefit.
- *Backfill silently and never persist*: rejected — every reader on every load pays the cost; the in-memory shape diverges from the on-disk shape, opening a category of "but it works on my machine" bugs.
- *Auto-bump schema_version on read*: rejected — same problem as silent backfill; readers should never mutate data the user has not asked them to.

## R-004: Validation invariants

**Decision**:
- **Drop** invariant FC-I3 ("No two Scenes with same `storyboard_id` share the same `timestamp`"). It is no longer an invariant.
- **Add** invariant FC-I4 ("No two Scenes with same `storyboard_id` share the same `creation_order`"). Violation is `DuplicateCreationOrderError`.
- **Add** invariant FC-I5 ("Every Scene MUST carry a `creation_order` value"). Violation is `MissingCreationOrderError`. Catches pre-#259 plots and any malformed input where the field has been stripped.
- **Retain** invariant SC-I1 *with revised wording*: "Scenes within a Storyboard are ordered by `(timestamp, creation_order)` ascending; `creation_order` is unique within a Storyboard."

**Rationale**:
- FC-I4 is the integrity check that makes tied-group reorder deterministic. Without it, two Scenes could share `(timestamp, creation_order)` and the sort outcome would depend on `Array.prototype.sort` stability — exactly the failure mode R-002 avoids.
- The new invariant is cheap to check (single linear pass per Storyboard) and is added to `validate.ts` alongside the existing per-Storyboard checks.

**Alternatives considered**:
- *No new invariant; treat duplicate `creation_order` as a non-error and fall back to ID order*: rejected — silently-different orderings on different machines is precisely what FR-005 forbids ("identical for every reader, on every machine, on every read").

## R-005: Reorder operation API

**Decision**: Add `reorderSceneInTiedGroup(plot, sceneId, newPositionInGroup)` to `crud.ts`. Semantics:
1. Locate the target Scene; identify its tied-timestamp group (all Scenes in the same Storyboard sharing the target's `timestamp`).
2. Validate `newPositionInGroup ∈ [0, group.length)`; otherwise throw `CreationOrderOutOfRangeError`.
3. Sort the tied group by current `(creation_order)` ascending → list of size N. Move the target to the new index → produces a new ordered list of size N.
4. Reassign `creation_order` across the group in lockstep: the new list's i-th member takes `creation_order = old_group_min_creation_order + i`. This preserves the global monotonic invariant (no overlap with adjacent tied groups or with non-tied Scenes around the group).
5. Return the updated plot.

**Rationale**:
- Operates only on the tied group, not the whole Storyboard — preserves FR-008 ("Deleting a Scene MUST NOT renumber or reshuffle the remaining Scenes").
- The position parameter is the user-visible index within the tied group (0-based), not a raw `creation_order` value — keeps FR-012 ("MUST NOT expose the raw creation-order indicator as a primary user-facing field") satisfied at the API surface.

**Alternatives considered**:
- *Pair-swap API (`swapScenes(a, b)`)*: rejected — caller has to know which neighbour to swap with for a multi-step move; awkward for moving to end of group.
- *Re-sequence the entire Storyboard*: rejected — wastes mutation budget on Scenes that did not move; risks renumbering across tied-group boundaries.

## R-006: Test strategy

**Decision**: Four test files cover the change:
- `crud.test.ts` (modified): invert each `DuplicateTimestampError` assertion into a "Scene is accepted, group has N+1 members in capture order" assertion. Covers create, update, duplicate, copy-to-other-storyboard, restore.
- `ordering.test.ts` (modified): existing "sorts by timestamp" tests pass unchanged; add cases for (a) two Scenes at same timestamp, distinct creation_order → ordered by creation_order; (b) interleaved tied + non-tied Scenes.
- `reorder.test.ts` (new): five cases — move B to end of group A,B,C; move C to front; delete B from A,B,C; edit B's viewport (position unchanged); out-of-range index throws.
- `validate.test.ts` (modified): replace the duplicate-timestamp test with two new tests — (a) duplicate `creation_order` throws `DuplicateCreationOrderError`; (b) loading the `storyboard-scene-missing-creation-order.json` fixture throws `MissingCreationOrderError` with the offending Storyboard + Scene IDs in the error payload.

Fixture changes are scripted in the `tasks.md` (Phase 2) work-breakdown.

**Rationale**:
- One-to-one mapping from spec FRs to test cases (Article VII — tests are the spec).
- Migration test pins FR-010 to a fixture-driven assertion, the strongest form of regression-test for "legacy behaviour unchanged".

## R-007: Schema version bump

**Decision**: Bump `StoryboardProperties.schema_version` from `1` to `2`. Writers always emit `2`. Readers accept `2` only — `schema_version < 2` is a load error surfaced as `UnsupportedSchemaVersionError` (existing pattern, used elsewhere in the schema cluster). FC-I5 (R-004) is the secondary check that catches well-versioned-but-malformed plots.

**Rationale**:
- Article II.3 requires a version bump for breaking changes. The bump pairs with the hard-fail policy (R-003): a pre-#259 plot fails on either the `schema_version` check or the FC-I5 check, whichever fires first; the user gets a clear error either way.
- Two layers of protection (version + invariant) is cheap and informative for any analyst who diffs two plot files or hand-edits a fixture.

**Alternatives considered**:
- *No bump (rely on XIV)*: rejected — the schema_version field already exists for exactly this purpose; using it is essentially free.
- *Version bump alone, no FC-I5*: rejected — hand-rolled fixtures or extension-authored plots might forget to bump schema_version while still omitting `creation_order`. Belt and braces.

## Open questions

None. All NEEDS CLARIFICATION markers from the spec are resolved by the design above. Three planning-time clarifications were settled with the user:
1. Reorder-UI scope — CRUD-only this feature; UI affordance deferred.
2. Legacy-migration strategy — originally "backfill from ULID on read"; **revised mid-plan to hard-fail with `MissingCreationOrderError`** at the user's instruction ("we're still in dev, and do not need any backward support").
3. Schema version handling — bump from 1 to 2; readers reject `< 2` with `UnsupportedSchemaVersionError`.
