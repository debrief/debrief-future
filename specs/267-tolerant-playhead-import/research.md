# Research: Tolerant import for out-of-window saved playhead

**Feature**: `267-tolerant-playhead-import`
**Phase**: 0 (outline & research)
**Date**: 2026-05-26

There were no `NEEDS CLARIFICATION` markers in the Technical Context — the stack is fully determined (this is a behavioural amendment to spec-261's TypeScript `SystemState` layer, no new tech). The "research" here is the set of design decisions that shape the amendment. Each is resolved below with rationale and the alternatives rejected.

---

## R-001 — Where does the clamp + diagnostic live in spec-261's helper?

**Decision**: The `current_time ∈ [start_time, end_time]` rule moves out of `validate.ts`'s *throwing* cross-field check and into **temporal reconciliation** (`applyTemporalReconciliation`). `validate.ts` keeps throwing only for `start_time > end_time` (and all structural errors). Reconciliation performs the clamp via a pure `clampPlayheadToWindow()` helper and returns a `PlayheadClampDiagnostic | null` alongside the hydrated slice.

**Rationale**:
- Spec-261's `readSystemStateFromFeatureCollection(fc): SystemStateMap` is a *pure parse* of the wire shape. Out-of-window `current_time` is **schema-valid** (the cross-field invariant is a runtime rule, not a LinkML rule), so `read` should return it faithfully; the *recovery action* belongs one layer down, at the store-hydration boundary where epoch-ms values and the window are already in hand.
- `applyTemporalReconciliation` already converts the plot's ISO `current_time` into the store's epoch-ms `currentTime` and already owns "what value does the in-memory playhead take". Clamping is a natural extension of that mapping — it is *the* place that decides the hydrated value.
- Keeping the hard-fail (`start>end`) in `validate.ts`/`read.ts` preserves spec-261's "throw before reconciliation" contract for genuinely-broken windows, so the plot still fails to open before any store hydration is attempted (FR-005).

**Alternatives rejected**:
- *Clamp inside `validate.ts`, mutate the returned `SystemStateMap`*: would make `read` non-faithful to the wire (it would silently rewrite a field), and `read` has no clean channel to surface a diagnostic without a signature change anyway.
- *Clamp in the host load paths*: would duplicate the rule across VS Code and web-shell, violating FR-010 (single-sourced clamp rule).

---

## R-002 — Provenance timing: when is the heal recorded as a `LogEntry`? (FR-007 vs FR-008)

**Decision**: The clamp is applied **in memory** at load and produces a `PlayheadClampDiagnostic` carried in session memory. The durable provenance `LogEntry` (capturing original out-of-window value → clamped value) is appended to the temporal `SystemState`'s `provenance` array **when the heal is persisted on the next explicit save** — via spec-261's existing `writeSystemStateIntoFeatureCollection` write path, which already appends a `LogEntry` per save. If the analyst never saves, no provenance is written (nothing was persisted) and the orphaned value remains in the file — re-opening simply re-clamps and re-notifies (idempotent).

**Rationale**:
- FR-008 (and spec-261 FR-017) forbid auto-marking the plot dirty or auto-saving on a read. Writing provenance at load would require a file write → contradiction. So provenance must wait for the save that actually persists the healed value.
- The *immediate* "user must know" requirement (Article I.3 / FR-003) is satisfied by the non-blocking notification at load. Provenance (FR-007) is the *durable* record that materialises once the heal is committed. The two requirements are complementary, not simultaneous.
- The save-time `LogEntry` already exists in spec-261's write path; this feature enriches that entry (when a pending clamp diagnostic exists for the temporal variant) with the original out-of-window value, rather than inventing a separate provenance write.

**Alternatives rejected**:
- *Write provenance immediately at load*: violates FR-008 (would dirty/write on open).
- *Never record provenance, rely only on the toast*: violates FR-007 (provenance always, Article III.1) — the heal must leave a durable trace once it is persisted.

**Spec note**: this resolves the apparent FR-007↔FR-008 tension by sequencing — surfaced immediately (toast), recorded durably at next save. No spec change required; recorded here for the implementer.

---

## R-003 — Notification surface & multi-clamp coalescing (FR-003, FR-006)

**Decision**: Each host renders the clamp diagnostic on its **existing** non-modal surface — VS Code `window.showWarningMessage(...)` (non-modal by default; no `{modal:true}`), web-shell's existing toast component. When a single load/restore operation produces **multiple** clamp diagnostics (session restore of N plots), the host coalesces them into **one** summary notification (e.g. "Adjusted the saved time-cursor on 3 plots that fell outside their time range"). No new notification framework is introduced (Assumption 4).

**Rationale**:
- Reusing host-native surfaces respects Article IV.1 (the shared helper emits data; the host owns presentation) and avoids a new dependency (Article IX).
- Coalescing is the cheapest way to satisfy FR-006's "must not block / must not stack a wall of toasts" — a count-summarised single notification scales to any N.
- A *warning*-level surface (not info, not error) matches the semantics: the plot opened fine (not an error), but the analyst should know their saved position was adjusted (more than mere info).

**Alternatives rejected**:
- *One toast per clamp*: fails FR-006 under session restore.
- *Status-bar-only indicator*: too easy to miss; weakens the Article I.3 "users must know" guarantee for a state change they didn't initiate.
- *Modal dialog*: explicitly forbidden (FR-006, NG-003).

---

## R-004 — Comparison space: ISO timestamps vs epoch milliseconds

**Decision**: Perform the in-window test and the clamp in **epoch-millisecond space**, inside `applyTemporalReconciliation`, reusing the same conversion spec-261 uses to map ISO `start_time`/`end_time`/`current_time` → the store's `timeRange.{start,end}` / `currentTime` (all `number` epoch-ms, per `services/session-state/src/store/slices/temporal.ts`). The clamp is `Math.min(Math.max(current, start), end)` — identical arithmetic to the store's existing `stepForward`/`stepBackward` clamp.

**Rationale**:
- The store already represents time as epoch-ms and already clamps in that space; matching it avoids a second comparison semantics and reuses the precision/tolerance spec-261 establishes (Assumption 5).
- A `current_time` within float/round-trip tolerance of a boundary resolves to in-range (no clamp) for free, since the epoch-ms values are the same integers spec-261 round-trips.

**Alternatives rejected**:
- *Lexicographic ISO-string comparison*: brittle across equivalent representations (`Z` vs `+00:00`, fractional seconds); the store doesn't use it.

---

## R-005 — Sequencing relative to spec-261 (the hard dependency)

**Decision**: This feature **must land after, or be co-sequenced with, spec-261**. Spec-261 is currently planned/tasked but **not implemented** — none of the files this feature edits (`system-state/validate.ts`, `reconcile.ts`, `persistence/load.ts`, `SystemStateLoadError`) exist yet. `/speckit.tasks` for this feature should encode that the first concrete task is *gated* on spec-261's helper + load path being present.

**Rationale**:
- The feature is a behavioural amendment to spec-261's code; there is nothing to amend until 261 ships. The spec records this as a hard dependency (Assumption 1, Dependencies §).
- Co-sequencing option: because the relaxation is small and well-understood, the team *could* fold it into spec-261's delivery (changing FR-018 there directly) rather than shipping it as a separate follow-up. That is a delivery-ordering call for the team; this plan assumes the separate-follow-up path (the ticket's framing) but flags the fold-in as viable if 261 hasn't merged when this work starts.

