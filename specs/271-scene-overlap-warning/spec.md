# Feature Specification: Overlap Warning for Time-Range Scenes

**Feature Branch**: `271-scene-overlap-warning`  
**Created**: 2026-05-31  
**Status**: Draft  
**Input**: User description: "271 check for overlapping scenes — Overlap detection for time-range Scenes (warn, not block). Detect when two or more time-range Scenes have overlapping `[t_start, t_end]` windows within a single Storyboard and surface a non-blocking warning on the offending rows (\"Overlaps with Scene B\"). Authors can dismiss; the platform does not reorder, merge, or reject. Deferred from #263 (FR-SCO-003)."

## User Scenarios & Testing *(mandatory)*

<!--
  Backlog #271. Follow-up to #263 (time-range Scenes). The MVP for #263
  treated overlap detection as authoring discipline (FR-SCO-003 deferred).
  This feature adds the passive safety net: a warning that helps analysts
  spot *accidental* overlaps without forcing a policy on *intentional* ones.
-->

### User Story 1 - Spot an accidental overlap between two time-range Scenes (Priority: P1)

An analyst is assembling a Storyboard out of several time-range Scenes, each capturing an evolving moment over a `[t_start, t_end]` window. While re-ordering and re-timing Scenes they accidentally leave two Scenes whose windows overlap — a sign of authoring drift that would cause the same stretch of time to be replayed twice. When the analyst views the Storyboard panel, the two offending Scene rows each carry a passive, clearly-visible warning that names the Scene they overlap with (e.g. "Overlaps with *Approach run*"). Nothing is blocked: the Scenes still play, save, and edit exactly as before. The warning simply lets the analyst notice the drift and decide whether to fix it.

**Why this priority**: This is the entire point of the feature — surfacing accidental overlaps. Without the warning appearing on the offending rows, there is no feature. Everything else (dismissal, live re-evaluation) refines this core experience.

**Independent Test**: Open a Storyboard containing two time-range Scenes whose `[t_start, t_end]` windows overlap. Confirm both rows display a warning that names the other Scene. Confirm a third, non-overlapping time-range Scene and any instant Scenes in the same Storyboard show no warning. Confirm the warning does not block playback, capture, save, or edit.

**Acceptance Scenarios**:

1. **Given** a Storyboard with two time-range Scenes A and B whose windows overlap, **When** the analyst views the Storyboard panel, **Then** row A shows a warning naming B and row B shows a warning naming A.
2. **Given** a Storyboard with two time-range Scenes whose windows do **not** overlap, **When** the analyst views the panel, **Then** neither row shows an overlap warning.
3. **Given** a Storyboard containing both time-range Scenes and instant (single-timestamp) Scenes, **When** the analyst views the panel, **Then** instant Scenes never carry an overlap warning, and an instant Scene whose timestamp falls inside a time-range Scene's window does not trigger a warning on either row.
4. **Given** a time-range Scene that overlaps **two or more** other time-range Scenes, **When** the analyst views the panel, **Then** that Scene's warning identifies every Scene it overlaps with, and each of those other Scenes also shows a warning naming this one.
5. **Given** any Storyboard with an active overlap warning, **When** the analyst plays the Storyboard, captures a new Scene, or saves the plot, **Then** the warning never blocks, cancels, reorders, merges, or rejects any of those actions.

---

### User Story 2 - Dismiss a warning for an overlap I meant to create (Priority: P2)

Sometimes an overlap is a deliberate creative choice — an emphasis re-play of the same moment. The analyst has reviewed the warning, confirmed the overlap is intentional, and wants the warning out of the way so it does not distract from the rest of the authoring work. They dismiss the warning on the offending rows; the rows return to their normal appearance. The Scenes are unchanged — only the warning is suppressed.

**Why this priority**: Without dismissal the warning becomes nagging noise for the legitimate "intentional overlap" case the backlog explicitly calls out. It is essential to the "warn, don't block, don't impose policy" philosophy, but the feature still delivers value (spotting accidents) before dismissal is wired.

