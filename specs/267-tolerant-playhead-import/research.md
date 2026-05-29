# Research: Tolerant import for out-of-window saved playhead

**Feature**: `267-tolerant-playhead-import`
**Phase**: 0 (outline & research)
**Date**: 2026-05-26

There were no `NEEDS CLARIFICATION` markers in the Technical Context — the stack is fully determined (this is a behavioural amendment to spec-261's TypeScript `SystemState` layer, no new tech). The "research" here is the set of design decisions that shape the amendment. Each is resolved below with rationale and the alternatives rejected.

---

## R-001 — Where does the clamp + diagnostic live? *(reconciled to 261 as merged)*

**Decision**: The clamp decision is computed in `validate.ts`'s `checkTemporalCrossField` (which is refactored to return a severity-split `TemporalCrossFieldResult`), and **applied in `read.ts`** — the existing throw site. `read.ts` gains an optional `playheadClamps` sink; on the `recoverable-playhead` result it sets the parsed `current_time` to the window boundary and pushes a `PlayheadClampDiagnostic`. `start>end`/unparseable stay `fatal` and still throw. `store-bridge.hydrateStoreFromFeatures` owns the sink and returns it to the host.

**Why this differs from the original plan**: the original R-001 targeted an `applyTemporalReconciliation` function and a `validate.ts`-only throw. **Neither matches 261 as merged.** 261 has no `reconcile.ts` and no `applyTemporalReconciliation`; the *only* place that throws `cross-field-invariant` is `read.ts` (driven by `checkTemporalCrossField`'s string return); and the both-host load entry is `store-bridge.hydrateStoreFromFeatures` (not `persistence/load.ts`, which doesn't exist). So the clamp must live where the throw lives — `read.ts` — which is also the only place holding the `featureId`, the parsed `TemporalVariant`, and the verdict together.

**Rationale**:
- `read.ts` already holds everything the diagnostic needs (`featureId`, the variant, the cross-field verdict). Clamping the value *before* it enters the `SystemStateMap` means the downstream `temporalVariantToSlice` (ISO→epoch) needs **no change** — it converts the already-in-window value.
- An **optional** sink keeps `read`'s signature backward-compatible for its ~6 existing callers/tests (they pass one arg and simply recover instead of throwing); only the `read.test.ts` case that asserted a throw must flip to assert a clamp.
- Keeping `fatal` in `read.ts`'s throw path preserves 261's strict-on-import for incoherent windows — the plot fails before any store hydration (FR-005).

**Alternatives rejected**:
- *Clamp in `store-bridge`/host*: the `featureId` isn't carried into `SystemStateMap`, and host-side clamping would duplicate the rule (violates FR-010).
- *A separate `clampPlayheadToWindow` module*: unnecessary — the clamp target is always a window boundary, so the clamped value is `start_time`/`end_time` verbatim; the decision folds into `checkTemporalCrossField`.

---

## R-002 — Provenance: **OVERTURNED by 261 reality — no provenance is written**

**Original decision** (against 261's planned contract): record the heal as a `LogEntry` appended to the temporal `SystemState`'s `provenance` array on next save.

**Revised decision** (against 261 as merged): **there is no provenance to write.** 261 ships view-state SystemState markers *without* a `provenance` field — the temporal Zod schema in `validate.ts` is `.strict()` with no such slot, and `write.ts`'s header states "NO `provenance` is written on `state.*` features (FR-013 — view-state markers are lean)." Adding one would be a schema change (which this feature explicitly avoids) and would contradict 261's deliberate decision. The session `LogService` is a tool-result/file-save timeline created *after* hydrate (`openPlot.ts:292`, after the load at line 180) with no generic "info event" method — not a fit either.

**So the durable-until-healed record is the notification itself**: the clamp surfaces a non-blocking notification on **every** load of the orphaned plot (FR-003), and re-opening re-clamps idempotently, so the analyst is informed every time until they save (which persists the in-window value via `write.ts` and ends the condition — FR-008). 

**Why this is constitutionally sound**:
- Article I.3 ("users must always know the state of their data") — satisfied: the state change is announced on every load until healed; it is never silently lost.
- Article III.1 ("provenance always — every *transformation* records lineage") — **not engaged**: a load-time UI-playhead recovery is not an analytical transformation producing output, and 261 already exempted view-state markers from provenance. We do not re-litigate 261's FR-013.

**Effect on tasks**: the former provenance-write task (old T019) is **removed**; FR-007 is revised in spec.md accordingly.

---

## R-003 — Notification surface (FR-003) — coalescing dropped post-review

**Decision**: Each host renders the clamp diagnostic on its **existing** non-modal surface — VS Code `window.showWarningMessage(...)` (non-modal by default; no `{modal:true}`); web-shell's existing **`logNotification`** transient (App.tsx:276, auto-dismiss after 3 s) — **not** the #259 error banner, which is for load failures. No new notification framework is introduced (Assumption 4).

**Multi-clamp coalescing (FR-006) was dropped at /speckit.review.** Both hosts load plots **one at a time** (VS Code `openPlot`, web-shell `App.tsx` per-plot hydrate), so a single load yields at most one clamp → one notification. There is no batch/session-restore path that could stack notifications, so coalescing solved a problem that can't occur (YAGNI; Article XIV move-fast). If such a path is ever added, coalescing is captured as a backlog item.

**Rationale**:
- Reusing host-native surfaces respects Article IV.1 (the shared helper emits data; the host owns presentation) and avoids a new dependency (Article IX).
- A *warning*-level surface (not info, not error) matches the semantics: the plot opened fine, but the analyst should know their saved position was adjusted.

**Alternatives rejected**:
- *Modal dialog*: explicitly forbidden (NG-003).
- *Building coalescing now*: speculative — no multi-plot load path exists (deferred to backlog).

---

## R-004 — Comparison space: ISO timestamps vs epoch milliseconds

**Decision**: Perform the in-window *test* in **epoch space** via `Date.parse` (exactly as the shipped `checkTemporalCrossField` already does — `validate.ts` lines 95-111), inside `checkTemporalCrossField`. The clamped **value** is not recomputed — it is the relevant window boundary's *verbatim ISO string* (`v.start_time` or `v.end_time`). So there is no epoch→ISO formatting step and no float/round-trip drift.

**Rationale**:
- The comparison already lives in `checkTemporalCrossField` using `Date.parse` — reusing it means one comparison semantics, no new arithmetic, no change to `mapping.ts`/`temporalVariantToSlice` (which converts the already-clamped ISO value to the store's epoch `currentTime`).
- Returning the boundary string verbatim is exact: the clamped playhead lands precisely on `start_time`/`end_time` as they appear in the file — no precision loss, no surprise.
- A `current_time` equal to a boundary is in-range (not clamped), matching the shipped `current < start || current > end` test (strict outside).

**Alternatives rejected**:
- *Recompute the clamp in epoch then format back to ISO*: introduces a formatting round-trip and potential drift for no benefit — the target is always a boundary we already hold as a string.
- *Lexicographic ISO comparison*: brittle across equivalent representations; the shipped code uses `Date.parse`, so we match it.

---

## R-005 — Sequencing relative to spec-261 — **RESOLVED (261 merged)**

**Decision**: The hard dependency is satisfied — spec-261 **merged 2026-05-29**. All amendment targets exist (`validate.ts`, `read.ts`, `store-bridge.ts`, `errors.ts`). The T001 gate (verify 261 present) is now a quick confirmation rather than a blocker.

**What merging revealed** (and forced into the artifacts):
- 261's shipped shape ≠ its planned `contracts/system-state-helper.ts.md`. No `reconcile.ts`, no `persistence/load.ts`, no `applyTemporalReconciliation`, and **no provenance** on view-state markers.
- The real entry point is `store-bridge.hydrateStoreFromFeatures` (both hosts), the real throw site is `read.ts`, the real cross-field check is `checkTemporalCrossField`.
- The temporal variant migrated more fields than 261's data-model predicted (`filter_start_time`, `filter_end_time`, `display_mode`, `step_size`, `playback_rate`) — irrelevant to this feature (only `current_time` is touched) but noted for accuracy.

All of R-001 and R-002 above are the reconciled positions. The contract delta and data-model are rewritten against the merged code.

---

## R-006 — Should the clamp also write provenance when it *coincides* with `start>end`? (precedence, FR-005)

**Decision**: No. When a temporal feature has **both** an incoherent window and an out-of-window playhead, the incoherent-window hard error (`SystemStateLoadError`, `start>end`) is thrown in `validate.ts`/`read.ts` **before** reconciliation runs, so the clamp path is never reached (FR-005). There is exactly one outcome (the plot does not open); no clamp, no diagnostic, no partial recovery.

**Rationale**: A window where `start>end` has no valid interval to clamp into — `Math.min(Math.max(c, start), end)` would be nonsensical. Failing fast first is both correct and simplest, and matches the spec's stated precedence.

---

## Summary of decisions

| ID | Decision *(reconciled to 261 as merged, 2026-05-29)* |
|---|---|
| R-001 | Clamp decision in `checkTemporalCrossField` (severity-split result); applied in `read.ts` via an optional `playheadClamps` sink; `store-bridge.hydrateStoreFromFeatures` returns it. No `reconcile.ts` (doesn't exist). |
| R-002 | **No provenance written** — 261 ships view-state markers provenance-free (FR-013). The repeating non-blocking notification (every load until healed) is the durable-until-healed record. Old provenance task removed; FR-007 revised. |
| R-003 | Reuse host-native non-modal surfaces (`showWarningMessage` / web-shell `logNotification`); warning severity. Coalescing **dropped** (per-plot loads; deferred to backlog). |
| R-004 | Compare in epoch (`Date.parse`); the clamped value is the boundary's verbatim ISO string (no reformat drift). |
| R-005 | **Resolved** — 261 merged; T001 is now a confirmation. Shipped shape differed from planned contract; all artifacts reconciled. |
| R-006 | `start>end` is `fatal` and throws in `read.ts` before any clamp (precedence). |
