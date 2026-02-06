# Implementation Plan: End-to-End Workflow Tests

**Branch**: `005-e2e-workflow-tests` | **Date**: 2026-02-06 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/005-e2e-workflow-tests/spec.md`

## Summary

Add true end-to-end workflow tests using code-server (browser-hosted VS Code) and Playwright. Tests drive the actual Debrief extension UI — opening REP files, verifying map display, running analysis tools, and checking catalog results — exercising the real TypeScript orchestration layer across all three Python services (io, stac, calc). Builds on the project's existing Playwright infrastructure (7 test files, 4 configs, `@sparticuz/chromium` CI support).

## Technical Context

**Language/Version**: TypeScript 5.x (test code), Python 3.11 (services under test)
**Primary Dependencies**: code-server ^4.x, @playwright/test ^1.57.0 (already in project), @sparticuz/chromium (already in project)
**Storage**: Local filesystem (STAC catalogs in test workspace)
**Testing**: Playwright with custom fixtures, code-server as VS Code host
**Target Platform**: Linux (CI via GitHub Actions), macOS/Linux (developer workstations)
**Project Type**: Test infrastructure (Playwright tests + Docker config + code-server setup)
**Performance Goals**: Full e2e suite completes within 5 minutes in CI
**Constraints**: Offline-capable, must work in Claude Code sessions (@sparticuz/chromium), code-server runs locally or in Docker
**Scale/Scope**: 3 test files (~10-15 test functions), 1 Dockerfile, 1 playwright config, shared page object model

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Gate | Status | Notes |
|---------|------|--------|-------|
| I. Defence-Grade Reliability | Offline by default | PASS | code-server runs locally, no external network needed |
| II. Schema Integrity | Schema tests mandatory | PASS | Tests validate that schema-conformant data flows through the full UI pipeline |
| III. Data Sovereignty | Provenance always | PASS | Tests verify provenance chain from analysis results back to source files |
| IV. Architectural Boundaries | Services never touch UI | PASS | Tests exercise the correct boundary: extension orchestrates, services return data |
| VI. Testing | Integration tests for workflows | PASS | Directly implements Article VI.3 — end-to-end path testing |
| VII. Test-Driven AI | Tests before implementation | PASS | Spec and plan precede implementation |
| VIII. Documentation | Specs before code | PASS | Specification written and validated |
| IX. Dependencies | Minimal, vetted dependencies | PASS | code-server is MIT-licensed; Playwright already in project |
| XII. Community Engagement | Public by default | PASS | Tests provide reproducible demo environment stakeholders can try |
| XIII. Contribution Standards | CI MUST pass | PASS | Tests integrate with existing CI pipeline |

**Post-Design Re-check**: All gates remain PASS. code-server is MIT-licensed (Article IX), runs offline (Article I), and the Dockerfile is reproducible (Article XIII).

## Project Structure

### Documentation (this feature)

```text
specs/005-e2e-workflow-tests/
├── plan.md              # This file
├── research.md          # Phase 0: code-server + Playwright research
├── data-model.md        # Phase 1: Test environment model
├── quickstart.md        # Phase 1: Developer getting-started
├── contracts/           # Phase 1: Webview interaction contracts
│   └── webview-selectors.md
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
tests/
└── e2e/
    ├── playwright.config.ts     # Playwright config targeting code-server
    ├── global-setup.ts          # Start code-server, wait for ready
    ├── global-teardown.ts       # Stop code-server
    ├── fixtures/
    │   └── base.ts              # Custom fixture: codeServerPage
    ├── models/
    │   ├── code-server-page.ts  # Page object: VS Code chrome interactions
    │   └── debrief-webview.ts   # Page object: Debrief webview components
    ├── test-workspace/
    │   ├── samples/
    │   │   ├── boat1.rep        # Symlink to services/io/tests/fixtures/valid/
    │   │   ├── boat2.rep        # Symlink to services/io/tests/fixtures/valid/
    │   │   └── malformed.rep    # Symlink to services/io/tests/fixtures/invalid/
    │   └── .vscode/
    │       └── settings.json    # Extension config for test workspace
    ├── test-load-display.spec.ts    # P1: Open file → map display
    ├── test-analysis-tool.spec.ts   # P2: Select → run tool → verify results
    └── test-error-feedback.spec.ts  # P3: Error handling across boundaries

docker/
└── code-server/
    ├── Dockerfile               # code-server + Python services + extension
    └── docker-compose.yml       # One-command test environment
```

**Structure Decision**: Tests live at `tests/e2e/` to parallel the existing test structure. Docker config lives at `docker/code-server/` to keep the repo root clean. The test workspace uses symlinks to existing io fixtures rather than duplicating data.

## Media Components

None - test infrastructure feature (no visual components created)

## Storybook E2E Testing

None - no interactive UI components created (tests *interact with* existing components but don't create new ones)

## Complexity Tracking

No constitution violations. No complexity tracking required.
