# Implementation Plan: Fix STAC Tree E2E Test Reliability

**Branch**: `143-fix-stac-tree` | **Date**: 2026-03-20 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/143-fix-stac-tree/spec.md`

## Summary

The `openPlotViaStacTree()` E2E test helper times out (~42s) in every CI run, causing 15 test suites to be skipped. The root cause is likely that the STAC tree view pane isn't visible/expanded when the test starts probing, combined with a possible case-sensitivity mismatch in the pane header selector (test expects "STAC STORES", package.json defines "STAC Stores"). The fix adds diagnostic instrumentation, hardens pane focus/expand logic, fixes selectors, and provides a command-based fallback for opening plots.

## Technical Context

**Language/Version**: TypeScript 5.x (Playwright E2E tests, VS Code extension)
**Primary Dependencies**: @playwright/test ^1.57.0, openvscode-server v1.109.5, VS Code Extension API ^1.85.0
**Storage**: N/A (test infrastructure)
**Testing**: Playwright E2E tests (`tests/e2e/`)
**Target Platform**: Linux CI (GitHub Actions, Ubuntu runner)
**Project Type**: Monorepo — changes span `tests/e2e/` (test infrastructure) and potentially `apps/vscode/` (extension commands)
**Performance Goals**: Plot opening completes in <30s (down from ~42s timeout cascade)
**Constraints**: Must work in headless openvscode-server v1.109.5; no desktop VS Code features; single Playwright worker
**Scale/Scope**: 15 skipped test files (~50+ tests) to be re-enabled

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Applicable? | Status | Notes |
|---------|-------------|--------|-------|
| I. Defence-Grade Reliability | No | PASS | Test infrastructure, not core functionality |
| II. Schema Integrity | No | PASS | No schema changes |
| III. Data Sovereignty | No | PASS | No data changes |
| IV. Architectural Boundaries | No | PASS | Test code only |
| V. Extensibility | No | PASS | No extension model changes |
| VI. Testing | **Yes** | PASS | This fix restores E2E test coverage (Art. VI.3, VI.4) |
| VII. Test-Driven AI | **Yes** | PASS | Fix has clear acceptance criteria (tests pass in CI) |
| VIII. Documentation | **Yes** | PASS | Spec exists; diagnostic guide in quickstart.md |
| IX. Dependencies | No | PASS | No new dependencies |
| X. Security | No | PASS | No security implications |
| XI. Internationalisation | No | PASS | No user-facing strings |
| XII. Community Engagement | No | PASS | Internal CI fix |
| XIII. Contribution Standards | **Yes** | PASS | Atomic commits, PR review required |
| XIV. Pre-Release Freedom | N/A | PASS | — |
| XV. Strict Type Safety | **Yes** | PASS | All TypeScript changes must be strictly typed |

**No violations. Gate passed.**

## Project Structure

### Documentation (this feature)

```text
specs/143-fix-stac-tree/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Root cause analysis and approach
├── quickstart.md        # Developer guide for E2E STAC tree debugging
└── checklists/
    └── requirements.md  # Spec quality checklist
```

### Source Code (repository root)

```text
tests/e2e/
├── models/
│   └── code-server-page.ts     # Primary changes: openPlotViaStacTree(), focusStacView(),
│                                 # waitForExtensionReady(), ensureStacPaneExpanded(),
│                                 # NEW: openPlotViaCommand(), diagnostic helpers
├── fixtures/
│   └── base.ts                  # May need updates for diagnostic artifact capture
├── helpers/
│   └── diagnostics.ts           # NEW: screenshot/log capture utilities
├── test-*.spec.ts               # Remove .skip annotations from 15 test files
└── evidence/                    # Diagnostic screenshots (gitignored)

