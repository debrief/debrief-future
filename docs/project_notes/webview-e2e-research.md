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
| npm registry works | ✅ when env's Network access is **Trusted** or **Full** at `claude.ai/code`; 403 on **None**/custom — see note below |
| GitHub releases work | ✅ when env's Network access is **Trusted** or **Full**; 403 on **None**/custom — see note below |
| localhost networking works | Servers on `localhost:8080` fully reachable from Chromium |
| Snap blocked | `snap-confine` fails — no snapd in sandbox |

> **2026-04-26 note.** Whether `npm install` and GitHub-release downloads
> work in Claude Code on the web depends on the cloud environment's
> **Network access** mode (`claude.ai/code` → environment settings). On
> `None` or a narrow custom allowlist, they 403; on **Trusted** or
> **Full** they work as documented above. The `npm install
> @sparticuz/chromium` and `wget openvscode-server-*.tar.gz` steps in
> this doc require at least Trusted. Local desktop CLI is unaffected. See
> `docs/project_notes/key_facts.md` → "Claude Code on the Web: Network
> Access".

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

#### A. Playwright `page.route()` interception (EXPERIMENTALLY VALIDATED)

**Status: CDN interception works. Content delivery pipeline has remaining timing issues.**

Playwright can intercept HTTPS cross-origin iframe `src` requests at the DevTools Protocol level, before TLS validation. Experimentally validated on 2026-03-19:

```typescript
await page.route('**/*.vscode-cdn.net/**', async (route) => {
  const url = new URL(route.request().url());
  const localPath = cdnUrlToLocalPath(url.href); // maps CDN path → local filesystem
  if (localPath && existsSync(localPath)) {
    await route.fulfill({ body: readFileSync(localPath), contentType: guessContentType(localPath) });
  } else {
    await route.abort('connectionfailed');
  }
});
```

**What works:**
- `page.route()` intercepts HTTPS iframe `src` loads (no TLS error)
- `pre/index.html` loads and executes (module script runs, perf marks confirm)
- `isSecureContext: true` — crypto.subtle available
- Origin hash validation passes (`hostnameMatchesHash: true`)
- `signalReady()` sends `webview-ready` to parent with MessagePort
- Parent receives `webview-ready` and adds `.ready` class to iframe
- `fake.html` is also interceptable (inner iframe for content injection)

**What doesn't work yet:**
- `#active-frame` is never created despite all the plumbing succeeding
- Root cause: timing mismatch in VS Code's webview lifecycle

**Timing analysis** (from workbench performance marks):
```
1371ms  set-content     (extension sets webview.html — content queued)
1383ms  set-content     (second webview)
...no mounted/set-src marks — iframe not in DOM yet...
5059ms  mounted         (iframe created when sidebar clicked)
5067ms  set-src         (iframe src set to CDN URL)
5085ms  webview-ready   (CDN intercepted, pre/index.html loaded, ready signal sent)
```

The problem: `set-content` fires at 1.4s when `resolveWebviewView` sets `webview.html`. But the iframe isn't mounted until 5.0s (when the sidebar becomes visible). By then, the webview instance that received `set-content` may have been replaced by a new instance that has no content queued.

The webview lifecycle has three states: Pending → Ready. Content set during Pending is flushed when `webview-ready` arrives. But if the webview instance is replaced between `set-content` and `webview-ready`, the pending content is lost.

**Effort**: Low for interception itself. Medium to resolve the lifecycle timing.

**Next steps for this approach:**
1. Try Patch 5: patch `workbench.js` to re-send `set-content` when a new webview instance is mounted for an existing view
2. Or: combine with MessagePort injector (Approach D) — intercept CDN so `pre/index.html` loads, then inject content via the established port
3. Or: ensure the route handler is installed before `page.goto()` AND that the sidebar starts visible (via VS Code settings or command)

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

## Solution: Hybrid A+D (VALIDATED 2026-03-20)

### What works

The **Hybrid A+D** approach successfully renders real extension React components in headless cloud E2E tests:

1. **CDN interceptor** (`helpers/cdn-interceptor.ts`): intercepts `*.vscode-cdn.net` requests via `context.route()` and serves `pre/index.html` from the local openvscode-server install. This boots the webview iframe — service worker registers, `signalReady()` fires, `webview-ready` message reaches the host.

2. **MessagePort injector** (`helpers/webview-injector.ts`): captures the `webview-ready` event's MessagePort and sends a `content` message containing the real extension HTML with bundled JS inlined. This creates `#active-frame` and renders the React components.

3. **Extension content generator** (`helpers/extension-content.ts`): reads the extension's esbuild bundles (`dist/webview/*.js`) and generates HTML matching the extension's `_getHtmlContent()` template, with a mock `acquireVsCodeApi()`.

### Why this is needed

The VS Code host receives `webview-ready` but never sends `content` back. Root cause: Patch 3 (visibility gate removal) causes `resolveWebviewView` to fire before the iframe exists. The extension's content is queued in `pendingMessages`, but the webview is then released (dismounted) and re-created when the sidebar becomes visible. The new instance has an empty `pendingMessages` queue. The content stored in `this.s` is re-sent via `reload()` → `tb()` → `gb("content", ...)`, but by this time the webview state has been reset and the flush never reaches the new iframe.

### Candidates evaluated

| Candidate | Result | Notes |
|-----------|--------|-------|
| Sidebar-first layout | Dead end | No VS Code setting to auto-open sidebar |
| B: HTTP + host-resolver-rules | Failed | Same timing issue — host never sends content |
| **Hybrid A+D** | **Works** | Real React components render in #active-frame |
| Patch 5: re-send on remount | Not needed | Hybrid A+D bypasses the broken pipeline |
| E: Real VS Code in xvfb | Not tried | Hybrid A+D sufficient |

