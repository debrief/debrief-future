# Research: End-to-End Workflow Tests

## Decision 1: VS Code Hosting Solution

**Decision**: Use code-server (by Coder) as the browser-hosted VS Code instance.

**Rationale**: code-server is the strongest choice for several reasons: (1) MIT-licensed, no vendor lock-in, (2) its own test suite uses Playwright — a proven reference implementation we can study, (3) official Docker image with extension installation support, (4) `--auth none` for frictionless testing, (5) v4.108.2 tracks VS Code 1.108.2 (Jan 2026). The nested webview iframe access pattern (`frameLocator("iframe.webview.ready").frameLocator("#active-frame")`) is documented and tested in their own codebase.

**Alternatives considered**:
- OpenVSCode Server (Gitpod) — MIT-licensed, closer to upstream VS Code, used by CodiumAI for extension testing. Viable but less documented Playwright patterns and no built-in auth handling.
- @vscode/test-web (Microsoft) — designed for running extension test modules *inside* the VS Code host, not for Playwright-driven UI interaction testing. Wrong tool for this job.
- VS Code Server (Microsoft) — proprietary license prohibits hosting as a service; not viable for automated testing.

## Decision 2: Browser Automation Tool

**Decision**: Use Playwright (already in the project at @playwright/test ^1.57.0).

**Rationale**: Playwright is already used extensively in this project (7 test files, 4 configs, CI integration). The team has solved the hard problems — @sparticuz/chromium for Claude Code sessions, custom launch args for sandboxed environments, and screenshot capture patterns. Adding e2e tests against code-server is an incremental extension, not a new capability.

**Alternatives considered**:
- Cypress — less capable with iframe interaction, which is critical for VS Code webview testing
- Selenium — more overhead, less developer-friendly than Playwright for modern web apps

## Decision 3: Webview Interaction Strategy

**Decision**: Use Playwright's `frameLocator()` to drill into VS Code's nested webview iframes, targeting Debrief-controlled DOM elements inside the innermost frame.

**Rationale**: VS Code webviews use a two-level iframe structure: an outer `iframe.webview.ready` container and an inner `#active-frame` content iframe. Playwright's `frameLocator` handles cross-origin boundaries at the CDP level. Most test assertions target Debrief-controlled components (map panel with Leaflet, catalog tree view, tool result panels) whose DOM structure is stable and owned by the project.

**Known risks**:
- Playwright issue #36943 documents CI instability with nested iframe access. Mitigation: generous timeouts, wait for `.ready` class before drilling in, retry flaky frame access.
- Service workers in VS Code web add startup latency. Mitigation: globalSetup waits for full VS Code + extension readiness before tests begin.

**Alternatives considered**:
- WebSocket-based proxy (CodiumAI approach) — messages from webview are proxied to test. More reliable but significantly more infrastructure to build. Reserve as fallback if iframe approach proves too flaky.

## Decision 4: Test Environment Architecture

**Decision**: Docker for CI reproducibility, local code-server for developer workflow. Same Playwright test scripts in both modes.

**Rationale**: A Dockerfile pre-installs code-server, Python services (via uv), and the Debrief extension (.vsix). This guarantees reproducibility in CI. For local development, developers install code-server directly and run the same tests. The Playwright config detects the environment and adjusts the base URL accordingly.

**Docker image layers**:
1. `codercom/code-server:latest` — base
2. Python 3.11 + uv — service runtime
3. `uv pip install` workspace services — io, stac, calc
4. `code-server --install-extension debrief.vsix` — extension
5. Copy test workspace with sample data

**Alternatives considered**:
- Docker-only — rejected because developers need fast feedback loops; waiting for Docker builds slows iteration
- Local-only — rejected because CI needs reproducibility; "works on my machine" failures are unacceptable

## Decision 5: Test File Organization

**Decision**: Three test files aligned with spec user stories, plus a page object model and shared fixtures.

**Rationale**: Follows the pattern established in `apps/web-shell/playwright/tests/` which has separate spec files per workflow (plot-load.spec.ts, tool-execution.spec.ts, catalog-browse.spec.ts). Page objects encapsulate VS Code chrome interactions (CodeServerPage) and Debrief webview interactions (DebriefWebview), making tests readable and maintainable.

**Alternatives considered**:
- Single test file — rejected because isolation matters; a failure in error testing shouldn't block load/display verification
- One file per acceptance scenario — rejected because too granular; shared setup within a story group avoids repetition

## Decision 6: Extension Installation in code-server

**Decision**: Pre-build the extension as a .vsix, install via `code-server --install-extension` in the Dockerfile.

**Rationale**: The extension must be fully packaged before testing. The .vsix includes all TypeScript bundles, Python service wrappers, and webview assets. Installing during Docker build ensures the extension is ready when tests start, with no runtime dependency on npm/pnpm.

**Key consideration**: code-server uses Open VSX, not the Microsoft Marketplace. Since the Debrief extension is not published to either marketplace, .vsix installation is the only viable path — and it works identically in code-server and desktop VS Code.

## Decision 7: Existing Web Shell Tests as Reference

**Decision**: Use the `apps/web-shell/playwright/tests/` patterns as the primary reference for test structure, selectors, and assertions.

**Rationale**: The web shell tests already exercise very similar workflows — `plot-load.spec.ts` tests file loading, `tool-execution.spec.ts` tests calc integration, `catalog-browse.spec.ts` tests STAC navigation. These use selectors like `.catalog-overview`, `.leaflet-container`, `.web-shell--analysis` that the e2e tests can adapt for the VS Code webview context.

**Key difference**: Web shell tests run against a Vite dev server. E2e tests run against code-server. The webview components are the same React/Leaflet code, but accessed through VS Code's iframe hierarchy instead of a direct URL.

## Decision 8: CI Integration

**Decision**: Add a new CI job that builds the Docker image, starts code-server, and runs Playwright tests.

**Rationale**: Matches the existing CI pattern (`.github/workflows/ci.yml` already installs Playwright browsers). The Docker-based approach ensures reproducibility. Health check loop (`until curl -s http://localhost:8080`) waits for code-server readiness before test execution.

**CI workflow outline**:
1. Build Docker image (code-server + services + extension)
2. Start container with `--auth none` and health check
3. Run `npx playwright test --config tests/e2e/playwright.config.ts`
4. Upload HTML report + screenshots as artifacts
5. Teardown container

**Alternatives considered**:
- Run in existing test job — rejected because code-server startup adds significant time; separate job allows parallel execution
- Use GitHub Actions services — viable but less control over extension installation timing
