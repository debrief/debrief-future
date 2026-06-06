# Contract Delta: SystemState helper — tolerant playhead import

**Feature**: `267-tolerant-playhead-import`
**Amends**: spec-261's shipped `services/session-state/src/system-state/` module
**Status of substrate**: spec-261 is **MERGED**. This delta is written against the *actual* landed code (verified 2026-05-29), superseding the earlier version that targeted spec-261's planned contract.

> **Reconciliation note**: spec-261 shipped a different shape than its own `contracts/system-state-helper.ts.md` predicted. There is **no** `persistence/load.ts`, no `reconcile.ts`, no `applyTemporalReconciliation`, and **no `provenance` field** on view-state SystemState variants (they are deliberately "lean" — `write.ts` header, 261 FR-013). The real surfaces are listed below; all task/spec/plan references have been updated to match.

---

## Real surfaces this feature touches (as merged)

| File | Real export(s) | Role |
|---|---|---|
| `system-state/validate.ts` | `checkTemporalCrossField(v: TemporalVariant): string \| null` | The cross-field check. Today returns a violation *string* (covers BOTH `start>end`/unparseable AND `current_time` out-of-window) or `null`. **Amendment target.** |
| `system-state/read.ts` | `readSystemStateFromFeatureCollection(fc): SystemStateMap` | Pure read; the throw site — turns `checkTemporalCrossField`'s string into `SystemStateLoadError(kind='cross-field-invariant')` (lines 98-109). **Amendment target.** |
| `system-state/store-bridge.ts` | `hydrateStoreFromFeatures(state, features): void` | The single both-host load entry; calls read then maps to the store. **Amendment target** (gains a return value). |
| `system-state/types.ts` | `SystemStateMap`, `TemporalVariant`, … | Type home. **Add** `PlayheadClampDiagnostic` here. |
| `system-state/mapping.ts` | `temporalVariantToSlice` | ISO→epoch slice mapping. **Unchanged** — it converts whatever `current_time` read returns. |
| `system-state/errors.ts` | `SystemStateLoadError`, `SystemStateLoadErrorKind` | **Unchanged** — still thrown for fatal cases. |
| `system-state/write.ts` | `writeSystemStateIntoFeatureCollection` | **Unchanged** — on save, writes the store's (now in-window) `current_time` via `temporalSliceToInput`. No provenance (FR-013). |

Host call sites: `apps/vscode/src/commands/openPlot.ts:180` (+ wrapper `apps/vscode/src/services/systemStateBridge.ts`) and `apps/web-shell/src/App.tsx:591,677` (via `apps/web-shell/src/session-state-browser.ts`).

---

## Δ1 — New type `PlayheadClampDiagnostic` (in `types.ts`)

```typescript
export interface PlayheadClampDiagnostic {
  readonly kind: 'playhead-clamped';
  readonly feature_id: string;             // snake_case per ADR-010 (lint-enforced)
  readonly edge: 'start' | 'end';
  readonly originalCurrentTime: string;   // ISO-8601, verbatim from the file
  readonly clampedCurrentTime: string;    // ISO-8601 — exactly start_time (edge:'start') or end_time (edge:'end')
}
```

Re-exported from `system-state/index.ts`, `services/session-state/src/index.ts`, `services/session-state/src/browser.ts`, and `apps/web-shell/src/session-state-browser.ts` (mirrors how `SystemStateLoadError` is exported today).

> No separate `clampPlayheadToWindow` helper is needed: because the clamp target is always a window boundary, the clamped value **is** `start_time` or `end_time` verbatim — no epoch→ISO reformatting, no drift. The decision is computed inside `checkTemporalCrossField` (Δ2).

---

## Δ2 — `checkTemporalCrossField` returns a structured, severity-split result (`validate.ts`)

```diff
- export function checkTemporalCrossField(v: TemporalVariant): string | null
+ export type TemporalCrossFieldResult =
+   | { status: 'ok' }
+   | { status: 'fatal'; message: string }
+   | { status: 'recoverable-playhead'; edge: 'start' | 'end'; clampedCurrentTime: string; message: string };
+
+ export function checkTemporalCrossField(v: TemporalVariant): TemporalCrossFieldResult
```

