# Feature Specification: Tolerant import for out-of-window saved playhead

**Feature Branch**: `267-tolerant-playhead-import`
**Created**: 2026-05-26
**Status**: Draft
**Backlog Item**: 267 (Tech Debt, V:2 M:1 A:4 = 7, Complexity: Low)
**Input**: User description: "Out-of-window `current_time` policy — #249/spec-261 introduces an optional `current_time` field on the LinkML `SystemStateProperties` `temporal` variant (the saved playhead position) and ships strict-on-import validation: if a plot's saved `current_time` falls outside its `[start_time, end_time]` window, the load fails with `SystemStateLoadError(kind='cross-field-invariant')`. This ticket revisits that policy to add a tolerant alternative: clamp the playhead to the nearest window edge with a non-modal toast, OR offer 'open ignoring saved playhead' as a fallback action, so analysts whose plots have orphaned playheads (e.g. after trimming the analytical window post-scrub) can still load them."

## Background

Spec-261 (migrate session-state slices into in-plot `SystemState` features) adds a `current_time` field to the temporal `SystemStateProperties` variant — the saved playhead position that rides with the plot so a colleague opens at the same moment the saver was viewing. To keep the data contract clean for the pre-release window, spec-261 FR-018 ships **strict-on-import** validation: if a plot's saved `current_time` lies outside its `[start_time, end_time]` window, the entire load is rejected with a structured `SystemStateLoadError` of kind `cross-field-invariant`. This is the correct Constitution Article XIV.4 default ("strict on import, fail fast") for v4.x.

But the strict default can be user-hostile in one realistic, recoverable situation: an analyst (or a colleague who shared the plot) scrubs the playhead to a moment, then later **trims the analytical window** to a tighter span and saves. The playhead is now orphaned outside the new window. The window itself is perfectly coherent; only the playhead points outside it. Under the strict policy the plot **fails to open at all** — a heavy penalty for a trivially recoverable mismatch on a non-critical field.

Constitution Article XIV's trigger note explicitly anticipates this: *"Clauses XIV.4 and XIV.5 should be revisited [upon v4.0.0 release] to introduce appropriate tolerance for real-world data ingestion."* This feature is that deliberate, scoped revisit — introducing tolerance for the **one recoverable sub-case** (orphaned playhead inside a coherent window) while preserving fail-fast strictness for genuinely **incoherent** data (a window where `start_time > end_time`, which has no valid position to recover to).

The change is narrow: the playhead is a recoverable, non-destructive field. Recovering it loses no analytical information — the analyst can re-scrub at will. By contrast, an incoherent window is a structural defect that must still surface loudly.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Open a plot with an orphaned playhead (Priority: P1)

An analyst opens a plot whose saved playhead sits outside the saved analytical window (because the window was trimmed after the playhead was set). Today the open fails outright. After this work, the plot **opens successfully**: the playhead is moved to the nearest edge of the window, and a non-blocking notification tells the analyst that the saved playhead was out of range and was adjusted.

**Why this priority**: This is the entire point of the ticket — the friction case that makes the strict policy user-hostile. Without it, analysts hit a dead-end ("this plot won't open") on a recoverable condition. Delivering this story alone resolves the reported friction.

**Independent Test**: Hand-craft (or save then trim) a plot whose temporal `SystemState` has `current_time` earlier than `start_time` (and a second whose `current_time` is later than `end_time`). Open each in both hosts. The plot opens; the playhead lands on `start_time` (former) / `end_time` (latter); a non-modal notification is shown; no `SystemStateLoadError` is thrown.

**Acceptance Scenarios**:

1. **Given** a plot whose temporal `SystemState` has `current_time` **before** `start_time` within an otherwise valid window, **When** the plot is opened in either host, **Then** the plot loads, the in-memory playhead is set to `start_time`, and a non-blocking notification reports that the saved playhead was out of range and was clamped to the window start.
2. **Given** a plot whose temporal `SystemState` has `current_time` **after** `end_time` within an otherwise valid window, **When** the plot is opened in either host, **Then** the plot loads, the in-memory playhead is set to `end_time`, and a non-blocking notification reports the clamp to the window end.
3. **Given** a plot whose `current_time` is **within** `[start_time, end_time]` (the normal case), **When** the plot is opened, **Then** the playhead is honoured exactly as saved and **no** notification is shown (the tolerant path is inert for valid data).
4. **Given** the analyst dismisses (or ignores) the notification and continues working, **When** they later perform an explicit save, **Then** the stored `current_time` is rewritten to the clamped (now in-window) value, so the orphaned value is healed in the file.

---

### User Story 2 — Incoherent window still fails fast (Priority: P1)

An analyst opens a plot whose saved temporal window is itself incoherent (`start_time > end_time`). This is a structural defect with no valid playhead position to recover to. The strict, loud failure from spec-261 FR-018 is **preserved** — this story exists to guarantee the tolerant path does not accidentally swallow genuinely broken data.

**Why this priority**: Equal-priority guard rail. The value of the tolerant path depends entirely on it being *narrow*. If tolerance leaked into the incoherent-window case, the feature would mask real corruption — the exact failure mode Article XIV.4 protects against. This story is the boundary that keeps the relaxation honest.

**Independent Test**: Hand-craft a plot whose temporal `SystemState` has `start_time` later than `end_time`. Open it in both hosts. The load fails with the existing structured error (`SystemStateLoadError`, kind `cross-field-invariant`) identifying the offending feature and field values — no clamping, no silent recovery.

**Acceptance Scenarios**:

1. **Given** a plot whose temporal `SystemState` has `start_time > end_time`, **When** the plot is opened in either host, **Then** the load fails with the structured cross-field-invariant error carrying the offending feature ID and the field values — identical to spec-261 behaviour.
2. **Given** a plot with **both** an incoherent window **and** an out-of-window playhead, **When** opened, **Then** the incoherent-window failure takes precedence (the plot does not open) — the playhead-clamp path is never reached for an incoherent window.

---

### Edge Cases

- **`current_time` equals a boundary** (`== start_time` or `== end_time`): in-range, honoured exactly, no clamp, no notification.
- **`current_time` absent**: nothing to validate or clamp; unchanged from spec-261 (the field is optional).
- **Window is a single instant** (`start_time == end_time`): any out-of-range `current_time` clamps to that single instant; the notification still fires.
- **Multiple plots opened in a batch / session restore**, several with orphaned playheads: each clamp is surfaced; notifications must not stack into a blocking wall (see FR-006 — coalesce or rate-limit rather than block).
- **Clamp occurs but analyst never saves**: the file's stored `current_time` remains orphaned; only the in-memory playhead is corrected. Re-opening repeats the clamp + notification (idempotent, non-destructive).
- **Floating boundary precision**: comparison uses the same timestamp precision spec-261 uses for the window; a `current_time` within round-trip tolerance of a boundary is treated as in-range, not clamped.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: When a temporal `SystemState` feature has a coherent window (`start_time <= end_time`) but a `current_time` that lies **outside** `[start_time, end_time]`, the load MUST succeed (no `SystemStateLoadError` is raised for this sub-case).
- **FR-002**: In the FR-001 case, the in-memory playhead MUST be set to the nearest window edge — `start_time` when `current_time < start_time`, `end_time` when `current_time > end_time`.
- **FR-003**: The clamp MUST NOT be silent (Constitution Article I.3 — "users must always know the state of their data"). Each clamp MUST surface a non-blocking, non-modal notification to the analyst stating that the saved playhead was out of the plot's time range and was adjusted, and to which edge.
- **FR-004**: The incoherent-window case (`start_time > end_time`) MUST continue to fail with the existing structured `SystemStateLoadError` (kind `cross-field-invariant`) defined by spec-261 FR-018, carrying the offending feature ID and field values. The tolerant path MUST NOT relax this case.
- **FR-005**: When both defects are present on the same feature (incoherent window AND out-of-window playhead), the incoherent-window failure MUST take precedence — the plot does not open and the playhead clamp is not attempted.
- **FR-006**: When multiple clamps occur within a single load/restore operation, the notifications MUST NOT block the analyst (e.g. coalesce into one summary notification or rate-limit) — opening a plot or restoring a session must never require dismissing a modal per orphaned playhead.
- **FR-007**: The clamp MUST be recorded as provenance (Constitution Article III.1 — provenance always) on the temporal `SystemState`'s lineage, capturing that an out-of-window saved playhead was clamped to a named edge on load, including the original out-of-window value and the resulting in-window value.
- **FR-008**: The clamp MUST be applied in-memory only on load; it MUST NOT by itself mark the plot dirty or trigger an automatic save (preserving spec-261 FR-017 — playhead changes persist only via explicit save). On the next explicit save, the now-in-window playhead value is written, healing the stored value (see FR-001 acceptance scenario 4).
- **FR-009**: Valid data MUST be unaffected: when `current_time` is within `[start_time, end_time]` (or absent), behaviour is byte-for-byte identical to spec-261 — the playhead is honoured as saved and no notification fires.
- **FR-010**: The tolerant load behaviour MUST apply consistently across both hosts (VS Code extension and web-shell), routed through the same shared `SystemState` load helper spec-261 introduces (FR-011/FR-012) — no host-private divergence in the clamp rule.

