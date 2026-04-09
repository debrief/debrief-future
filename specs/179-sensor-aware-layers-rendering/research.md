# Research & Decisions — 179 Sensor-Aware Layers Rendering

**Feature**: `179-sensor-aware-layers-rendering`
**Phase**: 0 — Outline & Research
**Status**: Complete (all NEEDS CLARIFICATION items resolved during `/speckit.clarify`)

## Summary

This feature has no open unknowns. All five clarification questions were resolved interactively during `/speckit.clarify` and recorded as FRs in `spec.md`. This document captures the decisions, the rationale for each, and the alternatives considered — per the speckit research template — so future contributors can audit the reasoning without re-walking the clarification conversation.

---

## Decision 1 — Group-row click behaviour

**FR**: FR-013

**Decision**: Group rows (`Positions`, `Sensors`, `Track Segments`) are **selectable as a unit**. Clicking the label adds the group's path ID (`${featureId}/positions`, `${featureId}/sensors`, `${featureId}/segments`) to `selectedIds` as a single entry — no fan-out to descendants. The chevron toggles expansion independently.

**Rationale**:
- Consistent with the existing path-based selection model. Any ID added to `selectedIds` is treated uniformly; the group-row path is just another path.
- Downstream consumers (map rendering #118, charts, etc.) get a compact "the whole collection" signal without the panel having to emit N sibling IDs on every click.
- The existing `hasChildSelected` prefix-matching lights up the parent track row for free because `${featureId}/sensors` begins with `${featureId}/`.
- No special-casing in `handleRowClick` is required — group rows go through the same selection path as every other row.

**Alternatives considered**:
- **Non-selectable headers** — clean but throws away a cheap UX affordance (select the whole collection).
- **Select-all-children** — fans out to N entries in `selectedIds`; bloats selection state, complicates downstream consumers, and duplicates what `hasChildSelected` already does.
- **Expand-on-label-click** — natural for file trees but conflicts with the existing "click = select, chevron = expand" model used for positions today.

---

## Decision 2 — Contact ordering in the UI

**FR**: FR-016

**Decision**: `flattenFeatures` renders contacts in the order they appear in `SensorData.contacts[]`. **No sort** at render time. Time-ordering is an importer/generator contract (upheld by #117 REP sensor import and any tool that mutates `contacts`).

**Rationale**:
- The design brief and the LinkML schema both describe `contacts` as "time-ordered". Sorting at render time would bypass the schema contract.
- SC-003 requires virtualisation to scale to ≥10,000 contacts. Sorting 10,000 contacts on every re-render (triggered by any selection change elsewhere in the panel) would cost `O(N log N)` per frame and measurably degrade scroll FPS.
- Pushing sort responsibility to the writer side (importer / tool) means the cost is paid once, not on every render.

**Alternatives considered**:
- **Sort by time in `flattenFeatures`** — robust to malformed input but pays the cost on every re-render. Would violate SC-003.
- **Sort once and memoize per `SensorData` instance** — adds state + cache invalidation logic to a pure function. Complexity not justified for a schema-guaranteed invariant.
- **Assert-and-warn** — worth doing in a dev-only invariant checker, but that belongs in the importer test suite, not the renderer. Deferred to a follow-up if out-of-order contacts ever surface in the wild.

---

## Decision 3 — Info icon plumbing

**FR**: FR-017

**Decision**: Contact rows are eligible for the existing `showInfoIcon` / `onChildInfoClick` hook. Sensor rows are **not** — sensor-metadata popover support is explicitly deferred. The popover UI itself lives in the host application; `@debrief/components` only plumbs the handler through.

**Rationale**:
- Contact rows carry the most useful optional fields (`range`, `frequency`, `label`, `comment`, `ambiguous_bearing`) — precisely the data an analyst wants at their fingertips when verifying a loaded sensor.
- Extending the existing `onChildInfoClick` contract is a 1-line change in `FeatureRow.tsx` (add `'contact'` to the existing type-check predicate).
- Sensor rows carry metadata (`base_frequency`, `offset`, `worm_in_hole`) that is less time-critical. Deferring them keeps this PR's scope tight and unblocks the "verify loaded data" goal (US1) without introducing a new component pattern.
- The design brief explicitly said the info popover hook "already supports this pattern" — this decision honours that intent without overreaching.

**Alternatives considered**:
- **Defer entirely** — safest scope cut but denies analysts access to optional fields in this PR.
- **Contact + sensor rows** — doubles the scope; sensor-row info popover introduces a new "row type has metadata popover" pattern that doesn't exist for positions today. Better as its own follow-up.
- **Ship a default popover in `@debrief/components`** — pulls UI library scope into a rendering package that has so far stayed lean. Rejected.

---

## Decision 4 — Group row label format

**FR**: FR-015

**Decision**: Group row labels include a count in parentheses: `Positions (1023)`, `Sensors (3)`, `Track Segments (5)`. Sublabel is `null`.

**Rationale**:
- One-glance summary without requiring the analyst to expand each group.
- Compact — fits in the existing row height without the need for a sublabel slot.
- Mirrors common file-tree conventions (e.g. GitHub's `/src (12)` folder counts).
- Leaves the sublabel slot free so group rows look visually distinct from sensor rows (which use `label = name`, `sublabel = "N contacts"`).

**Alternatives considered**:
- **Label only** (`Sensors`) — quietest but hides a useful data point.
- **Label + count as sublabel** (label=`Sensors`, sublabel=`3 sensors`) — mirrors the sensor-row label/sublabel pattern but duplicates the collection word ("Sensors / 3 sensors").
- **Rolled-up total** (label=`Sensors`, sublabel=`3 sensors · 59 contacts`) — starts creeping into analytics territory; sublabel gets long.

---

## Decision 5 — Bearing and course format

**FR**: FR-006, FR-007, FR-008, FR-018

**Decision**: Zero-pad **both** bearings (on contact rows) **and** courses (on position rows) to three digits. `getPositionSublabel` is updated to match the new bearing format; all existing position-row snapshots are refreshed. FR-008 (Case-A regression guard) is relaxed to accept this one deliberate format change.

**Rationale**:
- Zero-padded bearings are the standard nautical convention (e.g. `045°` vs `045°` — a 2-digit bearing like `45°` is conventionally "oh-four-five" said aloud).
- Consistency across the panel — a position row showing `045° 12.0kts` and a contact row showing `045°` share the same visual rhythm.
- The alternative (padding bearings but not courses) would produce a visibly inconsistent panel.
- The one-line change in `getPositionSublabel` is small and well-contained; the visual refresh affects every existing position row and is the only "scope creep" outside strict FeatureList additions.

**Alternatives considered**:
- **Match existing unpadded convention** (`45°`, `225°`) — zero scope creep but misses the nautical convention and produces misaligned labels.
- **Pad bearings only, leave courses unpadded** — fastest to ship but creates visual inconsistency between position and contact rows in the same tree.
- **Leave courses alone, accept slight mismatch** — same downside.

---

## Decision 6 — Sensor-name collisions (known limitation)

**FR**: covered under Edge Cases in spec.md

**Decision**: If two `SensorData` entries share the same `name`, the path-based IDs will collide. The panel renders them in array order; selection/hiding operates on the first match by path. This is documented as a known limitation; uniqueness is the responsibility of the importer (#117) and any tool that mutates `sensors[]`.

**Rationale**:
- The Layers panel is a read-only view — it can't enforce uniqueness that the data model doesn't.
- Enforcing uniqueness at render time (e.g. suffixing with array index) would break the FR-012 stability contract ("sensor row labels must remain stable under `SensorData[]` reordering").
- The importer side is a single choke point for enforcing this — doing it there is cleaner than scattering defensive logic through the render path.

**Alternatives considered**:
- **Suffix with array index** — solves the collision but sacrifices FR-012.
- **Warn in console at flatten time** — adds noise in the rendering hot path; better as a dev-only invariant checker in the importer.
- **Reject the track entirely** — hostile to users; a single bad sensor shouldn't lose the whole track.

---

## Decision 7 — Zero-contact sensor placeholder

**FR**: covered under Edge Cases in spec.md (Sensor with zero contacts)

**Decision**: A sensor with `contacts.length === 0` still renders its row with sublabel `"0 contacts"`. Expanding it shows a single "No contacts" placeholder row (non-selectable, non-expandable) — consistent with the existing "No child items" pattern in `flattenTrackChildren` and `flattenMultiPointChildren`.

**Rationale**:
- Explicit failure beats silent omission (Article I: "no silent failures"). An analyst must be able to see that a sensor is present but empty.
- Matches the existing placeholder pattern, so there's nothing new for users or contributors to learn.

**Alternatives considered**:
- **Hide zero-contact sensors entirely** — violates the "verify loaded data" goal (US1); an analyst would wonder where the sensor went.
- **Render without a placeholder** — empty expanded row is confusing; the placeholder confirms "yes, this is empty".

---

## Prior art within the repo

- **`flattenTrackChildren` + `flattenSegments`** (shared/components/src/FeatureList/flattenFeatures.ts:132,177) — the existing four-branch dispatcher (with/without segments, with/without positions) is the direct ancestor of the new four-case dispatcher in this feature. The code pattern is well-established.
- **`hasChildSelected`** (shared/components/src/FeatureList/flattenFeatures.ts:302) — the prefix-matching selection propagation mechanism this feature depends on. No changes needed; the new path scheme is designed to flow through it untouched.
- **`formatTime` helper** (shared/components/src/FeatureList/flattenFeatures.ts:48) — reused unchanged for contact row label formatting.
- **Feature 094 (show-points-in-layers)** — the previous iteration that added `position` as a child row kind. This feature follows the same pattern (extend `DisplayItem.type`, add a flattening helper, extend the Storybook story, extend the tests).

## Open questions for `/speckit.plan` re-review

None. All decisions are captured above and encoded as FRs in `spec.md`. Phase 1 design can proceed.
