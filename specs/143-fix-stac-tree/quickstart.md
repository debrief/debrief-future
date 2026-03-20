# Quickstart: Debugging STAC Tree E2E Tests

**Feature**: 143-fix-stac-tree

## Problem

The `openPlotViaStacTree()` method in `tests/e2e/models/code-server-page.ts` times out in CI because the STAC tree view doesn't populate in openvscode-server.

## Key Files

| File | Purpose |
|------|---------|
| `tests/e2e/models/code-server-page.ts` | Page object with tree navigation methods |
| `tests/e2e/global-setup.ts` | Config seeding and server startup |
| `tests/e2e/fixtures/base.ts` | CDN interceptor and webview content injection |
| `apps/vscode/src/providers/stacTreeProvider.ts` | Tree data provider |
| `apps/vscode/src/services/configService.ts` | Config reader (XDG-aware) |
| `apps/vscode/package.json` | Activation events, view contributions |

## Activation Chain

```
Config exists → Server starts → Extension activates (onStartupFinished)
  → ConfigService reads config (sync)
  → StacTreeProvider registered
  → VS Code calls getChildren() IF tree pane is visible
  → storesReady context set → "Loading stores..." disappears
```

## Known Issues

1. **Case sensitivity**: package.json defines view title as "STAC Stores" (title case); test selector uses "STAC STORES" (upper case). Playwright `:has-text()` is case-sensitive.

2. **Lazy tree rendering**: VS Code only calls `getChildren()` when the tree pane is visible. If the Explorer sidebar or STAC pane is collapsed, the tree never populates.

3. **Fallback wastes time**: When store row isn't visible, `seedConfigAndReload()` re-seeds config and reloads the entire window (~30s), even though the config is already correct.

## Running E2E Tests Locally

```bash
# Build extension VSIX first
cd apps/vscode && pnpm package && cd ../..

# Run with headed browser (for debugging)
E2E_HEADED=1 pnpm --filter @debrief/web-shell test -- --grep "load and display"

# Run specific test file
cd apps/web-shell && node run-playwright.mjs -- tests/e2e/test-load-display.spec.ts
```

## Diagnostic Screenshots

When the fix is in place, failed attempts produce screenshots in `tests/e2e/evidence/`:

| Screenshot | When Captured |
|------------|--------------|
| `debug-stage-focus-stac.png` | After focusStacView() attempt |
| `debug-stage-extension-ready.png` | After waitForExtensionReady() timeout |
| `debug-stage-pane-expanded.png` | After ensureStacPaneExpanded() attempt |
| `debug-no-stac-row.png` | After store row wait timeout |
| `debug-no-catalog-row.png` | After catalog/plot row wait timeout |

## Implementation Checklist

- [ ] Add diagnostic helpers (`tests/e2e/helpers/diagnostics.ts`)
- [ ] Fix case-insensitive pane header matching
- [ ] Use VS Code command for tree focus instead of CSS selectors
- [ ] Add retry loop to overall sequence
- [ ] Tighten individual timeouts, allow method-level retry
- [ ] Add `openPlotViaCommand()` fallback method
- [ ] Remove `.skip` from all 15 test files
- [ ] Verify full suite passes in CI
