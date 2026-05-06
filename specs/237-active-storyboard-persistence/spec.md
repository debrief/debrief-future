# Feature Specification: Active-Storyboard Selection Persistence

**Feature Branch**: `237-active-storyboard-persistence`
**Created**: 2026-05-06
**Status**: Draft — ready for quality-checklist validation
**Parent Epic**: #024 Storyboarding Briefings — [idea doc](../../docs/ideas/017-storyboarding-briefings.md)
**Related Specs**: #215 (storyboarding schema + CRUD core), #217 (panel + playback), #235 (storyboard capture & maintenance UX — the spec this follow-up amends)
**Backlog Item**: [#237](../../BACKLOG.md) — *Active-Storyboard selection persistence*
**Input**: Persist the analyst's chosen active Storyboard for a plot so closing and reopening it reopens on the same Storyboard, instead of always falling back to `getActiveStoryboardDefault()` (the most-recently-modified Storyboard).

## Summary

Today, opening a plot that contains multiple Storyboards always lands the
analyst on the **most-recently-modified Storyboard** — the
`getActiveStoryboardDefault()` rule introduced in #215 and adopted by
both hosts. The analyst can override the selection from the side-rail
header dropdown introduced in #235, but that override is held only in
React component state and is **lost as soon as the plot is closed and
reopened**. This was an intentional ephemeral-by-design choice in
#235's research §8, deferred with the note "may be revisited if
analysts complain about losing selection across sessions."

This spec acts on that deferral. After this feature ships, an analyst
working a multi-storyboard plot (commander's view, ASW evidence,
training debrief) can pick "Commander's view" once, close the plot,
walk away, reopen it the next day, and find "Commander's view" still
selected — without re-navigating the dropdown. The persistence is
**per-user, per-plot**: each analyst gets their own remembered
selection per plot, so two reviewers on different workstations don't
overwrite each other's preferred views, and an analyst's choice on
plot A doesn't leak into plot B.

The default-selection rule (`getActiveStoryboardDefault()`) is **not
removed**. It remains the fallback for any plot the analyst has never
explicitly switched away from, and for any persisted selection that
no longer corresponds to a Storyboard present in the plot (e.g. the
remembered Storyboard was deleted in another session). The dropdown
UI from #235 is unchanged; the only user-visible change is that the
right Storyboard is already selected on plot open.

The persistence lives in the existing **`debrief-config` user-state
service** (per the backlog steer that option (b) is "the lighter-touch
starting point"); the LinkML Storyboard schema is **not** modified, so
plots remain interoperable with hosts that haven't picked up this
feature yet.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Reopened plot lands on the analyst's last-picked Storyboard (Priority: P1)

An analyst is working a multi-storyboard plot ("Exercise Trident
2026"). The plot has three Storyboards: *Commander's view*, *ASW
evidence*, and *Training debrief*. The Training debrief was the
most-recently-modified Storyboard, so the host opens the plot on
*Training debrief* by default, but the analyst is preparing the
commander's brief and switches the side-rail dropdown to *Commander's
view*. They scrub through Scenes, take a phone call, close the plot,
and shut down for the day. Next morning, they reopen the same plot
and the panel is **already on *Commander's view*** — no re-navigation
of the dropdown, no mental check that they're on the right Storyboard.

**Why this priority**: This is the entire feature. Multi-storyboard
plots are a first-class case (per #235 P2: "most analysts on most
plots will work with a single storyboard, but multi-storyboard plots
are a first-class supported case"). Without persistence, every reopen
is a context-switch tax; with it, the panel matches where the analyst
left off. Everything else in this spec is robustness around this core
behaviour.

**Independent Test**: Open a plot with ≥2 Storyboards in either host;
the default selection lands on Storyboard X (per the
most-recently-modified rule). Switch via the dropdown to Storyboard Y.
Close the plot. Reopen it. Verify the panel header shows Y selected
and the Scene list reflects Y's Scenes (not X's). Repeat the
close/reopen cycle a second time without further interaction; Y must
still be selected.

**Acceptance Scenarios**:

1. **Given** a plot with Storyboards `A` (most-recently-modified) and
   `B`, opened in either host with `B` selected via the dropdown,
   **When** the analyst closes the plot and reopens it,
   **Then** the side-rail header shows `B` as the active Storyboard
   and the Scene list contains only `B`'s Scenes.
2. **Given** a plot the analyst has never switched away from
   (no override ever recorded), **When** they open it,
   **Then** the active Storyboard is `getActiveStoryboardDefault()` —
   identical to today's behaviour. The persistence layer adds no
   selection where none was made.
3. **Given** a plot the analyst has previously pinned to Storyboard
   `B`, **When** a second analyst on a different workstation opens
   the same plot, **Then** the second analyst sees
   `getActiveStoryboardDefault()` (or their own previously-recorded
   selection if they have one) — the first analyst's choice does
   **not** propagate to other users.

---

### User Story 2 — Robust fallback when the remembered Storyboard is gone (Priority: P2)

The analyst pinned plot "Exercise Trident 2026" to *Commander's view*
yesterday. Overnight, a colleague reopened the plot, deleted
*Commander's view* (it was a draft), and saved. This morning the
analyst reopens the plot. The remembered selection ID no longer
matches any Storyboard in the plot, so instead of an empty rail with a
"Storyboard not found" error, the panel **falls back to
`getActiveStoryboardDefault()`** — the most-recently-modified
remaining Storyboard — and the stale selection record is cleared so
the analyst's next pick replaces it cleanly.

**Why this priority**: A persistence layer that breaks the panel when
the underlying entity is gone is worse than no persistence at all.
This story makes the feature safe to ship; without it, a single
delete-in-another-session can wedge the analyst's panel.

**Independent Test**: Pin a plot to Storyboard `B`. From a second
session, delete `B` and save. From the first session, open the plot.
Verify the panel falls back to `getActiveStoryboardDefault()` (the
most-recently-modified surviving Storyboard) and shows no error
banner. Close and reopen the plot a second time; the persisted
selection is now `getActiveStoryboardDefault()`'s pick (or, if the
analyst overrode it after fallback, that new pick) — never the
deleted `B`.

**Acceptance Scenarios**:

1. **Given** a persisted selection `B` and a plot in which `B` no
   longer exists, **When** the analyst opens the plot,
   **Then** the active Storyboard is the
   `getActiveStoryboardDefault()` pick over the remaining Storyboards
   and no error or warning is surfaced to the user about the missing
   selection.
2. **Given** the situation above, **When** the analyst takes any
   subsequent action that records a selection (overrides via dropdown
   or interacts with the now-active Storyboard's Scenes long enough
   for the host to write through),
   **Then** the stale `B` record is replaced with the current
   selection in the persistence layer.
3. **Given** a plot that has zero Storyboards remaining (all
   deleted), **When** the analyst opens it,
   **Then** the panel shows the existing #235 "Empty State (no
   Storyboards on plot)" UX unchanged; no persistence-specific error
   appears.

---

### User Story 3 — Independent persistence across plots (Priority: P3)

An analyst maintains two plots: "Exercise Trident 2026" pinned to
*Commander's view*, and "Exercise Aegis 2025" pinned to *ASW
evidence*. They flip between the two plots throughout the morning. At
no point does opening one plot reset the other plot's pinned
selection, and at no point does the selection from one plot
"contaminate" the other.

**Why this priority**: Per-plot keying is a correctness guarantee, not
a feature on its own — but it's worth listing as an acceptance story
because it's how a reasonable user could see the system fail
("everything keeps snapping back to ASW evidence"). Including it as
P3 makes it an explicit, independently-testable behaviour rather than
an implicit assumption.

**Independent Test**: Pin plot `P1` to Storyboard `B1` and plot `P2`
to Storyboard `B2`. In any open/close order across the two plots,
each plot must reopen on its own pinned selection. Pinning a new
selection on `P1` must not change `P2`'s selection.

**Acceptance Scenarios**:

1. **Given** plot `P1` pinned to `B1` and plot `P2` pinned to `B2`,
   **When** the analyst opens `P1`, then closes it and opens `P2`,
   **Then** `P2` opens on `B2` (not `B1`).
2. **Given** the situation above, **When** the analyst then
   re-pins `P1` to `B1'`, **Then** `P2`'s persisted selection is
   unchanged.
3. **Given** two plots that each contain a Storyboard with the
   same `name` but different IDs (e.g. both have a Storyboard called
   "Commander's view"), **When** the analyst pins each plot
   independently, **Then** the persistence layer keys on Storyboard
   ID, not name — pinning one plot does not change the other even if
   the names overlap.

---

### Edge Cases

- **Persistence cleared / first-ever open**: A plot the analyst has
  never opened before, or a host install with no persistence record
  for this plot, behaves identically to today: the panel shows
  `getActiveStoryboardDefault()`. The feature must not require a
  one-time "migration" or onboarding step.
- **Selection cleared back to default**: The dropdown does not need a
  "clear my override" affordance. If the analyst wants to undo a
  pinned selection, they can pick the default Storyboard explicitly
  from the dropdown, and that pick is then persisted as their choice.
- **Plot identity changes (rename / move)**: The persistence record is
  keyed by the plot's stable identifier. If a plot's identifier
  changes (e.g. the file is moved to a new STAC item path), the
  persistence record is treated as belonging to a different plot and
  the analyst sees the default selection on first open at the new
  location. This is **acceptable** behaviour — moving a plot is rare
  enough that asking the analyst to re-pin once is preferable to
  inventing a content-fingerprint key.
- **Plot has exactly one Storyboard**: The dropdown is hidden / inert
  per #235. Persistence is still recorded for forward compatibility
  (so that adding a second Storyboard later doesn't force the analyst
  to re-pin), but no behaviour changes versus today.
- **Concurrent edits from two sessions**: If the analyst has the same
  plot open in both VS Code and web-shell on the same machine and
  pins different Storyboards in each, the last write to the
  persistence layer wins for the next plot open. This matches the
  existing last-writer-wins concurrency story for plot edits (#235
  research §9).
- **Persistence layer unavailable / write fails**: If the
  user-state service is read-only or unavailable (e.g. corrupted
  config file, file-locked), the panel must still function — it
  falls back to today's ephemeral behaviour and the analyst's
  selection is held only for the lifetime of the panel mount. No
  modal error surfaces; a single non-fatal log entry is acceptable.

## Requirements *(mandatory)*

### Functional Requirements

#### Persistence

- **FR-001**: The system MUST persist the analyst's active-Storyboard
  selection per plot, scoped to the current user account on the
  current host install. The persisted record MUST identify the
  Storyboard by its stable Storyboard ID (not by name, position, or
  any other field that can collide or change).
- **FR-002**: The persistence record MUST be keyed by a stable
  per-plot identifier (the plot's STAC item path). Two distinct plots
  MUST have independent persistence records, even if they contain
  Storyboards with identical names.
- **FR-003**: The system MUST write a new selection to the
  persistence layer **immediately** when the analyst overrides the
  active Storyboard via the dropdown. The analyst MUST NOT have to
  perform a save action or close the plot for the selection to be
  recorded.
- **FR-004**: The persistence layer MUST store records under the
  existing `debrief-config` user-state service (no new
  config-storage backend is introduced). The Storyboard LinkML
  schema MUST NOT be modified by this feature, so plots remain
  byte-identical to plots produced by hosts that have not yet
  adopted this feature.

#### Restoration on plot open

- **FR-005**: On plot open, the system MUST consult the persistence
  layer for a record matching this plot's identifier. If a record
  exists **and** the recorded Storyboard ID is present in the plot,
  the panel MUST initialise the active Storyboard to that record.
- **FR-006**: If no persistence record exists for the plot, or the
  recorded Storyboard ID is no longer present in the plot, the panel
  MUST fall back to `getActiveStoryboardDefault()` — preserving
  today's behaviour for first-ever opens and stale-record cases.
- **FR-007**: When a fallback per FR-006 occurs because the recorded
  ID is stale (Storyboard was deleted), the system MUST clear or
  overwrite the stale record at the next moment a fresh selection is
  established (either via fallback completing successfully or via the
  analyst's first dropdown interaction in that session). No banner,
  toast, or modal explanation MUST be shown for this self-healing.

#### Behavioural parity across hosts

- **FR-008**: Both hosts (VS Code and web-shell) MUST exhibit the
  same persistence behaviour from the analyst's perspective: a
  selection pinned in host H1 must be honoured on subsequent opens
  **in H1**. Cross-host syncing (selection pinned in VS Code being
  honoured on next open in web-shell) is **not** required by this
  spec; if it occurs because both hosts share the same user-state
  storage on the analyst's machine, that is acceptable but not a
  guarantee.
- **FR-009**: The dropdown's existing UX from #235 MUST be unchanged
  by this feature — same layout, same labels, same placement, same
  keyboard affordances. The only observable change is which
  Storyboard is selected on plot open.

#### Multi-user safety

- **FR-010**: A second analyst on a different workstation, or a
  second user account on the same machine, opening the same plot,
  MUST see their own persisted selection (or the default if none) —
  never the first analyst's pinned selection. Persistence MUST NOT be
  written into the plot file itself.
- **FR-011**: If the analyst clears or resets their `debrief-config`
  user state (e.g. deletes the config file, switches to a new user
  account), the panel MUST gracefully revert to default-selection
  behaviour for every plot — no broken-state handling required.

#### Robustness

- **FR-012**: A read or write failure against the persistence layer
  MUST NOT prevent the panel from rendering or block any analyst
  action. On read failure, the panel MUST behave as if no record
  existed (fall back to default). On write failure, the override is
  treated as session-only (matching today's ephemeral behaviour);
  the analyst's current session is not interrupted.
- **FR-013**: The persistence layer MUST tolerate concurrent writes
  from two sessions on the same plot via last-writer-wins semantics,
  matching the existing plot-edit concurrency model from #235
  research §9. No additional locking, conflict prompts, or merge UI
  is required.

#### Observability

- **FR-014**: Provenance/log behaviour from #235 (which records Scene
  and Storyboard CRUD into the plot's `provenance` chain) MUST NOT
  be extended by this feature. Persisting an active-Storyboard
  selection is a per-user UI-state act, not an edit to the plot, so
  it MUST NOT add a provenance entry. (This makes the persistence
  layer additionally invisible to plot diffing, audit logs, and
  cross-host plot interchange.)

### Key Entities

- **Active-Selection Record**: A single per-plot, per-user entry that
  stores the Storyboard ID the analyst last selected for a given
  plot. Attributes: plot identifier (STAC item path), Storyboard ID
  (stable Storyboard `properties.id`), and a last-updated timestamp
  (informational; used for "last writer wins" tie-breaking and
  potentially for housekeeping). Lifetime: written on every analyst
  override, read on every plot open, cleared when the recorded
  Storyboard is deleted.
- **Plot identifier**: The stable string used to key Active-Selection
  Records. Today this is the STAC item path that the host already
  uses to identify open plots (`stacItemPath` / `itemPath` in the
  host wiring). The persistence layer treats this as opaque.
- **`debrief-config` user state**: The existing per-user, on-machine
  configuration store (Linux: `~/.config/debrief/config.json`;
  macOS: `~/Library/Application Support/debrief/config.json`;
  Windows: `%APPDATA%\debrief\config.json`). Active-Selection
  Records live under a dedicated section of this store; no other
  consumer of `debrief-config` is affected.

## User Interface Flow

### Decision Analysis

- **Primary Goal**: When opening a multi-storyboard plot they've
  worked on before, the analyst lands on the Storyboard they were
  last using — no re-navigation, no mental check.
- **Key Decision(s)**:
  1. *Which Storyboard to work on now?* — exactly the same decision
     as today; the dropdown's options and labels are unchanged.
  2. *Should I revert to the default Storyboard?* — the analyst
     answers this by picking the default Storyboard from the
     dropdown explicitly. There is no separate "clear pin" affordance
     in this spec.
- **Decision Inputs**: The header dropdown shows the same Storyboard
  list as #235 — Storyboard names with their Scene counts. The
  selected entry is the persisted choice (or the default if none),
  visually identical to today's selected-state styling.

### Screen Progression

| Step | Screen/State | User Action | Result |
|------|--------------|-------------|--------|
| 1 | Plot open, header shows persisted Storyboard `B` selected (or default if no persisted record) | Analyst inspects panel | Scene list, on-map rectangles, and time controller all reflect `B` exactly as if `B` had been picked manually — no transition or animation specific to "restoration" |
| 2 | Header dropdown open | Analyst clicks Storyboard `C` | Active Storyboard switches to `C` (same as today's #235 behaviour); persistence layer records `C` for this plot in the background, before the next render completes |
| 3 | Analyst closes the plot, reopens it later | Plot opens | Header lands on `C` (the most recent pinned choice), not on `getActiveStoryboardDefault()` |
| 4 | Persisted Storyboard was deleted in another session | Plot opens | Header lands on `getActiveStoryboardDefault()` over the remaining Storyboards; no banner or warning is shown |

### UI States

- **Empty State** *(no Storyboards on plot)*: Identical to #235's
  "Empty State (no Storyboards on plot)". No persistence
  consideration applies.
- **First-open / no persisted record**: Identical to today —
  `getActiveStoryboardDefault()` is selected. The user cannot tell
  whether they're on a "default" or a "restored" Storyboard, and that
  is intentional: the dropdown looks and behaves the same in both
  cases.
- **Loading State**: The panel mounts only after the host has read
  the persistence record (a single small JSON read from
  `debrief-config`); this read is bounded and fast enough that no
  separate loading affordance is needed. If the read is delayed or
  fails, the panel mounts on the default selection — no spinner.
- **Error State**: A persistence read or write failure MUST NOT
  surface a visible error in the panel. The panel renders normally
  on the default selection (read failure) or treats the override as
  session-only (write failure). At most a single non-fatal log
  entry is written.
- **Success State**: The plot opens directly on the analyst's
  remembered Storyboard. There is no success toast, no banner, no
  "you're on your last Storyboard" affordance — silence is the
  success state, because the goal of the feature is that the right
  Storyboard is *already* there.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For a plot with ≥2 Storyboards that the analyst has
  pinned to a non-default Storyboard, **100% of subsequent plot
  opens on that host install reopen on the pinned Storyboard**
  (until the analyst either pins a different Storyboard or the
  pinned Storyboard is deleted).
- **SC-002**: For a plot the analyst has never switched away from,
  **the active Storyboard on open matches today's default rule
  exactly** — `getActiveStoryboardDefault()` (the
  most-recently-modified Storyboard). Verified by replaying the
  existing #235 / #217 acceptance scenarios for default selection;
  none must regress.
- **SC-003**: Plot files produced by hosts with this feature MUST be
  **byte-identical** to plot files produced by hosts without it for
  any sequence of analyst actions that does not involve a Storyboard
  CRUD edit. This guarantees zero schema-drift risk and zero
  interop regressions for organisations on mixed host versions.
- **SC-004**: When the remembered Storyboard is no longer in the
  plot (deleted in another session), **the panel renders on
  `getActiveStoryboardDefault()` with no banner, toast, or modal**.
  The fallback completes within the same render cycle as a normal
  plot open — i.e. the analyst MUST NOT see a flash of "loading" or
  "Storyboard not found" content before the fallback paints.
- **SC-005**: Two analysts on different workstations opening the
  same plot **never see each other's pinned selection**. Verified
  by acceptance scenario US1#3 — the second analyst's view is
  derived from their own persistence record (or the default).
- **SC-006**: A persistence layer outage (config file removed,
  read-only filesystem, write fails) **does not block any analyst
  action**: panel renders, dropdown works, plot is editable.
  Recovery on the next plot open is automatic — once
  `debrief-config` is reachable again, persistence resumes.

## Assumptions

- **Plot identity is stable enough**: We assume the plot's STAC item
  path (`stacItemPath` / `itemPath`, already used by hosts to
  identify open plots) is a sufficient persistence key. Moving a
  plot to a new path forfeits the persistence record; this is
  acceptable per Edge Cases.
- **`debrief-config` is the right home**: Per the backlog steer that
  option (b) is the "lighter-touch starting point", the feature lives
  in the existing user-state service rather than extending the
  LinkML Storyboard schema. The schema-modification path (option (a))
  is **out of scope** for this spec; if a future need to share a
  pinned selection across users emerges (e.g. "the published
  storyboard for this exercise"), that is a separate, larger feature.
- **Per-host persistence, not cross-host sync**: The user-state
  service is per-machine and per-user; if both hosts on the same
  machine happen to share that store, cross-host sync emerges
  naturally, but the spec does not require it. An organisation that
  configures hosts to point at separate user-state stores will see
  per-host persistence only — that is acceptable.
- **No migration of existing plots is required**: First open of any
  plot under the new behaviour is indistinguishable from today; the
  persistence record only starts existing the first time the analyst
  overrides the active Storyboard. There are no pre-existing
  records to migrate.
- **Provenance is not the right place for this**: Active-Storyboard
  selection is a UI-state act, not an edit to the plot, and per
  FR-014 it MUST NOT enter the plot's `provenance` chain. This keeps
  plot diffs noise-free and avoids leaking one user's UI history
  into shared plot files.

## Dependencies

- **`debrief-config` user-state service** must already expose a
  per-user key-value or sectioned store on every host that mounts
  the Storyboard panel. (The Python side already does — see
  `services/config/README.md`. The TypeScript side must offer
  equivalent read/write of arbitrary user state; if it does not yet
  expose a section suitable for plot-keyed records, a thin
  accessor in `@debrief/config` is the implementation cost — but
  the API surface is not a concern for this spec.)
- **#235 storyboard capture & maintenance UX** ships first; this
  spec amends one paragraph of #235 research §8 ("Active-Storyboard
  selection is session-scoped, not persisted") to "Active-Storyboard
  selection is persisted per-user, per-plot via #237".
- **#215 storyboarding schema + CRUD core** is unchanged. No
  `is_active` slot is added to `StoryboardFeature`; `getActiveStoryboardDefault()`
  remains the default-selection rule.

## Out of Scope

- **Schema-level persistence (option (a))**: Adding an `is_active`
  slot on `StoryboardFeature` in the LinkML schema is explicitly
  deferred. The backlog flagged this as the heavier of the two
  options and the lighter option is sufficient for the analyst pain
  point; revisit only if a "published / shared" pinned selection
  becomes a real requirement.
- **Cross-machine or cross-account sync**: Two analysts on different
  workstations, or one analyst across two machines, do not share
  pinned selections. Adding a sync layer would be a larger feature
  with auth, conflict-resolution, and online-mode questions that
  Article I (offline by default) discourages.
- **Pin-selection UI on the panel**: This spec does not add a
  visual "pinned" indicator, "clear pin" affordance, or any other
  UI surface to the panel. The header dropdown is unchanged. If
  user research later shows analysts want to see "this plot is
  pinned to X for me", that is a separate UX feature.
- **Storyboard ordering, listing UX, or selection-by-name**: Any
  Storyboard-list affordances beyond what #235 already ships are out
  of scope.
