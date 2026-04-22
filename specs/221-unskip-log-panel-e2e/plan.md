# Implementation Plan: Un-skip Webview Log-Panel E2E Suite

**Branch**: `221-unskip-log-panel-e2e` | **Date**: 2026-04-22 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/221-unskip-log-panel-e2e/spec.md`

## Summary

Reactivate the three tests in `tests/e2e/test-log-panel.spec.ts`, which are currently wrapped in `test.describe.fixme(...)` citing the now-resolved blocker `#143`. Verify the suite passes against the same code-server preview environment already used by `test-analysis-tool.spec.ts` and `test-capture-log-evidence.spec.ts` (both green on `main`). Technical approach: single-file edit (`fixme` → active, strip stale comment), three-run stability check against the Heroku review-app environment, capture evidence artefact, mark backlog `#210` complete. No production code changes. Safety net: if tests fail on reactivation, FR-005 forbids silent re-skip — open a new blocker issue instead.

## Technical Context

**Language/Version**: TypeScript 5.x (test file only — no production code touched)
**Primary Dependencies**: Playwright ^1.57.0, `@sparticuz/chromium` (cloud runner), existing `tests/e2e/fixtures/base.ts` (`codeServerPage` fixture with `openPlotViaStacTree`, `getWebviewFrame`, `getLogPanelFrame`, `executeCommand` helpers)
**Storage**: N/A
**Testing**: Playwright E2E against openvscode-server preview with the sample STAC catalogue (`Exercise Alpha` plot)
**Target Platform**: Linux (cloud Claude Code sandbox, Heroku review apps, local dev via `@sparticuz/chromium` extraction)
**Project Type**: Single — test-infrastructure feature; no new source tree
**Performance Goals**: Existing per-test timeouts unchanged (5 s empty-state test, 15 s tool-run tests per NFR-002)
**Constraints**: NFR-001 forbids production code changes in this feature; NFR-002 forbids relaxing timeouts to force passes; FR-005 forbids silent re-skip on failure
**Scale/Scope**: 1 test file (`tests/e2e/test-log-panel.spec.ts`, ~66 LOC), 3 tests, 1 evidence artefact, 1 backlog entry update

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Relevance | Compliance |
|---------|-----------|------------|
| **I.3 — No silent failures** | ★ Primary motivation. A `fixme` on a resolved blocker IS a silent failure of CI coverage. | ✅ Feature directly eliminates the silent failure. |
| **VI.3 — Integration tests for workflows** | ★ These tests are the integration coverage for the `tool-run → log-entry-visible` workflow across the extension-host / webview boundary. | ✅ Reactivation restores the integration-test gate. |
| **VI.4 — CI MUST pass** | ★ SC-004 requires green CI with the three tests executed (not skipped). | ✅ Explicit success criterion. |
| **VII.2 — Tests are the spec** | Tests already written in `#176`; this feature makes them executable again. | ✅ No new test authorship needed. |
| **IX — Dependencies** | No new dependencies introduced. | ✅ |
| **XIII.1 — Atomic commits** | Single-file test change + evidence + backlog update lands as one logical feature. | ✅ |
| **XV — Strict type safety** | Test file already typed; no `any` introduced. | ✅ |

**Non-applicable articles**: II (no schema changes), III (no data transformations), IV (no service boundary changes), V (no extension work), VIII.3 (no ADR — this is a test-infrastructure reactivation, not a design decision), X (no secrets), XI (no user-facing strings), XII (no user-facing surface), XIV (does not invoke pre-release freedom).

**Gate status**: ✅ PASS. No violations; no Complexity Tracking entries required.

**Post-design re-check** (after research.md + quickstart.md): ✅ PASS. Phase 1 design did not surface any new article dependencies. Research R5 (log-panel focus-command string discrepancy) was flagged but resolves to "empirically works via selector fallback" — not a constitutional concern. R7 failure-mode plan explicitly reinforces Article I.3 (no silent failures) by forbidding `fixme`-on-closed-blocker re-entry.

## Project Structure

### Documentation (this feature)

```text
specs/221-unskip-log-panel-e2e/
├── spec.md                 # Feature specification (already committed)
├── plan.md                 # This file
├── research.md             # Phase 0 output — reactivation-readiness evidence
├── quickstart.md           # Phase 1 output — how to run the reactivated tests
├── checklists/
│   └── requirements.md     # Spec quality checklist (already committed)
├── evidence/               # Populated during implementation (task phase)
│   └── test-summary.md     # Three-run pass record per FR-006 / SC-003
└── media/                  # Phase 2 output
    ├── planning-post.md
    └── linkedin-planning.md

# NOT created for this feature (no data / no API):
# - data-model.md  — no entities beyond existing test file
# - contracts/     — no API contracts; test file is the contract
```

### Source Code (repository root)

```text
tests/e2e/
├── test-log-panel.spec.ts          # THE file modified by this feature (fixme → active)
├── fixtures/
│   └── base.ts                     # Read-only — provides codeServerPage fixture
├── helpers/                        # Read-only — webview iframe helpers
└── (sibling suites — read-only, used as reference for passing behaviour)
    ├── test-analysis-tool.spec.ts
    ├── test-capture-log-evidence.spec.ts
    └── ...

# Production code — NOT TOUCHED (NFR-001):
# shared/components/src/LogPanel/**
# apps/vscode/src/views/logPanelView.ts
# apps/vscode/src/webview/** (log-panel webview entry)
```

**Structure Decision**: Single-file change inside the existing `tests/e2e/` Playwright test root. No new source directories. Evidence and media co-locate under `specs/221-unskip-log-panel-e2e/` per repo convention.

## Media Components

None — test-infrastructure / CI-coverage feature. No new visual components, no Storybook stories, no shareable component bundle.

## Storybook E2E Testing

None — no interactive UI components added or modified. (Note: LogPanel component Storybook tests already exist and pass; they are out of scope for this feature.)

## Web-Shell E2E Testing

None — no extension workflow changes. This feature reactivates **code-server** webview E2E tests specifically. The web-shell already has its own log-panel E2E at `apps/web-shell/playwright/tests/log-panel.spec.ts` (out of scope per O-004).

## Complexity Tracking

> No entries — Constitution Check passed with no violations.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| *(none)*  | *(n/a)*    | *(n/a)*                              |
