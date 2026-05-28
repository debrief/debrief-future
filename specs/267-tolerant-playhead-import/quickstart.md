# Quickstart: Tolerant import for out-of-window saved playhead

**Feature**: `267-tolerant-playhead-import`

This is how to verify the feature end-to-end once spec-261's `SystemState` layer is present (hard dependency — see research § R-005). The two behaviours to confirm are the **tolerant path** (orphaned playhead → opens + clamps + notifies) and the **preserved hard-fail** (incoherent window → still fails).

## Prerequisites

- Spec-261 implemented: `services/session-state/src/system-state/` (`validate.ts`, `reconcile.ts`/`mapping.ts`, `index.ts`), `persistence/load.ts`, and `SystemStateLoadError` exist.
- `pnpm install` clean (Network access = Trusted/Full in cloud sessions — see CLAUDE.md "Before Pushing").

## 1. Unit — the pure clamp

```sh
pnpm --filter @debrief/session-state test clamp
```

Expect: `clampPlayheadToWindow` clamps before-start → `start`, after-end → `end`, leaves in-range/boundary untouched (`clampedTo: null`), and handles a single-instant window.

## 2. Unit — reconciliation emits the diagnostic

```sh
pnpm --filter @debrief/session-state test reconcile-clamp
```

Expect:
- A temporal `SystemState` with `current_time` after `end_time` → `{ slice: { currentTime: <end epoch> }, clamp: { kind:'playhead-clamped', edge:'end', ... } }`.
- A temporal `SystemState` with `current_time` in range → `{ slice, clamp: null }` (byte-identical to spec-261).
- `validate.ts`: `start_time > end_time` still throws `SystemStateLoadError(kind='cross-field-invariant')`.

## 3. Both-host parity (shared fixtures)

```sh
pnpm --filter @debrief/session-state test
```

Expect the same fixture FeatureCollections to produce identical clamp outcomes whether driven through the VS Code or web-shell load path (SC-007) — there is no host-private clamp logic.

## 4. Web-shell E2E — the tolerant path (and its guard)

```sh
cd apps/web-shell && node run-playwright.mjs playhead-clamp
```

Expect:
- **Tolerant**: loading a plot whose temporal `SystemState.current_time` is after `end_time` → the plot **opens** (map renders), a **non-blocking toast** reports the saved time-cursor was outside the time range and was moved to the end, and the playhead sits at `end_time`. Screenshot lands in `specs/267-tolerant-playhead-import/evidence/screenshots/`.
- **Guard**: loading a plot with `start_time > end_time` → the plot does **not** open; the structured error surface is shown (spec-261 behaviour preserved).

## 5. Round-trip heal (manual / integration)

1. Open a plot with an out-of-window playhead → it clamps + notifies (no dirty marker; the title shows no unsaved-changes indicator — FR-008).
2. Save the plot (explicit save).
3. Inspect the `*.plot.geojson` temporal `SystemState`: `current_time` is now in-window (healed), and its `provenance` array has a new `LogEntry` recording the heal (original → clamped) — FR-007.
4. Re-open the plot → **no** clamp, **no** toast (SC-005, the loop is closed).

## 6. Regression — valid plots unaffected

```sh
pnpm --filter @debrief/session-state test && uv run pytest shared/schemas
```

Expect: existing session-state tests and the schema-adherence suite pass unchanged (SC-006) — no LinkML delta, in-range/absent `current_time` behaviour is identical to spec-261.

## Done when

- SC-001..SC-007 all demonstrated: orphaned playheads open with a correct edge clamp + one non-blocking notification; incoherent windows still hard-fail; valid plots unchanged; heal round-trips and closes; the rule is single-sourced across both hosts.
