# Research: Fix STAC Tree E2E Test Reliability

**Feature**: 143-fix-stac-tree
**Date**: 2026-03-20

## Research Questions

### R1: Why does `openPlotViaStacTree()` time out in CI?

**Investigation**: Traced the full activation and tree rendering chain.

**Root Cause Analysis**:

The `openPlotViaStacTree()` method follows a 7-step sequence, each with its own timeout. When the STAC tree isn't populated, the method cascades through all waits (~42s total) before failing.

The likely failure points are:

1. **Extension activation timing**: The extension activates on `onStartupFinished`, but the `storesReady` context flag (which removes "Loading stores..." welcome text) is set during Phase 3 of activation (line 243 of extension.ts). If `waitForExtensionReady()` polls before Phase 3 completes, it will see the loading message and wait.

2. **Config file race condition**: CI seeds config BEFORE server start (e2e.yml:147). Global-setup ALSO seeds config (global-setup.ts:97-127) but only if it doesn't exist (idempotent). The config paths should match, but `$(pwd)` in the terminal-based fallback `seedConfigAndReload()` resolves to the terminal's working directory, which might differ from `GITHUB_WORKSPACE` depending on how openvscode-server sets the CWD.

3. **Pane visibility in openvscode-server**: The selector `.pane-header:has-text("STAC STORES")` depends on the Explorer sidebar being open and the STAC STORES section being visible. In openvscode-server v1.109.5, the Explorer may not auto-open or the tree view contribution may render differently than in desktop VS Code.

4. **Tree rendering without user interaction**: VS Code tree views are lazy — `getChildren()` is only called when the tree is visible. If the STAC STORES pane is not expanded or visible, the tree never populates even though the extension is activated and config is loaded.

**Decision**: Start with Option A (diagnose and fix), targeting the pane visibility and tree rendering timing.

**Rationale**: The config seeding and extension activation chain appear correct. The most likely issue is that the tree view isn't rendered because the pane isn't visible/expanded when the test starts probing. Adding robust pane focus/expand logic and better wait conditions should fix this.

**Alternatives considered**:
- Option B (command-based opening) — viable fallback but loses tree UI coverage
- Option C (pre-loaded fixtures) — too invasive, changes component code for test purposes

### R2: What is the exact activation → tree render sequence?

**Findings**:

```
1. Config pre-seeded to ~/.config/debrief/config.json (CI workflow line 147)
2. openvscode-server starts (CI workflow line 157)
3. Extension activates via onStartupFinished
4. ConfigService constructor:
   a. ensureConfigDir() - creates dir if needed
   b. loadConfig() - reads config.json synchronously
   c. watchConfig() - fs.watch for changes
5. StacTreeProvider constructor:
   a. Receives configService reference
   b. Registers onConfigChange listener
6. Extension registers tree view (extension.ts line 136)
7. VS Code renders tree if visible → calls getChildren()
8. storesReady context set to true (extension.ts line 243)
9. "Loading stores..." welcome text disappears
```

Steps 1-8 should complete in <1 second. Step 7 only happens if the tree view is visible. If the Explorer is collapsed or the STAC STORES section is collapsed, step 7 never fires and the tree stays empty.

### R3: What selectors does the test use and are they correct?

**Findings**:

| Selector | Used In | Expected Match |
|----------|---------|----------------|
| `.pane-header:has-text("STAC STORES")` | focusStacView() | Tree view title from package.json ("STAC Stores") — **NOTE case mismatch possible**: package.json says "STAC Stores" (title case), test uses "STAC STORES" (upper case). Playwright `:has-text()` is case-sensitive for exact match but case-insensitive for substring. This should work since "STAC STORES" contains "STAC Stores" as a pattern... but actually `:has-text()` checks if the element's text CONTAINS the given text. The rendered text could be "STAC Stores" (from package.json `"name": "STAC Stores"`) and `:has-text("STAC STORES")` would NOT match because Playwright's `:has-text()` is case-sensitive. **This could be the root cause.** |
| `.monaco-list-row:has-text("STAC:")` | openPlotViaStacTree() | Store nodes use label `STAC: ${displayName}` — selector matches |
| `.monaco-list-row:has-text("plots")` | openPlotViaStacTree() | Catalog node title — depends on catalog.json titles |
| `.monaco-list-row:has-text("${plotName}")` | openPlotViaStacTree() | Plot item title from STAC item.json |
| `.activitybar .action-item a[aria-label="Explorer"]` | focusStacView() fallback | Explorer icon in activity bar |

**Decision**: Investigate whether the rendered pane header text is "STAC Stores" (title case from package.json) vs "STAC STORES" (upper case as expected by test). If VS Code / openvscode-server renders the title in uppercase automatically, the selector works. If it preserves the original case, the selector fails silently and the fallback Explorer icon click may not expand the correct pane.

### R4: What is the seedConfigAndReload fallback path doing?

**Findings**:

When the store row isn't visible after 10 seconds, `seedConfigAndReload()`:
1. Opens integrated terminal (`Ctrl+Backtick`)
2. Writes config via `echo ... > ~/.config/debrief/config.json`
3. Uses `$(pwd)/local-store` for the store path
4. Closes terminal
5. Runs "Developer: Reload Window" via command palette
6. Waits 30s for workbench to reappear

**Problem**: After window reload, the entire activation sequence restarts. The test then re-runs focusStacView → waitForExtensionReady → ensureStacPaneExpanded → wait for store row. If the original problem was pane visibility (not config), the same failure repeats and ~30s has been wasted.

**Decision**: The fallback should be more targeted — if config exists and is valid, skip seeding and focus on ensuring the tree view is visible and rendered.

### R5: What approach should the fix take?

**Decision**: Two-phase fix strategy.

**Phase 1 — Diagnostic instrumentation (P2 story)**:
- Add screenshots at each stage of `openPlotViaStacTree()`
- Log extension output channel content
- Print tree row contents when they're found
- Capture config file contents in CI artifacts

**Phase 2 — Fix tree loading reliability (P1 story)**:
- Fix potential case-sensitivity issue in pane header selector
- Use VS Code command `workbench.view.extension.debrief-explorer` or `debrief.stacExplorer.focus` to reliably focus the tree view instead of CSS selectors
- Add explicit wait for `storesReady` context (via extension ready signal) before probing tree
- Ensure pane is expanded with retries
- Reduce individual step timeouts but add retries to the overall sequence

**Phase 3 — Fallback mechanism (P3 story)**:
- Add `openPlotViaCommand(plotName)` method that uses `debrief.openPlot` command
- Use for most tests; keep one dedicated test for tree navigation

**Rationale**: Diagnostic instrumentation first ensures we can verify the fix works in CI. The fix targets the most likely cause (pane visibility + selector accuracy). The fallback provides resilience.

**Alternatives considered**:
- Rewriting all tests to avoid tree navigation — too much churn, loses coverage
- Adding delays — masks the problem, makes tests slow
