# E2E Test Restoration Requirements

> This document describes the prerequisites for restoring the skipped E2E tests
> in `tests/e2e/`. The infrastructure (Playwright, Chromium, openvscode-server)
> is verified working — what remains is the Debrief VS Code extension and its
> backing services.

## Current State

The E2E infrastructure is proven:

- **Chromium** downloads from GH release (`playwright-browsers-v1`) when the
  Playwright CDN is blocked
- **openvscode-server** launches and renders the full VS Code workbench
- **Playwright** drives the browser with `--single-process --no-zygote` flags
  for sandboxed environments
- **Page objects** (`CodeServerPage`, `DebriefWebview`) handle command palette,
  Quick Open, webview iframe drilling, and notification reading

Evidence screenshots in `specs/005-e2e-workflow-tests/evidence/screenshots/`
confirm workbench loading, command palette, Quick Open, and file opening all
work.

### Skipped Test Files

| File | Tests | User Story | Priority |
|------|-------|------------|----------|
| `test-load-display.spec.ts` | T014–T017 | US1: Load and Display | P1 |
| `test-analysis-tool.spec.ts` | T018–T021 | US2: Analysis Tool Execution | P2 |
| `test-error-feedback.spec.ts` | T022–T024 | US3: Error Feedback | P3 |

All files use `test.describe.skip()` — test bodies are preserved in full.

---

## Prerequisites by User Story

### US1: Load and Display Workflow (P1 — restore first)

**What the tests do**: Open a `.rep` file → verify tracks render on a Leaflet
map → verify STAC catalog panel populates → verify track selection highlights.

**Required components**:

1. **Debrief VS Code extension** installed and activated in openvscode-server
   - Must register as a handler for `.rep` files
   - Must render a Leaflet map in a webview panel
   - Must render a STAC catalog overview panel

2. **debrief-io service** (Python) — parses REP files into GeoJSON
   - Called by the extension when a `.rep` file is opened

3. **debrief-stac service** (Python) — stores parsed data as STAC Items
   - Called by the extension after io parsing completes

4. **Sample data** in `tests/e2e/test-workspace/samples/`
   - `boat1.rep` — single-track REP file

**DOM selectors used by tests**:

| Selector | Purpose |
|----------|---------|
| `.leaflet-container` | Map container visible |
| `.leaflet-interactive` | Track features on map |
| `.catalog-overview` | STAC catalog panel |
| `.catalog-plot-item` | Individual plot entries |
| `.track--selected` or `.debrief-feature-row--selected` | Selected track highlight |

**To restore**: Remove `.skip` from `test.describe.skip()`, uncomment `expect`
assertions, verify selectors match the extension's actual DOM.

### US2: Analysis Tool Execution Workflow (P2)

**What the tests do**: Select features → run analysis tool via command palette →
verify results appear in catalog and on map.

**Required components** (in addition to US1 prerequisites):

1. **debrief-calc service** (Python) — executes analysis tools
2. **Extension command**: `Debrief: Run Analysis Tool`
3. **Sample data**: `boat1.rep` and `boat2.rep`

**DOM selectors used by tests**:

| Selector | Purpose |
|----------|---------|
| `.tool-result-item` | Analysis result entries |
| `.provenance-source` | Provenance lineage markers |

**To restore**: Same as US1, plus ensure calc service is running and the command
is registered.

### US3: Error Feedback Workflow (P3)

**What the tests do**: Trigger error conditions → verify error notifications
surface to the user.

**Required components** (in addition to US1 prerequisites):

1. **Extension error handling** wired up with notification display
2. **Extension command**: `Debrief: Run Incompatible Tool`
3. **Sample data**: `samples/malformed.rep` (intentionally broken file)

**DOM selectors used by tests**:

| Selector | Purpose |
|----------|---------|
| `.notification-toast-container` | VS Code notification toasts |

**To restore**: Same as US1, plus ensure error paths produce VS Code
notifications.

---

## Environment Setup

### Extension Installation in openvscode-server

The extension must be sideloaded into openvscode-server before tests run.
Options (in order of preference):

1. **VSIX sideload at startup** — build the extension VSIX, then pass
   `--install-extension /path/to/debrief.vsix` to openvscode-server in
   `global-setup.ts`

2. **Pre-installed in Docker image** — build a Docker image with
   openvscode-server + extension pre-installed, use `CODE_SERVER_URL` env var

3. **Extension marketplace** — if/when the extension is published, configure
   openvscode-server to install from Open VSX

### Python Service Stack

The three Python services (io, calc, stac) must be running and accessible to the
extension. Options:

1. **In-process** — extension spawns Python services as child processes
2. **Docker Compose** — services run in containers alongside openvscode-server
3. **MCP transport** — services communicate via MCP (stdio or HTTP)

The simplest path for CI is Docker Compose with all services + openvscode-server
in a single compose file.

### global-setup.ts Changes

When restoring tests, `global-setup.ts` will need to:

1. Build and sideload the extension VSIX (or verify it's pre-installed)
2. Start Python services (or verify they're reachable)
3. Copy sample data files into the test workspace
4. Wait for extension activation (not just workbench load)

---

## Restoration Checklist

### Phase 1: US1 — Load and Display (P1)

- [ ] Build Debrief VS Code extension as VSIX
- [ ] Add VSIX sideload to `global-setup.ts` startup sequence
- [ ] Start debrief-io and debrief-stac services in test environment
- [ ] Place `boat1.rep` sample file in `tests/e2e/test-workspace/samples/`
- [ ] Verify extension activates and registers `.rep` file handler
- [ ] Verify DOM selectors match extension's actual rendering
- [ ] Remove `.skip` from `test-load-display.spec.ts`
- [ ] Uncomment `expect` assertions
- [ ] Run tests and fix any selector mismatches

### Phase 2: US2 — Analysis Tool Execution (P2)

- [ ] Start debrief-calc service in test environment
- [ ] Verify `Debrief: Run Analysis Tool` command is registered
- [ ] Place `boat2.rep` sample file in test workspace
- [ ] Remove `.skip` from `test-analysis-tool.spec.ts`
- [ ] Uncomment `expect` assertions
- [ ] Run tests and fix any selector mismatches

### Phase 3: US3 — Error Feedback (P3)

- [ ] Create `malformed.rep` sample file for error testing
- [ ] Verify extension error handling produces VS Code notifications
- [ ] Verify `Debrief: Run Incompatible Tool` command is registered
- [ ] Remove `.skip` from `test-error-feedback.spec.ts`
- [ ] Uncomment `expect` assertions
- [ ] Run tests and fix any assertion failures

---

## Infrastructure Already Working

These components are tested and committed — no further work needed:

| Component | Status | Location |
|-----------|--------|----------|
| Chromium download from GH release | Working | `tests/e2e/scripts/ensure-chromium.sh` |
| Playwright config with sandbox flags | Working | `tests/e2e/playwright.config.ts` |
| openvscode-server auto-start | Working | `tests/e2e/global-setup.ts` |
| Welcome tab workaround | Working | `tests/e2e/models/code-server-page.ts` |
| CodeServerPage page object | Working | `tests/e2e/models/code-server-page.ts` |
| DebriefWebview page object | Scaffolded | `tests/e2e/models/debrief-webview.ts` |
| Test fixtures (codeServerPage, debriefWebview) | Working | `tests/e2e/fixtures/base.ts` |
