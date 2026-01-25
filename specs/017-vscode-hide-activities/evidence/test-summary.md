# Test Summary: VS Code Hide Activities

**Date**: 2026-01-23
**Feature**: 017-vscode-hide-activities

## Test Results

| Test File | Tests | Status |
|-----------|-------|--------|
| activityBarService.test.ts | 18 | PASS |
| calcService.test.ts | 9 | PASS |
| selectionManager.test.ts | 13 | PASS |
| stacTreeProvider.test.ts | 8 | PASS |
| storeValidation.test.ts | 10 | PASS |
| timeFilter.test.ts | 7 | PASS |
| toolFilter.test.ts | 6 | PASS |
| trackRenderer.test.ts | 5 | PASS |

**Total**: 76 tests passed, 0 failed

## ActivityBarService Tests

| Test | Description |
|------|-------------|
| isEnabled | Returns true/false based on debrief.hideActivities.enabled setting |
| getTargetViewIds | Returns default list of view IDs to hide |
| applyDefaults | Hides target activities on first run only |
| applyDefaults | Does not hide when feature disabled |
| applyDefaults | Does not re-hide on subsequent activations |
| applyDefaults | Sets initialization state after first run |
| protected views | Never hides Explorer view |
| protected views | Never hides Debrief view |
| detectUserOverrides | Detects when user re-enabled a hidden activity |
| detectUserOverrides | Returns empty array when no overrides |
| detectUserOverrides | Returns empty array when no snapshot exists |
| restoreDefaults | Sets all activities to visible |
| restoreDefaults | Clears initialization state |
| restoreDefaults | Clears snapshot state |
| restoreDefaults | Allows feature to re-apply after restore |

## Lint Status

ESLint passed with no errors.

## Build Status

```
  dist/extension.js  89.0kb
  dist/webview/map.js  423.1kb
```

Build completed successfully.
