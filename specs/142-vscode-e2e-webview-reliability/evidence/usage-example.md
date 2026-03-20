# Usage Example: Running VS Code E2E Tests with Webview Fix

## Prerequisites

1. Install openvscode-server v1.109.5
2. Build and package the Debrief VS Code extension
3. Apply all four webview patches

## Setup

```bash
# Install openvscode-server
OVS_VERSION="1.109.5"
curl -fsSL "https://github.com/gitpod-io/openvscode-server/releases/download/openvscode-server-v${OVS_VERSION}/openvscode-server-v${OVS_VERSION}-linux-x64.tar.gz" \
  | tar xz -C /tmp
sudo mv "/tmp/openvscode-server-v${OVS_VERSION}-linux-x64" /opt/openvscode-server
sudo ln -sf /opt/openvscode-server/bin/openvscode-server /usr/local/bin/openvscode-server

# Apply webview patches (includes Patch 3 for resolveWebviewView)
bash tests/e2e/scripts/patch-webview.sh /opt/openvscode-server
# Expected output:
#   ✓ Patch 1a: Service worker disabled
#   ✓ Patch 1b: CSP meta tag commented out
#   ✓ Patch 2: Origin hash guard removed
#   ✓ Patch 3: Visibility gate on webview view resolution removed
#   ✓ All webview patches applied successfully.

# Build and install extension
cd apps/vscode && pnpm run build && pnpm run package && cd ../..
DATA_DIR="/tmp/ovs-data"
mkdir -p "$DATA_DIR"
openvscode-server --install-extension apps/vscode/*.vsix --user-data-dir "$DATA_DIR"

# Pre-seed Debrief config
mkdir -p ~/.config/debrief
echo '{"stores":[{"id":"local-store","path":"'$(pwd)'/tests/e2e/test-workspace/local-store","displayName":"Test Maritime Data","status":"available"}],"preferences":{}}' \
  > ~/.config/debrief/config.json

# Write VS Code settings
SETTINGS='{"security.workspace.trust.enabled":false,"workbench.startupEditor":"none"}'
mkdir -p "$DATA_DIR/User" "$DATA_DIR/data/User"
echo "$SETTINGS" > "$DATA_DIR/User/settings.json"
echo "$SETTINGS" > "$DATA_DIR/data/User/settings.json"
```

## Running Tests

```bash
# Start openvscode-server
openvscode-server --host 0.0.0.0 --port 8080 \
  --without-connection-token --telemetry-level off \
  --disable-workspace-trust \
  --user-data-dir "$DATA_DIR" \
  --default-folder "$(pwd)/tests/e2e/test-workspace" &

# Run the webview resolution validation tests
CHROMIUM_PATH=$(cat tests/e2e/.chromium-path)
E2E_HEADED=1 \
CODE_SERVER_URL=http://localhost:8080 \
E2E_WORKSPACE_FOLDER="$(pwd)/tests/e2e/test-workspace" \
CHROMIUM_PATH="$CHROMIUM_PATH" \
  xvfb-run --auto-servernum npx playwright test \
    --config tests/e2e/playwright.config.ts \
    test-webview-resolve
```

## Expected Output

```
Running 2 tests using 1 worker

  ✓ Debrief sidebar composite renders after clicking activity icon (5.7s)
  ✓ sidebar toggle disposes and re-creates webview (8.7s)

  2 passed (15.8s)
```

## What Patch 3 Fixes

Without Patch 3, the webview view lifecycle in openvscode-server stalls:
- `resolveWebviewView()` is never called because `isBodyVisible()` returns false in headless
- No webview iframe appears in the sidebar
- All tests depending on sidebar webview content self-skip

With Patch 3, the visibility gate is removed:
- `resolveWebviewView()` fires during extension activation
- Webview iframes are created for Activity Panel and Log Panel
- Tests can interact with real extension content via Playwright frame locators
