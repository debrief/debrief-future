# Implementation Plan: Tolerant import for out-of-window saved playhead

**Branch**: `267-tolerant-playhead-import` | **Date**: 2026-05-26 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/267-tolerant-playhead-import/spec.md`

## Summary

Relax spec-261's FR-018 strict-on-import rule for exactly one recoverable sub-case: a temporal `SystemState` whose `current_time` (saved playhead) falls outside an *otherwise-coherent* `[start_time, end_time]` window. Instead of failing the whole plot load with `SystemStateLoadError(kind='cross-field-invariant')`, the load succeeds, the in-memory playhead is clamped to the nearest window edge, and the host surfaces a non-blocking notification. The genuinely-incoherent case (`start_time > end_time`) keeps its hard, structured load error — the guard rail that keeps the relaxation narrow.

Technical approach: this is a behavioural amendment to spec-261's shared `SystemState` load layer (`services/session-state/src/system-state/`), not a schema change. The `current_time ∈ [start,end]` rule moves from a *throwing* cross-field check in `validate.ts` to a *recoverable clamp* performed during temporal reconciliation, which emits a typed `PlayheadClampDiagnostic`. The two host load paths (VS Code `loadSession`, web-shell plot load) collect these diagnostics and render them on their existing notification surfaces (`window.showWarningMessage` / web-shell toast). No LinkML change, no new runtime dependency.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode, per Article XV). No Python changes (the LinkML schema is untouched — `current_time` already exists from spec-261; this feature changes only load-time *behaviour*).
**Primary Dependencies**: `@debrief/session-state` (the shared `SystemState` helper + persistence `load.ts`, both introduced by spec-261), `@debrief/schemas` (generated `SystemStateProperties`/`LogEntry` types — unchanged), VS Code Extension API ^1.85.0 (`window.showWarningMessage`), web-shell's existing toast/notification surface. No new external dependency.
**Storage**: Plot file `*.plot.geojson` FeatureCollection (the temporal `SystemState` feature). Read-only at load for this feature; the healed value is persisted only on the next explicit save via spec-261's existing writer path.
**Testing**: Vitest (unit — clamp logic, reconciliation, both-host parity via shared fixtures), Playwright web-shell E2E (the clamp toast on plot load). Schema-adherence suite re-runs unchanged (no schema delta).
**Target Platform**: VS Code extension host (Node) + web-shell (browser). Shared clamp logic runs identically in both via the shared helper.
**Project Type**: Web/extension monorepo (existing). No new project.
**Performance Goals**: Negligible — one extra interval comparison per temporal `SystemState` at load. No measurable impact on load time.
**Constraints**: Offline-capable (no network); the clamp is pure, in-memory, deterministic. Must not auto-mark the plot dirty (spec-261 FR-017). Notifications must be non-blocking (no modal-per-plot during session restore).
**Scale/Scope**: At most one temporal `SystemState` per plot; session restore may open N plots, each potentially producing one clamp diagnostic → coalesced notification.

**Hard sequencing dependency**: spec-261 (`261-session-state-systemstate`) is **planned/tasked but not yet implemented** — the `SystemState` helper, `validate.ts`, `load.ts`, and `SystemStateLoadError` it introduces do not exist in the codebase yet. This feature **amends** that code and therefore cannot be implemented until spec-261 lands (or is co-sequenced). See research.md § R-005.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Relevance | Verdict |
|---|---|---|
| **I.3 — No silent failures** | The whole point of the feature: a clamp is *never silent*. Every clamp surfaces a non-blocking notification (FR-003) and, on the next save, a provenance LogEntry (FR-007). | **PASS** — central design goal. |
| **II.1 — Schema single source of truth** | No LinkML change. `current_time` already exists (spec-261 FR-016). This feature changes runtime load behaviour only. | **PASS** — no schema delta. |
| **II.2 — Schema tests mandatory** | No derived-schema change, so the existing adherence suite must pass unchanged (SC-006). New behaviour is covered by helper unit tests + fixtures (recoverable vs. hard-fail). | **PASS**. |
| **III.1 — Provenance always** | The heal is recorded as a `LogEntry` on the temporal `SystemState`'s provenance when it is persisted on the next save (FR-007), capturing original → clamped value. | **PASS** — see research § R-002 for timing. |
| **IV.1 — Services never touch UI** | The shared helper emits a *typed diagnostic* (data), never UI. The host decides how to render it (VS Code notification / web-shell toast). | **PASS** — boundary respected. |
| **IV.4 — Persistence-host abstraction** | The healed value persists via spec-261's existing writer path on save. No new write path. | **PASS**. |
| **VI / VII — Testing & TDD** | Unit tests (clamp/reconciliation), shared-fixture parity across hosts, web-shell E2E for the toast. Fixtures written before implementation. | **PASS**. |
| **XIV.4 — Strict on import, fail fast** | This feature **deliberately and narrowly relaxes** XIV.4 for the recoverable orphaned-playhead sub-case. | **SANCTIONED RELAXATION — see below.** |
| **XV — Strict type safety** | All new diagnostic types fully typed; no `any`. The diagnostic is a discriminated structure derived from generated types where it mirrors them. | **PASS**. |

**XIV.4 relaxation justification**: Article XIV's own trigger note states *"Clauses XIV.4 and XIV.5 should be revisited [upon v4.0.0 release] to introduce appropriate tolerance for real-world data ingestion."* This feature **is** that authorised revisit. The relaxation is kept honest by being maximally narrow:
- It applies to **one field** (`current_time`) on **one variant** (`temporal`), and **only** when the surrounding window is coherent (`start_time ≤ end_time`).
- The playhead is a *recoverable, non-destructive, derivable* field — clamping loses no analytical information (the analyst re-scrubs at will).
- The genuinely-unrecoverable case (`start_time > end_time`) **retains** its hard `SystemStateLoadError` (FR-004, FR-005). Tolerance never leaks into structurally-broken data.
- The clamp is **never silent** (Article I.3), so the relaxation does not mask the data issue — it surfaces it loudly while still letting the analyst work.

This is recorded in Complexity Tracking below as a sanctioned exception, not an unjustified violation. No other gate is affected.

## Project Structure

### Documentation (this feature)

```text
specs/267-tolerant-playhead-import/
├── plan.md              # This file
├── research.md          # Phase 0 — design decisions (clamp location, provenance timing, notification surface)
├── data-model.md        # Phase 1 — PlayheadClampDiagnostic + the amended cross-field rule
├── quickstart.md        # Phase 1 — how to verify the tolerant + hard-fail paths
├── contracts/
│   └── system-state-helper-delta.md   # Δ to spec-261's helper contract
├── checklists/
│   └── requirements.md  # (from /speckit.specify)
└── evidence/
    └── opening-context.md  # Phase 2 — cached blog opener
