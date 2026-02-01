---
layout: future-post
title: "Planning: vscrui Component and Theme Library Conversion"
date: 2026-02-01
track: momentum
author: Ian
reading_time: 4
tags: [tracer-bullet, theming, vscrui, ui-components]
excerpt: "Replacing raw HTML with vscrui components in FeatureList and LayersToolbar. Fixing 7 hardcoded colours and unifying theme control."
---

## What We're Building

We're converting the FeatureList and LayersToolbar components from raw HTML elements to the vscrui component library. This means replacing `<button>`, `<input>`, and `<checkbox>` elements with their vscrui equivalents while preserving all existing behaviour.

The work includes eliminating 7 hardcoded colour values that currently bypass our token system, removing browser media queries in favour of ThemeProvider-controlled theme switching, and swapping inline SVG icons for Codicon icons where platform equivalents exist (trash, eye, play, search, filter icons all have Codicon versions; eraser and paperclip stay as custom SVG).

## How It Fits

This builds on the three-layer theming architecture we already have in place: `tokens.css` defines `--debrief-*` design tokens for both light and dark themes, ThemeProvider sets a `data-theme` attribute on the root element, and `vsCodeAdapter.ts` maps VS Code's native `--vscode-*` variables to our `--debrief-*` tokens. vscrui inherits VS Code's CSS variables directly, so once we replace the raw HTML, components automatically pick up the correct theme.

We're doing this for FeatureList and LayersToolbar first because they represent the most complex UI patterns in the shared component library. Once these are converted, we'll have proven patterns for radio groups, date-time inputs, icon buttons, and nested dropdowns.

## Key Decisions

- **vscrui Dropdown replaces radio group** — The visibility filter (All / Hidden only / Visible only) is currently radio buttons, but dropdowns are the standard pattern in VS Code panels. We're following platform conventions over web conventions here.

- **Native datetime-local inputs stay native** — vscrui's TextField doesn't support type pass-through for specialised input types. We're keeping `<input type="datetime-local">` as styled native controls using the token system, and raising a backlog item for a custom date-time component if needed later.

- **color-mix() for opacity variations** — When we need semi-transparent versions of tokens (like the attention colour at 60%, 50%, and 0% opacity), we're using CSS `color-mix()` rather than creating separate tokens for each opacity level.

- **FeatureRow stays as a div** — FeatureRow is a virtualised list item that needs precise layout control. It's staying as a `<div role="button">` with proper ARIA attributes and keyboard support, not converting to a vscrui Button.

## What We'd Love Feedback On

- Does the Dropdown conversion for the visibility filter feel right, or would you prefer we build a custom radio group component that follows vscrui styling patterns?

- Are there other UI components in your tactical analysis workflows that need similar treatment (raw HTML that should be converted to platform-native components)?

- Should we prioritise Codicon icon coverage over custom SVG flexibility? We're keeping custom icons where no Codicon exists, but if you have strong preferences for visual consistency over functional completeness, that affects which icons we prioritise.

> [Join the discussion](https://github.com/debrief/debrief-future/discussions)