### Key Entities

- **Temporal `SystemState` feature**: the GeoJSON `SystemState` feature (from spec-261) whose properties carry `start_time`, `end_time`, and optional `current_time`. This feature is the sole subject of the out-of-window check.
- **Out-of-window playhead**: a saved `current_time` that lies outside an otherwise-coherent `[start_time, end_time]` window. Recoverable by clamping. The unit this feature heals.
- **Incoherent window**: a saved temporal window where `start_time > end_time`. Unrecoverable; remains a hard load error. The boundary this feature must not cross.
- **Clamp notification**: the non-blocking, non-modal message surfaced to the analyst when a clamp occurs, naming the adjustment.

## User Interface Flow

### Decision Analysis

- **Primary Goal**: Open a plot that has an orphaned (out-of-window) saved playhead, without losing the rest of the plot, and understand that the playhead was adjusted.
- **Key Decision(s)**:
  1. None required to open — the plot loads automatically with the playhead clamped (zero-click recovery). The analyst's only decision is whether to act on the notification (e.g. re-scrub to a deliberate moment, or save to heal the stored value).
- **Decision Inputs**: The notification states that the saved playhead fell outside the plot's time range and was moved to the window start/end, so the analyst can decide whether the clamped position is acceptable or wants re-scrubbing.

### Screen Progression

| Step | Screen/State | User Action | Result |
|------|--------------|-------------|--------|
| 1 | Analyst opens a plot with an out-of-window saved playhead | Open the plot | Plot loads normally; playhead positioned at the nearest window edge |
| 2 | Plot open, non-modal notification visible | (No action required) | Notification reports the playhead was out of range and was adjusted to the window start/end |
| 3 | Plot open | Optionally dismiss the notification, re-scrub, and/or save | On explicit save, the stored playhead is healed to the in-window value |

### UI States