apps/vscode/
├── src/
│   └── extension.ts             # May add debrief.openPlotByUri command if needed
└── package.json                 # Register new command if added
```

**Structure Decision**: Changes are concentrated in the E2E test models layer (`tests/e2e/models/`). The VS Code extension may get a minor command addition if the fallback mechanism (P3) requires it.

## Media Components

None - CI infrastructure/test reliability fix with no visual components.

## Storybook E2E Testing

None - no interactive UI components.

## VS Code Webview E2E Testing

This feature IS the VS Code E2E test fix. The changes directly affect the test infrastructure:

| Workflow | Panels Involved | Key Selectors | Interactions |
|----------|----------------|---------------|--------------|
| Open plot via STAC tree | Explorer sidebar, STAC tree view | `.pane-header` (case-insensitive), `.monaco-list-row`, `.monaco-tl-twistie` | focus pane, expand tree, click plot |
| Open plot via command (fallback) | Command palette or direct command | Command palette selectors | invoke command with plot URI |

**Testing Strategy**:
- [x] Extension workflow works end-to-end in openvscode-server
- [x] Webview content accessible via `frameLocator` chaining
- [x] Page objects updated for new selectors
- [x] Screenshots captured for evidence

**Test File Location**: `tests/e2e/test-load-display.spec.ts` (primary validation), all 15 re-enabled test files

**Infrastructure**:
- Patches applied by `tests/e2e/scripts/patch-webview.sh`
- Content injection via `tests/e2e/helpers/webview-injector.ts`
- Diagnostic capture via NEW `tests/e2e/helpers/diagnostics.ts`

## Implementation Approach

### Step 1: Diagnostic Instrumentation (P2)

Add diagnostic helpers to capture state at each stage of `openPlotViaStacTree()`:

1. Create `tests/e2e/helpers/diagnostics.ts` with:
   - `captureStageScreenshot(page, stage)` — saves screenshot with stage name
   - `captureTreeState(page)` — logs all `.monaco-list-row` text contents
   - `captureExtensionOutput(page)` — reads extension output channel

2. Instrument each step of `openPlotViaStacTree()` with diagnostic capture on timeout

### Step 2: Fix Pane Focus and Selectors (P1)

1. **Fix case sensitivity**: Change `.pane-header:has-text("STAC STORES")` to use case-insensitive matching (e.g., `getByText('STAC Stores', { exact: false })` or regex)

2. **Use command for focus**: Instead of clicking pane headers, use the command palette to run the VS Code focus command for the STAC explorer view (if available), or `workbench.view.explorer` followed by pane-specific expansion

3. **Add retry loop**: Wrap the full sequence in a retry (max 2 attempts) with targeted diagnostics on each failure

4. **Tighten timeouts**: Reduce individual step timeouts (3-5s each) but allow the overall method to retry once. Total time: 2 × ~15s = 30s max

### Step 3: Harden Tree Wait Logic (P1)

1. **Wait for storesReady signal**: Instead of polling for "Loading stores" text absence, wait for the first `.monaco-list-row` to appear within the STAC pane (more reliable than text-absence check)

2. **Fix seedConfigAndReload**: Skip config re-seeding if config already exists and is valid. Only reload if needed. After reload, use the same hardened focus/expand logic.

3. **Verify tree population**: After expanding store node, assert at least one child row appears before proceeding to find plot name

### Step 4: Command-Based Fallback (P3)

1. Add `openPlotViaCommand(plotName)` method to `CodeServerPage`:
   - Map plot name to STAC URI (convention: `stac://local-store/{slug}/item.json`)
   - Invoke via command palette: "Debrief: Open Plot" then select from list, OR
   - Add `debrief.openPlotByUri` command to extension that accepts a URI string

2. If extension command approach: add `debrief.openPlotByUri` to `apps/vscode/src/extension.ts` and `package.json`

3. Keep one dedicated test (`test-catalog-browse.spec.ts`) using tree navigation to maintain UI coverage

### Step 5: Remove .skip Annotations

1. Remove `.skip` from all 15 test files
2. Run full E2E suite locally to verify
3. Push and verify CI passes

## Complexity Tracking

No constitution violations — section not needed.