```

### Source Code (repository root)

This feature edits files that **spec-261 creates**. Paths below are spec-261's planned locations (per its `contracts/system-state-helper.ts.md` and `data-model.md`); this feature amends them.

```text
services/session-state/src/system-state/
├── validate.ts          # MODIFY — split the temporal cross-field check: start>end throws (unchanged);
│                         #          current_time-out-of-window no longer throws (delegated to reconciliation)
├── reconcile.ts         # MODIFY (or mapping.ts) — applyTemporalReconciliation gains the clamp + emits PlayheadClampDiagnostic
├── diagnostics.ts       # NEW — PlayheadClampDiagnostic type + the pure clampPlayheadToWindow() helper
├── index.ts             # MODIFY — export PlayheadClampDiagnostic + the result-with-diagnostics shape
└── __tests__/
    ├── clamp.test.ts            # NEW — clampPlayheadToWindow unit tests (before/after/boundary/single-instant)
    └── reconcile-clamp.test.ts  # NEW — applyTemporalReconciliation emits diagnostic + clamps; in-range is inert

services/session-state/src/persistence/
└── load.ts              # MODIFY — collect PlayheadClampDiagnostic[] during load; return them to the host
                         #          (load result gains a diagnostics channel; throws still propagate for start>end)

apps/vscode/src/commands/
└── loadSession.ts (or equivalent host load entry) # MODIFY — render clamp diagnostics via window.showWarningMessage (non-modal, coalesced)

