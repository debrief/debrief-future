# Usage Example: Layers Panel Vertical Space Fix

**Feature**: 101-layers-panel-vertical-space
**Date**: 2026-02-24

## Before (Bug)

When both Time Controller and Tools sections were collapsed, the Layers section displayed with a fixed 300px height, leaving a large whitespace gap below the layers list:

```
┌──────────────────────────┐
│ ▸ TIME CONTROLLER        │  ← collapsed header
├──────────────────────────┤
│ ▸ TOOLS                  │  ← collapsed header
├──────────────────────────┤
│ ▾ LAYERS                 │
│ ┌────────────────────────┤
│ │ HMS Belfast            │
│ │ USS Enterprise         │
│ │ HMS Victory            │
│ │                        │  ← FeatureList fixed at 300px
│ └────────────────────────┤
│                          │
│                          │  ← WASTED SPACE (bug)
│                          │
│                          │
└──────────────────────────┘
```

## After (Fix)

The Layers section now expands to fill all remaining vertical space:

```
┌──────────────────────────┐
│ ▸ TIME CONTROLLER        │  ← collapsed header
├──────────────────────────┤
│ ▸ TOOLS                  │  ← collapsed header
├──────────────────────────┤
│ ▾ LAYERS                 │
│ ┌────────────────────────┤
│ │ HMS Belfast            │
│ │ USS Enterprise         │
│ │ HMS Victory            │
│ │                        │
│ │                        │  ← FeatureList fills remaining space
│ │                        │
│ │                        │
│ └────────────────────────┤
└──────────────────────────┘
```

## CSS Changes Made

**File**: `shared/components/src/ActivityPanel/ActivityPanel.css`

### Change 1: Section content becomes a flex column

```css
/* Before */
.debrief-activity-panel__section--flexible .debrief-activity-panel__section-content {
  flex: 1 1 0%;
  overflow-y: auto;
}

/* After */
.debrief-activity-panel__section--flexible .debrief-activity-panel__section-content {
  flex: 1 1 0%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}
```

### Change 2: FeatureList fills remaining space

```css
/* New rule */
.debrief-activity-panel__section--flexible .debrief-feature-list {
  flex: 1 1 0%;
  min-height: 0;
}
```

## How It Works

1. The section-content wrapper is now a **flex column container** instead of a block element
2. The FeatureList gets `flex: 1 1 0%` which makes it grow to fill available space
3. In a flex column, `flex-basis: 0%` (from the shorthand) takes precedence over the inline `height: 300px`
4. The FeatureList's internal scroll container (`height: 100%`) now correctly fills the expanded parent

## Verification

Open any Storybook story under **Components/ActivityPanel**:
- `ToolsCollapsed` — Layers fills remaining space below TC
- `AllCollapsed` — only three section headers visible
- `Default` — 50/50 split with resize handle (unchanged)
