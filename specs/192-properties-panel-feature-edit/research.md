# Phase 0 — Research: Properties Panel Feature & Sub-feature Editing

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-05-12

This document resolves the open modelling and integration questions
surfaced during planning. No `NEEDS CLARIFICATION` markers remain after
this round.

---

## R-001 — Where does point-level metadata live in the schema?

**Decision**: Add a new LinkML class `PositionMetadata` (slots: `label`,
`tags`, `note`) and a new multivalued slot
`position_metadata: PositionMetadata` on `TrackProperties`, where each
entry carries an `index: integer` slot that pins it to a position in
`geometry.coordinates`. Storage stays sparse — only positions with at
least one set value get an entry. The slot is optional and defaults to
omission.

**Rationale**:

1. **Round-trip safety for kinematics.** `TimestampedPosition`
   (`shared/schemas/src/linkml/common.yaml:351–373`) is consumed by the
   import pipeline (REP parsing, etc.), the calc tools, and the chart
   renderer. Adding optional metadata to that class would require
   downstream code to opt-out of those fields on every kinematic
   round-trip. A sibling slot keeps kinematic shapes untouched
   (Constitution III.2 — source preservation).
2. **Sparse by construction** (satisfies FR-010). A dense parallel array
   matching `coordinates.length` would force every plot file to carry
   ~5 000 nulls on a long track. An indexed entry list with the position
   index as a slot is the smallest representation that LinkML can
   express cleanly.
3. **Schema-driven form works unchanged.** `PropertiesForm` dispatches on
   `FieldSpec.kind`; treating `PositionMetadata` as a regular nested
   class means the sub-feature editor renders via the same path as
   `TrackProperties` — no new widget code.

**Alternatives considered**:

- **Inline on `TimestampedPosition`.** Rejected: pollutes the kinematic
  type and forces import/export/calc code to handle optional metadata
  everywhere. Also makes "metadata changed but kinematics unchanged"
  hard to express in provenance.
- **Dense parallel array (one entry per position).** Rejected: violates
  FR-010 (sparse storage) and bloats large plot files; the typical edit
  rate is "one annotation per 50–200 points".
- **Separate STAC asset for annotations.** Rejected: pulls editing
  outside the feature, breaks the round-trip invariant SC-005, and
  requires a new write path. Constitution II demands the schema is the
  single source of truth; pushing this out of the feature shape moves
  data outside the schema.
- **Map keyed by stringified index (`"42": {...}`).** Rejected: LinkML
  doesn't model dict-with-integer-keys cleanly, and the
  schema-comparison test (CONSTITUTION.md §"Schema Test Strategy") would
  need a custom comparator.

---

## R-002 — Exact shape of the sub-feature selection path

**Decision**: The sub-feature editor activates when `selection.primary`
matches the existing `positions` level encoded by
`services/session-state/src/utils/selectionPath.ts:44–49` — i.e. paths
of the form `<featureId>/positions/<index>`. The spec's shorthand
`track-id/index` is updated to use this concrete format in the contracts
and acceptance tests.

**Rationale**: The selection path contract was set by #053 and is
already produced by the map click handlers and consumed by FeatureList.
Anything we add MUST consume the existing encoding (FR-017 — no new
selection store). RFC 6901-escaping is applied by the existing
`selectionPath` utility; the sub-feature mode resolver delegates path
parsing to that utility rather than parsing by hand.

**Alternatives considered**:

- **Introduce a new `point-id` opaque token.** Rejected: would require
  the map layer and FeatureList to emit a new selection shape, breaking
  the "no new selection store" constraint.
- **Use a structured `selection.primary` object.** Rejected: changes the
  current `string | null` typing on `FeatureSelection`, a wider blast
  radius than this feature warrants.

---

## R-003 — How to detect read-only plots (edge case in spec)

**Decision**: Treat read-only detection as **out of scope for v1** and
remove the read-only edge case from the v1 acceptance surface. The spec
explicitly notes the capability does not yet exist in session-state, and
the architectural map confirms no `isReadOnly` flag is present. The
form's disabled-state code is wired (so a future flag can flip it on
trivially) but no detection logic is added.

**Rationale**: Adding a read-only flag is a session-state shape change
that ripples through load/save, MapView affordances (drag-handles,
geoman tooling), and STAC catalog lock semantics. None of that is
needed for the feature- or point-edit workflow this item is approved to
deliver. Acknowledging it explicitly here keeps the v1 surface
unambiguous and avoids a hidden dependency on infrastructure that does
not exist.

