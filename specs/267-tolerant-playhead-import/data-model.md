# Data Model: Tolerant import for out-of-window saved playhead

**Feature**: `267-tolerant-playhead-import`
**Phase**: 1 (design)
**Date**: 2026-05-26

This feature introduces **no schema (LinkML) change** — `current_time` already exists on the temporal `SystemStateProperties` variant (spec-261 FR-016). It introduces **one new runtime type** (a load diagnostic) and **amends one cross-field validation rule**. Everything below lives in TypeScript inside `services/session-state/src/system-state/`.

---

## Entity 1: `PlayheadClampDiagnostic` (NEW — runtime only)

The structured record emitted when an out-of-window saved playhead is clamped on load. It is data, not UI — the host consumes it to render a notification (Article IV.1) and, on next save, to enrich the provenance `LogEntry`.

```typescript
/**
 * Emitted by applyTemporalReconciliation when a coherent-window temporal SystemState
 * has a current_time outside [start_time, end_time]. Carried in session memory until
 * (a) surfaced as a non-blocking notification and (b) recorded as provenance on next save.
 */
export interface PlayheadClampDiagnostic {
  readonly kind: 'playhead-clamped';
  /** id of the offending temporal SystemState Feature (for provenance + message detail). */
  readonly featureId: string;
  /** Which edge the playhead was clamped to. */
  readonly edge: 'start' | 'end';
  /** The original out-of-window saved playhead, as an ISO-8601 timestamp (verbatim from the file). */
  readonly originalCurrentTime: string;
  /** The resulting in-window value the playhead was set to, as an ISO-8601 timestamp. */
  readonly clampedCurrentTime: string;
}
```

**Field notes**
- `kind` is a literal discriminator so the diagnostics channel can carry future recoverable-load kinds without a breaking change.
- `edge` lets the notification say "moved to the start/end of the time range" without the host re-deriving direction.
- `originalCurrentTime` / `clampedCurrentTime` are kept as ISO strings (the wire form) so they can be written verbatim into the provenance `LogEntry` at save time (R-002) and shown in the message; the *comparison/clamp* happens in epoch-ms (R-004) but the diagnostic reports the human-facing ISO form.

**Invariants**
- Emitted **only** for a coherent window (`start_time ≤ end_time`) where `current_time` is strictly outside `[start_time, end_time]`. Never emitted for in-range/absent `current_time` (FR-009) or for an incoherent window (FR-005 — that path throws before reconciliation).
- At most one per temporal `SystemState` per load (there is at most one temporal feature per plot).

---

## Entity 2: Amended cross-field validation rule (`validate.ts`)

Spec-261's `data-model.md` validation table has two temporal cross-field rows. This feature **splits their severity**:

| Invariant | Variant | Spec-261 behaviour (before) | This feature (after) |
|---|---|---|---|
| `start_time ≤ end_time` | `temporal` | Throws `SystemStateLoadError(kind='cross-field-invariant')` | **Unchanged** — still throws. The incoherent-window guard rail (FR-004). |
| `current_time ∈ [start_time, end_time]` (when present) | `temporal` | Throws `SystemStateLoadError(kind='cross-field-invariant')` | **Recoverable** — no longer throws. Detected during reconciliation; clamps to nearest edge and emits `PlayheadClampDiagnostic` (FR-001, FR-002). |

The first rule stays in `validate.ts` (evaluated before reconciliation, so the plot fails to open before any store hydration). The second rule's *detection + action* moves into `applyTemporalReconciliation`.

---

## Entity 3: `clampPlayheadToWindow` (NEW — pure function)

```typescript
/**
 * Pure clamp in epoch-ms space (matches the store's stepForward/stepBackward arithmetic).
 * Precondition: start <= end (incoherent windows are rejected upstream in validate.ts).
 *
 * Returns the in-window value and, when a clamp occurred, the edge it was clamped to.
 */
export function clampPlayheadToWindow(args: {
  currentMs: number;
  startMs: number;
  endMs: number;
}): { valueMs: number; clampedTo: 'start' | 'end' | null };
```

