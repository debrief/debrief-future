# Implementation Plan: End-to-End Workflow Tests

**Branch**: `005-e2e-workflow-tests` | **Date**: 2026-02-06 | **Revised**: 2026-03-06 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/005-e2e-workflow-tests/spec.md`

## Summary

Dual-platform E2E test strategy exercising the complete Debrief workflow (io → stac → calc) through both the web-shell (13 spec files, 81+ tests with mock data) and the VS Code extension (expanding from 8 to 13+ spec files with real Python services). The web-shell catches orchestration regressions quickly; the VS Code E2E tests validate extension-specific concerns (activation, VSIX packaging, webview lifecycle) against real REP files parsed by real Python services.

## Technical Context

**Language/Version**: TypeScript 5.x (test code), Python 3.11 (services under test)
**Primary Dependencies**: openvscode-server / code-server, @playwright/test ^1.57.0, @sparticuz/chromium
**Storage**: Local filesystem (STAC catalogs in test workspace, real REP files from `services/io/tests/fixtures/`)
**Testing**: Playwright with custom fixtures; web-shell tests via Vite dev server; VS Code E2E tests via openvscode-server/code-server
**Target Platform**: Linux (CI via GitHub Actions), macOS/Linux (developer workstations)
**Project Type**: Test infrastructure (Playwright tests + Docker config + CI workflow)
**Performance Goals**: Full E2E suite (both platforms) completes within 10 minutes in CI
**Constraints**: Offline-capable, must work in Claude Code sessions (@sparticuz/chromium), real Python services must be reachable from VS Code E2E environment
**Scale/Scope**: 13 web-shell spec files (existing), 13+ VS Code E2E spec files (expanding from 8), Docker environment, dedicated CI workflow

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Gate | Status | Notes |
|---------|------|--------|-------|
| I. Defence-Grade Reliability | Offline by default | PASS | openvscode-server/code-server runs locally; Docker container self-contained |
| II. Schema Integrity | Schema tests mandatory | PASS | Tests validate schema-conformant data flows through the full UI pipeline |
| III. Data Sovereignty | Provenance always | PASS | VS Code E2E tests verify provenance chain from analysis results back to real REP source files |
| IV. Architectural Boundaries | Services never touch UI | PASS | Tests exercise the correct boundary: extension orchestrates, services return data |
| VI. Testing | Integration tests for workflows | PASS | Directly implements Article VI.3 — end-to-end path testing on both platforms |
| VII. Test-Driven AI | Tests before implementation | PASS | Spec and plan precede implementation |
| VIII. Documentation | Specs before code | PASS | Specification written and validated |
| IX. Dependencies | Minimal, vetted dependencies | PASS | openvscode-server is MIT-licensed; code-server is MIT-licensed; Playwright already in project |
| XII. Community Engagement | Public by default | PASS | Tests provide reproducible demo environment stakeholders can try |
| XIII. Contribution Standards | CI MUST pass | PASS | Dedicated `e2e.yml` workflow runs in parallel with unit tests |
| XV. Strict Type Safety | Explicit types everywhere | PASS | Test code and page objects use explicit TypeScript types |

**Post-Design Re-check**: All gates remain PASS. Dual-platform approach strengthens Article VI compliance by testing the same workflows through two independent surfaces.

## Project Structure

### Documentation (this feature)

```text
specs/005-e2e-workflow-tests/
├── plan.md              # This file
├── research.md          # Phase 0: Dual-platform research decisions
├── data-model.md        # Phase 1: Test environment model (both platforms)
├── quickstart.md        # Phase 1: Developer getting-started (both surfaces)
├── contracts/           # Phase 1: Service + webview interaction contracts
│   ├── io-to-stac.md
│   ├── stac-to-calc.md
│   └── webview-selectors.md
├── media/               # Phase 2: Planning post + LinkedIn
│   ├── planning-post.md
│   └── linkedin-planning.md
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
# Web-shell test suite (existing — 13 spec files)
apps/web-shell/
├── playwright/
│   ├── tests/
│   │   ├── catalog-browse.spec.ts
│   │   ├── capture-log-evidence.spec.ts
│   │   ├── drawing.spec.ts
│   │   ├── event-log-propagation.spec.ts
│   │   ├── log-edit-face.spec.ts
│   │   ├── log-panel.spec.ts
│   │   ├── plot-load.spec.ts
│   │   ├── selection-sync.spec.ts
│   │   ├── styling-tools.spec.ts
│   │   ├── time-controller.spec.ts
│   │   ├── tool-execution.spec.ts
│   │   ├── tune-prov.spec.ts
│   │   └── undo-redo-split.spec.ts
│   └── ...
└── run-playwright.mjs           # Chromium extraction for sandboxed envs

