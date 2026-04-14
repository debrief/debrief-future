---
layout: future-post
title: "Planning: Nested Child Selection"
date: 2026-04-14
track: [momentum]
author: Ian
reading_time: 4
tags: [tracer-bullet, session-state, selection, ui]
excerpt: "Paths instead of IDs — clicking a single position on a track should select that position, not its parent, without losing mixed-depth multi-select."
---

## What We're Building

Today, clicking a track on the Debrief map selects the whole track. If you want to analyse a single position — say, the moment a vessel altered course — you have no way to say so to the rest of the system. The properties panel shows track-level metadata; any tool you invoke receives the track as its input.

Feature 186 changes that. Selection entries become paths: `track-hms-defender` for the whole track, `track-hms-defender/positions/4` for a specific position, `track-hms-defender/segments/leg-alpha/positions/3` for a position within a segment (once segmented tracks land). Arbitrary depth, mixed-depth multi-select, Ctrl+click to toggle, Shift+click for a contiguous range, per-plot persistence so your working selection survives tab-switches and reopens.

This is the third time we've looked at this. Feature 053 shipped the path utilities and a flexible selection model, but kept flat-ID semantics as a backwards-compatible fallback. 186 finishes the job — drops the fallback, formalises the Level Registry as a LinkML-generated single source of truth, and wires up the remaining interaction patterns users expect from any modern desktop tool.

## How It Fits

The selection state is the pivot point between the map and every other panel. Once it holds paths instead of flat IDs, the properties panel can show position-level detail, tools can match on exact leaf elements, and the Log Panel can report when a persisted selection fails to resolve after a data reload. No panel has to guess what the user meant — the path carries the full answer.

It also sets up the groundwork for segmented tracks. A `LineString` is a single sequence of coordinates today; segmented tracks decompose it into named sub-units (`leg-alpha`, `leg-bravo`). Having arbitrary-depth selection from day one means that feature doesn't trigger a second refactor of every panel.

## Key Decisions

A few things we wrestled with, now settled:

- **Mixed addressing** (some levels use IDs, others use indices) stays, with the Level Registry as the single authority. We looked at ID-only (generate synthetic position IDs — rejected, invents identity GeoJSON doesn't have), self-describing paths (rejected, duplicates schema), and index-only (rejected, loses stable segment identity). Mixed is what the data actually looks like.
- **No backwards compatibility.** Article XIV.1 of our constitution grants pre-release freedom from compat obligations; this is a clean breaking change delivered all at once. Every consumer updates together.
- **Ctrl+click = toggle, not append.** Clicking an already-selected element removes it. Entries are unique by path. This matches VS Code, file managers, and every desktop convention.
- **Per-plot persistence.** Selections survive tab-switches and plot reopens. Paths that no longer resolve (data reloaded with fewer positions) are retained, flagged, and logged — never silently dropped.
- **Binary visual styles** — one for whole-feature, one for any nested child, plus an independent overlay marking the primary. No per-depth colour ramp; we tried imagining five depths and five shades, and it's illegible.
- **Two-click range selection**, bounded to siblings under a shared parent, currently only at index-based levels. Cross-parent Shift+click falls back to a plain replace rather than an error.
- **Explicit scope boundary.** Rubber-band/box selection, "select all positions on this track", keyboard navigation, and list-panel-initiated selection are all out of scope for 186 and deferred to their own features. Better a small clean slice than a sprawling one with interaction-mode conflicts discovered late.

## What We'd Love Feedback On

- **The Shift+click constraint.** We require the anchor and target to share the same immediate parent for range selection. Is that ever going to feel too restrictive? A Shift+click from a position on track A to a position on track B falls back to single-click replace. Is that the behaviour analysts would want, or should it be rejected with a tooltip explaining why?
- **Unresolvable-entry visibility.** Each unresolvable path emits a LogService warning and the properties panel shows an aggregate count. Would analysts want a one-click "drop all unresolvable" action, or is retaining them the right default so that re-loading corrected data brings them back to life?
- **Primary overlay design.** The overlay is independent of the whole-vs-nested style. That's the engineering contract. What should it *look* like? A bolder outline? An accent colour? A marker glyph? This is the kind of thing where a fast round of UI review before we commit would save rework.
- **Persistence scope.** We're persisting per plot. If you open a plot, make a selection, then open a *different* plot, does the second plot start with an empty selection (current plan) or remember whatever you had selected last time you visited it (also current plan)? Both are true — but I want to check that matches intuition.

→ [See the spec](https://github.com/debrief/debrief-future/blob/claude/speckit-specify-187-2efuf/specs/186-nested-child-selection/spec.md)
→ [Join the discussion](https://github.com/debrief/debrief-future/discussions)
