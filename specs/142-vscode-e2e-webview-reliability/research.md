# Research: VS Code E2E Webview Reliability

**Feature**: 142-vscode-e2e-webview-reliability
**Date**: 2026-03-18
**Status**: Partial — Blockers 1-4 resolved, Blocker 5 (CDN URL) remaining

## Research Questions — Updated Findings

### RQ-1: Can `resolveWebviewView` be made to fire via further patching of `workbench.js`?

**Answer**: Yes — Patch 3 removes the `isBodyVisible()` gate. Validated 3/3 runs.

The fix unconditionally calls `this.pc()` (which triggers `resolveWebviewView`), then conditionally claim/releases the webview based on visibility. The webview iframe is created with `class="webview"` and `resolveWebviewView()` fires on the extension's `WebviewViewProvider`.

### RQ-2: Does a newer openvscode-server version fix the webview view lifecycle?

**Answer**: Not investigated. Patch 3 resolves the lifecycle issue on v1.109.5. Upgrading may be needed for Blocker 5 if the URL template becomes configurable at runtime in a newer version.

### RQ-3: Would code-server exhibit the same `resolveWebviewView` bug?

**Answer**: Original research was against code-server — same bug exists there too. Both use the same VS Code workbench code. Patch 3 would apply to either.

### RQ-4: Can the extension's activation explicitly trigger `resolveWebviewView`?

**Answer**: Not needed. Patch 3 makes `resolveWebviewView` fire natively without any extension-side changes or command execution.

### RQ-5: Would `@vscode/test-web` or real VS Code in xvfb provide a more reliable alternative?

**Answer**: Not tested. May still be relevant for Blocker 5 — real VS Code (Electron) serves webview content locally without CDN URLs. However, the CI setup complexity is significant.

### RQ-6: Would a hybrid approach work?

**Answer**: This is now the recommended fallback if Blocker 5 cannot be resolved. VS Code E2E validates extension lifecycle (activation, commands, tree views, webview iframe creation). Web-shell E2E validates all webview DOM content (map, tools, selection, time controller).

### RQ-7 (NEW): Can the CDN URL for the webview host page be redirected to localhost?

**Answer**: Not straightforwardly. See detailed analysis below.

---

## Blocker 5: CDN URL Unreachable in Sandbox

### The Problem

After Patches 1-4, the webview iframe is created with `src="https://<uuid>.vscode-cdn.net/insider/<commit>/out/vs/workbench/contrib/webview/browser/pre/index.html"`. This URL is unreachable in the sandboxed CI environment.

### Why Cross-Origin Is Required

VS Code **requires** the webview iframe URL to be cross-origin from the workbench. When the URL is same-origin (e.g., `http://localhost:8080/static/...`), VS Code does not create the `iframe.webview` element at all. This is not a Chromium feature — it is VS Code application logic that checks origin before creating the iframe.

Experimentally validated: patching `workbench.js` to use `http://localhost:8080/static/.../pre/` results in **zero webview iframes** in the DOM, regardless of Chromium `--disable-site-isolation-trials` flags.

### URL Template Location

The URL template `https://{{uuid}}.vscode-cdn.net/insider/<commit>/out/vs/workbench/contrib/webview/browser/pre/` is:
- Defined in `product.json` as `webviewContentExternalBaseUrlTemplate`
- Baked into `workbench.js` at build time
- **NOT read from `product.json` at runtime** — changing `product.json` has no effect

### Approaches Evaluated

| # | Approach | Result | Blocker |
|---|----------|--------|---------|
| 1 | Patch `product.json` | No effect | Template baked into `workbench.js` at build |
| 2 | Patch `workbench.js` → `localhost:8080` | No iframe created | Same-origin → VS Code skips iframe creation |
| 3 | Patch URL with uuid in path | Same result | Still same-origin |
| 4 | `/etc/hosts` wildcard | Cannot work | Linux `/etc/hosts` doesn't support wildcards |
| 5 | `dnsmasq` wildcard DNS | DNS resolves to 127.0.0.1 | HTTPS fails — no TLS cert for `*.vscode-cdn.net` |

### Promising Approaches Not Yet Tested

| # | Approach | Complexity | Notes |
|---|----------|-----------|-------|
| A | Patch to `http://` + `dnsmasq` + Chromium `--host-resolver-rules` | Low | Cross-origin preserved (different subdomain), no TLS needed. Risk: VS Code may enforce https |
| B | `mkcert` wildcard cert + reverse proxy + `dnsmasq` | Medium | Full TLS, highest fidelity. Needs mkcert, caddy/nginx, dnsmasq |
| C | Chromium `--host-resolver-rules="MAP *.vscode-cdn.net 127.0.0.1"` | Low | Browser-level DNS, no system changes. Needs testing if wildcards supported |
| D | Real VS Code (Electron) in xvfb | High | No CDN URL issue at all — Electron serves locally. Complex CI setup |

---

## Current State Summary

### What's Implemented and Working

1. **`patch-webview.sh`** — 4 patches, all idempotent, version-guarded
2. **5 test files unskipped** — were blocked by Blocker 4, now active
3. **13 skip-comment updates** — reflect current status accurately
4. **`test-webview-resolve.spec.ts`** — validates Patch 3 (3 tests, 3/3 passing)
5. **Webview injector** — updated docs noting Patch 3 conflict

### What's Blocked on Blocker 5

- Real extension content (React components from `shared/components`) cannot render
- 9 business-flow tests exist but cannot validate webview DOM
- Screenshot evidence of real content requires working host page

### What Was Already Validated (Prior Research)

In code-server environments where the CDN URL is reachable:
- Map panel: real Leaflet with track symbols, time labels, shapes, reference areas
- Activity panel: real React components (TimeController, ToolsPanel, LayersToolbar + FeatureList)
- Collapsible sections, debrief-calc connection (11 tools), route interception

---

## Recommended Next Steps

1. **Test Approach C** (Chromium `--host-resolver-rules`): add `--host-resolver-rules=MAP *.vscode-cdn.net 127.0.0.1` to Playwright config, patch `workbench.js` URL from `https://` to `http://`, verify iframe creation and host page loading
2. **If C fails, test Approach A** (`dnsmasq` + http:// patch): install `dnsmasq` in CI setup, configure wildcard DNS, patch URL scheme
3. **If both fail, implement Approach B** (full TLS proxy): `mkcert` for wildcard cert, reverse proxy for TLS termination
4. **Last resort: hybrid testing** (RQ-6): accept webview DOM stays in web-shell E2E only

## Key References

- Full technical details: `docs/project_notes/webview-e2e-research.md`
- Patch script: `tests/e2e/scripts/patch-webview.sh`
- Webview injector: `tests/e2e/helpers/webview-injector.ts`
- Patch 3 validation: `tests/e2e/test-webview-resolve.spec.ts`