- `currentMs < startMs` → `{ valueMs: startMs, clampedTo: 'start' }`
- `currentMs > endMs`   → `{ valueMs: endMs,   clampedTo: 'end' }`
- otherwise (in range, incl. boundary)`→ `{ valueMs: currentMs, clampedTo: null }`
- Degenerate single instant (`startMs === endMs`): any out-of-range value clamps to that instant; `clampedTo` reflects the direction it came from.

---

## Entity 4: `applyTemporalReconciliation` return shape (AMENDED)

Spec-261's contract: `applyTemporalReconciliation(fromPlot, fromSidecar): HydratedTemporalSlice`. This feature changes the return so the clamp diagnostic can flow to the host:

```typescript
export function applyTemporalReconciliation(
  fromPlot: SystemStateMap['temporal'] | undefined,
  fromSidecar: SidecarTemporalSlice | undefined
): { slice: HydratedTemporalSlice; clamp: PlayheadClampDiagnostic | null };
```

- `clamp` is non-null only in the FR-001 case. The `slice.currentTime` reflects the clamped epoch-ms value.
- When `fromPlot` is absent or `current_time` is in range/absent, `clamp` is `null` and `slice` is byte-identical to spec-261's behaviour (FR-009).

(Spec-261 is unshipped, so this is a contract refinement of 261, not a breaking change to released code — see `contracts/system-state-helper-delta.md`.)

---

## Entity 5: Load result diagnostics channel (`persistence/load.ts`, AMENDED)

Spec-261's `load.ts` orchestrates: read FC → `readSystemStateFromFeatureCollection` → `applyXReconciliation` → hydrate store (+ read sidecar). This feature has `load.ts` **collect** any `PlayheadClampDiagnostic` produced by `applyTemporalReconciliation` and expose it to the caller so the host can render it.

```typescript
// Illustrative — exact shape pinned in the helper delta contract.
interface LoadSessionResult {
  // ...existing spec-261 load result fields...
  /** Non-fatal recoverable-load diagnostics surfaced to the host for notification. Empty when none. */
  clampDiagnostics: PlayheadClampDiagnostic[];
}
```

- Hard errors (`SystemStateLoadError`, incl. `start>end`) still **throw** out of `load.ts` — they are not added to this array (FR-004, FR-005).
- The array carries diagnostics across **all** plots loaded in one operation (session restore), enabling host coalescing (FR-006).

---

## Relationships

```text
  temporal SystemState (wire)        validate.ts
  ┌───────────────────────┐        ┌──────────────────────────────┐
  │ start_time            │───────▶│ start>end?  ── yes ──▶ throw   │  (FR-004 hard fail, unchanged)
  │ end_time              │        │   no                          │
  │ current_time (maybe   │        └───────────────┬───────────────┘
  │   out of window)      │                        │ (coherent window)
  └───────────────────────┘                        ▼
                                   applyTemporalReconciliation
                                   ┌──────────────────────────────┐
                                   │ clampPlayheadToWindow()       │
                                   │   in range  → slice, clamp=null│
                                   │   out range → slice(clamped),  │
                                   │               clamp=Diagnostic │ (FR-001/002)
                                   └───────────────┬───────────────┘
                                                   ▼
                                   load.ts collects clampDiagnostics[]
                                                   ▼
                          host (VS Code / web-shell) renders coalesced
                          non-blocking notification (FR-003/006)
                                                   ▼
                          (next explicit save) write path appends a
                          provenance LogEntry recording original→clamped (FR-007)
```

---

## Validation rules (this feature's additions/changes)

| Rule | Enforcement point | Article / FR |
|---|---|---|
| `start_time ≤ end_time` still throws on violation | `validate.ts` (before reconciliation) | I.3, XIV.4, FR-004/005 |
| Coherent-window `current_time` out of range → clamp, do not throw | `applyTemporalReconciliation` | FR-001/002 (XIV.4 sanctioned relaxation) |
| A clamp MUST emit exactly one `PlayheadClampDiagnostic` | `applyTemporalReconciliation` | FR-003, SC-003 |
| In-range/absent `current_time` emits no diagnostic and is byte-identical to spec-261 | `applyTemporalReconciliation` | FR-009, SC-006 |
| Clamp never marks dirty / never auto-saves | host load path (no save triggered) | FR-008, spec-261 FR-017 |
| Heal recorded as provenance LogEntry on next save | spec-261 write path, enriched | III.1, FR-007 (R-002) |
| Same clamp rule on both hosts (no host-private logic) | shared helper (`session-state`) | FR-010, SC-007 |
