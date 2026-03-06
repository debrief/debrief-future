# Code-Server Cloud Testing — Solution

**Date:** 2026-02-20
**Status:** Resolved
**Context:** Running Playwright E2E smoke tests against code-server in Claude Code cloud sessions

## Goal

Run `tests/e2e/test-preview-smoke.spec.ts` in a Claude Code cloud session to verify that
code-server loads with the Debrief VS Code extension active, activity bar icons are present,
and sample workspace files are visible.

## Solution Summary

Docker-based testing is blocked in the cloud sandbox (no bridge networking, no registry
access, no overlay2 filesystem). Instead, **install code-server directly via GitHub release**
and run Playwright with `@sparticuz/chromium`.

One-liner:

```bash
bash tests/e2e/scripts/cloud-e2e-setup.sh
```

## What Works

### Direct code-server Installation

The official code-server install script downloads a standalone tarball from GitHub Releases,
which is accessible from the cloud sandbox:

```bash
curl -fsSL https://raw.githubusercontent.com/coder/code-server/main/install.sh \
  | sh -s -- --method=standalone --prefix=/opt/code-server
export PATH="/opt/code-server/bin:$PATH"
```

### Chromium via @sparticuz/chromium

The `@sparticuz/chromium` npm package bundles a Linux x86-64 Chromium binary that extracts
at runtime. This is the same approach used by the web-shell Playwright tests:

```bash
node -e "require('@sparticuz/chromium').executablePath().then(p => console.log(p))"
# → /tmp/chromium
```

### Workspace Trust and Welcome Tab

Code-server shows a "Do you trust the authors?" dialog and Welcome tab by default.
Both block extension activation and test interaction. Fix with user settings:

```json
{
  "security.workspace.trust.enabled": false,
  "workbench.startupEditor": "none",
  "workbench.welcomePage.walkthroughs.openOnInstall": false
}
```

Written to `~/.local/share/code-server/User/settings.json`.

### Chromium Launch Flags

The `--single-process` flag (previously used in the E2E Playwright config) causes the
browser to crash after each test in constrained sandboxes. The fix:

```diff
- '--single-process',
+ '--disable-features=IsolateOrigins,site-per-process',
+ '--disable-site-isolation-trials',
```

This matches the proven web-shell Playwright config approach.

## What Doesn't Work

### Docker (Three Blockers)

1. **Bridge networking** — Linux 4.4.0 kernel lacks nftables: `Failed to initialize nft: Protocol not supported`
2. **overlay2 storage** — Kernel can't mount overlayfs: `failed to mount overlay: invalid argument`
3. **Registry access** — DNS for `registry-1.docker.io` fails: `dial tcp: lookup registry-1.docker.io: connection refused`

Docker daemon *can* start with `--bridge=none --iptables=false --storage-driver=vfs`, but
without registry access it cannot pull base images, making `docker build` unusable.

```bash
# Docker daemon starts but can't pull images
sudo dockerd --iptables=false --bridge=none --storage-driver=vfs &
docker info  # Works
docker build ...  # Fails — no registry access
```

### npm install code-server

`npm install -g code-server` fails with tar extraction errors (ENOENT during extraction
of the bundled VS Code server). The standalone tarball from GitHub Releases works instead.

## Complete Working Pipeline

```bash
# 1. Install code-server
curl -fsSL https://raw.githubusercontent.com/coder/code-server/main/install.sh \
  | sh -s -- --method=standalone --prefix=/opt/code-server
export PATH="/opt/code-server/bin:$PATH"

# 2. Build and install the Debrief extension
pnpm --filter @debrief/session-state build
pnpm --filter @debrief/utils build
pnpm --filter @debrief/components build
cd apps/vscode && pnpm run package && cd ../..
code-server --install-extension apps/vscode/*.vsix

# 3. Configure settings (disable trust dialog + Welcome tab)
mkdir -p ~/.local/share/code-server/User
cat > ~/.local/share/code-server/User/settings.json << 'EOF'
{
  "security.workspace.trust.enabled": false,
  "workbench.startupEditor": "none",
  "workbench.welcomePage.walkthroughs.openOnInstall": false,
  "workbench.tips.enabled": false
}
EOF

# 4. Start code-server
nohup code-server --auth none --bind-addr 0.0.0.0:8080 \
  --disable-telemetry tests/e2e/test-workspace > /tmp/code-server.log 2>&1 &

# 5. Extract Chromium and write path
node -e "require('@sparticuz/chromium').executablePath().then(p => {
  require('fs').writeFileSync('tests/e2e/.chromium-path', p);
  console.log('Chromium:', p);
})"

# 6. Run smoke tests
CHROMIUM_PATH=$(cat tests/e2e/.chromium-path) \
CODE_SERVER_URL=http://localhost:8080 \
  npx playwright test --config tests/e2e/playwright.config.ts \
  tests/e2e/test-preview-smoke.spec.ts
```

## Smoke Test Results (4/4 passing)

```
Running 4 tests using 1 worker
  ✓ S01: workbench loads successfully (2.9s)
  ✓ S02: Debrief activity-bar icon is present (3.4s)
  ✓ S03: sample workspace files are visible (4.6s)
  ✓ S04: capture evidence screenshot (5.3s)
  4 passed (19.7s)
```

## Related Files

| File | Purpose |
|------|---------|
| `tests/e2e/test-preview-smoke.spec.ts` | Smoke test (4 checks) |
| `tests/e2e/scripts/cloud-e2e-setup.sh` | Automated setup + run script |
| `tests/e2e/playwright.config.ts` | Playwright config (updated: no `--single-process`) |
| `tests/e2e/global-setup.ts` | Server startup logic (supports external CODE_SERVER_URL) |
| `tests/e2e/global-teardown.ts` | Server cleanup |
| `apps/web-shell/run-playwright.mjs` | Reference: working cloud Playwright runner |
| `docker/code-server/Dockerfile` | Docker image (for CI, not cloud sessions) |
| `docker/code-server/docker-compose.yml` | Docker Compose (for CI, not cloud sessions) |

## Key Discoveries

1. **npm registry works** in the sandbox — packages can be downloaded
2. **GitHub URLs work** — release tarballs and raw content are accessible
3. **Docker registry doesn't work** — DNS resolution fails for `registry-1.docker.io`
4. **`--single-process` crashes browsers** — use `--disable-features=IsolateOrigins,site-per-process` instead
5. **Workspace trust must be disabled** — otherwise extensions run in Restricted Mode and don't activate
6. **code-server standalone tarball** is the reliable installation method (not npm, not Docker)
