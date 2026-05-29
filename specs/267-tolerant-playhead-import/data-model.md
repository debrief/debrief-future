# Data Model: Tolerant import for out-of-window saved playhead

**Feature**: `267-tolerant-playhead-import`
**Phase**: 1 (design) — **reconciled to spec-261 as merged (2026-05-29)**

This feature introduces **no schema (LinkML) change** and **no new runtime dependency**. It adds **one new runtime type** (`PlayheadClampDiagnostic`) and **amends one cross-field check** plus its caller. Everything lives in TypeScript inside `services/session-state/src/system-state/`.

> **Reconciliation**: written against spec-261's *shipped* code, not its planned contract. There is no `reconcile.ts`, no `persistence/load.ts`, and no `provenance` on view-state SystemState features. See `contracts/system-state-helper-delta.md`.

---

## Entity 1: `PlayheadClampDiagnostic` (NEW — runtime only, in `system-state/types.ts`)

The structured record emitted when an out-of-window saved playhead is clamped on load. It is data, not UI — the host consumes it to render a notification (Article IV.1).

```typescript
export interface PlayheadClampDiagnostic {
  readonly kind: 'playhead-clamped';
  readonly feature_id: string;         // id of the offending temporal SystemState feature (snake_case per ADR-010)
  readonly edge: 'start' | 'end';      // which window edge the playhead was clamped to
  readonly originalCurrentTime: string; // ISO-8601, verbatim from the file
  readonly clampedCurrentTime: string;  // ISO-8601 — exactly start_time (edge:'start') or end_time (edge:'end')
}
```

**Invariants**
- Emitted **only** for a coherent window (`start ≤ end`) where `current_time` is strictly outside `[start_time, end_time]`. Never for in-range/boundary/absent `current_time` (FR-009), never for an incoherent window (FR-005 — that throws).
- `clampedCurrentTime` is a window boundary's *verbatim* ISO string (no reformatting / no float drift).
- At most one per plot (at most one temporal SystemState feature per plot — 261 FR-003).

---

## Entity 2: Amended cross-field check `checkTemporalCrossField` (`validate.ts`)

**As shipped (261)**: `checkTemporalCrossField(v: TemporalVariant): string | null` — returns a single violation string for *any* temporal cross-field problem (both `start>end` and `current_time` out-of-window), or `null`. `read.ts` throws `SystemStateLoadError(kind='cross-field-invariant')` whenever it's non-null.

**After this feature**: returns a severity-split discriminated result:

```typescript
export type TemporalCrossFieldResult =
  | { status: 'ok' }
  | { status: 'fatal'; message: string }
  | { status: 'recoverable-playhead'; edge: 'start' | 'end'; clampedCurrentTime: string; message: string };
```

| Condition | Result |
|---|---|
| `start_time`/`end_time` unparseable | `fatal` |
| `start_time > end_time` | `fatal` (the incoherent-window guard rail — FR-004) |
| `current_time` present but unparseable | `fatal` |
| coherent window, `current_time < start_time` | `recoverable-playhead` { edge:'start', clampedCurrentTime: `start_time` } |
| coherent window, `current_time > end_time` | `recoverable-playhead` { edge:'end', clampedCurrentTime: `end_time` } |
| `current_time` in `[start,end]` or absent | `ok` |

The clamp *decision* (which edge, what value) is computed here — no separate clamp helper module is needed (the value is a verbatim boundary string).

---

## Entity 3: `read.ts` recoverable handling (`readSystemStateFromFeatureCollection`)

`read.ts` is the throw site. Its **return type** changes to surface diagnostics explicitly (review 1A — chosen over an optional mutable sink to remove the silent-clamp footgun):

```typescript
export interface ReadSystemStateResult {
  map: SystemStateMap;
  playheadClamps: PlayheadClampDiagnostic[];   // [] when none
}
export function readSystemStateFromFeatureCollection(fc: PlotFeatureCollection): ReadSystemStateResult;
```

At the temporal branch it switches on `checkTemporalCrossField`:
- `fatal` → `throw new SystemStateLoadError({ kind: 'cross-field-invariant', … })` (as today).
- `recoverable-playhead` → build a **typed copy** `{ ...v, current_time: clampedCurrentTime }` (review 2A — no `as`-cast, no mutation of the parsed object), place it in the map, and push the diagnostic into `playheadClamps`.
- `ok` → unchanged.

