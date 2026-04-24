# Implementation Plan: Reactivate Webview Log-Panel E2E Suite

**Branch**: `210-unskip-log-panel-e2e` | **Date**: 2026-04-24 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/210-unskip-log-panel-e2e/spec.md`

## Summary

Convert the `test.describe.fixme(...)` block in `tests/e2e/test-log-panel.spec.ts` into an active `test.describe(...)` suite now that its blockers (#143 STAC-tree reliability and #176 LogPanel UX) have shipped. Keep the three existing scenarios (empty state, entry creation, ordering), add two scenarios for selection parity with the web-shell suite (click-to-select, click-to-deselect), strip residual blocked-state comments, and make the suite a first-class member of the default E2E run. No component DOM changes, no new dependencies, no bespoke test helpers.

## Technical Context

**Language/Version**: TypeScript 5.x (test file uses existing `@playwright/test` v1.57.x harness)
**Primary Dependencies**: `@playwright/test ^1.57.0` (existing), `@sparticuz/chromium` (existing sandboxed-Chromium path for cloud runs), existing `tests/e2e/fixtures/base.ts`, existing `tests/e2e/models/code-server-page.ts` (`openPlotViaStacTree`, `getLogPanelFrame`, `getWebviewFrame`, `executeCommand`)
**Storage**: N/A (no persistence; test-only change)
**Testing**: Playwright E2E against openvscode-server (configured in `tests/e2e/playwright.config.ts`: `timeout: 60_000`, `actionTimeout: 15_000`, `retries: 0 in CI / 1 local`, `workers: 1`, `trace: on-first-retry`)
**Target Platform**: Linux CI (openvscode-server via `.github/workflows/ci.yml`) + local dev (macOS/Linux/WSL). Cloud sessions use `@sparticuz/chromium` via `run-playwright.mjs`.
**Project Type**: monorepo (existing) — no new project; edits live under `tests/e2e/`
**Performance Goals**: Suite wall-clock ≤ 90 s median across 10 consecutive CI runs (see SC-005)
**Constraints**: No scenario-level timeout overrides without inline justification; no bespoke fixtures; no new runtime dependencies; must pass on `workers: 1` without introducing cross-scenario coupling
**Scale/Scope**: 5 scenarios in one `.spec.ts` file; ~80-120 LOC edit to the test file; zero changes to component source; zero changes to page models and fixtures (if possible — see research R3)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Verdict | Evidence / Rationale |
|---------|---------|----------------------|
| I — Defence-Grade Reliability | ✅ Pass | Test-infra only; no runtime change. Tests run offline against local openvscode-server. |
| II — Schema Integrity | ✅ N/A | No schemas touched. |
| III — Data Sovereignty | ✅ N/A | No data transformations or persistence. |
| IV — Architectural Boundaries | ✅ Pass | Tests observe existing service/UI boundaries; do not cross them. |
| V — Extensibility | ✅ N/A | No extension surface changes. |
| VI — Testing | ✅ Core alignment | This feature IS the testing article applied to reactivated coverage. Closes the integration-path gap. |
| VII — Test-Driven AI Collaboration | ✅ Pass | Tests define "done"; acceptance scenarios in spec.md map 1:1 to the 5 Playwright scenarios this plan adds/reactivates. |
| VIII — Documentation | ✅ Pass | Spec present at `specs/210-unskip-log-panel-e2e/spec.md`; quickstart emitted in Phase 1. |
| IX — Dependencies | ✅ Pass | Zero new dependencies. Uses existing Playwright harness. |
| X — Security | ✅ N/A | No credentials, no secrets, no classification boundary. |
| XI — Internationalisation | ✅ N/A | Test file, not user-facing. |
| XII — Community Engagement | ✅ Pass | Work is public and delivered via PR. |
| XIII — Contribution Standards | ✅ Pass | Atomic PR planned; CI gate includes this suite post-merge. |
| XIV — Pre-Release Freedom | ✅ Pass | Pre-v4.0.0 context permits rapid iteration; no deprecation obligations. |
| XV — Strict Type Safety | ✅ Pass | Test file retains explicit types; no `any` introduced. Fixture base already provides typed `codeServerPage`. |

**Result**: No gate violations. Proceeding to Phase 0.

**Post-design re-check (2026-04-24, after Phase 0 + Phase 1 artefacts written)**:

- The design artefacts (research.md, quickstart.md, opening-context.md) introduce **no new Constitution implications**. No new dependencies, no new schemas, no new data boundaries.
- Research R5 ("four sibling suites remain `.skip`") is disclosed as a known risk with a documented mitigation path (revert to `fixme`, file a new bug) — consistent with Article I ("no silent failures") and Article VII ("iterate on failures with specific feedback"). The revert trigger is now pinned to a concrete, machine-checkable rule (2 consecutive main failures within 24 h, or ≥ 3 failures in the last 10 main runs).
- `data-model.md` and `contracts/` are explicitly omitted (see Project Structure above) because no entities or APIs are introduced. This is consistent with Article VIII ("specs before code") — the spec, plan, research, quickstart, and cached opener collectively cover the "documented" bar without padding empty artefacts.
- **Verdict**: Design remains gate-clean. Proceed to `/speckit.tasks` when ready.

**Second re-check (2026-04-24, after `/speckit.review` feedback applied)**:

- Spec FR-010 (assertion form pinned as `toHaveClass(/selected/)` regex) and FR-011 (lint-level skip-guard) added — neither introduces new dependencies, schemas, or architectural surface. Article IX (Dependencies) holds; the optional ESLint implementation path reuses the existing `@typescript-eslint` toolchain already present in the monorepo.
- Research R2 mitigation is now expressed as a reactive trigger (85 s warning / 90 s breach → scenario consolidation). No pre-emptive scope reduction.
- Research R5 mitigation now has a concrete trigger rule. Both changes strengthen Article I (Defence-Grade Reliability — no silent degradation) by making the two soft intents machine-checkable.
- **Verdict**: Still gate-clean. Proceed to `/speckit.tasks`.

## Project Structure

### Documentation (this feature)

```text
specs/210-unskip-log-panel-e2e/
├── plan.md                        # This file (/speckit.plan output)
├── spec.md                        # /speckit.specify output
├── research.md                    # Phase 0 output
├── quickstart.md                  # Phase 1 output
├── checklists/
│   └── requirements.md            # from /speckit.specify
├── evidence/
│   └── opening-context.md         # Phase 2 output (cached blog opener)
└── tasks.md                       # Phase 3 output (/speckit.tasks — NOT created here)
```

Note: `data-model.md` and `contracts/` are **not** emitted for this feature. Rationale: the feature introduces no new entities, no new APIs, and no new data-flow — it re-enables an existing Playwright suite. Emitting empty or placeholder files would be noise. The omission is declared here and recorded in Phase 1.

### Source Code (repository root)

```text
tests/e2e/
├── test-log-panel.spec.ts             # EDITED — remove test.describe.fixme, add 2 scenarios
├── fixtures/base.ts                   # UNCHANGED — existing fixture reused
├── models/
│   └── code-server-page.ts            # UNCHANGED preferred; TBD in research if a tiny helper addition is warranted
└── playwright.config.ts               # UNCHANGED

