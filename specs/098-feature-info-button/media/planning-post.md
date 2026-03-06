---
layout: future-post
title: "Planning: Feature Info Button"
date: 2026-02-17
track: [momentum]
author: Ian
reading_time: 3
tags: [tracer-bullet, layers-panel, testing, playwright]
excerpt: "An info button on every feature row so Playwright can verify geometry without parsing the map canvas."
---

## What We're Building

Testing map applications is awkward. The map canvas is a rendered image -- you can't query it with `getByRole` or assert against a coordinate value. If a Playwright test needs to verify that dragging a track point actually changed the geometry, it has to either parse pixels or hope the data matches some indirect signal. Neither is reliable.

We're adding an "info" button to every feature row in the Layers panel. Click it, and a dialog shows the feature's geometry type and coordinates as structured text. Point features show a single coordinate pair. Tracks show every position in their LineString. Zones show their polygon rings. Each value has a `data-testid` attribute, so a test script can open the dialog, read `geometry-type`, read `geometry-coordinates`, and assert. No canvas parsing, no guesswork.

The same button appears on child rows. Expand a track, hover over an individual position, click its info button, and you see that specific point's coordinates -- not the parent track's full geometry. This matters for tests that verify single-point edits.

## How It Fits

This is a pure frontend addition to the shared React component library (`@debrief/components`). The info button slots in next to the format icon we shipped last week in feature 097 -- same hover-visibility pattern, same 20x20px clickable area, same `stopPropagation` to avoid triggering row selection. The GeometryDialog is a new component, but it follows the positioning and dismissal patterns established by CascadingMenu: `position: fixed`, viewport collision detection, click-outside and Escape to close. State lives in ActivityPanel, same as the format menu state. No new dependencies.

## Key Decisions

- **Dialog, not tooltip or inline expansion**: A tooltip would be hard for Playwright to target reliably. Inline expansion would disrupt the virtualised list layout. A dialog with `role="dialog"` and `aria-label` gives test frameworks a clean, stable selector.

- **Structured text, not raw JSON or map preview**: The coordinates are displayed in a formatted list with each pair on its own line, not dumped as a JSON blob. Human-readable for manual inspection, machine-readable via `data-testid` attributes for automation. The spec explicitly ruled out a map preview -- this feature is about data access, not visualisation.

- **Circled "i" SVG icon**: Matches the existing 14x14 inline SVG style used by the format (pencil) and visibility (eye) icons. Same `stroke="currentColor"` approach so it adapts to light, dark, and VS Code themes automatically.

- **Child geometry is derived, not stored**: Child rows (individual positions within a track) don't carry their own geometry object. Instead, the dialog constructs a synthetic `Point` geometry from the child's index and the parent feature's coordinate array. This avoids inflating the memory footprint of the flattened display list.

- **One dialog at a time**: Opening the info dialog for one feature closes any previously open dialog. Same single-state pattern as the format menu.

## What We'd Love Feedback On

The main open question is about large coordinate arrays. A track recorded at one-second intervals over several hours could have thousands of positions. Showing all of them in a dialog is technically correct but not particularly useful for either humans or test scripts. We're considering a truncation approach -- show the first N coordinates with an "and X more" indicator -- but the right threshold isn't obvious. Too low and you can't verify mid-track edits; too high and the dialog becomes unwieldy.

For Playwright specifically, should the dialog expose a way to query a coordinate by index without rendering all of them? Something like a `data-coord-index` attribute on each line, so a test can jump straight to position 47 without scrolling through 46 others. That adds markup complexity but could make test scripts significantly cleaner.

> [Join the discussion](https://github.com/debrief/debrief-future/discussions)
