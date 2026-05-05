# Feature Specification: Active-Storyboard Selection Persistence

**Feature Branch**: `237-active-storyboard-persistence`
**Created**: 2026-05-05
**Status**: Draft
**Input**: User description: "Active-Storyboard selection persistence — persist the analyst's chosen active Storyboard for a plot so closing and reopening it in either host reopens on the same Storyboard, instead of always falling back to `getActiveStoryboardDefault()` (the most-recently-modified Storyboard)." (BACKLOG.md #237)

## Background

A Plot can contain multiple Storyboards (#215). Exactly one Storyboard is "active" at a time in the Storyboard panel — the active one drives Scene rectangles on the map (#217), the Scene list in the panel, and the timeline preview. Today, when an analyst opens a plot, the panel auto-selects the most-recently-modified Storyboard via `getActiveStoryboardDefault(plot)` (#235 research §8). The analyst can switch via the panel header dropdown, but that override is **panel-local and ephemeral**: closing the plot (or reopening it in the other host) discards the choice and re-applies the default rule.

For plots with two or three Storyboards in regular use (e.g. "Plan A" vs "Plan B" vs "Counter-factual"), this means the analyst re-picks every session. This feature persists the active selection so reopen-on-same-Storyboard is the default behavior.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Active selection persists across plot reopen in the same host (Priority: P1)

An analyst has a plot containing three Storyboards: "Plan A", "Plan B", and "Counter-factual". "Counter-factual" was modified most recently, so by today's default rule it is auto-selected on every plot open. The analyst is currently working on "Plan A" and switches to it via the header dropdown. They close the plot for the day and reopen it the next morning in the same host (VS Code or web-shell). The panel reopens with "Plan A" active — not "Counter-factual".

**Why this priority**: This is the entire point of the feature. Without it, analysts working multi-storyboard plots re-pick on every reopen, which the backlog flags as friction. The single-host case is by far the most common workflow and is achievable independently of cross-host concerns.

**Independent Test**: Open a multi-Storyboard plot in one host, switch to a non-default Storyboard via the header dropdown, close the plot, reopen the plot — the panel must reopen on the chosen Storyboard.

**Acceptance Scenarios**:

1. **Given** a plot with Storyboards A (last-modified yesterday), B (last-modified today), and C (last-modified an hour ago) — so C is the default active — **When** the analyst opens the plot, switches to A, then closes and reopens the plot in the same host, **Then** the panel reopens with A active and the dropdown header shows "A".
2. **Given** a plot opened for the first time on this host (no prior persisted selection), **When** the analyst opens it, **Then** the panel uses the existing default rule (`getActiveStoryboardDefault`) — preserving today's behavior for first-time opens.
3. **Given** the analyst has persisted "A" as active for a plot, **When** they switch to "B" and reopen the plot, **Then** the persisted selection is "B" (not "A") — the most recent choice wins.

---

### User Story 2 - Active selection persists across hosts (Priority: P2)

An analyst chooses an active Storyboard in VS Code, then later opens the same plot in the web-shell (or vice versa). The panel reopens with the chosen Storyboard active in the second host.

**Why this priority**: The backlog item explicitly says "in either host". Many analysts will only ever use one host, so this is a refinement on top of P1, not a precondition. Implementing P1 first and P2 second is a reasonable delivery split — but P2 must work by feature-completion.

**Independent Test**: Set the active Storyboard in host 1, open the same plot in host 2 (cold — no prior session) — host 2 must show the same Storyboard active.

**Acceptance Scenarios**:

1. **Given** the analyst has set "A" as the active Storyboard for a plot in VS Code, **When** they open the same plot in the web-shell on the same machine, **Then** the web-shell panel reopens with "A" active.
2. **Given** the analyst sets "A" in VS Code and "B" in web-shell during overlapping sessions, **When** both hosts reopen the plot, **Then** both reflect whichever selection was written last (last-writer-wins, consistent with the existing concurrent-edit posture from #235 research §9).

---

### User Story 3 - Graceful fallback when the persisted selection is no longer valid (Priority: P2)

The persisted active Storyboard ID may become invalid between sessions — for example, the analyst (or a collaborator) deleted that Storyboard, or the plot file was replaced with a copy that uses different Storyboard IDs.

**Why this priority**: Without this, the panel could open in a broken state (no active Storyboard, empty Scene list, dropdown showing "—"). The default-rule fallback is a small additional behavior on top of P1's persistence, but it is required for the feature to be safe.

**Independent Test**: Persist a Storyboard ID, delete that Storyboard from the plot, reopen the plot — the panel must fall back to the existing default rule and the orphaned persisted entry must be cleared.

**Acceptance Scenarios**:

1. **Given** the analyst persisted "A" as active, **When** they delete "A" and reopen the plot, **Then** the panel falls back to `getActiveStoryboardDefault` (the most-recently-modified remaining Storyboard) and silently clears the stale persisted entry.
2. **Given** the persisted Storyboard ID does not exist in the plot at all (e.g. plot was replaced by an unrelated copy with the same identifier), **When** the analyst opens the plot, **Then** the panel applies the default rule and the persisted entry is silently replaced on the next user-driven selection.
3. **Given** the plot contains zero Storyboards, **When** the analyst opens it, **Then** the panel renders the existing empty-state — persisted-selection logic does not change empty-state behavior.

---

### Edge Cases

- **Plot with one Storyboard**: persistence is a no-op; the only Storyboard is always active; nothing is written and nothing changes for the analyst.
- **Plot identity changes (file rename, save-as, copy)**: out of scope. The feature persists against the plot's stable identifier (chosen during planning); if the analyst saves-as or renames such that the identifier changes, the persisted entry does not migrate, and the panel falls back to the default rule on the new identifier — same as a first-time open. This matches the per-user, per-plot scope.
- **Two analysts on the same plot, different OS user accounts**: each user has their own persisted selection (per-user scope, see Assumptions).
- **Two analysts on the same plot, same OS user account**: they share the persisted selection. Last-writer-wins, no warning. This is consistent with treating active-Storyboard as a UI preference, not document state.
- **Storyboard renamed (not deleted)**: persistence keys on the Storyboard's stable ID, not its name. Renaming "A" → "Alpha" preserves the persisted active selection.
- **Cascade-delete of an active Storyboard during a live session**: handled by existing #235 reducer logic (override clears automatically); the persisted entry is removed at the same time so the next reopen does not resurrect a stale selection.
- **Web-shell with no host filesystem (e.g. a fresh browser profile)**: the persistence layer must still work in the web-shell. Storage backend is left to planning, but the user-visible behavior must be identical to VS Code.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: When the analyst changes the active Storyboard via the panel header dropdown, the system MUST persist that selection so the same Storyboard is re-activated when the plot is next opened.
- **FR-002**: When the analyst opens a plot that contains a previously-persisted active Storyboard selection AND that Storyboard still exists in the plot, the panel MUST activate the persisted Storyboard instead of applying `getActiveStoryboardDefault()`.
- **FR-003**: When the analyst opens a plot that has no previously-persisted active Storyboard selection (first open on this host/account), the panel MUST apply the existing `getActiveStoryboardDefault()` rule. No regression for first-time opens.
- **FR-004**: When the persisted active Storyboard ID does not match any Storyboard currently in the plot (e.g. it was deleted), the panel MUST fall back to `getActiveStoryboardDefault()` and the stale persisted entry MUST be silently cleared on that open.
- **FR-005**: Persistence MUST be **per-user, per-plot** — see Assumptions A1 and A2 below for scope rationale.
- **FR-006**: The persisted active selection MUST be readable and writable by **both hosts** (VS Code extension and web-shell), so an active selection set in one host is observed by the other on a subsequent open of the same plot on the same user account / device.
- **FR-007**: When two writes from concurrent sessions race (same plot, same user, both hosts open), the system MUST converge to the most recent write (last-writer-wins). No locking, no merge dialog.
- **FR-008**: Persistence MUST work entirely offline. No network call, no remote sync. Consistent with Article III (offline by default).
- **FR-009**: Persistence MUST NOT modify the plot file's contents on disk *unless the chosen implementation explicitly opts into the schema-slot approach* (see Assumption A3 — defaults to user-state, not plot-state).
- **FR-010**: The act of switching the active Storyboard MUST NOT mark the plot as dirty (no unsaved-changes prompt on close), regardless of which storage approach is chosen. Active-Storyboard is a UI preference, not document state.
- **FR-011**: When a Storyboard is deleted (including via the cascade-delete flow from #235), if the deleted Storyboard was the persisted active selection, the persisted entry MUST be removed in the same operation — no orphaned entries left behind.
- **FR-012**: The persisted store MUST tolerate the plot containing zero Storyboards. Reading returns "no selection"; writing is a no-op.
- **FR-013**: The persisted store SHOULD be human-readable (or at least debuggable) so support engineers can inspect / reset a stuck selection without specialised tooling. (Soft requirement — informs implementation choice.)

### Key Entities

- **Active-Storyboard preference entry**: A small piece of state recording, for a given plot, which Storyboard the analyst last activated. Conceptually a map from `(user, plot identifier) → Storyboard ID`. Not part of the plot's STAC payload (under Assumption A3); persisted in user-scoped state.
- **Plot identifier**: The stable key used to look up the preference for a given plot. The exact identifier is left to planning (candidates: STAC Item ID, plot file URI, Plot Feature `id`). The chosen identifier MUST be stable across reopen of the same plot on the same host.

## User Interface Flow *(optional - included because feature involves the panel header dropdown)*

### Decision Analysis

- **Primary Goal**: Reopen a plot on the Storyboard the analyst was last working with — without re-clicking the dropdown.
- **Key Decision(s)**:
  1. None at plot-open — the system makes the decision (use persisted selection if any, else default rule). The analyst's only decision is which Storyboard to switch to during a session, exactly as today.
- **Decision Inputs**: The header dropdown continues to show all Storyboards in the plot, with the active one highlighted (existing #235 UX). No new badges or annotations on the dropdown — persistence is invisible to the analyst beyond the reopen behavior changing.

### Screen Progression

| Step | Screen/State | User Action | Result |
|------|--------------|-------------|--------|
| 1 | Panel open on plot, default Storyboard active | Click header dropdown, select different Storyboard | Panel switches to the chosen Storyboard (existing #235 behavior); selection is persisted in the background |
| 2 | Plot closed, then reopened (same host or other host, same user account) | Open the plot | Panel reopens on the persisted Storyboard (no flicker through the default-rule choice) |
| 3 | Persisted Storyboard was deleted between sessions | Open the plot | Panel applies `getActiveStoryboardDefault()`; stale persisted entry silently cleared; no error or warning shown |

### UI States

- **Empty State** (plot has zero Storyboards): unchanged from #235 — panel shows the existing zero-Storyboards empty state. Persistence is a no-op.
- **Loading State**: persistence read happens during plot-open, before the panel renders Scenes. The user does not see a separate loading indicator for persistence; if the read is slow it falls under the existing plot-open loading affordance.
- **Error State**: if the persistence backend is unreadable (corrupted user-state file, denied storage permission), the panel falls back to `getActiveStoryboardDefault()` exactly as if there were no persisted entry. No banner, no error toast — the analyst sees today's behavior, which is the safe fallback.
- **Success State**: the panel renders with the correct Storyboard active. Indistinguishable from today's panel — that is the point.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For a plot with two or more Storyboards, switching the active Storyboard and reopening the plot in the same host activates the chosen Storyboard in 100% of test cases (acceptance test, not a measured field metric — feature is binary).
- **SC-002**: Cross-host persistence (set in VS Code, observed in web-shell on the same user account) succeeds in 100% of acceptance test cases.
- **SC-003**: Plot-open time does not regress by more than 50 ms in the median case for a plot with up to 10 Storyboards (the persistence read is a small lookup; this is a guardrail, not a target).
- **SC-004**: Switching the active Storyboard does not produce an unsaved-changes prompt on plot close (confirms FR-010 — preference is not document state).
- **SC-005**: Stale persisted entries (referenced Storyboard deleted) do not produce visible errors and do not block plot open in any test case — the fallback path is silent.
- **SC-006**: Analyst feedback ("I'm losing my Storyboard selection between sessions") does not recur in the next two analyst-feedback cycles after this feature ships. (Qualitative; this is the originating signal in BACKLOG #237.)

## Assumptions

- **A1 — Per-user scope**: The persisted active-Storyboard selection is per-OS-user (or per browser profile in the web-shell), not per-plot-shared. Two analysts opening the same plot file on different user accounts will each see their own last-chosen Storyboard. Rationale: the active selection is a UI preference about how *this analyst* views the plot, not a property of the plot itself. The backlog explicitly tags option (b) as "per-user, not per-plot" and prefers it as the lighter starting point.
- **A2 — Per-plot keying**: The persisted entry is keyed by a stable plot identifier so opening plot X and plot Y do not interfere with each other. The exact identifier (STAC Item ID vs file URI vs Plot Feature `id`) is an implementation choice deferred to `/speckit.plan`.
- **A3 — Storage approach defers to planning**: The backlog offers two implementation paths — (a) extend the LinkML schema with `is_active` on `StoryboardFeature`, or (b) use `debrief-config` user state. This spec is written to either approach. The default expectation captured in FR-005, FR-009, and FR-010 is **option (b)** (user-state), because (i) the backlog flags it as the lighter-touch starting point, (ii) it avoids a #215 schema bump and the round-trip-test churn that would entail, (iii) it cleanly delivers per-user scope (A1), and (iv) it keeps the active-selection UI preference out of the document, which #235 research §8 already argued for ("ergonomically wrong [to put] state on a Feature about how a UI displays it"). If planning revisits and chooses (a), FR-009 and FR-010 must be re-examined (the plot file would change on every dropdown click — likely violates FR-010's no-dirty-prompt guarantee unless suppressed).
- **A4 — Storage backend per host**: VS Code and web-shell may use different storage backends (e.g. `debrief-config` XDG file in VS Code, `localStorage` or IndexedDB in web-shell). The user-visible behavior must be identical, but FR-006's cross-host requirement is satisfied at the user-account / device level — not necessarily through a single shared file. Cross-host sync between two physical machines is **out of scope**.
- **A5 — No migration step**: Plots opened today will simply not have a persisted entry on first open after the feature ships, and will use the existing default rule for that first open. After the analyst makes a selection, persistence kicks in. No backfill, no migration tool.
- **A6 — Inherits #235 concurrency posture**: Concurrent-edit semantics (two hosts open at once on the same plot) follow #235 research §9 — last-writer-wins, no locking, no merge UI. The same posture applies to the persisted active-selection.

## Dependencies

- **#215 (Storyboarding schema)** — provides Storyboard Features with stable IDs and the `getActiveStoryboardDefault` query that this feature overrides.
- **#235 (Storyboard capture & maintenance UX)** — provides the panel header dropdown, the `activeOverrideId` panel-local state this feature persists, and the cascade-delete flow that FR-011 hooks into.
- **`debrief-config` user-state service** — likely persistence backend in VS Code under Assumption A3 / option (b). Already exposes `getPreference` / `setPreference` / `deletePreference`.
- **#236 (web-shell STAC writes)** — only relevant if planning selects schema-slot approach (option a), since persisting on a Storyboard Feature would need a write path. Under the default option (b), this dependency is not required.

## Out of Scope

- **Cross-machine sync of preferences** — analyst with two laptops will not share active-Storyboard selections between them. Out of scope.
- **Server-side / shared preferences** — no remote storage, no team-wide preference sharing.
- **Migration of existing plots** — no backfill of `is_active` slot or pre-population of user-state for plots already in the catalog.
- **A "reset to default" UI action** — analysts can already pick the most-recently-modified Storyboard manually if they want to return to today's default. No dedicated reset button.
- **Per-Storyboard pinning, ordering, or favouriting** — this feature does *only* the active-selection persistence. Other Storyboard-list UX changes are separate work.
- **Telemetry on which Storyboard analysts most often activate** — out of scope (no analytics infrastructure in v4 today; would also conflict with offline-by-default).
