# Feature Specification: Relax Scene Timestamp Uniqueness

**Feature Branch**: `259-relax-scene-time`
**Created**: 2026-05-18
**Status**: Draft
**Input**: User description: "Can we relax one constraint? We have a scene constraint where the time for each one must be after the previous one. But, sometimes it's useful to keep the same time while we change the viewport. So, we should allow successive frames to share the time of the previous one. When this happens, the order should be the order in which they were created"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Capture multiple viewports at the same instant (Priority: P1)

An analyst is building a Storyboard to narrate a tactical situation. At a single moment in the engagement they want to show that same instant from several different vantage points — a wide overview, then a zoom on the contact of interest, then a zoom on ownship. Today the platform refuses the second and third Scenes because their timestamps duplicate the first. The analyst wants to capture all three Scenes at the same timestamp and have them play back in the order they were created.

**Why this priority**: This is the entire point of the change. Without it, analysts cannot tell a multi-viewport story at a single instant — they have to fudge timestamps (e.g. +1ms increments) which corrupts the time semantics of the Storyboard.

**Independent Test**: In an existing plot, capture three Scenes in quick succession without advancing the time controller, varying only the map viewport between captures. The Storyboard accepts all three, lists them in creation order, and plays them back in that order.

**Acceptance Scenarios**:

1. **Given** a Storyboard with one Scene at time `T`, **When** the user captures a second Scene at time `T` with a different viewport, **Then** the second Scene is accepted and appears immediately after the first in the Storyboard's ordered list.
2. **Given** a Storyboard with three Scenes captured in order A, B, C — all at time `T` — **When** the user plays the Storyboard, **Then** the Scenes are shown in order A → B → C.
3. **Given** a Storyboard with Scenes captured at times `T`, `T`, `T+5s`, `T+5s`, `T+10s` (in that capture order), **When** the user plays the Storyboard, **Then** the Scenes are shown in that same creation order, not reordered by viewport or any other field.

---

### User Story 2 - Mixed timestamps remain time-ordered (Priority: P1)

An analyst captures Scenes across a longer engagement, sometimes pausing time to capture multiple viewports and sometimes advancing time between captures. The ordering must still feel intuitive: time advances monotonically across the Storyboard, and within a tied-timestamp group the creation order is preserved.

**Why this priority**: A regression here would silently scramble existing Storyboards. The change must preserve the strong time-ordering guarantee whenever timestamps differ.

**Independent Test**: Capture Scenes in this order: A@T0, B@T0, C@T1, D@T1, E@T2. Confirm the listed and playback order is exactly A, B, C, D, E.

**Acceptance Scenarios**:

1. **Given** Scenes with strictly increasing timestamps, **When** the Storyboard is listed or played, **Then** they appear in ascending timestamp order (unchanged from today).
2. **Given** a tied-timestamp group within an otherwise time-ordered Storyboard, **When** the Storyboard is listed or played, **Then** the tied group is internally ordered by creation order and the group as a whole sits between the prior smaller timestamp and the next larger timestamp.
3. **Given** an existing Storyboard from before this change (all timestamps unique), **When** it is opened and played, **Then** its order is identical to before the change.

---

### User Story 3 - Reordering, deletion, and editing within a tied group (Priority: P2)

When several Scenes share a timestamp, the analyst can still reorder them, delete one, or edit their viewport, without the platform reshuffling the rest of the tied group or scrambling its position relative to the surrounding time-ordered Scenes.

**Why this priority**: Editing operations on tied-timestamp Scenes are inevitable once the constraint is relaxed. The behaviour must be predictable, but the core capture-and-play loop (Stories 1 and 2) is what unlocks the value.

**Independent Test**: Create a tied-timestamp group A, B, C. Move B to the end; confirm order is A, C, B. Delete B; confirm order is A, C. Edit B's viewport; confirm B's position is unchanged.

**Acceptance Scenarios**:

1. **Given** a tied-timestamp group A, B, C (in that order), **When** the user moves B to the end of the group, **Then** the order becomes A, C, B and the surrounding Storyboard order is unchanged.
2. **Given** a tied-timestamp group A, B, C, **When** the user deletes B, **Then** the remaining order is A, C and the surrounding Storyboard order is unchanged.
3. **Given** a tied-timestamp group A, B, C, **When** the user edits the viewport of B, **Then** B keeps its position in the group (no implicit reordering by viewport, creation time, or any other field).

---

### Edge Cases