**Independent Test**: With an overlap warning visible on two rows, dismiss it and confirm both rows return to their unwarned appearance and the Scenes themselves are untouched. Re-evaluate (e.g. reload) and confirm the dismissed warning does not immediately reappear for the same, unchanged overlap.

**Acceptance Scenarios**:

1. **Given** two rows showing a mutual overlap warning, **When** the analyst dismisses the warning, **Then** the warning is removed from both rows and no Scene data is modified.
2. **Given** a dismissed overlap warning and an unchanged set of Scene windows, **When** the analyst continues working in the same session, **Then** the dismissed warning stays suppressed and does not re-nag.
3. **Given** a dismissed overlap, **When** the analyst later edits a Scene window so that a **new, different** overlap appears (a pair that was not previously overlapping), **Then** a warning is surfaced for the new overlap.

---

### User Story 3 - Warnings stay accurate as I edit Scene windows (Priority: P3)

As the analyst adjusts Scene timings — moving a Scene, changing a window, or adding a new time-range Scene — the overlap warnings keep up with the current state of the Storyboard. An overlap that is resolved (windows pulled apart) loses its warning; a new overlap created by an edit gains one. The analyst never has to manually refresh to trust what the warnings are telling them.

**Why this priority**: Live accuracy makes the warning trustworthy, but the feature is still useful if warnings are evaluated on panel render/open. This story hardens the experience rather than enabling it.

**Independent Test**: Start with two overlapping time-range Scenes (warning shown). Edit one window so the two no longer overlap; confirm the warning disappears from both rows. Edit it back to overlapping; confirm the warning reappears.

**Acceptance Scenarios**:

1. **Given** two overlapping time-range Scenes with a warning shown, **When** the analyst edits one window so the windows no longer overlap, **Then** the warning is removed from both rows.
2. **Given** two non-overlapping time-range Scenes with no warning, **When** the analyst edits one window so they now overlap, **Then** a warning appears on both rows.
3. **Given** a freshly opened Storyboard, **When** the panel first renders, **Then** all current overlaps among time-range Scenes are evaluated and warned without any manual refresh.

---

### Edge Cases