**Severity mapping**:
- unparseable `start_time`/`end_time`, or `start_time > end_time`, or unparseable `current_time` → `{ status: 'fatal', message }` (unchanged hard-fail; FR-004).
- coherent window (`start ≤ end`) AND `current_time < start_time` → `{ status: 'recoverable-playhead', edge: 'start', clampedCurrentTime: v.start_time, message }`.
- coherent window AND `current_time > end_time` → `{ status: 'recoverable-playhead', edge: 'end', clampedCurrentTime: v.end_time, message }`.
- in-range/boundary/absent `current_time` → `{ status: 'ok' }`.

Sole runtime caller is `read.ts`; the only test is `validate.test.ts`. (The `checkTemporalCrossField` export in `index.ts` is retained with the new return type.)

---

## Δ3 — `read.ts`: clamp the recoverable case instead of throwing

`read.ts` changes its **return type** to surface diagnostics explicitly (review decision 1A — chosen over an optional mutable sink, which risked a silent clamp if a caller forgot it):

```diff
- export function readSystemStateFromFeatureCollection(fc: PlotFeatureCollection): SystemStateMap
+ export interface ReadSystemStateResult {
+   map: SystemStateMap;
+   playheadClamps: PlayheadClampDiagnostic[];   // [] when none
+ }
+ export function readSystemStateFromFeatureCollection(fc: PlotFeatureCollection): ReadSystemStateResult
```

At the temporal branch (currently lines 98-109), build the clamped variant with a **typed copy — no `as`-cast, no mutation** (review decision 2A, Article XV):

```typescript
const v = result.data as TemporalVariant;
const res = checkTemporalCrossField(v);
if (res.status === 'fatal') {
  throw new SystemStateLoadError({ kind: 'cross-field-invariant', featureIds: [featureId(f)], message: `… ${res.message}.` });
}
let temporal: TemporalVariant = v;
if (res.status === 'recoverable-playhead') {
  temporal = { ...v, current_time: res.clampedCurrentTime };   // typed copy, in-window before it enters the map
  playheadClamps.push({
    kind: 'playhead-clamped',
    feature_id: featureId(f),
    edge: res.edge,
    originalCurrentTime: v.current_time as string,
    clampedCurrentTime: res.clampedCurrentTime,
  });
}
// place `temporal` into the map for the temporal key
```

**Observable behaviour**:
- Pure (the `playheadClamps` array is created fresh inside `read` and returned). No mutation of `fc`, no mutation of the Zod-parsed object.
- Fatal cross-field (incl. `start>end`) still throws `SystemStateLoadError(kind='cross-field-invariant')` — FR-004/FR-005.
- Recoverable case: `map.temporal.current_time` is already clamped in-window; the clamp is reported in `playheadClamps`.
- All other read behaviour (duplicate, malformed, unknown, missing-discriminator) unchanged.

**Caller migration (~6 sites)**: `store-bridge.ts` (Δ4) and the read unit tests destructure `.map`; the public re-exports (`index.ts`, `browser.ts`, `session-state-browser.ts`) re-export the new `ReadSystemStateResult` type. Trivial, mechanical. The `read.test.ts` case asserting out-of-window `current_time` *throws* flips to asserting a clamp on `result.playheadClamps`.

---

## Δ4 — `store-bridge.ts`: `hydrateStoreFromFeatures` returns the clamps

```diff
- export function hydrateStoreFromFeatures(state: ViewStateStore, features: ReadonlyArray<FeatureLike>): void
+ export function hydrateStoreFromFeatures(
+   state: ViewStateStore,
+   features: ReadonlyArray<FeatureLike>,
+ ): PlayheadClampDiagnostic[]
```

Body: `const { map, playheadClamps } = readSystemStateFromFeatureCollection(fc);` — hydrate the store from `map` as today (the temporal slice receives the clamped `current_time` via the unchanged `temporalVariantToSlice`), and `return playheadClamps`.

