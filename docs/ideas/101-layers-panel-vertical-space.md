# 101 - Layers Panel Does Not Expand to Fill Vertical Space

**Category**: Bug
**Status**: approved

## Summary

When Time Controller and Tools sections are collapsed in the Activity Panel, the Layers component does not expand to fill the available vertical height. A large whitespace area appears beneath the layers list.

## Steps to Reproduce

1. Open a plot with multiple layers
2. Collapse the Time Controller section
3. Collapse the Tools section
4. Observe: Layers section remains at its original height with whitespace below

## Expected Behaviour

The Layers section should use `flex-grow` or similar CSS to consume all remaining vertical space when sibling sections are collapsed.

## Evidence

`tests/e2e/evidence/real-webview-layers-focus.png` shows the issue clearly.

## Fix

Pure CSS fix -- add `flex-grow: 1` (or equivalent) to the Layers section container so it expands when siblings collapse.

## Scoring Rationale

- **V=3**: Visual polish, improves usability of the activity panel
- **M=2**: Before/after screenshot potential for blog
- **A=5**: Pure CSS fix, clear acceptance criteria, easily testable
- **Total=10**, **Complexity**: Low (straightforward CSS change)