**Why the clamp lands here**: `read.ts` is the one place holding the `featureId`, the parsed `TemporalVariant`, and the cross-field verdict together — and once it throws, the whole map is lost, so recovery *must* happen before the throw. Clamping the value before it enters the `SystemStateMap` means the downstream `temporalVariantToSlice` (ISO→epoch) needs **no change** — it converts the already-clamped value.

---

## Entity 4: `hydrateStoreFromFeatures` return (`store-bridge.ts`)

**As shipped**: `hydrateStoreFromFeatures(state, features): void` — both hosts' single load entry; calls `read` then applies the temporal/spatial/selection slices to the store.

**After this feature**: returns the clamps so the host can notify:

```typescript
export function hydrateStoreFromFeatures(
  state: ViewStateStore,
  features: ReadonlyArray<FeatureLike>,
): PlayheadClampDiagnostic[];
```

It destructures `const { map, playheadClamps } = readSystemStateFromFeatureCollection(fc)`, hydrates the store from `map` as today, and returns `playheadClamps` (`[]` when no clamp). Still throws `SystemStateLoadError` for fatal cases (callers' `try/catch` is unchanged).

---

## Entity 5: Temporal slice / variant (existing — for reference, NOT changed by this feature)

- Store `TemporalSlice`: `currentTime: number | null` (epoch ms), `timeRange: { start: number; end: number } | null` (epoch ms). The clamp comparison/decision is epoch-equivalent; the store receives the clamped value via the unchanged `temporalVariantToSlice` (`isoToEpoch`).
- Wire `TemporalVariant` (as migrated by 261, more fields than 261's data-model predicted): `start_time`, `end_time`, `current_time?`, `filter_start_time?`, `filter_end_time?`, `display_mode?`, `step_size?`, `playback_rate?`. **Only `current_time` is touched by this feature.**

---

## Relationships

```text
  temporal SystemState (wire)        validate.checkTemporalCrossField()
  ┌───────────────────────┐        ┌───────────────────────────────────────┐
  │ start_time            │───────▶│ fatal (start>end / unparseable) ──▶ read throws  │ (FR-004)
  │ end_time              │        │ recoverable-playhead {edge, clampedISO}          │
  │ current_time (maybe   │        │ ok                                                │
  │   out of window)      │        └───────────────────┬───────────────────┘
  └───────────────────────┘                            │
                                   read.ts: set current_time = clampedISO;
                                            playheadClamps.push(diagnostic)   (FR-001/002)
                                                        ▼
                                   store-bridge.hydrateStoreFromFeatures → returns PlayheadClampDiagnostic[]
                                            (store.setCurrentTime gets the in-window value via temporalVariantToSlice)
                                                        ▼
                                   host (openPlot.ts / App.tsx): non-blocking
                                            warning/logNotification (FR-003). Repeats on every load
                                                        ▼
                                   (next explicit save) write.ts persists the in-window current_time;
                                            re-open → ok, no clamp, no notification (FR-008, SC-005)
```

---

## Validation rules (this feature's additions/changes)

| Rule | Enforcement point | Article / FR |
|---|---|---|
| `start_time > end_time` (or unparseable) still throws | `validate.ts` `fatal` → `read.ts` throw | I.3, XIV.4, FR-004/005 |
| Coherent-window `current_time` out of range → clamp to boundary, no throw | `validate.ts` `recoverable-playhead` → `read.ts` | FR-001/002 (XIV.4 sanctioned relaxation) |
| A clamp emits exactly one `PlayheadClampDiagnostic` in `result.playheadClamps` | `read.ts` | FR-003, SC-003 |
| In-range/absent `current_time` → no diagnostic, behaviour byte-identical to 261 | `validate.ts` `ok` path | FR-009, SC-006 |
| Clamp never marks dirty / never auto-saves | host load path (no save triggered) | FR-008, 261 FR-017 |
| The clamp is surfaced on **every** load until the analyst saves the healed value | host notification (repeats; no in-plot provenance — 261 FR-013) | I.3, FR-003 (revised FR-007) |
| Same clamp rule on both hosts | shared `read.ts`/`store-bridge.ts` | FR-010, SC-007 |
