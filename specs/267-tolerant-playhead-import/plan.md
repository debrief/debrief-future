# Implementation Plan: Tolerant import for out-of-window saved playhead

**Branch**: `267-tolerant-playhead-import` | **Date**: 2026-05-26 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/267-tolerant-playhead-import/spec.md`

## Summary

Relax spec-261's FR-018 strict-on-import rule for exactly one recoverable sub-case: a temporal `SystemState` whose `current_time` (saved playhead) falls outside an *otherwise-coherent* `[start_time, end_time]` window. Instead of failing the whole plot load with `SystemStateLoadError(kind='cross-field-invariant')`, the load succeeds, the in-memory playhead is clamped to the nearest window edge, and the host surfaces a non-blocking notification. The genuinely-incoherent case (`start_time > end_time`) keeps its hard, structured load error — the guard rail that keeps the relaxation narrow.

Technical approach *(reconciled to spec-261 as merged, 2026-05-29)*: this is a behavioural amendment to spec-261's shipped `SystemState` layer (`services/session-state/src/system-state/`), not a schema change. `checkTemporalCrossField` (`validate.ts`) — today returning a single violation string for both invariants — is split by severity: `start>end`/unparseable stays `fatal` (throws), `current_time`-out-of-window becomes `recoverable-playhead` carrying the clamp edge + value. `read.ts` (the throw site) applies the recoverable case by clamping `current_time` to the window boundary (a typed copy, review 2A) and returning it in an explicit `{ map, playheadClamps }` result (review 1A — not an optional sink). `hydrateStoreFromFeatures` (`store-bridge.ts` — the single both-host load entry) returns those diagnostics; the hosts (`openPlot.ts` / `App.tsx`) render a non-blocking notification (one per plot — coalescing dropped per /speckit.review). No LinkML change, no new runtime dependency, and **no provenance write** — 261 ships view-state markers provenance-free (FR-013), so the repeating notification is the durable-until-healed record (revised FR-007).

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode, per Article XV). No Python changes (the LinkML schema is untouched — `current_time` already exists from spec-261; this feature changes only load-time *behaviour*).
**Primary Dependencies**: `@debrief/session-state` (the shared `SystemState` helper + persistence `load.ts`, both introduced by spec-261), `@debrief/schemas` (generated `SystemStateProperties`/`LogEntry` types — unchanged), VS Code Extension API ^1.85.0 (`window.showWarningMessage`), web-shell's existing toast/notification surface. No new external dependency.
**Storage**: Plot file `*.plot.geojson` FeatureCollection (the temporal `SystemState` feature). Read-only at load for this feature; the healed value is persisted only on the next explicit save via spec-261's existing writer path.
**Testing**: Vitest (unit — clamp logic, reconciliation, both-host parity via shared fixtures), Playwright web-shell E2E (the clamp toast on plot load). Schema-adherence suite re-runs unchanged (no schema delta).
**Target Platform**: VS Code extension host (Node) + web-shell (browser). Shared clamp logic runs identically in both via the shared helper.
**Project Type**: Web/extension monorepo (existing). No new project.
**Performance Goals**: Negligible — one extra interval comparison per temporal `SystemState` at load. No measurable impact on load time.
**Constraints**: Offline-capable (no network); the clamp is pure, in-memory, deterministic. Must not auto-mark the plot dirty (spec-261 FR-017). Notifications must be non-blocking (no modal-per-plot during session restore).
**Scale/Scope**: At most one temporal `SystemState` per plot, loaded one plot at a time → at most one clamp + one notification per load. No batch-restore path (multi-plot coalescing deferred to backlog per /speckit.review).

**Hard dependency — RESOLVED**: spec-261 (`261-session-state-systemstate`) is **MERGED** (2026-05-29). The real surfaces (`validate.ts` `checkTemporalCrossField`, `read.ts`, `store-bridge.ts` `hydrateStoreFromFeatures`, `errors.ts` `SystemStateLoadError`) exist and are the amendment targets. The shipped shape differs from 261's planned contract (no `reconcile.ts`, no `persistence/load.ts`, no provenance on markers); all artifacts here have been reconciled to the merged code. See research.md § R-005 and `contracts/system-state-helper-delta.md`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Relevance | Verdict |
|---|---|---|
| **I.3 — No silent failures** | The whole point of the feature: a clamp is *never silent*. Every clamp surfaces a non-blocking notification (FR-003) and, on the next save, a provenance LogEntry (FR-007). | **PASS** — central design goal. |
| **II.1 — Schema single source of truth** | No LinkML change. `current_time` already exists (spec-261 FR-016). This feature changes runtime load behaviour only. | **PASS** — no schema delta. |
| **II.2 — Schema tests mandatory** | No derived-schema change, so the existing adherence suite must pass unchanged (SC-006). New behaviour is covered by helper unit tests + fixtures (recoverable vs. hard-fail). | **PASS**. |
| **III.1 — Provenance always** | **N/A after 261 reconciliation.** 261 ships view-state SystemState markers without a provenance field (FR-013); a load-time playhead clamp is a UI-state recovery, not an analytical transformation. The clamp is surfaced on every load until healed (revised FR-007). | **PASS (not engaged)** — see research § R-002. |
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

This feature amends files that **spec-261 shipped**. Paths below are the *real* merged locations (verified 2026-05-29).

```text
services/session-state/src/system-state/
├── types.ts             # MODIFY — add the PlayheadClampDiagnostic interface
├── validate.ts          # MODIFY — checkTemporalCrossField returns TemporalCrossFieldResult
│                         #          (fatal | recoverable-playhead{edge,clampedCurrentTime} | ok)
├── read.ts              # MODIFY — return ReadSystemStateResult { map; playheadClamps } (review 1A);
│                         #          on recoverable, typed-copy clamp current_time (review 2A) + push
│                         #          diagnostic; fatal still throws SystemStateLoadError
├── store-bridge.ts      # MODIFY — hydrateStoreFromFeatures returns PlayheadClampDiagnostic[]
├── index.ts             # MODIFY — export PlayheadClampDiagnostic + ReadSystemStateResult types
└── __tests__/
    ├── validate.test.ts    # MODIFY — assert fatal vs recoverable-playhead vs ok
    └── read.test.ts        # MODIFY — out-of-window clamps (was: throws); start>end still throws

