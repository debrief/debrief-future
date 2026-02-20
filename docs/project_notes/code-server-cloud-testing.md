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

One of these solutions would unblock the tests:

### Option A: Install openvscode-server in the cloud image

`openvscode-server` is a single binary (~80MB) with no iptables dependency. Adding it to the cloud session base image would let `global-setup.ts` start it directly.

```bash
# Example install (version may vary)
curl -fsSL https://github.com/nicolo-ribaudo/openvscode-releases/releases/download/v1.96.2/openvscode-server-v1.96.2-linux-x64.tar.gz \
  | tar xz -C /usr/local
ln -s /usr/local/openvscode-server-*/bin/openvscode-server /usr/local/bin/
```

Then the test would run as:

```bash
# global-setup.ts detects openvscode-server and starts it automatically
cd /home/user/debrief-future
CHROMIUM_PATH=/tmp/chromium pnpm exec playwright test \
  --config=tests/e2e/playwright.config.ts test-preview-smoke
```

### Option B: Fix Docker networking in the sandbox

Either:
- Upgrade the kernel to support nftables, or
- Start dockerd with `--iptables=false --bridge=none` and use host networking (`docker run --network=host`)

### Option C: npm-installable code-server

`code-server` is available on npm but it's a large install (~200MB). Less ideal than a pre-installed binary.

```bash
npx code-server --auth none --bind-addr 0.0.0.0:8080 tests/e2e/test-workspace
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
