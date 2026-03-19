# Research Spike: Playwright E2E in Claude Code Cloud Environment

**Date:** 2026-03-19
**Goal:** Overcome blockers preventing reliable Playwright E2E tests in the Claude Code cloud environment.
**Prior work:** `specs/142-vscode-e2e-webview-reliability/webview-e2e-research.md`

## Executive Summary

There are **two separate E2E test suites** with different cloud-readiness:

| Suite | Target | Cloud Status | Blocker |
|-------|--------|-------------|---------|
| **web-shell** (81 tests) | React app via Vite dev server | **Fully working** | None |
| **VS Code E2E** (59 tests) | Extension inside openvscode-server | **Partially working** | CDN iframe URL unreachable, 40s timeout cascades |

The web-shell tests prove that Playwright + `@sparticuz/chromium` work correctly in the cloud sandbox. The VS Code E2E tests fail on tests that require webview *content* rendering because VS Code loads webview HTML from `https://<uuid>.vscode-cdn.net/...` — a domain that is unreachable in the sandbox (no DNS, no TLS cert, no network egress).

## Cloud Environment Constraints

Validated experimentally on 2026-03-19:

| Constraint | Detail |
|-----------|--------|
| CDN downloads blocked | `cdn.playwright.dev`, `dl.google.com` return 403 |
| Browser network blocked | `net::ERR_TUNNEL_CONNECTION_FAILED` for external URLs |
| Docker unavailable | No bridge networking, no overlay2, registry DNS fails |
| npm registry works | `@sparticuz/chromium` installs and extracts fine |
| GitHub releases work | openvscode-server tarball downloads fine |
| localhost networking works | Servers on `localhost:8080` fully reachable from Chromium |
| Snap blocked | `snap-confine` fails — no snapd in sandbox |

## What Works Today

### Web-Shell E2E (81/81 passing)

```
cd apps/web-shell && node run-playwright.mjs
```

- Chromium extracted from `@sparticuz/chromium` to `/tmp/chromium`
- Vite dev server started automatically by Playwright `webServer` config
- All 81 tests pass in ~2.3 minutes
- All features are client-side, no test takes more than 5 seconds
- No timeouts, no flakes

### VS Code E2E: Infrastructure Layer (4/4 passing)

```
CHROMIUM_PATH="/tmp/chromium" CODE_SERVER_URL="http://localhost:8080" \
  npx playwright test --config tests/e2e/playwright.config.ts test-preview-smoke.spec.ts
```

With openvscode-server v1.109.5 installed, patched, and extension loaded:
- **S01**: workbench loads successfully
- **S02**: Debrief activity-bar icon is present
- **S03**: sample workspace files are visible
- **S04**: evidence screenshot captured

### VS Code E2E: Webview Resolution (2/2 passing)

```
npx playwright test ... test-webview-resolve.spec.ts
```

- Debrief sidebar composite renders after clicking activity icon
- Sidebar toggle disposes and re-creates webview

Patches 1-4 in `tests/e2e/scripts/patch-webview.sh` are fully operational.

## What Fails

### VS Code E2E: Tests requiring webview content (~40 tests)

All tests that call `openPlotViaStacTree()` → `getWebviewFrame()` → probe for inner frame content (`.leaflet-container`, `.catalog-overview`, etc.) fail with 40s timeout.

**Root cause**: The `iframe.webview` element's `src` is set to:
```
https://a1b2c3d4e5f6.vscode-cdn.net/insider/ef65ac.../out/vs/workbench/contrib/webview/browser/pre/index.html
```

This URL is unreachable in the sandbox:
1. No DNS resolution for `*.vscode-cdn.net`
2. No TLS certificate for the domain
3. The file IS available locally at `/opt/openvscode-server/out/vs/workbench/contrib/webview/browser/pre/index.html`

The iframe never loads `pre/index.html`, so `#active-frame` is never created, so extension webview content (React components) never renders.

**Cascade effect**: Each failing test burns 40s (the action timeout) before declaring failure, making full suite runs extremely slow.

### code-server vs openvscode-server

| Feature | openvscode-server v1.109.5 | code-server v4.111.0 |
|---------|---------------------------|----------------------|
| Extension loads | Yes | Yes |
| Workspace trust disableable | Yes (`--disable-workspace-trust`) | **No** — dialog appears despite setting |
| Patches apply | Yes (all 4) | Untested (different file layout) |
| Webview resolution | Yes (with Patch 3) | Unknown |

**Recommendation**: Use openvscode-server. code-server's workspace trust dialog blocks extension activation.

## Setup Recipe (Validated Working)

