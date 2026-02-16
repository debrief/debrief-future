# E2E Test Summary: Feature 097 — Feature Format Menu

**Date**: 2026-02-14
**Runner**: Playwright 1.57.0 + @sparticuz/chromium (Chromium 131.0.6778.0)
**Environment**: Claude Code session (Linux 4.4.0, Node.js 22.x)
**Storybook**: v8.6.15 on localhost:6006

## Test Results

| Suite | Passed | Failed | Skipped | Duration |
|-------|--------|--------|---------|----------|
| FormatMenu | 8 | 0 | 0 | ~12s |
| FormatMenu Screenshots | 3 | 0 | 0 | ~5s |
| **Total** | **11** | **0** | **0** | **20.0s** |

## Test Details

### FormatMenu Suite (8 tests)

| # | Test | Duration | Status |
|---|------|----------|--------|
| 1 | format icon is visible on selected row | 2.5s | PASS |
| 2 | format icon appears on hover for unselected row | 1.3s | PASS |
| 3 | clicking format icon opens cascading menu | 1.3s | PASS |
| 4 | menu contains expected items for TRACK feature | 1.3s | PASS |
| 5 | hovering Line Colour opens colour submenu | 1.6s | PASS |
| 6 | selecting a colour updates the indicator bar | 1.7s | PASS |
| 7 | format change is recorded in hidden element | 1.5s | PASS |
| 8 | Escape dismisses the format menu | 1.2s | PASS |

### FormatMenu Screenshots Suite (3 tests)

| # | Test | Duration | Status |
|---|------|----------|--------|
| 9 | capture format menu open state | 1.6s | PASS |
| 10 | capture colour submenu open | 1.8s | PASS |
| 11 | capture after colour change | 1.9s | PASS |

## Screenshots Captured

- `screenshots/format-menu-open.png` — Format menu open showing 7 TRACK properties
- `screenshots/format-menu-colour-submenu.png` — Line Colour submenu with 12-colour palette
- `screenshots/format-menu-after-colour-change.png` — HMS Belfast indicator bar changed from blue to green

## Key Scenarios Verified

| Scenario | Requirement | Result |
|----------|-------------|--------|
| Format icon visible on selected rows | FR-001 | PASS |
| Format icon appears on hover | FR-001 | PASS |
| Cascading menu shows correct TRACK properties | FR-003 | PASS |
| Hover-cascade submenu opens for colour | FR-004 | PASS |
| Colour selection updates indicator bar immediately | FR-014 | PASS |
| Format change recorded with correct property/value | FR-012 | PASS |
| Escape dismisses menu | FR-017 | PASS |

## CascadingMenu Click-Outside Fix Verified

Test 6 ("selecting a colour updates the indicator bar") directly validates the fix for the
CascadingMenu click-outside bug. Previously, clicking a submenu colour item triggered the
click-outside handler (because SubmenuPanel is a sibling of menuRef via React Fragment),
which dismissed the menu before the click event could fire onSelect. The fix adds
`target.closest('.debrief-cascading-menu')` to ignore clicks within the menu system.