- **Touching endpoints (`A.t_end == B.t_start`)**: two windows that meet at a single instant are a *contiguous handoff*, the normal way sequential Scenes abut — this is **not** treated as an overlap and produces no warning. Overlap requires a shared interval of non-zero duration (strict interior overlap).
- **Zero-length window (`t_start == t_end`, the degenerate range #263 permits)**: a zero-length window that falls strictly inside another Scene's window is treated as an overlap and warned; a zero-length window that only touches another window's endpoint is not (consistent with the touching-endpoints rule).
- **Three or more mutually overlapping Scenes**: each offending row names all the other Scenes it overlaps; the warning does not collapse the group into a single ambiguous message.
- **Overlap that spans more than two Scenes via a chain (A overlaps B, B overlaps C, but A and C do not overlap)**: A and B warn about each other, B and C warn about each other, A and C do not — warnings reflect actual pairwise overlaps, not transitive grouping.
- **Identical windows (`A.t_start == B.t_start` and `A.t_end == B.t_end`)**: a full overlap; both rows warn.
- **A Scene renamed while a warning references it**: the warning text reflects the Scene's current title.
- **A Scene deleted while it is part of an overlap**: the warning on the surviving partner is removed if the deletion resolves the overlap.
- **Empty Storyboard, single-Scene Storyboard, or a Storyboard with only instant Scenes**: no overlap is possible; no warnings, no errors.
- **Overlaps are scoped to a single Storyboard**: time-range Scenes in *different* Storyboards on the same plot are never compared, even if their windows overlap.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST detect, within a single Storyboard, every pair of time-range Scenes (`time_range != null`) whose `[t_start, t_end]` windows overlap.
- **FR-002**: The system MUST define "overlap" as a shared interval of non-zero duration: windows A and B overlap when `A.t_start < B.t_end` AND `B.t_start < A.t_end`. Windows that merely touch at a single endpoint (`A.t_end == B.t_start`) do NOT overlap.
- **FR-003**: For each Scene that participates in one or more overlaps, the system MUST surface a non-blocking warning on that Scene's row in the Storyboard panel.
- **FR-004**: The overlap warning MUST identify the other Scene(s) it overlaps with by their current title (e.g. "Overlaps with *Scene B*"); when a Scene overlaps multiple others, all of them MUST be named.
- **FR-005**: The system MUST treat overlap detection as advisory only — it MUST NOT reorder, merge, reject, block, or otherwise modify Scenes, and it MUST NOT prevent capture, playback, editing, or saving.
- **FR-006**: The system MUST exclude instant Scenes (`time_range == null`) from overlap detection entirely; an instant Scene's timestamp falling inside a time-range Scene's window MUST NOT raise a warning on either Scene.
- **FR-007**: The system MUST scope overlap detection to a single Storyboard; time-range Scenes belonging to different Storyboards MUST NOT be compared.
- **FR-008**: Authors MUST be able to dismiss an overlap warning, after which the warning is suppressed for that overlap and no Scene data is changed.
- **FR-009**: A dismissed warning MUST NOT re-nag for the same, unchanged overlap during continued authoring; but the system MUST surface a warning for any *new* overlap introduced by subsequent edits (a pair that was not previously overlapping).
- **FR-010**: The system MUST re-evaluate overlaps against the current Storyboard state when Scene windows change (window edited, Scene added, Scene deleted) and when the panel is (re)opened, with no manual refresh required.
- **FR-011**: The overlap warning MUST be presented consistently across the surfaces that render the Storyboard panel (VS Code extension and web-shell), since both consume the same presentational panel.
- **FR-012**: The overlap warning MUST be perceivable to assistive technology — its presence and the named conflicting Scene(s) MUST be conveyed to screen-reader users, not by colour alone.
- **FR-013**: The warning MUST remain visually distinct from, and not conflict with, other per-row affordances already present (stale badge, pending-delete, out-of-range / missing-data indicators), so a row can carry an overlap warning alongside its other state.

### Key Entities *(include if feature involves data)*

- **Storyboard**: A named, ordered collection of Scenes on a plot. The unit within which overlaps are detected; Scenes in different Storyboards are never compared.
- **Scene**: A captured moment within a Storyboard. A *time-range Scene* has a `time_range` of `[t_start, t_end]`; an *instant Scene* has `time_range == null`. Only time-range Scenes participate in overlap detection. Each Scene has a title used to name it in warnings.
- **Overlap**: A pairwise relationship between two time-range Scenes in the same Storyboard whose windows share a non-zero-duration interval. Drives the per-row warning and is the unit an author can dismiss.

## User Interface Flow

### Decision Analysis

- **Primary Goal**: Let the analyst notice — and judge — when two or more time-range Scenes cover overlapping stretches of time, without being forced into any corrective action.
- **Key Decision(s)**:
  1. Is this overlap an accident I should fix (pull the windows apart / re-time a Scene), or an intentional emphasis re-play I want to keep?
  2. If intentional, do I want to dismiss the warning so it stops distracting me?
- **Decision Inputs**: The warning sits on the offending Scene rows and names the specific other Scene(s) involved, so the analyst can immediately see *which* Scenes collide. The rows already show each Scene's DTG/timestamp and title, giving the timing context needed to judge whether the overlap is deliberate.

### Screen Progression

| Step | Screen/State | User Action | Result |
|------|--------------|-------------|--------|
| 1 | Storyboard panel open with several Scenes | View the Scene list | Rows whose time-range windows overlap each show a passive warning naming the conflicting Scene(s) |
| 2 | A warned row | Read the warning ("Overlaps with *Scene B*") | Analyst identifies which Scenes collide and judges whether it is accidental |
| 3a | Accidental overlap | Edit a Scene window (or re-time a Scene) so the windows no longer overlap | Warning disappears from both rows automatically |
| 3b | Intentional overlap | Dismiss the warning | Warning is suppressed on the affected rows; Scenes unchanged |

### UI States

- **Empty State**: No time-range overlaps in the Storyboard (or fewer than two time-range Scenes) → no warnings appear; the panel looks exactly as it does today.
- **Loading State**: While the Scene list is still being marshalled, no warnings are shown; warnings appear once the Scene set is available and evaluated (no separate spinner — evaluation is instantaneous over in-memory data).
- **Error State**: Not applicable — overlap detection is a passive, read-only evaluation over data already in memory; it has no failure mode that blocks the analyst. Malformed or absent windows simply do not participate in detection.
- **Success State**: One or more rows display a passive, non-blocking warning naming the conflicting Scene(s); the warning coexists with any other per-row badges the Scene already carries, and dismissed warnings return their rows to the unwarned appearance.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: When a Storyboard contains an accidental overlap between two time-range Scenes, an analyst opening the Storyboard panel can identify which two Scenes collide within 10 seconds, without consulting documentation.
- **SC-002**: Overlap detection produces zero false warnings — no warning ever appears on a non-overlapping time-range Scene, on an instant Scene, on Scenes whose windows only touch at an endpoint, or across Scenes in different Storyboards.
- **SC-003**: 100% of authoring actions (capture, playback, edit, save, reorder) complete unaffected while one or more overlap warnings are present — the warning never blocks or alters any action.
- **SC-004**: After an analyst resolves an overlap by editing a window, the corresponding warning disappears with no manual refresh; after an analyst dismisses an intentional overlap, the warning does not re-appear for that unchanged overlap during the session.
- **SC-005**: For every Scene involved in an overlap, the warning correctly names every other Scene it overlaps with (including the 3-or-more mutually-overlapping case), verified against the actual pairwise overlap set.

## Assumptions

- **Overlap is strict (interior) overlap.** Windows that share only an endpoint are a contiguous handoff (the normal sequential-Scene case), not an overlap — so a well-formed, sequential Storyboard produces no warnings. (See FR-002 / Edge Cases.)
- **Only time-range Scenes participate.** Instant Scenes have a single timestamp, not a window; the backlog scopes this feature to "two or more time-range Scenes" with overlapping `[t_start, t_end]` windows. An instant Scene's timestamp landing inside a range does not constitute an overlap for this feature.
- **Dismissal is session-scoped and overlap-specific.** Dismissing suppresses the warning for that particular overlap (the specific pair, while their windows are unchanged). It is not persisted as a permanent plot annotation in this MVP; a brand-new overlap introduced by later edits is warned afresh. This keeps the feature a lightweight authoring aid (1–2 dev-days per the backlog estimate) without introducing new persisted plot state. If real-world feedback shows analysts want dismissals to survive reloads, persistence can be a follow-up.
- **Detection is scoped to the active/selected Storyboard's Scene set** as already surfaced by the Storyboard panel; the panel orders Scenes by timestamp ascending, which the detection can rely on but does not require.
- **The warning reuses the existing per-row affordance pattern** in the Storyboard panel (alongside stale / out-of-range badges) rather than introducing a separate modal or blocking dialog — consistent with the "warn, not block" mandate.
- **No schema change is required.** `time_range` (`[t_start, t_end]`) already exists on Scenes from #263; overlap is a derived, read-only computation over existing fields.

## Dependencies

- **#263 (time-range Scenes)** — must have shipped; this feature operates on the `time_range` (`[t_start, t_end]`) data it introduced. (Backlog: "depends on #263 shipping".)
- The Storyboard panel (#216 / #217 / #218 / #230 / #235) — the surface on which the per-row warning is rendered, in both the VS Code extension and the web-shell.

## Out of Scope

- Detecting or warning about instant-Scene timestamp collisions (that is the existing duplicate-timestamp collision flow from #235, a separate concern).
- Any automatic resolution: reordering, merging, trimming, or rejecting overlapping Scenes.
- Cross-Storyboard overlap detection.
- Persisting dismissals across plot reloads or sessions (candidate follow-up if analyst feedback warrants it).
- Warning about gaps between Scene windows (the inverse of overlap) — not requested.
</content>
