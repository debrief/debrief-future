# Quickstart: Tolerant import for out-of-window saved playhead

**Feature**: `267-tolerant-playhead-import`

How to verify the feature end-to-end. The two behaviours: the **tolerant path** (orphaned playhead → opens + clamps + notifies) and the **preserved hard-fail** (incoherent window → still fails). Reconciled to spec-261 **as merged**.

## Prerequisites

- Spec-261 **merged** — `services/session-state/src/system-state/` exists with `validate.ts` (`checkTemporalCrossField`), `read.ts` (`readSystemStateFromFeatureCollection`), `store-bridge.ts` (`hydrateStoreFromFeatures`), `errors.ts` (`SystemStateLoadError`), `types.ts`. (There is no `reconcile.ts` and no `persistence/load.ts`.)
- `pnpm install` clean (Network access = Trusted/Full in cloud — see CLAUDE.md "Before Pushing").

## 1. Unit — the severity-split cross-field check

```sh
pnpm --filter @debrief/session-state test validate
```

Expect `checkTemporalCrossField` to return:
- `{status:'fatal'}` for `start_time > end_time` and unparseable timestamps;
- `{status:'recoverable-playhead', edge:'start', clampedCurrentTime: <start_time>}` when `current_time < start_time`;
- `{status:'recoverable-playhead', edge:'end', clampedCurrentTime: <end_time>}` when `current_time > end_time`;
- `{status:'ok'}` for in-range / boundary / absent `current_time`.

## 2. Unit — read clamps instead of throwing

```sh
pnpm --filter @debrief/session-state test read
```

Expect:
- A temporal `SystemState` with `current_time` after `end_time` → `read` does NOT throw; `map.temporal.current_time === end_time`; with a `playheadClamps` sink, one `PlayheadClampDiagnostic{edge:'end'}` is pushed.
- `start_time > end_time` → still throws `SystemStateLoadError(kind='cross-field-invariant')`.
- Both defects on one feature → throws (precedence; clamp never attempted).

## 3. Unit — the both-host bridge returns the clamps

```sh
pnpm --filter @debrief/session-state test store-bridge
```

Expect `hydrateStoreFromFeatures` to return one `PlayheadClampDiagnostic` for an orphaned plot (and set the store's `currentTime` to the window edge), and `[]` for a clean plot. Because both hosts call this single function, the rule is exercised identically (SC-007).

## 4. Web-shell E2E — the tolerant path (and its guard)

```sh
cd apps/web-shell && node run-playwright.mjs playhead-clamp
```

Expect:
- **Tolerant**: a plot whose temporal `SystemState.current_time` is after `end_time` → the plot **opens** (map renders), a **non-blocking toast** reports the saved time-cursor was outside the time range and was moved to the end, and the playhead sits at `end_time`. Screenshot lands in `specs/267-tolerant-playhead-import/evidence/screenshots/`.
- **Guard**: a plot with `start_time > end_time` → the plot does **not** open; the structured error surface is shown (261 behaviour preserved).

## 5. Round-trip heal (manual / integration)

1. Open a plot with an out-of-window playhead → it clamps + notifies (no dirty marker — FR-008).
2. Save the plot (explicit save).
3. Inspect the `*.plot.geojson` temporal `SystemState`: `current_time` is now in-window (healed) — written through 261's `write.ts` from the store's clamped `currentTime`. (No provenance entry is written — view-state markers are lean, 261 FR-013.)
4. Re-open → **no** clamp, **no** toast (SC-005, the loop is closed).

## 6. Regression — valid plots unaffected

```sh
pnpm --filter @debrief/session-state test && uv run pytest shared/schemas
```

Expect existing session-state tests and the schema-adherence suite to pass unchanged (SC-006) — no LinkML delta; in-range/absent `current_time` behaviour is identical to 261.

## Done when

- SC-001..SC-007 demonstrated: orphaned playheads open with a correct edge clamp + one non-blocking notification (repeating until healed); incoherent windows still hard-fail; valid plots unchanged; heal round-trips and closes; the rule is single-sourced across both hosts via `hydrateStoreFromFeatures`.