### Integration

The Hybrid A+D approach is integrated into `fixtures/base.ts`:
- `codeServerPage` fixture installs both CDN interceptor and multi-webview MessagePort injector
- Content queue: activity panel (first webview-ready), map view (second)
- All tests using the `codeServerPage` fixture automatically get webview content injection

### Limitations

- Extension JS is **inlined** (~1.7MB per bundle) — adds memory overhead per test
- Uses a **mock `acquireVsCodeApi()`** — extension ↔ host message passing won't work
- Content is **static at injection time** — no live updates from the extension
- Tests cannot verify extension → webview message flows (e.g., state changes from STAC tree selection)

### What this enables vs what it doesn't

**Can now validate:**
- React component rendering (activity panel, map, catalog, etc.)
- Component DOM structure and CSS styling
- User interactions within webview content (clicks, scrolls)
- Cross-webview frame navigation

**Still cannot validate:**
- Extension ↔ webview message passing (e.g., selection sync)
- Live data loading from STAC stores into webview
- Extension commands that update webview state

## Recommendation

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
| `tests/e2e/scripts/patch-webview.sh` | Applies Patches 1, 2, 3 to openvscode-server |
| `tests/e2e/scripts/cloud-e2e-setup.sh` | Full cloud setup pipeline (code-server path) |
| `tests/e2e/helpers/cdn-interceptor.ts` | Playwright route handler for CDN request interception |
| `tests/e2e/helpers/webview-injector.ts` | MessagePort content injection (Hybrid A+D) |
| `tests/e2e/helpers/extension-content.ts` | Generates webview HTML with inlined extension JS |
| `tests/e2e/fixtures/base.ts` | Custom Playwright fixtures (CDN interceptor + MessagePort injector) |
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

## Service Worker Research (2026-03-19)

### Key Finding: Service Worker Must Remain Enabled

The `vscode-resource.vscode-cdn.net` domain is **not a real CDN**. The VS Code service
worker intercepts requests to it and transforms them into `postMessage('load-resource')`
calls back to the VS Code main thread, which serves the files from the local filesystem.

Patch 1a (`disableServiceWorker = true`) was actively breaking this mechanism: without the
service worker, the browser attempted real DNS resolution on the CDN domain and failed.
This was the root cause of `#active-frame` never being created — not the service worker
itself.

### Reference Implementation: code-server's Own Tests

code-server's `test/e2e/webview.test.ts` successfully drills into webview content using:

```typescript
page.frameLocator("iframe.webview.ready")
    .frameLocator("#active-frame")
    .getByText("Hello world")
```

Their key config: `ignoreHTTPSErrors: true`, service worker **intact**, running over
`localhost` (which browsers treat as a secure context).

### Applied Fix (Fix A + Fix C)

Fix A alone was insufficient — the service worker never registers because it runs
*inside* the CDN iframe, which can't load without DNS. Fix C (Playwright `context.route()`
interception) was added to serve CDN files from the local filesystem:

1. **Removed** Patch 1a from `patch-webview.sh` — service worker stays enabled
2. **Added** `ignoreHTTPSErrors: true` to `tests/e2e/playwright.config.ts`
3. **Added** `cdn-interceptor.ts` helper — `context.route()` intercepts `*.vscode-cdn.net`
   requests and fulfills from `/opt/openvscode-server/.../pre/` directory
4. **Integrated** interceptor into `fixtures/base.ts` — runs before `page.goto()`
5. **Retained** Patches 1 (CSP), 2 (origin hash guard), and 3 (visibility gate)

**Validation results (2026-03-20):**
- CDN requests intercepted → 200 response
- `iframe.webview.ready` class applied (confirmed)
- `#active-frame` created inside webview iframe (confirmed)
- Smoke tests: 4/4 passing
- Webview resolution tests: 2/2 passing
- Content-dependent tests: still failing at STAC tree navigation (separate issue —
  `openPlotViaStacTree` cannot find the plot node in headless mode)

### Alternate Fixes (if Fix A insufficient)

**Fix B: Patch `product.json` to use localhost-relative URL template**
- Rewrites `webviewContentExternalBaseUrlTemplate` to `http://{{authority}}/out/vs/...`
- Sidesteps DNS entirely but loses cross-origin isolation
- Acceptable for testing, changes runtime security model

**Fix C: Playwright `context.route()` interception (IMPLEMENTED)**
- Intercepts `**/*vscode-cdn.net/**` at the network layer via `context.route()` (not `page.route()`)
- Fulfills with local file content from the openvscode-server install directory
- ~80 lines of helper code in `tests/e2e/helpers/cdn-interceptor.ts`
- Validated: `#active-frame` created, webview content lifecycle works end-to-end

### Industry Landscape (E2E Testing VS Code Extensions)

| Framework | Basis | Webview Support | Desktop | Web |
|-----------|-------|----------------|---------|-----|
| **wdio-vscode-service** | WebdriverIO | Built-in page objects | Yes | Yes |
| **ExTester** | Selenium | DOM-level | Yes | No |
| **Playwright + Electron** | `_electron` API | Manual | Yes | N/A |
| **Playwright + openvscode-server** | Browser | Manual `frameLocator` | No | Yes |

No dedicated Playwright framework exists for VS Code webview E2E. Playwright classified
VS Code target support as P3 (Issue #22351). VS Code officially closed webview testing
guidance requests without solutions (Issue #100952).
