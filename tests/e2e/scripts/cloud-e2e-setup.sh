#!/usr/bin/env bash
# cloud-e2e-setup.sh — Set up and run E2E smoke tests in a Claude Code cloud session.
#
# This script handles the complete pipeline:
#   1. Install code-server (via GitHub release)
#   2. Install the Debrief VS Code extension
#   3. Configure code-server settings (disable workspace trust, Welcome tab)
#   4. Start code-server on port 8080
#   5. Extract Chromium from @sparticuz/chromium
#   6. Run Playwright smoke tests
#
# Usage:
#   bash tests/e2e/scripts/cloud-e2e-setup.sh [--setup-only] [--test-only]
#
# Options:
#   --setup-only  Set up code-server and chromium but don't run tests
#   --test-only   Skip setup, assume code-server is already running
#
# Prerequisites:
#   - Node.js >= 18
#   - pnpm installed
#   - @sparticuz/chromium in root package.json devDependencies
#   - Debrief VS Code extension buildable (pnpm run package in apps/vscode)
#
# Environment:
#   CODE_SERVER_PORT  Port for code-server (default: 8080)
#   CHROMIUM_PATH     Path to chromium binary (auto-detected if not set)
#
# Exit codes:
#   0  All tests passed
#   1  Setup or test failure

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
CODE_SERVER_PORT="${CODE_SERVER_PORT:-8080}"
CODE_SERVER_BIN="/opt/code-server/bin/code-server"
WORKSPACE_PATH="${REPO_ROOT}/tests/e2e/test-workspace"
CHROMIUM_PATH_FILE="${REPO_ROOT}/tests/e2e/.chromium-path"
SETUP_ONLY=false
TEST_ONLY=false

for arg in "$@"; do
  case "$arg" in
    --setup-only) SETUP_ONLY=true ;;
    --test-only)  TEST_ONLY=true ;;
  esac
done

log() { echo "[cloud-e2e] $*"; }
die() { echo "[cloud-e2e] ERROR: $*" >&2; exit 1; }

# ─── Step 1: Install code-server ───────────────────────────────────────────────
install_code_server() {
  if command -v code-server &>/dev/null; then
    log "code-server already installed: $(code-server --version 2>&1 | head -1)"
    return 0
  fi

  if [[ -x "$CODE_SERVER_BIN" ]]; then
    export PATH="/opt/code-server/bin:$PATH"
    log "code-server found at $CODE_SERVER_BIN"
    return 0
  fi

  log "Installing code-server via GitHub release..."

  # Try the official install script (downloads from GitHub releases)
  local install_script
  install_script="$(mktemp)"
  if curl -fsSL https://raw.githubusercontent.com/coder/code-server/main/install.sh -o "$install_script" 2>/dev/null; then
    bash "$install_script" --method=standalone --prefix=/opt/code-server
    rm -f "$install_script"
    export PATH="/opt/code-server/bin:$PATH"
    log "code-server installed: $(code-server --version 2>&1 | head -1)"
  else
    rm -f "$install_script"
    die "Failed to download code-server install script"
  fi
}

# ─── Step 2: Build and install Debrief extension ──────────────────────────────
install_extension() {
  local vsix
  vsix=$(ls "${REPO_ROOT}/apps/vscode/"*.vsix 2>/dev/null | head -1)

  if [[ -z "$vsix" ]]; then
    log "Building Debrief VS Code extension..."
    cd "$REPO_ROOT"
    pnpm --filter @debrief/session-state build
    pnpm --filter @debrief/utils build
    pnpm --filter @debrief/components build
    cd "${REPO_ROOT}/apps/vscode"
    pnpm run package
    vsix=$(ls "${REPO_ROOT}/apps/vscode/"*.vsix 2>/dev/null | head -1)
    [[ -n "$vsix" ]] || die "VSIX build failed"
  fi

  log "Installing extension from $vsix..."
  code-server --install-extension "$vsix"
}

