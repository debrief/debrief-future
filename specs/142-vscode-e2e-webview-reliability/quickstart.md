# Quickstart: VS Code E2E Webview Reliability

**Feature**: 142-vscode-e2e-webview-reliability
**Date**: 2026-03-18

## Prerequisites

- Node.js 18+
- pnpm (project package manager)
- Linux (for xvfb-run) or macOS/Windows (for headed mode)

## Reproducing the Problem

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

### 3. Apply existing patches (1-3 only)

```bash
bash tests/e2e/scripts/patch-webview.sh /opt/openvscode-server
```

### 4. Start openvscode-server

```bash
/opt/openvscode-server/bin/openvscode-server \
  --host 0.0.0.0 --port 8080 \
  --without-connection-token \
  --telemetry-level off \
  --user-data-dir /tmp/ovs-data \
  --default-folder $(pwd)/tests/e2e/test-workspace
```

### 5. Run a skipped test to see the failure

```bash
# This test will skip because #active-frame is never created
npx playwright test --config tests/e2e/playwright.config.ts test-load-display
```

Expected output: test skips with message about webview content not being available.

## Validating the Fix

After the fix is applied:

```bash
# Re-apply patches (now including blocker 4 fix)
bash tests/e2e/scripts/patch-webview.sh /opt/openvscode-server

# Run the same test — should now pass
npx playwright test --config tests/e2e/playwright.config.ts test-load-display
```

Expected output: test passes, with real extension content (MapView with Leaflet map) visible in the webview.

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
| `tests/e2e/scripts/patch-webview.sh` | The patches applied to openvscode-server |
| `tests/e2e/helpers/webview-injector.ts` | Current MessagePort injection workaround |
| `tests/e2e/global-setup.ts` | Server startup and config seeding |
| `tests/e2e/models/code-server-page.ts` | Page object with webview access helpers |
| `docs/project_notes/webview-e2e-research.md` | Full root cause analysis |