- **Two Scenes captured at the exact same wall-clock instant**: creation order is determined unambiguously by the order the platform receives the capture requests. Because capture is sequential, true ties at the creation-order layer should not occur; if they did, the platform MUST still produce a single deterministic order on every read.
- **Bulk import of legacy Scenes that happen to share timestamps**: the importer MUST preserve the order the Scenes appear in the source and treat that as their creation order.
- **Capturing a Scene at a timestamp earlier than an existing Scene**: out of scope — this change is about *equal* timestamps only. Existing behaviour for out-of-order timestamps is unchanged.
- **A Storyboard containing only tied-timestamp Scenes**: fully supported; they play back in creation order.
- **Round-tripping a Storyboard through export and import**: the creation-order tiebreaker MUST survive serialisation. A reader on a second machine MUST produce the same order as the writer.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A Storyboard MUST accept a new Scene whose timestamp equals the timestamp of one or more existing Scenes in the same Storyboard. The capture MUST NOT be rejected on grounds of timestamp duplication.
- **FR-002**: A Storyboard MUST continue to reject (or otherwise preserve today's behaviour for) a new Scene whose timestamp is *earlier* than the latest existing Scene's timestamp. This change relaxes equality only, not the broader time-ordering semantics.
- **FR-003**: Scenes within a Storyboard MUST be ordered primarily by timestamp ascending, and secondarily — for Scenes sharing a timestamp — by creation order ascending.
- **FR-004**: Each Scene MUST carry a stable, monotonically-increasing creation-order indicator assigned at the moment of capture. The indicator MUST be unique within its Storyboard and MUST NOT change once assigned.
- **FR-005**: The creation-order indicator MUST be persisted alongside the Scene so that the tied-group ordering is identical for every reader of the Storyboard, on every machine, on every read.
- **FR-006**: Listing, playback, thumbnail-strip rendering, and any other Scene-ordered view MUST apply the (timestamp, creation-order) ordering uniformly. No view may use a different tiebreaker (e.g. identifier lexicographic order, viewport, or in-memory insertion order).
- **FR-007**: Manual reordering of Scenes within a tied-timestamp group MUST be supported and MUST be expressed by adjusting the creation-order indicator of the affected Scenes, so that the new order is durable across sessions and machines.
- **FR-008**: Deleting a Scene from a tied-timestamp group MUST NOT renumber or reshuffle the remaining Scenes. The surviving Scenes retain their relative order.
- **FR-009**: Editing any field of a Scene *other than* its position MUST NOT change its position in the Storyboard. In particular, editing the viewport, title, description, or visible-feature set MUST leave the (timestamp, creation-order) ordering untouched.
- **FR-010**: Legacy Storyboards created before this change MUST continue to load and play in exactly the same order as before. The migration path MUST assign creation-order indicators to existing Scenes in a way that reproduces their pre-change order.
- **FR-011**: When the user captures a new Scene at the same timestamp as one or more existing Scenes, the new Scene MUST appear *after* all existing Scenes sharing that timestamp. Inserting into the middle of a tied group is only possible via the explicit reorder operation (FR-007).
- **FR-012**: The platform MUST NOT expose the raw creation-order indicator as a primary user-facing field. Users see Scenes by title, timestamp, and position; the indicator is a behind-the-scenes ordering mechanism.

### Key Entities

- **Scene**: An entry in a Storyboard. Already has a timestamp and a stable identifier. This change adds a creation-order indicator (a per-Storyboard sequence value) and removes the within-Storyboard timestamp-uniqueness constraint.
- **Storyboard**: An ordered collection of Scenes attached to a plot. The ordering rule changes from "by timestamp ascending (unique)" to "by timestamp ascending, then by creation order ascending".

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An analyst can capture three Scenes at the same timestamp with three different viewports in under 30 seconds, with zero rejections from the platform.
- **SC-002**: 100% of legacy Storyboards (created before this change) load and play in the same order as their pre-change behaviour.
- **SC-003**: For any Storyboard, two readers on different machines produce the same ordered list of Scenes 100% of the time, regardless of how many Scenes share a timestamp.
- **SC-004**: Zero support reports of "I can't capture two Scenes at the same time" within 30 days of release (this is currently a known workaround-friction point logged by analysts).
- **SC-005**: Reordering a Scene within a tied-timestamp group completes in a single user action and the new order persists across export, re-import, and a second reader opening the same Storyboard.

## Assumptions

- The current platform behaviour for a Scene captured at a timestamp *earlier* than the latest existing Scene is unchanged by this work. The schema's existing wording ("MUST be unique within a Storyboard") is the only constraint being relaxed, and only with respect to equality.
- "Creation order" is determined by the order in which the platform commits the captures, not by any clock value the client reports. The platform is the source of truth for creation order.
- Tied-timestamp groups are expected to be small (typically 2–5 Scenes); no performance concerns arise from group size for any realistic Storyboard.
- The user-facing default label for a Scene (DTG of timestamp in DDHHmmZ MMM YY) may now be non-unique within a Storyboard. This is acceptable; users can edit titles to disambiguate. Automatic disambiguation is out of scope.
- Existing thumbnail-strip and timeline views consume an already-ordered Scene list from the platform and do not re-sort by timestamp themselves. Any view that currently re-sorts by timestamp alone MUST be updated to honour the new ordering rule (covered by FR-006).