# VS Code E2E test suite (expanding from 8 to 13+ spec files)
tests/e2e/
├── playwright.config.ts         # Config (openvscode-server/code-server)
├── global-setup.ts              # Start server, seed config, wait for ready
├── global-teardown.ts           # Stop server
├── fixtures/
│   └── base.ts                  # Custom fixture: codeServerPage
├── helpers/
│   └── webview-injector.ts      # Webview frame access helpers
├── models/
│   └── code-server-page.ts      # Page object: VS Code chrome interactions
├── scripts/
│   ├── cloud-e2e-setup.sh       # Cloud environment setup
│   ├── ensure-chromium.sh       # Chromium download fallback
│   └── patch-webview.sh         # Webview patching utility
├── test-workspace/
│   ├── samples/
│   │   ├── boat1.rep            # Real REP file for testing
│   │   ├── boat2.rep            # Real REP file for testing
│   │   └── malformed.rep        # Invalid REP for error testing
│   └── local-store/             # Pre-built STAC catalog
│       ├── catalog.json
│       ├── exercise-alpha/
│       └── training-run-1/
├── test-load-display.spec.ts    # P1: File loading workflow
├── test-analysis-tool.spec.ts   # P2: Tool execution workflow
├── test-error-feedback.spec.ts  # P3: Error handling
├── test-tune-prov.spec.ts       # Provenance tuning
├── test-real-webview.spec.ts    # Real webview interaction
├── test-webview-probe.spec.ts   # Webview structure probing
├── test-preview-smoke.spec.ts   # Preview smoke tests
├── test-heroku-smoke.spec.ts    # Heroku deployment smoke
└── (new spec files to match web-shell categories)

# Docker environment (CI)
docker/code-server/
├── Dockerfile                   # code-server + Python services + VSIX
└── docker-compose.yml           # One-command test environment

# CI workflow
.github/workflows/e2e.yml       # Dedicated E2E job (parallel with ci.yml)
```

**Structure Decision**: Two test surfaces in separate directories (`apps/web-shell/playwright/` and `tests/e2e/`), each with their own Playwright config and infrastructure. The web-shell uses mock data for speed; VS Code E2E uses real REP files and Python services for fidelity. Docker config stays at `docker/code-server/` for CI reproducibility.

## Implementation Phases

### Phase A: VS Code E2E Restoration (existing tests)

**Goal**: Unskip/fixme the 4 spec files that currently have `.skip()` annotations and verify they pass against the Docker environment.

1. Remove `.skip()` from `test-load-display.spec.ts`, `test-analysis-tool.spec.ts`, `test-error-feedback.spec.ts`, `test-tune-prov.spec.ts`
2. Fix DOM selectors to match current extension output
3. Verify real Python services are reachable from the Docker container
4. Convert tests that reveal missing features to `test.fixme()` with backlog cross-references

### Phase B: VS Code E2E Expansion (new tests)

**Goal**: Create new spec files to match all 13 web-shell categories.

Missing categories to implement:
- `capture-log-evidence.spec.ts` — log capture and evidence collection
- `event-log-propagation.spec.ts` — event propagation through log system
- `log-edit-face.spec.ts` — log editing UI
- `log-panel.spec.ts` — log panel display
- `styling-tools.spec.ts` — styling/theming tools
- `undo-redo-split.spec.ts` — undo/redo and track splitting

Each new spec file adapts the web-shell test patterns for the VS Code webview context (iframe access, page objects, real service data).

### Phase C: CI Integration

**Goal**: Ensure both suites run reliably in CI as a parallel job.

1. Verify `e2e.yml` workflow correctly builds Docker, starts container, runs tests
2. Ensure web-shell tests remain in main `ci.yml` workflow
3. Both suites must complete within 10 minutes total
4. Upload Playwright reports, screenshots, and traces as CI artifacts

## Media Components

None — test infrastructure feature (no visual components created)

## Storybook E2E Testing

None — no interactive UI components created (tests *interact with* existing components but don't create new ones)

## Complexity Tracking

No constitution violations. No complexity tracking required.
