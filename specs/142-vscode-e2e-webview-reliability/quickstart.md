# Quickstart: VS Code E2E Webview Reliability

**Feature**: 142-vscode-e2e-webview-reliability
**Created**: 2026-03-18
**Validated**: 2026-04-25 (Patch 3 in place, validation tests green)

## Prerequisites

- Node.js 18+
- pnpm (project package manager)
- Linux (for xvfb-run) or macOS/Windows (for headed mode)

## TL;DR — Validated Reproduction

```bash
# Patch openvscode-server (idempotent; exits non-zero if a pattern is missing)
bash tests/e2e/scripts/patch-webview.sh /opt/openvscode-server

# Run the validation tests — both should pass
npx playwright test --config tests/e2e/playwright.config.ts test-webview-resolve

# Run a previously-skipped test — real MapView/Leaflet content renders
npx playwright test --config tests/e2e/playwright.config.ts test-load-display
```

If either step fails, the most likely cause is an openvscode-server upgrade —
see "Patch failure → server upgrade" below.

## Reproducing the Original Problem

To confirm the original failure mode (useful for regression checks against a
new openvscode-server version), revert Patch 3 and re-run the same test.

### 1. Install openvscode-server

```bash
OVS_VERSION="1.109.5"
OVS_URL="https://github.com/gitpod-io/openvscode-server/releases/download/openvscode-server-v${OVS_VERSION}/openvscode-server-v${OVS_VERSION}-linux-x64.tar.gz"
curl -fsSL "$OVS_URL" | tar xz -C /tmp
sudo mv "/tmp/openvscode-server-v${OVS_VERSION}-linux-x64" /opt/openvscode-server
```

### 2. Build and install the extension

```bash
cd apps/vscode
pnpm run package
/opt/openvscode-server/bin/openvscode-server --install-extension *.vsix --user-data-dir /tmp/ovs-data
```

### 3. Apply patches 1, 1b, 2 only (skip Patch 3) and start the server

Edit `patch-webview.sh` to comment out the Patch 3 block, then:

```bash
bash tests/e2e/scripts/patch-webview.sh /opt/openvscode-server

/opt/openvscode-server/bin/openvscode-server \
  --host 0.0.0.0 --port 8080 \
  --without-connection-token \
  --telemetry-level off \
  --user-data-dir /tmp/ovs-data \
  --default-folder $(pwd)/tests/e2e/test-workspace
```

### 4. Confirm the failure

```bash
npx playwright test --config tests/e2e/playwright.config.ts test-webview-resolve
```

Expected: the resolve probe times out — `resolveWebviewView` never fires
because openvscode-server's `isBodyVisible()` gate is back in place.

## Validating the Fix

With the full patch set (including Patch 3) applied:

```bash
bash tests/e2e/scripts/patch-webview.sh /opt/openvscode-server

# Validation tests added by #142 — both must pass
npx playwright test --config tests/e2e/playwright.config.ts test-webview-resolve

# Previously-skipped tests reactivated by #142
npx playwright test --config tests/e2e/playwright.config.ts \
  test-load-display test-catalog-browse test-selection-sync \
  test-time-controller test-error-feedback
```

Expected output:

- `test-webview-resolve`: 2 passed (sidebar resolves; webview survives toggle)
- The five reactivated tests: real extension content (`.leaflet-container`,
  `.debrief-feature-list`) renders inside `#active-frame` and assertions pass.

## Patch failure → server upgrade

`patch-webview.sh` exits non-zero whenever any of its four pattern matches
fails. That is the intended early-warning signal for an upstream upgrade:

1. Diff the failing pattern against the new `workbench.js` / `index.html`.
2. Update the script's literal in place (keep the comments and the
   "tested against vX.Y.Z" version line up to date).
3. Re-run `tests/e2e/scripts/patch-webview.sh` until all four patches print ✓.
4. Re-run `test-webview-resolve` to confirm `resolveWebviewView` still fires.

## Running the Full Suite

```bash
# Linux (headless with xvfb)
xvfb-run --auto-servernum npx playwright test --config tests/e2e/playwright.config.ts --grep-invert "Heroku"

# macOS/Windows (headed)
E2E_HEADED=1 npx playwright test --config tests/e2e/playwright.config.ts --grep-invert "Heroku"
```

## Cloud Sessions (Claude Code)

```bash
# Uses @sparticuz/chromium for headless Chromium
bash tests/e2e/scripts/cloud-e2e-setup.sh
```

## Key Files to Inspect

| File | What to look for |
|------|-----------------|
| `tests/e2e/scripts/patch-webview.sh` | The four version-pinned patches (CSP, origin-hash bypass, origin-hash guard, visibility gate) |
| `tests/e2e/test-webview-resolve.spec.ts` | Two validation tests added by #142 — sidebar resolve + toggle survival |
| `tests/e2e/helpers/webview-injector.ts` | MessagePort injection helper — retained for tests that need synthetic content; no longer required for real extension content |
| `tests/e2e/global-setup.ts` | Server startup, patch invocation, config seeding |
| `tests/e2e/models/code-server-page.ts` | `revealSidebar()` + webview access helpers |
| `tests/e2e/models/debrief-webview.ts` | Selectors against real extension content (no skip handling — see post-#142 docstring) |
| `docs/project_notes/webview-e2e-research.md` | Full root cause analysis, including the four blockers and the resolution |
| `specs/142-vscode-e2e-webview-reliability/evidence/root-cause-analysis.md` | The visibility-gate root cause and Patch 3 derivation |