```bash
# 1. Install openvscode-server
curl -sSL "https://github.com/gitpod-io/openvscode-server/releases/download/openvscode-server-v1.109.5/openvscode-server-v1.109.5-linux-x64.tar.gz" \
  -o /tmp/ovs.tar.gz
mkdir -p /opt/openvscode-server
tar -xzf /tmp/ovs.tar.gz -C /opt/openvscode-server --strip-components=1

# 2. Apply webview patches
bash tests/e2e/scripts/patch-webview.sh /opt/openvscode-server

# 3. Build and install Debrief extension
pnpm --filter @debrief/session-state build
pnpm --filter @debrief/utils build
pnpm --filter @debrief/components build
cd apps/vscode && pnpm run package && cd ../..
/opt/openvscode-server/bin/openvscode-server --install-extension apps/vscode/debrief-vscode-*.vsix

# 4. Write settings
DATA_DIR="tests/e2e/.vscode-server-data"
mkdir -p "$DATA_DIR/User" "$DATA_DIR/data/User"
echo '{"security.workspace.trust.enabled":false,"workbench.startupEditor":"none"}' \
  | tee "$DATA_DIR/User/settings.json" "$DATA_DIR/data/User/settings.json"

# 5. Extract Chromium
node -e "import('@sparticuz/chromium').then(m=>m.default.executablePath()).then(console.log)" > tests/e2e/.chromium-path

# 6. Start server
/opt/openvscode-server/bin/openvscode-server \
  --host 0.0.0.0 --port 8080 \
  --without-connection-token --telemetry-level off \
  --disable-workspace-trust \
  --user-data-dir "$DATA_DIR" \
  --default-folder tests/e2e/test-workspace &

# 7. Run tests
CHROMIUM_PATH="$(cat tests/e2e/.chromium-path)" CODE_SERVER_URL="http://localhost:8080" \
  npx playwright test --config tests/e2e/playwright.config.ts
```

## The CDN URL Problem (Blocker 5)

### Architecture

VS Code renders extension webview content through a 3-layer iframe stack:

```
localhost:8080  (VS Code workbench)
  └─ iframe.webview  src="https://<uuid>.vscode-cdn.net/.../pre/index.html"
       └─ #active-frame  (created by pre/index.html after receiving 'content' message)
            └─ Extension HTML  (<script src="activityPanel.js">)
```

Two separate CDN domains are involved:

| Domain | Purpose |
|--------|---------|
| `<uuid>.vscode-cdn.net` | Webview host page (`pre/index.html`) |
| `*.vscode-resource.vscode-cdn.net` | Extension static assets (`activityPanel.js`, CSS) |

The host page domain uses a per-session random UUID subdomain for cross-origin isolation.

### What We Already Tried (from prior research)

| Approach | Outcome |
|----------|---------|
| Patch `product.json` at runtime | No effect — URL baked into JS at build time |
| Patch URL → `localhost:8080` (same origin) | Iframe not created — VS Code requires cross-origin |
| `/etc/hosts` for `vscode-cdn.net` | Linux `/etc/hosts` doesn't support wildcards |
| `dnsmasq` wildcard → 127.0.0.1 | DNS resolves, but `https://` fails (no TLS cert) |

### Candidate Solutions

#### A. Playwright `page.route()` interception (RECOMMENDED FIRST)

Playwright can intercept network requests before they reach the browser. If this works for cross-origin iframe `src` loads, we can serve `pre/index.html` from the local filesystem:

```typescript
// In test fixture or beforeEach
await page.route('**/*.vscode-cdn.net/**', async (route) => {
  const url = new URL(route.request().url());
  const localPath = `/opt/openvscode-server${url.pathname.replace(/^\/insider\/[^/]+/, '')}`;
  if (existsSync(localPath)) {
    const body = readFileSync(localPath);
    await route.fulfill({ body, contentType: guessContentType(localPath) });
  } else {
    await route.abort();
  }
});
```

**Why this should work**: Playwright's route interception operates at the browser DevTools Protocol level, intercepting *all* requests regardless of origin. The HTTPS handshake never happens because the request is fulfilled before reaching the network stack.

**Risk**: Unclear whether Playwright interception fires before Chromium's TLS validation for `https://` URLs. The iframe `src` URL uses HTTPS, and Chromium may reject the connection before Playwright can intercept.

**Effort**: Very low — a few lines in the test fixture.

**Mitigation if TLS blocks it**: Combine with `--host-resolver-rules` and `--ignore-certificate-errors` flags.

#### B. HTTP scheme + Chromium `--host-resolver-rules`

Patch `workbench.js` to change `https://` → `http://` in the webview URL template, then use:

```typescript
args: [
  '--host-resolver-rules=MAP *.vscode-cdn.net 127.0.0.1',
  // ... existing sandbox args
]
```

This resolves `*.vscode-cdn.net` to localhost without any DNS infrastructure. The HTTP request then hits `localhost:8080` where openvscode-server serves the file.

**Key requirement**: The webview iframe URL must include the port (`http://<uuid>.vscode-cdn.net:8080/...`) or openvscode-server must listen on port 80. Port 80 requires root (which we have in Claude Code, but not all CI environments).

**Risk**: VS Code may enforce `https://` somewhere in the webview pipeline. The `pre/index.html` module or MessageChannel setup may check `location.protocol`.

**Effort**: Low — one `sed` patch + one Playwright config line.

#### C. HTTPS with local wildcard TLS (mkcert)

