# Research: Running code-server E2E Tests in Cloud Sessions

**Date**: 2026-02-20
**Status**: Blocked — needs solution
**Context**: Feature 099 (Browser Extension Preview) requires running Playwright smoke tests against a code-server instance

## Goal

Run `tests/e2e/test-preview-smoke.spec.ts` in a Claude Code cloud session. This test verifies that code-server loads with the Debrief VS Code extension active, the activity bar icons are present, and sample workspace files are visible.

The test uses the existing `tests/e2e/` infrastructure (`global-setup.ts`, `CodeServerPage` fixture, `playwright.config.ts`).

## What Works

Web-shell Playwright tests run successfully using `@sparticuz/chromium`:

```bash
cd apps/web-shell && pnpm test:cloud
# 71 passed (2.3m)
```

This proves:
- Playwright is installed and functional
- `@sparticuz/chromium` extracts and launches correctly
- The Vite dev server starts and serves the web-shell app
- Browser automation works end-to-end

## What Fails

### Approach 1: Docker container with code-server

The preview Dockerfile (`preview/Dockerfile`) builds a container based on `codercom/code-server:latest` with the Debrief extension and sample data pre-installed.

```bash
# Start Docker daemon
nohup sudo dockerd > /tmp/dockerd.log 2>&1 &
sleep 5

# Build the preview image
docker build -t debrief-preview -f preview/Dockerfile .
```

**Result**: Docker daemon starts but crashes during network initialisation:

```
failed to start daemon: Error initializing network controller:
  error obtaining controller instance: failed to register "bridge" driver:
  failed to create NAT chain DOCKER: iptables failed:
  iptables --wait -t nat -N DOCKER: iptables: Failed to initialize nft:
  Protocol not supported (exit status 1)
```

**Root cause**: The sandbox kernel (Linux 4.4.0) does not support nftables. Docker requires iptables/nft for bridge networking.

### Approach 2: Direct code-server binary

The `global-setup.ts` can start `openvscode-server` or `code-server` directly (no Docker needed).

```bash
which openvscode-server  # not found
which code-server        # not found
find / -name "openvscode-server" -type f 2>/dev/null  # empty
find / -name "code-server" -type f 2>/dev/null         # empty
```

**Result**: Neither binary is installed in the cloud session image.

## Minimum Reproducible Example

To reproduce, run this in a Claude Code cloud session:

```bash
# 1. Verify Docker is installed but daemon can't run
docker --version          # Docker version 29.2.1
nohup sudo dockerd > /tmp/dockerd.log 2>&1 &
sleep 5
tail -5 /tmp/dockerd.log  # "Failed to initialize nft: Protocol not supported"

# 2. Verify no VS Code server binaries exist
which openvscode-server   # not found
which code-server         # not found
```

## What's Needed

The end goal is running `preview/Dockerfile` on Heroku as a Review App. Local Docker testing in the cloud session is a stepping stone — it validates the same container image that Heroku will build and run. Solutions must exercise this Docker path; bypassing Docker doesn't prove the Heroku deployment works.

### Fix Docker networking in the sandbox

Docker fails because the sandbox kernel (4.4.0) doesn't support nftables. Two sub-options:

**A. Kernel/nftables support**: Upgrade the sandbox kernel or enable the `nf_tables` module so Docker's default bridge networking works.

**B. Disable Docker networking, use host mode**: Start dockerd without iptables and run containers on the host network:

```bash
# Start daemon without bridge networking
nohup sudo dockerd --iptables=false --bridge=none > /tmp/dockerd.log 2>&1 &
sleep 5

# Build the image (no networking needed for build)
docker build -t debrief-preview -f preview/Dockerfile .

# Run with host networking (no NAT/bridge needed)
docker run --rm --network=host -e PORT=8080 debrief-preview
```

This is the preferred approach because:
- It validates the exact Dockerfile and entrypoint that Heroku will use
- It tests the full build chain: Python services, .vsix install, workspace copy
- The smoke test (`test-preview-smoke.spec.ts`) runs against `localhost:8080` — identical to the Heroku flow except for the URL
- Any build or runtime failures caught here will also fail on Heroku

Once the container is running, the smoke test runs as:

```bash
# Extract chromium for cloud environment
cd apps/web-shell && node -e "import('@sparticuz/chromium').then(c=>c.default.executablePath()).then(p=>{console.log(p);require('fs').writeFileSync('/tmp/chromium-path',p)})"

# Run the smoke test against the local container
cd /home/user/debrief-future
CODE_SERVER_URL=http://localhost:8080 \
CHROMIUM_PATH=$(cat /tmp/chromium-path) \
pnpm exec playwright test --config=tests/e2e/playwright.config.ts test-preview-smoke
```

## Related Files

| File | Purpose |
|------|---------|
| `tests/e2e/test-preview-smoke.spec.ts` | The smoke test that needs to run |
| `tests/e2e/global-setup.ts` | Starts openvscode-server or code-server |
| `tests/e2e/playwright.config.ts` | Config with `CODE_SERVER_URL` and chromium resolution |
| `preview/Dockerfile` | Docker container definition |
| `preview/entrypoint.sh` | Container entrypoint |
| `docs/project_notes/playwright-installation-research.md` | How @sparticuz/chromium works |
| `apps/web-shell/run-playwright.mjs` | Working example of cloud Playwright execution |