- **Empty State**: Not applicable — no playhead value (or in-range playhead) means the tolerant path is inert and nothing is shown.
- **Loading State**: The plot loads as normal; the clamp is computed during load with no additional blocking step.
- **Error State**: Reserved for the **incoherent-window** case only — the existing load-failure surface from spec-261 (the plot fails to open with a structured error). The out-of-window playhead case is deliberately *not* an error state.
- **Success State**: Plot is open and usable; a transient, non-blocking notification confirms the playhead adjustment and then auto-dismisses or can be dismissed.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of plots that previously failed to open *solely* because of an out-of-window saved playhead (coherent window) now open successfully, with the playhead positioned at the correct nearest window edge.
- **SC-002**: 100% of plots with an incoherent window (`start_time > end_time`) continue to fail to open with the same structured error as before — zero regressions in the fail-fast guarantee for genuinely broken data.
- **SC-003**: Every clamp produces exactly one analyst-visible, non-blocking notification (no silent recovery, no modal/blocking dialog); valid in-range/absent playheads produce zero notifications.
- **SC-004**: Opening or restoring a session containing N plots with orphaned playheads requires zero blocking dismissals to proceed (notifications are non-blocking / coalesced).
- **SC-005**: After a clamp followed by an explicit save, re-opening the same plot produces no clamp and no notification (the stored value was healed) — verifying the round-trip closes the loop.
- **SC-006**: Behaviour for valid plots (in-range or absent `current_time`) is unchanged versus spec-261 — the existing session-state and schema-adherence test suites pass without modification.
- **SC-007**: The clamp rule is exercised identically in both hosts (VS Code, web-shell) via the shared load helper — a single test fixture set drives both, with no host-specific clamp logic.

## Assumptions

1. **Spec-261 ships first and provides the substrate.** This feature modifies spec-261's load-time validator (FR-018) and depends on its shared `SystemState` load helper (FR-011/FR-012), the temporal `current_time` field (FR-016), and the structured `SystemStateLoadError` type. Spec-261 is currently planned/tasked but not yet implemented; this feature assumes it lands before (or is co-sequenced with) this work. If spec-261's contract shifts, this feature inherits the change.
2. **Clamp-to-nearest-edge is the chosen tolerant behaviour** (over the alternative "open ignoring saved playhead", which would discard the playhead to `start_time` regardless of direction). Clamping preserves maximum analyst intent: when the playhead overshot the window end, the nearest valid moment is the end, not the start. When it undershot the start, both strategies coincide. The `/speckit.clarify` step may revisit this if a different default is preferred.
3. **The clamp does not auto-mark the plot dirty.** Consistent with spec-261 FR-017 (playhead movement is not a dirty trigger), the in-memory correction does not by itself force a save. Healing the stored value happens on the analyst's next explicit save. (Alternative considered: auto-dirty to nudge a heal — rejected as contradicting FR-017 and as surprising for a read-only open.)
4. **Notifications use each host's existing non-modal notification surface** (VS Code's information notifications; web-shell's toast equivalent). No new notification framework is introduced.
5. **Timestamp comparison reuses spec-261's precision and tolerance** for the `[start_time, end_time]` window — this feature does not introduce a new comparison semantics; it only changes the *action taken* when the existing comparison finds `current_time` out of range.
6. **Scope is the temporal variant's `current_time` only.** No other cross-field invariant, variant, or field is touched. The spatial and selection variants and the `active_storyboard` variant are unaffected.

## Dependencies

- **Hard dependency on spec-261** (`261-session-state-systemstate`): the `current_time` field (FR-016), the shared `SystemState` load helper (FR-011/FR-012), the load-time cross-field validator and `SystemStateLoadError` (FR-018), and the no-dirty-on-playhead contract (FR-017). This feature is a direct amendment to FR-018's policy.
- **Constitution Article XIV trigger point**: this feature is the deliberate post-v4.0.0 (or analyst-feedback-driven) introduction of tolerance that Article XIV's trigger note authorises for Clauses XIV.4/XIV.5.

## Out of Scope

- **NG-001**: No relaxation of the incoherent-window failure (`start_time > end_time`) — it remains a hard, structured load error.
- **NG-002**: No tolerance added to any other `SystemState` variant, field, or cross-field invariant (spatial, selection, active_storyboard are untouched).
- **NG-003**: No new "open ignoring saved playhead" explicit user action / dialog. The recovery is automatic (clamp + notify); the alternative interactive-discard UX is explicitly not built (see Assumption 2).
- **NG-004**: No change to the dirty/save contract (Assumption 3, spec-261 FR-017) — the clamp never auto-saves.
- **NG-005**: No general-purpose "tolerant import" framework. This is a single, named, recoverable case; broader real-world-data tolerance remains a separate, deliberate post-v4.0.0 effort under Article XIV's trigger.
