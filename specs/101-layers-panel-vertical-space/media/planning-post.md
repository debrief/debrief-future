---
layout: future-post
title: "Planning: Layers Panel Vertical Space Fix"
date: 2026-02-24
track: [momentum]
author: Ian
reading_time: 3
tags: [tracer-bullet, activity-panel, bug-fix, css]
excerpt: "A fixed 300px height and a missing flex container leave whitespace where layers should be."
---

## What We're Building

Collapse the Time Controller and Tools sections in the Activity Panel, and you'd expect the Layers section to expand and fill the space. It doesn't. Instead, a gap appears below the layers list -- sometimes half the panel height, sitting empty while your layer entries are crammed into a 300px window above it.

The root cause is a mismatch between two levels of the layout. The outer flex column works correctly: when sibling sections collapse, the Layers section container does grow to claim the freed space. But inside that container, the FeatureList component renders with an inline `height: 300px`, and its parent wrapper isn't a flex container. So FeatureList can't participate in flex layout. It sits at its fixed height, and everything below it is wasted space.

## How It Fits

The Activity Panel is a shared React component used across the VS Code extension webview and potentially other frontends. It's a flex-column container with three collapsible sections: Time Controller (fixed height), Tools (flexible), and Layers (flexible). The flex layout at the section level was set up correctly during the unified Activity Panel work (feature 047). This bug lives one level deeper -- inside the section content wrapper -- and only becomes visible when you start collapsing sections to focus on your layers.

## Key Decisions

- **CSS-only fix**: No component logic changes. The FeatureList component has a `height` prop that defaults to 300px, and other contexts may rely on that default. Changing the prop would fix this case but break FeatureList anywhere it's used outside a flex container. Instead, we override the fixed height via CSS specificity when FeatureList is inside a flexible section.

- **Two CSS rule changes, one file**: Make `.section-content` a flex column container inside flexible sections (`display: flex; flex-direction: column`), and add a rule for `.debrief-feature-list` inside flexible sections to use `flex: 1 1 0%`. The flex shorthand sets `flex-basis: 0%`, which overrides the inline 300px height. Standard CSS specificity, no `!important` hacks.

- **Move scroll responsibility**: Currently `.section-content` has `overflow-y: auto`. After the fix, it becomes a flex container with `overflow: hidden`, and scrolling stays with FeatureList's internal scroll container (which already handles virtualised scrolling via `@tanstack/react-virtual`). Scrolling doesn't change from the user's perspective -- it just happens at the right level of the DOM.

- **All 8 collapse-state combinations tested**: Three sections, each collapsed or expanded, gives 8 combinations. The fix must produce correct layouts for all of them. The two that were visibly broken -- Tools collapsed with Layers expanded, and both Tools and Time Controller collapsed with Layers expanded -- are the primary targets, but the other six must not regress.

## What We'd Love Feedback On

This is a minimal fix -- two CSS rules in one file. An alternative would be to refactor FeatureList to not set a fixed height at all and instead always derive its height from its container. That's a larger change with wider implications (FeatureList is used in multiple contexts), but it would prevent this category of bug from recurring. Is the targeted CSS override the right call, or should we take on the broader refactor now while the component surface area is still small?

> [Join the discussion](https://github.com/debrief/debrief-future/discussions)