**Alternatives rejected**:
- *Implement now against a stubbed helper*: would create throwaway scaffolding that diverges from 261's actual shape — wasteful and risky.

---

## R-006 — Should the clamp also write provenance when it *coincides* with `start>end`? (precedence, FR-005)

**Decision**: No. When a temporal feature has **both** an incoherent window and an out-of-window playhead, the incoherent-window hard error (`SystemStateLoadError`, `start>end`) is thrown in `validate.ts`/`read.ts` **before** reconciliation runs, so the clamp path is never reached (FR-005). There is exactly one outcome (the plot does not open); no clamp, no diagnostic, no partial recovery.

**Rationale**: A window where `start>end` has no valid interval to clamp into — `Math.min(Math.max(c, start), end)` would be nonsensical. Failing fast first is both correct and simplest, and matches the spec's stated precedence.

---

## Summary of decisions

| ID | Decision |
|---|---|
| R-001 | Clamp + diagnostic live in `applyTemporalReconciliation`; `validate.ts` throws only for `start>end`. |
| R-002 | Heal provenance `LogEntry` written at next save (not at load); immediate awareness via toast. |
| R-003 | Reuse host-native non-modal notification surfaces; coalesce multi-clamp into one summary; warning severity. |
| R-004 | Compare/clamp in epoch-ms space, reusing the store's existing arithmetic. |
| R-005 | Hard dependency on spec-261; tasks gated on 261's helper existing. Fold-in into 261 is a viable alternative ordering. |
| R-006 | `start>end` takes precedence and throws before any clamp is attempted. |
