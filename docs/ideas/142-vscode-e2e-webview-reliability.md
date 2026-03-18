# VS Code E2E Webview Reliability — Research Sprint

## Category
Infrastructure (research sprint)

## Problem

18 VS Code E2E test files exist in `tests/e2e/` but ~15 of them self-skip via `test.skip()` because the webview `#active-frame` iframe is never reliably created inside openvscode-server's headless Playwright environment. This means the VS Code extension's core user workflows (load-and-display, analysis tools, selection sync, time controller, drawing, undo/redo, etc.) have **zero automated E2E coverage** against the real extension — only the web-shell E2E suite covers the React components directly (without VS Code iframe nesting).

### Skipped Test Files (15 files, ~50+ individual tests)

| File | Tests | What it covers |
|------|-------|---------------|
| `test-load-display.spec.ts` | 4 | Open plot via STAC tree, map tracks, feature list selection |
| `test-analysis-tool.spec.ts` | 4 | Select tracks, run tools, verify log entries |
| `test-error-feedback.spec.ts` | 3 | Malformed file handling, tool precondition errors |
| `test-tune-prov.spec.ts` | ~10 | Replay, parameter tuning, provenance chain |
| `test-selection-sync.spec.ts` | — | Map click ↔ feature list synchronization |
| `test-time-controller.spec.ts` | — | Time slider, step buttons, playback |
| `test-drawing.spec.ts` | 3 | Drawing toolbar, shape palette, rectangle creation |
| `test-catalog-browse.spec.ts` | 3 | Catalog overview, timeline bars, metadata |
| `test-log-panel.spec.ts` | — | Log panel rendering and interactions |
| `test-log-edit-face.spec.ts` | — | Log entry editing |
| `test-event-log-propagation.spec.ts` | — | Event propagation through log system |
| `test-styling-tools.spec.ts` | — | Feature styling via tools |
| `test-undo-redo-split.spec.ts` | — | UI undo vs data undo via Log |
| `test-capture-log-evidence.spec.ts` | 5 | Evidence screenshot capture |
| `test-webview-probe.spec.ts` | 2 | POC webview injection (also skipped) |

### Active Test Files (3 files)

| File | Status | Notes |
|------|--------|-------|
| `test-real-webview.spec.ts` | Active | Uses MessagePort injection with *placeholder* HTML, not real extension content |
| `test-preview-smoke.spec.ts` | Active | Basic openvscode-server smoke (no webview content needed) |
| `test-heroku-smoke.spec.ts` | Active | Heroku-specific, excluded from CI via `--grep-invert "Heroku"` |

### Root Cause: Four Blockers in openvscode-server Webview Lifecycle

Documented in `docs/project_notes/webview-e2e-research.md`:

1. **Service Worker Conflict** — openvscode-server registers a service worker at `/` that conflicts with the webview host page's expected SW. The `workerReady` Promise never resolves.
   - *File:* `pre/index.html` line 36
   - *Current fix:* `disableServiceWorker = true` (applied by `patch-webview.sh`)

2. **CSP Hash Mismatch** — Modifying the inline `<script type="module">` invalidates the SHA-256 hash in the Content-Security-Policy meta tag. Browser refuses to execute.
   - *File:* `pre/index.html` line 8
   - *Current fix:* Comment out CSP meta tag (applied by `patch-webview.sh`)

3. **Origin Hash Guard** — VS Code's `WebviewElement.ib()` has a guard that silently drops the `webview-ready` message if the origin hash hasn't resolved yet. The message arrives before the hash is stored.
   - *File:* `workbench.js` (minified)
   - *Current fix:* Remove guard, make origin check conditional (applied by `patch-webview.sh`)

4. **`resolveWebviewView` Never Called** — Even with blockers 1-3 fixed, openvscode-server **never calls `resolveWebviewView()`** on the extension's `WebviewViewProvider`. The webview container is created, the iframe loads, `webview-ready` is processed (port stored), `styles` and `focus` messages are sent — but `setHtml()` / `fb("content")` is never called. This appears to be an openvscode-server-specific bug in the webview view lifecycle.
   - *Current workaround:* `tests/e2e/helpers/webview-injector.ts` intercepts the `webview-ready` MessagePort and manually sends a `content` message, bypassing VS Code's broken resolution pipeline. This works for **injected placeholder HTML** but not for real extension bundles because the extension's `resolveWebviewView` is where the real HTML with React/Leaflet is generated.

### Why the Current Workaround is Insufficient

The MessagePort injection in `webview-injector.ts` can push arbitrary HTML into `#active-frame`, but the skipped tests need the **real extension content** — the actual React components (MapView, FeatureList, TimeController, ToolsPanel, ActivityPanel) rendered by the extension's `resolveWebviewView`. The injector can serve placeholder HTML or even a static copy of the extension bundle, but:

- The real content depends on VS Code extension API context (`vscode.postMessage`, `getState`/`setState`)
- The real content communicates bidirectionally with the extension host via MessagePort
- Mocking all of this at the injection level defeats the purpose of E2E testing

## Proposed Approach: Research Sprint

This is a **research sprint** — the deliverable is a validated, reliable approach for making the VS Code extension's real webview content render inside Playwright-controlled openvscode-server in headless cloud CI. The fix must then be applied to unskip the ~15 test files.

### Research Questions