Full-fidelity approach:
1. `mkcert -install` to create local CA
2. `mkcert '*.vscode-cdn.net'` for wildcard cert
3. Reverse proxy (`caddy` or `socat`) terminates TLS, proxies to localhost:8080
4. `dnsmasq` or `--host-resolver-rules` for DNS
5. `--ignore-certificate-errors` Chromium flag as fallback

**Effort**: Medium. Multiple daemons to manage.

#### D. Updated MessagePort injector (PROVEN FALLBACK)

The `webview-injector.ts` helper captures the MessagePort from the `webview-ready` event and sends `content` directly, bypassing the broken iframe load.

**Current conflict**: With Patch 3 active, both the injector and the real extension race to send `content`. Fix: either (a) remove Patch 3 and use injector exclusively, or (b) update injector to yield to the extension's `content` message.

**Limitation**: Doesn't test the real extension webview lifecycle. Tests use synthetic HTML rather than the actual React components built from `shared/components/`.

**Effort**: Low — injector already exists, just needs race condition fix.

#### E. Real Electron VS Code in xvfb

Run actual VS Code (Electron) under `xvfb-run`. Electron serves webview content from the local filesystem — no CDN URLs at all.

**Effort**: High — needs VS Code CLI install, extension sideloading, Playwright-Electron connection.

## Recommendation

### Immediate: Reduce timeout waste

The 40s timeout on failing tests is the biggest productivity drain. Even before solving Blocker 5:

1. **Add `test.skip()` guards** for tests that depend on webview content when `WEBVIEW_CDN_AVAILABLE` env var is not set
2. **Reduce action timeout** from 15s to 5s for client-side-only interactions (per user observation: nothing takes more than 5s)
3. **Tag tests** with `@webview-content` vs `@workbench-chrome` so the two categories can be run independently

### Short-term: Test Approach A (Playwright route interception)

Lowest effort, most elegant. If `page.route()` can intercept iframe `src` navigation for HTTPS URLs before TLS validation, the entire CDN problem evaporates with zero infrastructure changes.

If TLS validation blocks it, combine with Approach B (`--host-resolver-rules` + HTTP scheme patch).

### Medium-term: Approach D (injector update)

As proven fallback, update the MessagePort injector to work alongside Patch 3. This sacrifices some lifecycle fidelity but unblocks all content-dependent tests.

### Architecture: Consider converging on web-shell

The web-shell suite (81 tests, all passing, 2.3 min) tests the same React components as the VS Code webview tests, without any of the iframe/CDN complexity. The VS Code E2E tests add value only for:

1. VS Code chrome interactions (command palette, STAC tree, activity bar)
2. Extension activation lifecycle
3. Webview lifecycle (iframe creation, disposal, re-creation)

Tests #1 and #3 already pass (6/6). The bulk of failing tests (catalog browse, drawing, tool execution, selection sync, etc.) test React component behaviour that is already thoroughly covered by web-shell tests. Consider whether duplicating these tests inside VS Code webviews adds sufficient value to justify the CDN workaround complexity.

## Files Referenced

| File | Role |
|------|------|
| `apps/web-shell/run-playwright.mjs` | Extracts `@sparticuz/chromium` for web-shell tests |
| `apps/web-shell/playwright/playwright.config.ts` | Web-shell Playwright config |
| `tests/e2e/playwright.config.ts` | VS Code E2E Playwright config |
| `tests/e2e/global-setup.ts` | Server lifecycle management |
| `tests/e2e/scripts/patch-webview.sh` | Applies Patches 1a, 1b, 2, 3 to openvscode-server |
| `tests/e2e/scripts/cloud-e2e-setup.sh` | Full cloud setup pipeline (code-server path) |
| `tests/e2e/helpers/webview-injector.ts` | MessagePort content injection fallback |
| `tests/e2e/models/code-server-page.ts` | Page object for VS Code chrome interactions |
| `tests/e2e/test-preview-smoke.spec.ts` | Smoke tests (4/4 passing) |
| `tests/e2e/test-webview-resolve.spec.ts` | Webview resolution tests (2/2 passing) |
| `specs/142-vscode-e2e-webview-reliability/` | Prior research spike artifacts |

## Evidence

### Web-shell: 81/81 passing
```
Running 81 tests using 1 worker
  ✓ 81 tests passed (2.3m)
```

### VS Code smoke: 4/4 passing (openvscode-server)
```
Running 4 tests using 1 worker
  ✓ S01: workbench loads successfully (1.5s)
  ✓ S02: Debrief activity-bar icon is present (2.6s)
  ✓ S03: sample workspace files are visible (4.0s)
  ✓ S04: capture evidence screenshot (4.6s)
```

### VS Code smoke: 3/4 passing (code-server) — workspace trust blocks S02
Screenshot shows "Restricted Mode" with workspace trust dialog, extension not activated.

### VS Code webview resolve: 2/2 passing
```
  ✓ Debrief sidebar composite renders after clicking activity icon (6.0s)
  ✓ sidebar toggle disposes and re-creates webview (9.1s)
```

### VS Code content tests: failing with 40s timeouts
Tests that navigate iframe hierarchy to find `.leaflet-container`, `.catalog-overview`, etc. all timeout because `pre/index.html` never loads from the CDN URL.