# ─── Step 3: Configure code-server settings ───────────────────────────────────
configure_settings() {
  local settings_dir="$HOME/.local/share/code-server/User"
  mkdir -p "$settings_dir"

  log "Writing code-server user settings..."
  cat > "${settings_dir}/settings.json" << 'SETTINGS'
{
  "security.workspace.trust.enabled": false,
  "workbench.startupEditor": "none",
  "workbench.welcomePage.walkthroughs.openOnInstall": false,
  "workbench.tips.enabled": false,
  "extensions.autoCheckUpdates": false,
  "extensions.autoUpdate": false,
  "update.mode": "none",
  "telemetry.telemetryLevel": "off"
}
SETTINGS
}

# ─── Step 4: Start code-server ────────────────────────────────────────────────
start_code_server() {
  # Check if already running
  if curl -sf "http://localhost:${CODE_SERVER_PORT}/healthz" &>/dev/null; then
    log "code-server already running on port ${CODE_SERVER_PORT}"
    return 0
  fi

  log "Starting code-server on port ${CODE_SERVER_PORT}..."
  nohup code-server \
    --auth none \
    --bind-addr "0.0.0.0:${CODE_SERVER_PORT}" \
    --disable-telemetry \
    "$WORKSPACE_PATH" > /tmp/code-server.log 2>&1 &

  local pid=$!
  echo "$pid" > "${REPO_ROOT}/tests/e2e/.code-server-pid"
  log "code-server PID: $pid"

  # Wait for readiness
  local max_wait=60
  local waited=0
  while ! curl -sf "http://localhost:${CODE_SERVER_PORT}/healthz" &>/dev/null; do
    sleep 1
    waited=$((waited + 1))
    if [[ $waited -ge $max_wait ]]; then
      die "code-server failed to start within ${max_wait}s. Log: $(tail -10 /tmp/code-server.log)"
    fi
  done
  log "code-server ready at http://localhost:${CODE_SERVER_PORT}"
}

# ─── Step 5: Extract Chromium ─────────────────────────────────────────────────
setup_chromium() {
  if [[ -n "${CHROMIUM_PATH:-}" ]] && [[ -x "${CHROMIUM_PATH}" ]]; then
    log "Using CHROMIUM_PATH=${CHROMIUM_PATH}"
    echo "$CHROMIUM_PATH" > "$CHROMIUM_PATH_FILE"
    return 0
  fi

  log "Extracting Chromium from @sparticuz/chromium..."
  local path
  path=$(node -e "
    require('@sparticuz/chromium').executablePath().then(p => {
      process.stdout.write(p);
    });
  " 2>/dev/null)

  if [[ -z "$path" ]] || [[ ! -x "$path" ]]; then
    die "Failed to extract chromium from @sparticuz/chromium"
  fi

  echo "$path" > "$CHROMIUM_PATH_FILE"
  export CHROMIUM_PATH="$path"
  log "Chromium extracted to: $path ($($path --version 2>&1))"
}

# ─── Step 6: Run tests ───────────────────────────────────────────────────────
run_tests() {
  log "Running smoke tests..."
  cd "$REPO_ROOT"

  CHROMIUM_PATH="${CHROMIUM_PATH:-$(cat "$CHROMIUM_PATH_FILE" 2>/dev/null)}" \
  CODE_SERVER_URL="http://localhost:${CODE_SERVER_PORT}" \
    npx playwright test \
      --config tests/e2e/playwright.config.ts \
      tests/e2e/test-preview-smoke.spec.ts

  log "All smoke tests passed!"
}

# ─── Main ─────────────────────────────────────────────────────────────────────
main() {
  cd "$REPO_ROOT"

  if [[ "$TEST_ONLY" == "true" ]]; then
    run_tests
    return
  fi

  install_code_server
  install_extension
  configure_settings
  start_code_server
  setup_chromium

  if [[ "$SETUP_ONLY" == "true" ]]; then
    log "Setup complete. Run tests with:"
    log "  bash tests/e2e/scripts/cloud-e2e-setup.sh --test-only"
    return
  fi

  run_tests
}

main "$@"