1. **Can `resolveWebviewView` be made to fire?**
   - Is there a startup timing issue? Does the extension activate too late?
   - Would a VS Code command trigger (e.g., `workbench.view.extension.debrief-sidebar`) force resolution?
   - Can we patch `workbench.js` further to trigger the webview view resolution lifecycle?

2. **Is there a newer openvscode-server version that fixes this?**
   - Current: v1.109.5 (pinned in `.github/workflows/e2e.yml`)
   - openvscode-server tracks VS Code releases — check if a newer version (1.110+, 1.95+) fixes the webview view lifecycle
   - Check openvscode-server issue tracker for related bugs

3. **Would code-server work better?**
   - The research notes were originally done against code-server
   - code-server has its own webview issues but may have a different lifecycle path
   - Compare: is the `resolveWebviewView` bug code-server-specific or shared?

4. **Can we intercept at a different level?**
   - Instead of MessagePort injection, could we hook the extension host's webview resolution callback?
   - Could we patch the extension's activation to explicitly trigger `resolveWebviewView`?
   - Could we use `vscode.commands.executeCommand` from inside the test to trigger a view reveal?

5. **Is there a VS Code test framework that handles this?**
   - `@vscode/test-web` — does it handle webview DOM access?
   - `vscode-jupyter` integration test pattern — they test webviews via a Jupyter middleware layer
   - Would running Playwright against a real VS Code (not openvscode-server) in a virtual framebuffer work?

6. **Would a hybrid approach work?**
   - Real extension runs in openvscode-server for extension host + command registration + tree view
   - Webview content tested via web-shell E2E (already working)
   - Only the *integration boundary* (extension ↔ webview communication) tested in VS Code E2E
   - Accept that some webview DOM assertions stay in web-shell only

### Candidate Solutions to Evaluate

| # | Approach | Effort | Fidelity | Notes |
|---|----------|--------|----------|-------|
| A | Patch workbench.js to trigger resolveWebviewView | Medium | High | May break on version upgrades |
| B | Upgrade openvscode-server to latest | Low | High | Only if the bug is fixed upstream |
| C | Switch to code-server | Medium | High | Different patching, may have same issue |
| D | Use real VS Code in xvfb | High | Highest | Best fidelity, hardest CI setup |
| E | Extension-side workaround (explicit view reveal) | Low | High | If a command can force resolution |
| F | Accept hybrid: webview DOM in web-shell only | Low | Medium | Already working, reduces VS Code E2E scope |

### Related Items

- **#005** (complete) — Original E2E workflow tests spec. Delivered the dual-platform strategy and all test files.
- **#135** (approved) — Log Panel webview fails to load in VS Code E2E. This is a *symptom* of the same root cause.
- **#099** (tasked) — Browser-based VS Code extension preview via Heroku Review Apps. Uses similar openvscode-server infrastructure.

## Success Criteria

- [ ] Root cause of `resolveWebviewView` not firing is identified with evidence
- [ ] At least one candidate solution validated end-to-end: real extension webview content renders in headless Playwright
- [ ] Solution works in CI (GitHub Actions ubuntu-latest, no Docker, headless Chromium)
- [ ] Solution documented with reproduction steps and evidence screenshots
- [ ] At least 5 previously-skipped test files unskipped and passing
- [ ] Patches (if any) are version-pinned and documented for upgrade path
- [ ] CI `e2e.yml` updated to use the validated approach

## Existing Infrastructure

### Files

| File | Purpose |
|------|---------|
| `tests/e2e/scripts/patch-webview.sh` | Applies patches 1-3 to openvscode-server |
| `tests/e2e/helpers/webview-injector.ts` | MessagePort interception + content injection |
| `tests/e2e/models/debrief-webview.ts` | Page object model for webview interactions |
| `tests/e2e/fixtures/base.ts` | Playwright test fixtures (codeServerPage) |
| `tests/e2e/global-setup.ts` | Starts openvscode-server before tests |
| `tests/e2e/playwright.config.ts` | Playwright config with Chromium resolution |
| `.github/workflows/e2e.yml` | CI workflow (web-shell + VS Code E2E) |

### Documentation

| File | Purpose |
|------|---------|
| `docs/project_notes/webview-e2e-research.md` | Full root cause analysis and experimental timeline |
| `docs/e2e-testing-guide.md` | Developer guide for running and writing E2E tests |
| `docs/project_notes/playwright-installation-research.md` | Chromium extraction for sandboxed environments |
| `specs/005-e2e-workflow-tests/spec.md` | Feature spec with user stories and success criteria |

### CI Configuration

- openvscode-server v1.109.5 (pinned in `e2e.yml`)
- Chromium via `pnpm exec playwright install --with-deps chromium`
- E2E job runs `npx playwright test --config tests/e2e/playwright.config.ts --grep-invert "Heroku"`
- Patches applied via `bash tests/e2e/scripts/patch-webview.sh /opt/openvscode-server`

## Environment Constraints

- **Headless cloud CI** — no display server except xvfb
- **GitHub Actions ubuntu-latest** — standard runner, no Docker-in-Docker
- **No persistent state** between CI runs
- **Chromium only** — via Playwright, no Firefox/WebKit needed
- **Timeout budget** — VS Code E2E job has 25 minute limit

## Dependencies

- #005 (complete) — E2E test infrastructure
- Requires access to openvscode-server or code-server source/issues for debugging

## Complexity
High (Opus) — research sprint with uncertain outcome, requires deep understanding of VS Code webview architecture
