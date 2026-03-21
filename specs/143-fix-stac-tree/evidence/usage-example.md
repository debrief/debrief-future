# Usage Example: Before/After of openPlotViaStacTree()

## Before (Broken)

The original implementation used fragile CSS selectors and negative-signal waits that failed silently in openvscode-server:

```typescript
// BEFORE: Case-sensitive selector that didn't match package.json registration
const stacHeader = this.page.locator('.pane-header:has-text("STAC STORES")');
//                                                          ^^^^^^^^^^^^^^
// package.json: "name": "STAC Stores" (title case, not uppercase)

// BEFORE: Polling for absence of "Loading stores" text — fails when pane isn't visible
private async waitForExtensionReady(timeoutMs: number): Promise<boolean> {
  while (Date.now() - start < timeoutMs) {
    const loadingVisible = await this.page.getByText('Loading stores').isVisible();
    if (!loadingVisible) return true;  // FALSE POSITIVE: text is absent because pane is hidden
    await this.page.waitForTimeout(500);
  }
}

// BEFORE: If tree didn't load, seed config via terminal + window reload (~30s wasted)
await this.seedConfigAndReload();
```

**Result**: Every CI run timed out at ~42s (7 steps × 5-10s each), causing 15 test files to be skipped.

## After (Fixed)

The rewritten implementation uses command-based focus and positive-signal waits:

```typescript
// AFTER: Command-based focus mirrors proven revealSidebar() pattern
await page.keyboard.press('Control+Shift+KeyP');
await this.commandInput.fill('Focus on STAC Stores');
await page.keyboard.press('Enter');

// AFTER: Case-insensitive pane header matching
const stacHeader = page.locator('.pane-header').filter({
  has: page.locator('h3', { hasText: /stac stores/i }),
});

// AFTER: Positive signal — wait for first tree row to appear
private async waitForTreePopulated(timeoutMs: number): Promise<boolean> {
  return this.page.locator('.monaco-list-row').first()
    .waitFor({ state: 'visible', timeout: timeoutMs })
    .then(() => true)
    .catch(() => false);
}

// AFTER: No reload fallback — fail fast with diagnostic screenshots
await this.captureTreeDiagnostics('tree-not-populated');
throw new Error('STAC tree did not populate within 15s. ...');
```

**Result**: Tree navigation completes in <15s. Failure produces actionable screenshots.

## Command-Based Fallback

For maximum resilience, `openPlotViaCommand()` bypasses tree UI entirely:

```typescript
// Uses "Debrief: Open Plot" command via palette → select from Quick Pick list
await codeServerPage.openPlotViaCommand('Exercise Alpha');
```