**Action**: A follow-up issue will be filed during `/speckit.tasks` to
introduce the flag in concert with whatever catalog lock model is chosen
(probably alongside #135's auto-derivation work). The "read-only" UI
state in `spec.md` is retained as design intent — it documents how the
form will behave **when** the flag exists — but tasks gated on the flag
are marked deferred.

**Alternatives considered**:

- **Infer read-only from STAC item presence/absence.** Rejected: there
  is no consistent signal today; would invent a flag in disguise.
- **Always allow edits and require save to fail at the writer.** 
  Rejected: violates Constitution I.3 (no silent failures) and
  Constitution III.1 (provenance recorded even on a failed write).

---

## R-004 — Multi-select read-only summary: shared-value computation

**Decision**: Compute the multi-select summary as a pure derivation in
`MultiSelectSummaryMode`:

1. For each selected feature, project its `properties` through the
   schema's editable-field set.
2. For each field, compute the set of distinct values across the
   selection.
3. If the set has exactly one value, render that value (read-only).
4. Otherwise render the locale-aware token `(differs)`.

Performance budget: O(features × fields) per render with the result
memoised against `(selection.featureIds, plot.features-by-id)`. With
SC-005's 100-edit envelope and the spec's ≤ 200 features cap, this is
well under the 16 ms swap budget.

**Rationale**: Keeps the summary mode a stateless presentation
component, eliminating any new selectors or store changes. Memoisation
on the selection-tuple key handles the only realistic re-render trigger
(selection change). No bulk-edit affordances are introduced — this is
strictly read-only summary (FR-011, Out of Scope).

**Alternatives considered**:

- **Hide non-shared fields entirely.** Rejected: analysts need to see
  that there are diverging values, not infer it from absence.
- **Inline mini-bar-chart-of-values.** Rejected: not in scope; bulk edit
  is deferred.

---

## R-005 — Stale-selection handling (Edge Cases §1, §2)

**Decision**: The mode resolver (`selectionMode.ts`) accepts the current
features map and the current selection and returns either a concrete
mode or a `STALE` sentinel. On `STALE` the panel falls back to
plot-editor mode and dispatches `clearSelection()` on the existing slice
(`services/session-state/src/store/slices/features.ts:51–86`).

**Rationale**: This keeps the panel pure (read-only against the store
for mode selection) and centralises the "selection no longer valid"
handling in one resolver, with one test. No new store actions are
needed — `clearSelection()` already exists.

**Alternatives considered**:

- **Auto-clear stale selections at the store level.** Rejected: would
  couple the store to feature-shape concerns it currently does not own,
  and would surprise other panels that may want to handle staleness
  differently (e.g., the Layers panel may show a "feature deleted"
  hint).

---

## R-006 — Provenance entry shape

**Decision**: Reuse the #447 wiring at
`shared/components/src/PropertiesPanel/provenanceTypes.ts:28` — every
save with feature- and/or sub-feature edits writes one
`LogEntry` per affected feature with:

- `source = 'user'`
- `tool = 'debrief.propertiesPanel'`
- `method = 'properties-panel@<package version>'`
- `inputs[]` lists edited field paths (using LinkML slot names) — for
  point-level edits, paths are prefixed with `position_metadata[<index>]/`
- `output` is the updated feature id

**Rationale**: This is the shape #447 already records. Reusing it
preserves audit-trail uniformity (Constitution III.3) and means
existing NarrativeLog views render the new entries with no UI changes.

**Alternatives considered**:

- **One combined provenance entry per save (covering all edited
  features).** Rejected: makes per-feature replay harder and diverges
  from the per-feature pattern already in use.

---

## R-007 — Schema generation pipeline

**Decision**: Use the existing `shared/schemas/Makefile` targets —
`make generate-pydantic`, `make generate-jsonschema`,
`make generate-typescript` — invoked once after the `position_metadata`
slot lands. Adherence tests under `shared/schemas/tests/` run in the
existing pytest gate (Constitution II.2, VI.1).

**Rationale**: No new tooling; the schema change rides the existing
generator + adherence pipeline.

**Alternatives considered**: None — the build path is fixed by the
constitution and the existing toolchain.

---

## Open items rolled forward to `/speckit.tasks`

- Filing the follow-up "read-only plots" issue (R-003 action).
- Confirming whether `position_metadata[].index` should be `0`-based
  (matches `coordinates[]` indexing — recommended) or `1`-based (matches
  some legacy plot conventions). Recommended default in `data-model.md`:
  `0`-based.