services/session-state/src/
├── index.ts             # MODIFY — re-export PlayheadClampDiagnostic
└── browser.ts           # MODIFY — re-export PlayheadClampDiagnostic (web-shell barrel)

apps/vscode/src/
├── commands/openPlot.ts # MODIFY (~line 180) — capture hydrate return; non-blocking window.showWarningMessage;
│                         #          keep catch(SystemStateLoadError)→showErrorMessage for fatal
├── services/systemStateBridge.ts   # MODIFY — re-export the type if it narrows the bridge surface
└── tests/unit/systemStateBridge.test.ts  # MODIFY — orphaned playhead returns a clamp (no throw)

apps/web-shell/src/
├── App.tsx              # MODIFY (lines 591, 677) — capture hydrate return; reuse logNotification transient (App.tsx:276)
└── session-state-browser.ts        # MODIFY — re-export PlayheadClampDiagnostic

apps/web-shell/playwright/
├── pages/AnalysisPage.ts           # MODIFY — toast + playhead selectors
└── tests/playhead-clamp.spec.ts    # NEW — E2E: orphaned playhead opens + toast + edge; start>end fails to open

shared/schemas/fixtures/  # NO CHANGE — the cross-field invariant is a runtime check, not a LinkML rule;
                          # out-of-window current_time is LinkML/Zod-valid. Fixtures live in the helper __tests__.
```

**Structure Decision**: No new package, project, or file in the helper (the diagnostic type goes in the existing `types.ts`; the clamp decision folds into `checkTemporalCrossField` — no separate clamp module). The change is concentrated in spec-261's shared `system-state/` layer (single-sourced rule, FR-010) plus two thin host call-sites that render the returned diagnostic (UI decision host-local, Article IV.1).

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
