# E2E Test Summary

**Feature**: 101-layers-panel-vertical-space
**Date**: 2026-02-24
**Test File**: `shared/components/e2e/ActivityPanel.spec.ts`

## Results

| Suite | Passed | Failed | Skipped |
|-------|--------|--------|---------|
| Collapse State Layouts | 5 | 0 | 0 |
| Theme Variants | 2 | 0 | 0 |

**Total**: 7 passed, 0 failed (17.3s)

## Screenshots Captured

- `screenshots/tools-collapsed.png` — Layers fills vertical space (core fix)
- `screenshots/tools-collapsed-dark.png` — Dark theme variant
- `screenshots/tools-collapsed-vscode.png` — VS Code theme variant
- `screenshots/all-collapsed.png` — Headers only, no orphan space

## Test Coverage

| Collapse State | Tested | Verified |
|----------------|--------|----------|
| All expanded (E/E/E) | Yes | 50/50 split, resize handle visible |
| TC collapsed (C/E/E) | Yes | Tools/Layers share space, resize handle |
| Tools collapsed (E/C/E) | Yes | Layers fills remaining space |
| All collapsed (C/C/C) | Yes | Headers only, no content |
| Only TC expanded (E/C/C) | Yes | Two collapsed flex sections |
| Dark theme | Yes | Correct rendering |
| VS Code theme | Yes | Correct rendering |
