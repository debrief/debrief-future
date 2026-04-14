# Feature Specification: Filter Bar Platform Chips

**Feature Branch**: `186-filter-chips`
**Created**: 2026-04-14
**Status**: Draft
**Input**: User description: "186 filter chips [2]" — Backlog item #186 `[E10] Filter bar platform chips`: update FilterBar to generate and display compound platform-based chips (nationality + domain, vessel type, etc.) wired to `array_filter` CQL2 expressions (requires #185).

## Overview

The existing Filter Bar (#127) supports independent chips — a `nationality=GB` chip and a `vessel-class=frigate` chip combine with AND, which matches any plot that contains *some* British platform **and** *some* frigate (possibly different platforms). After the E10 data model migration (#181), per-plot metadata is now stored as an array of platform records (`debrief:platforms`), and the CQL2 engine (#185) can evaluate compound predicates per-platform via `array_filter`.

This feature adds a new **platform chip** to the filter bar — a single chip that captures a compound, same-platform predicate such as "British submarine" or "German frigate", and serialises as an `array_filter` expression so every condition must be satisfied by *the same* platform record within a plot.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Build a compound "same platform" chip (Priority: P1)

An analyst wants to find plots that involve a **British submarine**. In the current filter bar, they would add a `nationality=GB` chip and a `domain=subsurface` chip; the bar would return any plot that has at least one British platform AND at least one subsurface platform, even if those are different platforms (a false positive for the analyst's intent). The new platform chip lets the analyst express "nationality=GB AND domain=subsurface on the *same* platform" as a single chip, and the filter results match that intent.

**Why this priority**: This is the headline capability of #186. Without it, E10's per-platform data model delivers no user-visible value in the filter bar. The analyst's most common compound queries ("British frigates", "German surface warships", "US submarines") all require same-platform matching.

**Independent Test**: With a catalog containing (a) a plot with a British frigate, (b) a plot with a German frigate and a British surface ship, and (c) a plot with only a British submarine — building a "nationality=GB AND vessel_role=frigate" platform chip must return only (a). Verifiable from the Filter Bar Storybook story with the existing platform fixtures.

**Acceptance Scenarios**:

1. **Given** the filter bar is empty and the catalog contains per-platform metadata, **When** the analyst opens the add-filter menu, **Then** a "Platform" entry appears alongside the existing filter types.
2. **Given** the analyst selects "Platform", **When** the platform chip editor opens, **Then** they can choose values for at least `nationality`, `domain`, `vessel_role`, and `vessel_type` and must pick at least one attribute.
3. **Given** the analyst picks `nationality=GB` and `domain=subsurface` and confirms, **When** the chip is added, **Then** the filter results update to show only plots containing a platform whose nationality is GB **and** whose domain is subsurface (same platform record).
4. **Given** a plot contains one British surface ship and one German submarine (no single platform matches both conditions), **When** the platform chip `GB + subsurface` is active, **Then** that plot does NOT appear in the filtered list.
5. **Given** a platform chip is active, **When** the filter expression is serialised to CQL2 JSON, **Then** the output contains a single `array_filter` node referencing `debrief:platforms` with a compound AND predicate of the selected attributes.

---

### User Story 2 - Edit, negate, and remove a platform chip (Priority: P1)

The analyst refines filters iteratively. A platform chip behaves like every other chip: it can be clicked to edit, toggled to negate ("NOT a British submarine"), and removed. Edits preserve the compound shape — changing `nationality=GB` to `nationality=DE` keeps the rest of the predicate intact.

**Why this priority**: Equal priority with P1 because the chip is unusable in practice without the standard lifecycle operations. Parity with existing chip behaviour is a baseline expectation of the filter bar.

**Independent Test**: Create a platform chip, change one of its attribute values in the editor, and verify both the chip label and the filtered results update. Toggle negation and verify the item set inverts. Remove the chip and verify results return to baseline.

**Acceptance Scenarios**:

1. **Given** a platform chip with `nationality=GB, vessel_role=frigate`, **When** the analyst clicks the chip body and changes `nationality` to `US`, **Then** the chip updates and results recompute for American frigates.
2. **Given** a platform chip is active, **When** the analyst toggles negation, **Then** the chip visually indicates negation and results flip to plots that do NOT contain a platform matching the predicate.
3. **Given** a platform chip exists, **When** the analyst opens its editor and clears every attribute, **Then** the editor prevents confirmation until at least one attribute is set (an empty compound predicate is not valid).
4. **Given** a platform chip exists, **When** the analyst clicks the chip's remove affordance, **Then** the chip disappears and filtered results update accordingly.

---

### User Story 3 - Combine platform chips with existing chips and OR containers (Priority: P2)

Platform chips live alongside the existing chip types. An analyst can build "British submarines tagged 'exercise'" by adding a platform chip and a tag chip (top-level AND). Two platform chips at top level also AND — "British submarines AND German frigates" returns plots containing at least one of each. Platform chips can also go inside an OR container for "British submarines OR German frigates" (plots containing either).

**Why this priority**: Not required for the single-chip use case but matters for realistic analyst workflows combining platform filters with tag, exercise, or temporal filters. Drops out of reusing the existing filter-bar plumbing.

**Independent Test**: Build a filter with one platform chip and one tag chip; verify AND behaviour. Move both chips into an OR container; verify OR behaviour. Both scenarios should be verifiable in the existing Storybook OR-container story by swapping in a platform chip.

**Acceptance Scenarios**:

1. **Given** a platform chip `GB + subsurface` and a tag chip `exercise` at top level, **When** filtering runs, **Then** only plots matching both conditions appear.
2. **Given** two platform chips `GB + subsurface` and `DE + frigate` at top level, **When** filtering runs, **Then** only plots containing **both** a British submarine and a German frigate appear.
3. **Given** two platform chips inside the same OR container, **When** filtering runs, **Then** a plot with only a British submarine appears, and a plot with only a German frigate also appears.
4. **Given** a platform chip, **When** the analyst drags it into an OR container, **Then** the chip is accepted by the container (parity with other chip types).

---

### User Story 4 - Re-open a saved filter that contains a platform chip (Priority: P3)

Analysts save filters (#128). A saved configuration containing a platform chip must round-trip: save, reload, restore — and the restored filter bar must show the same chip with the same attributes and produce the same filtered result set.

**Why this priority**: Important for continuity across sessions but depends on the primary capability being in place. Falls out of serialising through the existing saved-filters store.

**Independent Test**: Create a filter with a platform chip, save it, clear the filter bar, restore the saved filter, and verify the chip and results are identical.

**Acceptance Scenarios**:

1. **Given** a filter bar with one platform chip and one nationality chip, **When** the analyst saves the configuration, **Then** the stored record captures both chips' structure including the compound predicate.
2. **Given** a saved configuration containing a platform chip, **When** the analyst restores it, **Then** the filter bar displays the chip with the same attributes, the filtered item set matches the original, and the serialised CQL2 JSON matches what was originally emitted.

---

### Edge Cases

- What happens when a plot has no `debrief:platforms` (legacy or unenriched)? The platform chip excludes that plot — the compound predicate has no platform record to satisfy it. (Consistent with existing array-filter semantics in #185.)
- What happens when a platform record is missing one of the attributes selected in the chip (e.g., chip requires `vessel_role` but a platform has no `vessel_role`)? That platform is not a match; the plot still matches if another platform in the array satisfies the full compound predicate.
- What happens when the analyst selects `vessel_class` at an interior node of the taxonomy (e.g., `frigate`)? The chip matches any descendant class (`type23`, `type26`, `fremm`, …) — taxonomy expansion is already supported inside `array_filter` sub-predicates by #185.
- What happens when the analyst combines `vessel_role=frigate` and `domain=subsurface` (a contradiction: frigates are surface)? The editor does not prevent contradictory combinations; the filter simply returns zero results, and the standard "no results" UI informs the analyst.
- What happens when the catalog has zero platform records anywhere? The platform filter type still appears in the add menu, but the editor's attribute pickers offer an empty set; the editor blocks confirmation until at least one attribute has a value.
- What happens when a platform chip is negated and a plot has an empty `platforms` array? The plot DOES match the negated chip (it does not contain any platform matching the predicate). This aligns with the `array_filter` negation semantics finalised in #185.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The filter bar MUST offer a new "Platform" filter type in the add-filter menu, positioned alongside existing filter types.
- **FR-002**: When the analyst selects "Platform", the system MUST present an editor that lets them pick a value for any subset of the platform attributes `nationality`, `domain`, `vessel_role`, `vessel_type`, and `vessel_class`.
- **FR-003**: The platform chip editor MUST populate its attribute pickers from values present in the current catalog (distinct values observed across `debrief:platforms`), so the analyst only sees useful options; for `vessel_class` / `vessel_role` / `vessel_type`, the existing vessel-class taxonomy MUST be used as the source of hierarchical choices.
- **FR-004**: The platform chip editor MUST require at least one attribute to have a value before the chip can be confirmed (empty compound predicates are rejected).
- **FR-005**: When confirmed, the system MUST add a single chip to the filter bar that captures the compound predicate AND-ing the selected attributes, and MUST display a human-readable label summarising all selected attributes (e.g., "Platform: GB + frigate").
- **FR-006**: The filter engine MUST evaluate a platform chip as `array_filter(debrief:platforms, p -> AND of selected attribute comparisons)`, so only plots containing at least one platform record satisfying *all* selected attributes match.
- **FR-007**: The CQL2 JSON serialiser MUST emit exactly one `array_filter` node per platform chip, referencing the `debrief:platforms` property and containing the compound predicate as nested CQL2 operators.
- **FR-008**: The CQL2 JSON deserialiser MUST recognise an `array_filter` node over `debrief:platforms` and reconstruct a platform chip in the filter bar with the same attributes, so round-trip (serialise → deserialise → restore UI) is lossless.
- **FR-009**: A platform chip MUST support the same lifecycle operations as other chips: click-to-edit, toggle-negate, drag-to-OR-container, drag-out-of-OR-container, and remove.
- **FR-010**: Editing a platform chip MUST re-open the same editor with the current attributes pre-filled; confirming the edit MUST replace the chip's predicate without changing its position in the filter bar.
- **FR-011**: Negating a platform chip MUST wrap the underlying `array_filter` expression in a logical NOT during both evaluation and serialisation, matching the semantics defined by #185.
- **FR-012**: Multiple platform chips at the same level MUST combine using the level's existing logic (top-level AND, OR-container OR), with no special-casing for platform chips.
- **FR-013**: The platform chip MUST be visually distinguishable from independent single-attribute chips (e.g., through a distinct chip colour, icon, or type label), so the analyst can tell at a glance that its conditions are same-platform-bound.
- **FR-014**: A saved filter configuration (#128) containing a platform chip MUST persist and restore the chip's attributes and negation state losslessly.
- **FR-015**: The filter bar MUST continue to work unchanged when no platform chip is in use (the new capability MUST NOT alter behaviour of existing chip types or filter expressions).
- **FR-016**: When the catalog contains plots with empty or missing `debrief:platforms`, the filter bar MUST still function: those plots are excluded by any positive platform chip and included by any negated platform chip.

### Key Entities

- **Platform Chip**: A single lozenge in the filter bar that represents a compound, same-platform predicate. It has: an ID, an optional negation flag, a human-readable label, and a set of attribute-value pairs drawn from `{nationality, domain, vessel_role, vessel_type, vessel_class}`. It serialises to exactly one `array_filter` CQL2 expression.
- **Platform Attribute**: One of the taxonomy-aware fields on a `debrief:platforms` record (`nationality`, `domain`, `vessel_role`, `vessel_type`, `vessel_class`). Values for each attribute are drawn from the distinct values present in the current catalog (for flat attributes) or from the vessel-class taxonomy tree (for hierarchical attributes).
- **Compound Predicate (UI form)**: The in-memory AND-composition of attribute-value pairs held by a platform chip. Maps directly to the `CompoundPredicate` structure consumed by the #185 filter engine.

## User Interface Flow

### Decision Analysis

- **Primary Goal**: Let the analyst express a same-platform compound filter (e.g., "British submarines") as a single, editable chip in the filter bar.
- **Key Decisions**:
  1. Which platform attributes to constrain (any subset of nationality, domain, vessel_role, vessel_type, vessel_class).
  2. What value to assign to each chosen attribute (from catalog-derived options or the vessel-class taxonomy).
  3. Whether to negate the chip ("NOT a British submarine").
  4. Whether to combine it with other chips at top-level (AND) or inside an OR container (OR).
- **Decision Inputs**:
  - The set of distinct attribute values present in the catalog (so the analyst sees only useful options).
  - The vessel-class taxonomy tree (so the analyst can pick at any level of the hierarchy and get descendant expansion).
  - The live filtered item count (so the analyst sees the effect of each choice immediately).
  - Visual distinction from flat independent chips so the same-platform-bound semantics are obvious.

### Screen Progression

| Step | Screen/State                                        | User Action                                           | Result                                                                                                              |
|------|-----------------------------------------------------|-------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------|
| 1    | Filter bar (existing)                               | Click the (+) add-filter button                       | Filter-type menu opens, now including a "Platform" entry                                                            |
| 2    | Filter-type menu                                    | Click "Platform"                                      | Platform chip editor opens, showing one picker per supported attribute with values drawn from the catalog/taxonomy  |
| 3    | Platform chip editor (empty)                        | Pick `nationality=GB` and `domain=subsurface`         | Editor shows both values as selected; confirm button becomes enabled                                                |
| 4    | Platform chip editor (values chosen)                | Click confirm                                         | A new platform chip appears in the filter bar labelled with both attributes; filtered results update immediately    |
| 5    | Filter bar with platform chip                       | Click the chip body                                   | Editor re-opens with current attributes pre-filled; analyst can add, change, or clear attributes                    |
| 6    | Filter bar with platform chip                       | Click the chip's negate affordance                    | Chip visually indicates negation; results flip to plots that do NOT contain any matching platform                   |
| 7    | Filter bar with platform chip                       | Click the chip's remove affordance                    | Chip disappears; results return to what they were without it                                                        |

### UI States

- **Empty State**: When the catalog has zero platform records anywhere, the Platform editor shows empty pickers with hint text explaining that no platform metadata is available; confirmation remains disabled. (Unlikely in practice since the catalog regenerated in #184 enriches platforms.)
- **Loading State**: None required — the filter bar is client-side; distinct-value derivation is synchronous over the items already in memory. The editor opens instantly.
- **Error State**: If CQL2 serialisation of the compound predicate fails, the existing filter-bar error banner displays (parity with other chips). An unknown `array_filter` node on deserialisation is surfaced as a restore error, not a silent drop.
- **Success State**: A confirmed platform chip appears in the bar with its human-readable label; the filtered item count and list both update to reflect the new predicate; the chip's CQL2 serialisation is available via the existing onExpressionChange callback.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For a representative catalog containing at least one plot with a British submarine, at least one with a British surface ship, and at least one with a German submarine, a single platform chip "nationality=GB AND domain=subsurface" returns **only** the British-submarine plot (100% precision on the joined-query class of queries that motivated E10).
- **SC-002**: Round-tripping a platform chip through save → restore preserves both its attributes and its filtered result set exactly (0 differences in the filtered item IDs and 0 differences in the serialised CQL2 JSON) in 100% of cases.
- **SC-003**: A platform chip can be added, edited, negated, moved into and out of an OR container, and removed using the same interaction patterns as existing chips, so an analyst familiar with the filter bar can use platform chips without consulting documentation (verified via usability walk-through with an analyst unfamiliar with this feature).
- **SC-004**: On a catalog of 100+ plots, filtering with an active platform chip produces visibly instant results (perceived as immediate by the analyst); no progress indicator is required.
- **SC-005**: Adding the platform chip feature does not change the filtered results for any pre-existing filter configuration (regression-tested against stored filter fixtures from #127 and #128 — identical result sets produced).
- **SC-006**: All standard analyst queries motivating E10 — "UK submarines", "German frigates", "Type 23 frigates", "US surface warships" — are expressible as a single platform chip and return correct results against the regenerated sample catalog (#184).

## Assumptions

- `debrief:platforms` per-item records are in place across the sample catalog (delivered by #181 + #184); the filter bar operates directly on that structure.
- The CQL2 filter engine's `array_filter` evaluator and serialiser (#185) are complete and expose the necessary `CompoundPredicate` API for the UI to build chips; this spec does not redesign that engine.
- The vessel-class taxonomy tree used for hierarchical pickers is the same `VesselTaxonomyNode[]` already passed to the filter bar via the `taxonomy` prop (no new data source).
- The filter bar's existing chip lifecycle infrastructure (add, edit, remove, negate, drag-to-OR, saved filters) is reused as-is; no refactor of the reducer or drag-drop logic is required.
- The existing `nationality`, `vessel-class`, and `track-name` flat chip types (which, after #181, also read `debrief:platforms`) remain in the filter bar unchanged — they represent "any platform" queries and coexist with the new compound chip. Deprecating them is out of scope.
- Human-readable chip labels (e.g., "GB + frigate") can be assembled from attribute values plus the taxonomy label map already available to the filter bar; no new labelling service is required.

## Dependencies

- **#185** ([E10] CQL2 `array_filter` evaluator) — completed; provides evaluation, serialisation, and deserialisation of `array_filter` with compound predicates. This feature builds on that engine and does not extend it.
- **#181** ([E10] LinkML schema update) — completed; provides the `debrief:platforms` shape that this chip queries.
- **#127** ([E08] Filter Bar with lozenge UI) — completed; provides the chip rendering, add/edit/remove/drag/negate infrastructure that this feature reuses.
- **#128** ([E08] Saved filter configurations) — completed; determines the persistence path for platform chips in saved filters (Story 4).

## Out of Scope

- NL → CQL2 generation (#188): typing "British submarines" as free text and having the system create the chip automatically. Handled separately.
- Stakeholder demo UI (#190): the no-build-step HTML/React playground that showcases NL + chips + card grid.
- New chip types beyond the platform compound chip (e.g., cross-platform predicates like "two platforms from different nationalities in the same plot").
- Changes to the filter engine itself — all evaluation is delegated to the existing #185 implementation.
- Changes to the `debrief:platforms` data model or the save-time regeneration pipeline (#183).
- Deprecating or removing the existing flat `nationality`, `vessel-class`, or `track-name` chip types.
- Export / import of filter configurations beyond what #128 already supports.
