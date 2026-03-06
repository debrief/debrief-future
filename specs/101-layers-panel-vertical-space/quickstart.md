# Quickstart: Layers Panel Vertical Space Fix

**Feature**: 101-layers-panel-vertical-space
**Date**: 2026-02-24

## What Changed

Two CSS rules in `shared/components/src/ActivityPanel/ActivityPanel.css`:

1. **Section content becomes a flex column** — the `.section-content` wrapper inside flexible sections now uses `display: flex; flex-direction: column` so its children can fill available space.

2. **FeatureList fills remaining space** — the `.debrief-feature-list` inside flexible sections gets `flex: 1 1 0%` to claim remaining vertical space instead of using its default 300px height.

## How to Verify

1. Open a plot with multiple layers in the VS Code extension
2. Collapse the Time Controller section (click its header)
3. Collapse the Tools section (click its header)
4. Verify the Layers section expands to fill all remaining vertical space
5. Verify scrolling works within the expanded layers list
6. Re-expand sections and verify layout returns to normal

## Storybook Verification

Run `pnpm storybook` and navigate to **Components/ActivityPanel**. The existing stories cover all collapse states:

- `Default` — all expanded (50/50 split)
- `TimeControllerCollapsed` — Tools/Layers fill space
- `ToolsCollapsed` — Layers fills remaining space
- `AllCollapsed` — headers only

After the fix, the `ToolsCollapsed` and `OnlyTimeExpanded` stories should show the Layers list filling all available space with no whitespace gap.

## Files Modified

| File | Change |
|------|--------|
| `shared/components/src/ActivityPanel/ActivityPanel.css` | 2 CSS rule changes |
