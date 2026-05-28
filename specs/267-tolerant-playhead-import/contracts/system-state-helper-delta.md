# Contract Delta: SystemState helper — tolerant playhead import

**Feature**: `267-tolerant-playhead-import`
**Amends**: `specs/261-session-state-systemstate/contracts/system-state-helper.ts.md`
**Module path**: `services/session-state/src/system-state/` (+ `services/session-state/src/persistence/load.ts`)

Spec-261 is **unshipped**, so this is a *refinement of an in-flight contract*, not a breaking change to released code. It expresses exactly the deltas spec-261's helper needs to support the tolerant playhead-import behaviour. Everything in spec-261's contract not mentioned here is unchanged.

---

## Δ1 — New exported type: `PlayheadClampDiagnostic`

Added to the helper's public surface (`services/session-state/src/system-state/index.ts`, re-exported from `@debrief/session-state`).

```typescript
export interface PlayheadClampDiagnostic {
  readonly kind: 'playhead-clamped';
  readonly featureId: string;
  readonly edge: 'start' | 'end';
  readonly originalCurrentTime: string;   // ISO-8601, verbatim from the file
  readonly clampedCurrentTime: string;    // ISO-8601, the in-window value applied
}
```

---

## Δ2 — New exported pure helper: `clampPlayheadToWindow`

```typescript
export function clampPlayheadToWindow(args: {
  currentMs: number;
  startMs: number;
  endMs: number;     // precondition: startMs <= endMs (incoherent windows rejected upstream)
}): { valueMs: number; clampedTo: 'start' | 'end' | null };
```

**Observable behaviour invariants**
- Pure, deterministic, no I/O.
- `currentMs < startMs` → `{ valueMs: startMs, clampedTo: 'start' }`.
- `currentMs > endMs` → `{ valueMs: endMs, clampedTo: 'end' }`.
- `startMs ≤ currentMs ≤ endMs` → `{ valueMs: currentMs, clampedTo: null }` (boundary values are in-range; no clamp).
- Arithmetic identical to the store's `stepForward`/`stepBackward` clamp (`Math.min(Math.max(...))`).

---

## Δ3 — `validate.ts` cross-field rule severity split

Spec-261's `validate.ts` runs two temporal cross-field checks, **both** throwing `SystemStateLoadError(kind='cross-field-invariant')`. This feature changes them to:

| Invariant | Before (spec-261) | After (this feature) |
|---|---|---|
| `start_time ≤ end_time` | throws | **throws — UNCHANGED** |
| `current_time ∈ [start_time, end_time]` | throws | **no longer evaluated here** — moved to reconciliation as a recoverable clamp |

`validate.ts` therefore no longer raises `cross-field-invariant` for the `current_time`-window case. It still raises it for `start>end`. The `SystemStateLoadError` class and its `kind` enum are otherwise unchanged.

---

## Δ4 — `applyTemporalReconciliation` return shape

```diff
- export function applyTemporalReconciliation(
-   fromPlot: SystemStateMap['temporal'] | undefined,
-   fromSidecar: SidecarTemporalSlice | undefined
- ): HydratedTemporalSlice;
+ export function applyTemporalReconciliation(
+   fromPlot: SystemStateMap['temporal'] | undefined,
+   fromSidecar: SidecarTemporalSlice | undefined
+ ): { slice: HydratedTemporalSlice; clamp: PlayheadClampDiagnostic | null };
```

**Observable behaviour invariants**
- `clamp` is non-`null` **iff** `fromPlot` has a coherent window and an out-of-range `current_time`. In that case `slice.currentTime` holds the clamped epoch-ms value.
- For absent `fromPlot`, or in-range/absent `current_time`, `clamp === null` and `slice` is identical to spec-261's output (FR-009).
- Pure function — no I/O, no notification (that is the host's job).

> The sibling `applySpatialReconciliation` / `applySelectionReconciliation` signatures are **unchanged** — only the temporal one grows a diagnostic, because only the temporal variant has the `current_time` cross-field invariant.

---

## Δ5 — `persistence/load.ts` diagnostics channel

The host-facing load result gains a non-fatal diagnostics array. Exact field name aligns with spec-261's load result type at implementation time; the contract is:

```typescript
// The load result MUST expose, in addition to spec-261's existing fields:
readonly clampDiagnostics: readonly PlayheadClampDiagnostic[];
```

**Observable behaviour invariants**
- Populated from every `applyTemporalReconciliation` call made during the load operation (one per plot). Empty array when no clamps occurred.
- Hard errors (`SystemStateLoadError`, including `start>end`) continue to **throw** out of `load.ts`; they are never represented in this array (FR-004/005).
- Carries diagnostics across all plots in a multi-plot load (session restore) to enable host coalescing (FR-006).

---

## Δ6 — Provenance enrichment at save (FR-007)

No signature change to `writeSystemStateIntoFeatureCollection`. The behaviour addition: when the temporal variant being written has a pending clamp (the in-memory `PlayheadClampDiagnostic` from this session's load), the `LogEntry` appended for that write records the heal — the original out-of-window value and the resulting in-window value. Mechanism (carry the pending diagnostic to the write call) is an implementation detail for `/speckit.tasks`; the contract is only that the heal leaves a durable provenance trace **on the save that persists it**, and never before (FR-008).

---

## Compatibility & exhaustiveness

- The `exhaustive.ts` guard (spec-261) is unaffected — no new `SystemStateTypeEnum` value is introduced.
- The `PlayheadClampDiagnostic.kind` literal (`'playhead-clamped'`) is a discriminator reserving room for future recoverable-load diagnostic kinds without a breaking change to the channel.

---

## Testing expectations (delta)

| Module | Coverage |
|---|---|
| `clampPlayheadToWindow` | before-start, after-end, in-range, both boundaries, single-instant window. |
| `applyTemporalReconciliation` | emits one diagnostic with correct `edge`/values on out-of-window; `clamp===null` and unchanged slice on in-range/absent; never reached for `start>end` (thrown upstream). |
| `validate.ts` | `start>end` still throws `cross-field-invariant`; out-of-window `current_time` no longer throws. |
| `load.ts` | `clampDiagnostics` populated for a clamped plot, empty for a clean plot; `start>end` plot still throws (not swallowed into the array). |
| host parity | one shared fixture set drives both VS Code and web-shell load tests → identical clamp outcome (SC-007). |
| web-shell E2E | orphaned-playhead plot opens + toast shown + playhead at edge; `start>end` plot fails to open. |