**Observable behaviour**: still throws `SystemStateLoadError` for fatal cases (callers' `try/catch` unchanged). Returns `[]` when no clamp occurred. Existing callers that ignore the return value keep compiling — but per review decision 1A the explicit return makes the diagnostics a visible value rather than a forgettable out-param.

---

## Δ5 — Host rendering (no helper change; consume the return)

- **VS Code** `apps/vscode/src/commands/openPlot.ts` (~line 180): capture `const clamps = hydrateStoreFromFeatures(...)`; after the `try`, if `clamps.length > 0` show a non-blocking `vscode.window.showWarningMessage(...)`. The existing `catch (SystemStateLoadError) → showErrorMessage` stays for fatal cases. Apply the same in the wrapper `apps/vscode/src/services/systemStateBridge.ts` if it narrows the return type. (Per-plot load → at most one clamp; coalescing dropped at review.)
- **web-shell** `apps/web-shell/src/App.tsx` (lines 591, 677): capture the return at both hydrate call sites; surface a non-blocking message via `surfacePlayheadClamp`. **Implementation note (deviation from plan):** the originally-planned `logNotification` transient (App.tsx:276) renders inside the LogPanel, which is *tab-gated* — it does not render a notice set while the Log tab is unmounted, the exact load-time case here. So this ships a dedicated, always-visible, auto-dismissing App-level toast (`data-testid="playhead-clamp-toast"`, amber/info styling) instead — still non-blocking, still distinct from the #259 error banner (red). Same wording as the VS Code host via `playheadClampMessage.buildPlayheadClampMessage`.

---

## Δ6 — Provenance: **REVISED** (was FR-007)

**There is no provenance to write.** spec-261 ships view-state SystemState features without a `provenance` field (the temporal Zod schema is `.strict()` with no such field; `write.ts` states "NO `provenance` is written on `state.*` features — FR-013"). The earlier FR-007 ("append a LogEntry to the temporal SystemState's provenance") is therefore **dropped**.

Durable-until-healed record instead: the clamp surfaces a non-blocking notification on **every** load (FR-003), and re-opening re-clamps idempotently, so the analyst is informed every time until they save (which persists the in-window `current_time` through the normal `write.ts` path and ends the condition — FR-008). Article I.3 ("users must always know") is satisfied by the repeating notification; Article III.1 is not engaged — a load-time UI-playhead recovery is not an analytical transformation, and 261 already exempted view-state markers from provenance.

---

## Testing expectations (delta, real paths)

| File | Coverage |
|---|---|
| `system-state/__tests__/validate.test.ts` | `checkTemporalCrossField` returns `fatal` for `start>end`/unparseable; `recoverable-playhead` (`edge`, `clampedCurrentTime`) for before-start / after-end; `ok` for in-range/boundary/absent. |
| `system-state/__tests__/read.test.ts` | out-of-window `current_time` → no throw, `result.map.temporal.current_time` clamped, `result.playheadClamps` has one entry; `start>end` → still throws `cross-field-invariant`; **unparseable** start/end/current → throws (fatal); both-defects → throws (precedence). |
| `system-state/__tests__/store-bridge.test.ts` | `hydrateStoreFromFeatures` returns one clamp for an orphaned plot and `[]` for a clean plot; store `currentTime` lands on the window edge; malformed feature still throws. |
| `apps/vscode/tests/unit/systemStateBridge.test.ts` | existing `toThrow(SystemStateLoadError)` (malformed) still passes; new: orphaned playhead does not throw and returns a clamp. |
| **VS Code render** (review 3A) | `openPlot` clamp branch calls `vscode.window.showWarningMessage` (mock) when `hydrateStoreFromFeatures` returns clamps, and does **not** call `showErrorMessage` for the recoverable case — closes the silent-clamp gap (Article I.3). |
| web-shell E2E `apps/web-shell/playwright/tests/playhead-clamp.spec.ts` | orphaned-playhead plot opens + toast + playhead at edge; incoherent-window plot fails to open. |
