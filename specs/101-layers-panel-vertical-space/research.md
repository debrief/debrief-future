# Research: Layers Panel Vertical Space Fix

**Feature**: 101-layers-panel-vertical-space
**Date**: 2026-02-24

## Root Cause Analysis

### The Bug

When Time Controller and/or Tools sections are collapsed in the Activity Panel, the Layers section does not expand to fill the remaining vertical space. A whitespace gap appears below the layers list.

### Layout Architecture

The Activity Panel uses a CSS flex column layout:

```
.debrief-activity-panel         (flex column, height: 100%)
├── PaneSection[fixed]          Time Controller  (flex: 0 0 auto)
├── PaneSection[flexible]       Tools            (flex: 1 1 0% or 0 0 auto when collapsed)
├── ResizeHandle                                 (flex: 0 0 4px, only when both flexible)
└── PaneSection[flexible]       Layers           (flex: 1 1 0% or 0 0 auto when collapsed)
```

### CSS Rules (Current)

| Selector | Rule | Purpose |
|----------|------|---------|
| `.debrief-activity-panel` | `display: flex; flex-direction: column; height: 100%` | Flex column container |
| `__section` | `flex: 0 0 auto` | Default: fixed, content-sized |
| `__section--flexible` | `flex: 1 1 0%; display: flex; flex-direction: column; overflow: hidden` | Grows to fill |
| `__section--collapsed` | `flex: 0 0 auto !important` | Overrides flexible to header-only |
| `__section--flexible .section-content` | `flex: 1 1 0%; overflow-y: auto` | Content scrolls |

### The Problem

The flex layout at the **section level** is correct. When Tools is collapsed, Layers gets `flex: 1 1 0%` and the section container does expand. However, the content **inside** the Layers section does not expand because:

1. `.debrief-activity-panel__section-content` has `flex: 1 1 0%` and `overflow-y: auto` — it grows within the flex section. **But it is not itself a flex container** — it's a block-level element.

2. Inside section-content, the `FeatureList` component renders with an **inline style** of `height: 300px` (the default `height` prop, line 93 of FeatureList.tsx). This fixed pixel height prevents the list from filling the available space.

3. The `LayersToolbar` above FeatureList takes its natural height. The remaining space inside section-content is available, but FeatureList's fixed height doesn't claim it.

### Visual Breakdown

```
section-content (flex: 1 1 0%, grows to fill section)
├── LayersToolbar    (~36px, natural height)
├── FeatureList      (300px inline height - THE PROBLEM)
└── [whitespace]     (remaining unclaimed space)
```

## Decision: CSS-Only Fix Strategy

**Decision**: Make section-content a flex column container and override FeatureList's fixed height via CSS specificity.

**Rationale**: This is the minimal CSS-only approach that:
- Does not change any component logic (FR-005 compliance)
- Uses standard CSS flex patterns
- Works for all collapse-state combinations
- Preserves the resize handle behaviour when both flexible sections are expanded

**Alternatives Considered**:

1. **Change FeatureList default height prop to `undefined`** — Rejected: this is a component logic change, violating FR-005. It would also break FeatureList in contexts where flex-fill isn't desired.

2. **Pass `style={{ height: '100%' }}` to FeatureList from ActivityPanel** — Rejected: this is a component logic change. Also fragile — would need `min-height: 0` on parent.

3. **Use `!important` on height alone** — Considered: works but incomplete without also making section-content a flex container. The `flex: 1 1 0%` approach requires a flex parent.

## CSS Changes Required

### File: `shared/components/src/ActivityPanel/ActivityPanel.css`

**Change 1**: Make section-content a flex column in flexible sections:

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

Key changes:
- `display: flex; flex-direction: column` — makes it a flex container so children can use `flex: 1`
- `overflow: hidden` instead of `overflow-y: auto` — scrolling moves to the FeatureList's internal scroll container
- `min-height: 0` — standard flex child shrink fix

**Change 2**: Override FeatureList fixed height inside flexible sections:

```css
/* New rule */
.debrief-activity-panel__section--flexible .debrief-feature-list {
  flex: 1 1 0%;
  min-height: 0;
}
```

This uses CSS specificity to make FeatureList grow within the flex container. The inline `height: 300px` is overridden by the `flex` shorthand which sets `flex-basis: 0%`.

### Verification

After the fix, the layout becomes:

```
section-content (flex: 1 1 0%, display: flex, flex-direction: column)
├── LayersToolbar    (flex: 0 0 auto, natural height ~36px)
└── FeatureList      (flex: 1 1 0%, fills remaining space)
    └── scroll       (height: 100%, overflow: auto - already present)
```

All 8 collapse-state combinations should produce correct layouts:

| TC | Tools | Layers | Expected |
|----|-------|--------|----------|
| E | E | E | TC fixed, Tools/Layers 50/50 with resize handle |
| E | E | C | TC fixed, Tools fills remaining |
| E | C | E | TC fixed, **Layers fills remaining** |
| E | C | C | TC fixed, two collapsed headers below |
| C | E | E | Tools/Layers share all space 50/50 |
| C | E | C | Tools fills all space |
| C | C | E | **Layers fills all space** |
| C | C | C | Three headers only |

The bolded rows are the bug-fix cases that should now work correctly.