shared/components/src/LogPanel/        # UNCHANGED (component source — no touch)
```

**Structure Decision**: Single-file edit within an existing monorepo directory. The test file `tests/e2e/test-log-panel.spec.ts` is the **only** guaranteed change; `tests/e2e/models/code-server-page.ts` may receive an additive helper **only if** Phase 0 research confirms it's required for scenario independence (default: no change). In addition, a **lint-level skip-guard** (spec FR-011) is added to the project's lint step — implementation is either a one-line grep in the Taskfile `lint` target (exits non-zero if `tests/e2e/test-log-panel.spec.ts` contains `test\.(skip|fixme)` or `test\.describe\.(skip|fixme)`), or an ESLint `no-restricted-syntax` rule scoped via `overrides` to that file. The implementer picks whichever matches the project's existing lint wiring; either form satisfies FR-011 and makes User Story 2 machine-verifiable.

## Media Components

**None — test-infrastructure feature.**

The feature reactivates an existing Playwright suite in `tests/e2e/`. It does not introduce, modify, or visually change any React component. The LogPanel component it asserts against (already shipped under #176) has its own Storybook stories at `shared/components/src/LogPanel/LogPanel.stories.tsx`, but those stories are out of scope for this PR and remain unchanged.

*If no components identified, write "None - backend/infrastructure feature"* — **None - backend/infrastructure feature.**

## Storybook E2E Testing

**None — no Storybook stories are introduced or altered by this feature.**

The Storybook path (`shared/components/e2e/`) covers component-level behaviour in isolation, which is orthogonal to this feature's goal of covering the real code-server → webview iframe → extension host integration path (the gap Storybook cannot close per the spec description).

*If no e2e tests needed, write "None - no interactive UI components"* — **None - no interactive UI components.**

## Web-Shell E2E Testing

**None — no web-shell workflow is affected.**

The web-shell log-panel suite at `apps/web-shell/playwright/tests/log-panel.spec.ts` already exists and is the parity baseline for this feature; it is **not** modified by this PR. All changes this PR introduces live in the sibling VS Code E2E suite (`tests/e2e/`), which exercises a different host surface (openvscode-server + VS Code extension host + webview iframe hierarchy).

*If no workflow E2E tests needed, write "None - no extension workflow changes"* — **None - no extension workflow changes.** (The feature's *own* E2E tests are the ones being reactivated in `tests/e2e/` — that is their primary purpose, not an auxiliary verification step.)

## Complexity Tracking

No Constitution Check violations. Table intentionally left empty.
