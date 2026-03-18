# Spike: VS Code Webview Content in Headless Playwright

**Date:** 2026-03-18
**Goal:** Render real extension webview content (React components from `shared/components`) inside openvscode-server, driven by Playwright, with no network access.

## The Architecture

VS Code renders extension webview content through a 3-layer iframe stack:

```
localhost:8080  (VS Code workbench)
  └─ iframe.webview  src="https://<uuid>.vscode-cdn.net/.../pre/index.html"
       └─ #active-frame  (created by pre/index.html after receiving 'content' message)
            └─ Extension HTML  (<script src="activityPanel.js">)
```

The extension's React app (`activityPanel.js`, `mapView.js`, etc.) is transpiled from `shared/components/` and bundled into `apps/vscode/dist/webview/`. The view provider's `_getHtmlContent()` generates HTML referencing these bundles via `webview.asWebviewUri()`.

Two separate CDN domains are involved:

| Domain | Purpose | Content |
|--------|---------|---------|
| `<uuid>.vscode-cdn.net` | Webview host page | `pre/index.html` — creates `#active-frame`, manages MessageChannel |
| `*.vscode-resource.vscode-cdn.net` | Extension static assets | `activityPanel.js`, CSS, images — the actual app |

The host page domain uses a **per-session random UUID subdomain** for cross-origin isolation between the workbench and each webview.

## Five Blockers Found

Working inward through the iframe stack, five blockers prevent webview content from rendering in headless openvscode-server:

| # | Layer | Problem | Fix | Status |
|---|-------|---------|-----|--------|
| 1a | `pre/index.html` | Service worker conflict — wrong SW found | `disableServiceWorker = true` | **Patched** |
| 1b | `pre/index.html` | CSP hash mismatch after Patch 1a | Comment out CSP meta tag | **Patched** |
| 2 | `workbench.js` | Origin hash guard drops `webview-ready` message | Remove `this.g` precondition | **Patched** |
| 3 | `workbench.js` | `isBodyVisible()` gate prevents `resolveWebviewView` | Unconditionally call `this.pc()` | **Patched** |
| 5 | Browser | `https://<uuid>.vscode-cdn.net` unreachable — no DNS, no TLS | **See below** | **Open** |

Patches 1-3 are automated by `tests/e2e/scripts/patch-webview.sh` and are idempotent with version guards against openvscode-server v1.109.5.

## Blocker 5: The CDN URL Problem

### What Happens

After Patches 1-4, `resolveWebviewView` fires and VS Code creates an `iframe.webview` element. The iframe's `src` is:

```
https://a1b2c3d4e5f6.vscode-cdn.net/insider/ef65ac.../out/vs/workbench/contrib/webview/browser/pre/index.html
```

The subdomain is a random UUID generated per webview instance. In our sandbox, this URL is unreachable:
- No DNS entry for `*.vscode-cdn.net`
- No TLS certificate for the domain
- The file IS available locally at `/opt/openvscode-server/out/vs/workbench/contrib/webview/browser/pre/index.html`

### Why We Can't Just Use localhost

**Experimentally validated:** When we patch `workbench.js` to use `http://localhost:8080/static/.../pre/index.html`, VS Code **does not create the `iframe.webview` element at all**. Zero iframes in the DOM.

VS Code's JavaScript requires the webview URL to be **cross-origin** from the workbench. This is application logic, not a browser feature — Chromium's `--disable-site-isolation-trials` flag has no effect.

### Where the URL Template Lives

| Location | Effect |
|----------|--------|
| `product.json` → `webviewContentExternalBaseUrlTemplate` | **Read at build time only** — runtime changes ignored |
| `workbench.js` (hardcoded) | `https://{{uuid}}.vscode-cdn.net/insider/<commit>/.../pre/` |

The second copy in `workbench.js` also contains `https://{{uuid}}.vscode-cdn.net/{{quality}}/{{commit}}/.../pre/` with template variables — this is the generic fallback.

### What We Tried

| Approach | Outcome |
|----------|---------|
| Patch `product.json` at runtime | No effect — template already baked into JS |
| Patch `workbench.js` → `localhost:8080` (same origin) | Iframe not created — VS Code requires cross-origin |
| Patch URL with `{{uuid}}` in path (still same origin) | Same — still no iframe |
| `/etc/hosts` for `vscode-cdn.net` | Linux `/etc/hosts` doesn't support wildcards |
| `dnsmasq` wildcard → 127.0.0.1 | DNS resolves, but `https://` fails (no TLS cert) |

## Approaches to Evaluate

### A. HTTP scheme + browser-level DNS

Patch `workbench.js` to change `https://` → `http://` in the webview URL template. Then use one of:

- **Chromium `--host-resolver-rules`**: Add `MAP *.vscode-cdn.net 127.0.0.1` to Playwright's browser args. No system DNS changes needed. If wildcards are supported, requests to `http://<uuid>.vscode-cdn.net:8080/.../pre/index.html` would resolve to localhost. Cross-origin is preserved (different subdomain).
- **`dnsmasq`**: Already confirmed working for DNS resolution. Without HTTPS the TLS problem disappears.

**Risk:** VS Code may enforce `https://` somewhere in the webview pipeline. The `pre/index.html` module script or the MessageChannel setup may check `location.protocol`.

**Effort:** Low — one `sed` patch + one Playwright config line.

### B. HTTPS with local wildcard TLS

Full-fidelity approach: generate a wildcard TLS cert for `*.vscode-cdn.net` using `mkcert`, run a reverse proxy (`caddy` or `socat`) that terminates TLS and proxies to `localhost:8080/static/...`, plus `dnsmasq` for DNS.

**Risk:** Low — preserves the exact URL VS Code expects. `mkcert` certs are trusted by the local CA.

**Effort:** Medium — needs `mkcert`, proxy daemon, `dnsmasq`, and CA trust setup in Chromium (or `--ignore-certificate-errors`).

### C. Playwright route interception on the CDN URL

Playwright's `page.route()` can intercept requests by URL pattern before they reach the network. If the webview iframe is created (the DOM element exists), Playwright could intercept the `https://<uuid>.vscode-cdn.net/...` request and serve `pre/index.html` from the local filesystem.

**Key question:** Does `page.route()` work for cross-origin iframe `src` loads? Playwright's interception operates at the browser network layer, so it should intercept regardless of origin — but this needs testing.

```typescript
await page.route('**/*.vscode-cdn.net/**/pre/index.html**', async (route) => {
  const body = readFileSync('/opt/openvscode-server/out/vs/workbench/contrib/webview/browser/pre/index.html');
  await route.fulfill({ body, contentType: 'text/html' });
});
```

**Risk:** Route interception may not apply to iframe `src` navigation (as opposed to fetch/XHR). Also, HTTPS cert validation may fail before interception takes effect.

**Effort:** Very low — a few lines in the test fixture.

### D. Browser context with custom cert or `--ignore-certificate-errors`

Launch Chromium with `--ignore-certificate-errors` and set up DNS resolution (approach A or `dnsmasq`). The `https://` URL resolves to localhost, TLS handshake fails, but the browser ignores the error.

**Risk:** Chromium may still refuse to load the page in an iframe context even with this flag. Mixed content (http workbench + https iframe) may also be blocked.

**Effort:** Low — one flag + DNS setup.

### E. MessagePort injector with real bundles (proven fallback)

The `webview-injector.ts` helper captures the MessagePort from the `webview-ready` event and sends `content` directly. This bypasses the broken iframe load entirely. The original research validated this with real extension bundles inlined.

**Downside:** Conflicts with Patch 3 — now that `resolveWebviewView` fires, both the injector and the extension race to send `content`. The injector currently blocks subsequent `content` messages, but this means real extension content never loads.

**To make this work with Patch 3:** Either (a) remove Patch 3 and rely entirely on the injector, or (b) update the injector to yield to the extension's `content` message instead of blocking it.

**Effort:** Low — the injector already exists and was validated.

### F. Real VS Code (Electron) in xvfb

Electron-based VS Code serves webview content from the local filesystem — no CDN URLs at all. Running under `xvfb-run` with Playwright connected to the Electron window provides the highest fidelity.

**Effort:** High — needs VS Code CLI install, extension sideloading, Playwright-Electron connection, CI runner changes.

## Recommendation

**Test C first** (Playwright route interception) — it's the lowest effort and most elegant. If `page.route()` can intercept iframe `src` navigation, the problem is solved with zero infrastructure changes.

**Then A** (HTTP scheme + `--host-resolver-rules`) — simple Playwright config change plus one `workbench.js` patch.

**Then E** (injector, updated to not conflict with Patch 3) — proven to work, just needs the race condition resolved.

**Reserve B/F** for if we need production-grade reliability in CI.

## Files

| File | Role |
|------|------|
| `tests/e2e/scripts/patch-webview.sh` | Applies Patches 1a, 1b, 2, 3 |
| `tests/e2e/helpers/webview-injector.ts` | MessagePort content injection |
| `tests/e2e/test-webview-resolve.spec.ts` | Validates Patch 3 (iframe creation) |
| `tests/e2e/playwright.config.ts` | Chromium launch args |
| `/opt/openvscode-server/out/vs/workbench/contrib/webview/browser/pre/index.html` | Webview host page (patched at runtime) |
| `/opt/openvscode-server/out/vs/code/browser/workbench/workbench.js` | VS Code bundle (patched at runtime) |