apps/web-shell/src/
└── (plot load handler / App)   # MODIFY — render clamp diagnostics via the existing toast surface (coalesced)

shared/schemas/fixtures/        # NO CHANGE expected (cross-field invariant is a runtime check, not a LinkML rule —
                                # out-of-window current_time is LinkML-valid). Fixtures for this feature live in the
                                # helper's __tests__ as in-memory FeatureCollection fixtures.

apps/web-shell/playwright/tests/
└── playhead-clamp.spec.ts      # NEW — E2E: open a plot with an orphaned playhead → toast shown, plot opens, playhead at edge
```

**Structure Decision**: No new package or project. The feature is a localised behavioural change concentrated in spec-261's shared `SystemState` layer (`services/session-state/src/system-state/` + `persistence/load.ts`) plus two thin host call-sites that render the resulting diagnostic. This keeps the clamp rule single-sourced (FR-010) and the UI decision host-local (Article IV.1).

## Media Components

None — this is primarily a load-path behavioural change. Its only visible surface is a transient host notification (VS Code `showWarningMessage` / web-shell toast), which is not a standalone Storybook-able component and carries no narrative value as an isolated story. The blog post's visual evidence is the web-shell E2E screenshot of the toast + opened plot (captured under `evidence/screenshots/`), not a bundled component demo.

**Inclusion Criteria Applied**:
- [ ] New visual component
- [ ] Significant visual change
- [ ] Interactive demo adds narrative value

## Storybook E2E Testing

None — no interactive UI components. The notification is rendered by each host's native surface, not a shared component with a Storybook story.

## Web-Shell E2E Testing

| Workflow | Panels/Components Involved | Key Selectors | Interactions |
|----------|---------------------------|---------------|--------------|
| Open a plot with an out-of-window saved playhead | Plot load path, MapView, TimeController, toast surface | `.leaflet-container`, time-controller playhead element, `[data-testid="toast"]` (or the existing web-shell notification selector) | Load a fixture plot whose temporal `SystemState.current_time` is after `end_time`; assert: plot opens (map renders), a non-blocking toast reports the clamp, the playhead sits at `end_time` |
| Open a plot with an incoherent window (`start>end`) | Plot load path, error surface | error/notification selector | Load a fixture plot with `start_time > end_time`; assert the load fails with the structured error surface (plot does **not** open) — guard-rail regression check |

**Testing Strategy**:
- [x] Workflow runs end-to-end in the web-shell (tolerant path opens the plot; hard-fail path does not)
- [x] Page objects in `apps/web-shell/playwright/pages/` extended for the toast / playhead selectors (reuse `AnalysisPage`)
- [x] Screenshot of the opened plot + clamp toast written into `specs/267-tolerant-playhead-import/evidence/screenshots/`

**Test File Location**: `apps/web-shell/playwright/tests/playhead-clamp.spec.ts`

**Run Commands**:
- Cloud: `cd apps/web-shell && node run-playwright.mjs playhead-clamp`
- Local: `pnpm --filter @debrief/web-shell test playhead-clamp`

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Relaxation of Article XIV.4 (strict-on-import) for the `current_time`-out-of-window sub-case | Authorised by Article XIV's trigger note ("revisit XIV.4/XIV.5 to introduce appropriate tolerance for real-world data ingestion"); resolves a real, recoverable load dead-end where an orphaned playhead blocks opening an otherwise-valid plot | Keeping strict-fail (the status quo) was rejected as the *defining* user-hostile behaviour this ticket exists to fix. A broader "tolerant import framework" was rejected as over-engineering (NG-005) — the relaxation is deliberately scoped to one field, one variant, one recoverable condition, with the incoherent-window hard-fail preserved as the guard. |
