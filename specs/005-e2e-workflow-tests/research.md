# Research: End-to-End Workflow Tests (Revised)

**Revised**: 2026-03-06 — Updated for dual-platform strategy (web-shell + VS Code E2E with real Python services)

## Decision 1: VS Code Hosting Solution

**Decision**: Use openvscode-server (preferred) with code-server as fallback.

**Rationale**: `global-setup.ts` already implements this resolution order: (1) `CODE_SERVER_URL` env var for external servers, (2) already-running server on default port, (3) openvscode-server binary, (4) code-server binary. openvscode-server is preferred because it does not require the proprietary `vsda` WASM module for WebSocket authentication, making it simpler in sandboxed environments. The Docker CI environment continues to use `codercom/code-server:latest` as the base image because it provides a well-tested Docker distribution.

**Alternatives considered**:
- code-server only — still supported as fallback but not preferred for local runs
- @vscode/test-web (Microsoft) — designed for running extension test modules *inside* the VS Code host, not for Playwright-driven UI interaction testing
- VS Code Server (Microsoft) — proprietary license; not viable

## Decision 2: Browser Automation Tool

**Decision**: Use Playwright (already in the project at @playwright/test ^1.57.0).

**Rationale**: Playwright is already used extensively — 13 web-shell test files, 8 VS Code E2E spec files, dedicated CI workflow (`.github/workflows/e2e.yml`). The team has solved sandboxed Chromium extraction (`@sparticuz/chromium`, `ensure-chromium.sh`), custom launch args, and screenshot capture patterns.

**Alternatives considered**:
- Cypress — less capable with iframe interaction critical for VS Code webview testing
- Selenium — more overhead, less developer-friendly

## Decision 3: Dual-Platform Test Strategy

**Decision**: Maintain two complementary test suites — web-shell (13 spec files, 81+ tests) and VS Code E2E (expanding from 8 to 13+ spec files) — covering the same workflow categories.

**Rationale**: Web-shell tests catch orchestration regressions quickly and cheaply (no VS Code startup). VS Code E2E tests catch extension-specific issues (activation, command palette, webview lifecycle, VSIX packaging). Testing both surfaces provides higher confidence. The web-shell uses mock STAC data for speed; VS Code E2E uses real Python services for fidelity.

**Key differences**:

| Aspect | Web-Shell | VS Code E2E |
|--------|-----------|-------------|
| Server | Vite dev server | openvscode-server / code-server |
| Data | Mock STAC fixtures | Real REP files → real Python services |
| Speed | Fast (no extension host) | Slower (extension activation + services) |
| Scope | Orchestration logic | Extension-specific + orchestration |
| CI | Part of main `ci.yml` | Separate `e2e.yml` workflow |

**Alternatives considered**:
- Web-shell only — misses extension-specific regressions
- VS Code E2E only — too slow for rapid feedback; web-shell catches most regressions faster
- Mock services in VS Code E2E — lower fidelity; spec requires real services for true end-to-end

## Decision 4: Real Python Services in VS Code E2E

**Decision**: The VS Code E2E environment uses real Python services (debrief-io, debrief-stac, debrief-calc) parsing real sample REP files for true end-to-end fidelity.

**Rationale**: The spec explicitly requires this (FR-003). The Docker image already installs Python services via `uv pip install` in a virtual environment. Sample REP files exist at `services/io/tests/fixtures/valid/` (boat1.rep, boat2.rep, shapes.rep, narrative.rep) and are copied into the test workspace. The test workspace includes a pre-built STAC `local-store` with `catalog.json` and sample plots.

**Implications for test assertions**:
- Real service outputs may have different track counts, coordinate values, and timing than mock fixtures
- VS Code E2E assertions must be structurally-oriented (e.g., "at least one track exists") rather than value-exact (e.g., "exactly 3 tracks")
- Provenance chains from real services contain actual UUIDs and timestamps

**Alternatives considered**:
- Mock Python services — lower fidelity, misses real parsing edge cases, but faster
- Pre-computed fixtures only — doesn't test the actual service code path

## Decision 5: Test File Organization

**Decision**: Expand VS Code E2E from 8 to 13+ spec files, matching web-shell's 13 spec file categories. Use `test.fixme()` for tests that reveal missing features.

**Rationale**: The spec requires VS Code E2E to cover all 13 web-shell spec categories (SC-006). Currently the VS Code E2E suite has 8 spec files. Missing categories (from web-shell) include: `capture-log-evidence`, `event-log-propagation`, `log-edit-face`, `log-panel`, `styling-tools`, `undo-redo-split`. New spec files will be created for these.

**`test.fixme()` strategy** (FR-011):
- When a VS Code E2E test reveals a missing or incomplete extension feature, annotate with `test.fixme("Feature X not implemented — see backlog item #NNN")`
- Create a corresponding backlog item with cross-reference to the test file and line
- This keeps the test suite green while documenting known gaps
- `test.fixme()` differs from `test.skip()` — fixme tests appear in reports as "to be implemented"

**Alternatives considered**:
- Only restore the original 3 spec files — doesn't meet SC-006 coverage requirement
- Skip tests for missing features — `.skip()` hides gaps; `.fixme()` makes them visible

## Decision 6: Webview Interaction Strategy

**Decision**: Use Playwright's `frameLocator()` to drill into VS Code's nested webview iframes.

**Rationale**: VS Code webviews use a two-level iframe structure: outer `iframe.webview.ready` and inner `#active-frame`. Playwright's `frameLocator` handles cross-origin boundaries at the CDP level. The existing `models/code-server-page.ts` and `helpers/webview-injector.ts` already implement this pattern.

**Known risks**:
- CI instability with nested iframe access (Playwright issue #36943). Mitigation: generous timeouts, `.ready` class wait, retry on flaky frame access
- Service workers in VS Code web add startup latency. Mitigation: globalSetup waits for full readiness

**Alternatives considered**:
- WebSocket-based proxy — more reliable but significantly more infrastructure

## Decision 7: Docker Environment Architecture

**Decision**: Docker container (code-server base) for CI with real Python services installed. Local openvscode-server for developer workflow.

**Rationale**: The `docker/code-server/Dockerfile` already implements this — installs Python 3.11, uv, Python services in a virtualenv, copies test workspace, and installs the VSIX. CI builds and starts this container, runs Playwright tests against it, and tears down.

**Docker image layers** (current):
1. `codercom/code-server:latest` — base
2. Python 3.11 + uv — service runtime
3. `uv pip install` workspace services (io, stac, calc, schemas)
4. Copy test workspace with REP files + STAC local-store
5. Install Debrief VSIX as `coder` user
6. Pre-seed VS Code settings (trust disabled, welcome tab disabled)

## Decision 8: CI Integration

**Decision**: Dedicated `e2e.yml` workflow running in parallel with the main CI job.

**Rationale**: Already implemented at `.github/workflows/e2e.yml`. Triggers on push to main and PRs touching `tests/e2e/`, `docker/code-server/`, `apps/vscode/`, `services/`, or `shared/schemas/`. Runs as a separate job with 20-minute timeout.

**CI workflow steps** (current):
1. Checkout, install Task/uv/Node.js/pnpm
2. Install Playwright browsers
3. Build workspace dependencies (session-state, components)
4. Build and package VS Code extension (.vsix)
5. Build Docker image
6. Start code-server container
7. Wait for readiness (health check loop)
8. Verify container config (Debrief config, STAC store, extension)
9. Run Playwright tests (`--grep-invert "Heroku"`)
10. Upload artifacts (report, screenshots, traces)
11. Teardown container
