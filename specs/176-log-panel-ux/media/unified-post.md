---
title: "Building Analysis Log Panel — Rich Card UX"
date: 2026-04-19
layout: future-post
author: Ian
track: credibility
excerpt: "Every parameter visible, UTC timestamps, keyboard-navigable tabs. The audit trail stops hiding things from the analyst."
tags:
  - accessibility
  - log-panel
  - provenance
  - shared-components
  - ux
---

## What We're Building

The Log Panel is the analyst's audit trail -- every operation applied to track data, in order, with the parameters that were used. Right now it renders raw PROV data: tool names, positional parameter indices, ISO 8601 durations. It's accurate, but it forces analysts to mentally decode things like `P0DT0.25S` into "250 milliseconds" and guess whether a parameter value is a colour, a range, or a boolean.

We're redesigning the card face to surface that information visually. Each logged operation becomes a three-row card: a header with a coloured category icon (import, style, calc, filter, or snapshot), a meta row with track badges showing which platform was affected, and a parameters row where each value gets a type-aware chip -- colour swatches for colour values, `#` prefixes for numbers, `↔` indicators for ranges, boolean symbols for toggles. Parameters that were explicitly set (rather than left at defaults) get a small marker so analysts can immediately see what was customised.

## How It Fits

This is a pure UI change within the existing `@debrief/components` shared library. The underlying provenance model is untouched -- the PROV records remain immutable, and services continue to have no knowledge of how their output is rendered. The Log Panel already has a flip-card pattern from Feature 113 (parameter editing); we're only changing the read-only front face. The same cards will render identically in the VS Code extension webview and the web shell.

## Key Decisions

- **Unified 4-tab view mode.** The current implementation has separate controls for layout (timeline vs. by-feature) and detail level (compact vs. normal vs. detailed). We're collapsing these into four tabs: Timeline, By Feature, Compact, and Detailed. Simpler mental model, one selection instead of two.

- **Client-side type inference for parameter chips.** When a tool schema is available (from the existing schema cache), we use its declared types. When it's not, a heuristic function infers the type from the value itself -- recognising colour names, numeric patterns, boolean values. This avoids modifying the provenance data model and keeps rendering fast.

- **Tool categories from manifests, not inference.** Each tool declares its category in a manifest. We considered inferring categories from tool name prefixes, but that's fragile and the manifest approach is explicit. Tools without a declared category get a neutral grey icon.

- **ARIA tablist/tab/tabpanel pattern.** The 4-tab bar uses proper ARIA roles for screen reader accessibility. All semantic information is also conveyed through shape and text, not colour alone.

- **No new dependencies.** Everything is built with React 18 and CSS within the existing component library. The coloured category icons are 18x18px CSS squares, not an icon library.

The Log Panel is the analyst's audit trail — every operation applied to track data, in order, with the parameters that were used. Three weeks ago it rendered raw PROV records: tool names, positional indices, ISO 8601 durations. Accurate, but slow to scan, and quietly misleading in one specific way. This PR closes the remaining 15% of the redesign and fixes that quiet problem.

## Category Icons at a Glance

![All six tool-category icons in a single view](../evidence/screenshots/all-categories.png)

Each tool carries a coloured category icon drawn from a static manifest: blue for import tools, violet for style operations, green for calculations, orange for filters, yellow for snapshot exports, and a neutral grey for any tool that hasn't been classified yet. The analyst can scan an entire timeline and pick out "where did the import happen" without reading a single tool name. This is one of those "obvious once you see it" changes that the previous plain-text rendering couldn't do.

## Placeholders for the Awkward Cases

![Snapshot entry, empty params, deleted track, multi-track wrap](../evidence/screenshots/edge-cases.png)

Two specific entry types used to render badly. **Snapshot entries** (`export-png`, `export-csv`) have no tool runtime — they're manual checkpoints — so showing a `200ms` duration next to them was both meaningless and misleading. Now the duration is suppressed and the parameter row reads `Manual checkpoint` in muted italic. **Parameterless entries** previously rendered an empty row with no affordance for the reader; they now carry a `No parameters` placeholder, again in muted italic.

The multi-track entry (card 4 in the screenshot above) shows the `flex-wrap` behaviour for the track badges — when an operation touches three tracks (Alpha, Bravo, Charlie) the badges wrap onto a second line inside the meta row rather than overflowing the card.

## Before and After

| | Before | After |
|---|--------|-------|
| Parameters rendered | Non-default only | All, capped at 5 + `+N more` |
| Default vs. missing | Indistinguishable | Default renders as chip; non-default carries red-dot marker |
| Empty params | Empty row | `No parameters` placeholder (muted italic) |
| Snapshot entries | Showed a tool runtime that didn't exist | `Manual checkpoint` placeholder, duration hidden |
| Timestamp format | Local time, varied by machine | `HH:MM:SS UTC`, stable across labs |
| Duration ≥1s | Mixed (`1s`, `2.3s`) | Single decimal (`1.0s`, `2.3s`, `30.0s`) |
| Tab navigation | Mouse only | ARIA tablist with ArrowLeft/Right/Home/End |
| Non-default flag | `isDefault` double-negative | `isNonDefault` — true means "show the dot" |

## The polarity flip

One of the smaller commits in this PR was also one of the more satisfying. The contract carried a boolean called `isDefault`, and the component needed the red-dot marker when that flag was `false`. Every call site read as "show the dot when `!isDefault`", which is the kind of double-negative that forces a pause every time you read it. Flipping the flag to `isNonDefault` — across the types, the component, the tests, the spec contract, and the i18n key — removes the negation. The dot renders when the flag is `true`. The tests read in plain English. The future reader doesn't have to decode anything.

This is a tiny change with no user-visible effect, but it's the kind of change that's only cheap to make once. Left in place, `isDefault` would have leaked into every new call site for as long as the component existed.

## Disabled Entries — Visible but Out of Play

![Disabled card at reduced opacity with the Disabled badge](../evidence/screenshots/disabled-state.png)

A disabled entry (card 1 in the screenshot above) renders at 50% opacity with a red-tinted `Disabled` badge in the header. It stays in the audit trail, stays selectable, and its parameters stay visible. Removing it from the log would break the audit trail; hiding it would leave the analyst wondering why a subsequent calculation expected a feature that doesn't seem to exist. The reduced-opacity treatment makes the suppression obvious without losing any information.

## Accessibility

The 4-tab view-mode bar (Timeline, By Feature, Compact, Detailed) now uses a proper ARIA tablist with roving `tabIndex`. `ArrowLeft` and `ArrowRight` cycle through adjacent tabs with wrap; `Home` and `End` jump to the first or last. Only the active tab has `tabIndex={0}`, so tabbing out of the panel goes to the next focusable element rather than cycling through each tab. Each card carries `aria-selected` reflecting selection state and a step-numbered `aria-label` so a screen reader announces "Step 3, bearing-between-tracks, 09:02:00 UTC" rather than an unlabelled region.

The `@axe-core/playwright` audit across all stories in all themes is tracked as a follow-up under #209 — it's a separate concern from getting the semantics right, which this PR does.

## Storybook

Four focused stories land with this PR, and they are the stories the Playwright component E2E drives when it captures the screenshots above:

- **AllCategories** — one card per tool-category icon (import, style, calc, filter, snapshot, and the neutral-grey fallback).
- **AllChipTypes** — one parameter chip per inferred type (colour, number, boolean, range, enum) so the type-inference chain is visible at a glance.
- **EdgeCases** — the `No parameters` placeholder, the `Manual checkpoint` placeholder on a snapshot entry, a deleted-track badge, and a `+N more` overflow indicator all in one view.
- **DisabledCard** — a card rendered at reduced opacity with its disabled badge.

## By the Numbers

| | |
|---|---|
| LogPanel component + unit tests | 70 |
| New test files | 6 |
| New tests added in this PR | 46 |
| Total `@debrief/components` tests passing | 1,600 |
| Tests failing | 0 |
| i18n strings added | 4 (`chipNonDefaultTooltip`, `trackBadgeDeletedSuffix`, `noParametersLabel`, `manualCheckpointLabel`, `paramOverflowLabel`) |
| New Storybook stories | 4 |

## Known-pending

The webview E2E at `tests/e2e/test-log-panel.spec.ts` moved from `describe.skip` to `describe.fixme`, with an explicit reference to #143. `skip` silently drops a suite from CI; `fixme` surfaces it as a known-pending block so it stays visible until the underlying webview iframe selector instability lands its fix in #143. Same outcome for the run — nothing fails on merge — but the audit trail is now honest about what's not running and why.

The Playwright component E2E spec for this feature is authored and runs locally, but isn't wired into CI yet — it needs a Storybook server step in the workflow. Screenshots are produced manually for now; the paths in the evidence README describe where the CI-captured versions will land.

## Lessons Learned

**Show everything, mark the difference.** The "only render non-defaults" rule was a local optimisation that cost global clarity. Rendering all parameters and marking the non-default ones is more chips on screen but less cognitive load per card — the default values are information, not noise.

**Double-negatives cost more than they look.** `isDefault` wasn't wrong — it was just slightly harder to read than `isNonDefault`, and that slight difficulty compounded across every call site. Renaming it touched fewer files than I expected. Worth doing early.

**UTC is the only timezone that means one thing.** Any per-machine default is a coordination hazard in cross-site work. The timestamp change is five lines of code and several classes of bug removed.

## What's Next

The a11y audit under #209 is the main remaining thread — an automated `@axe-core/playwright` run against all LogPanel stories in all themes, to catch the contrast and focus-visible regressions that are easy to introduce and hard to spot by eye. The webview E2E unblocks when #143 ships. And the flip-card back face (parameter editing, from feature 113) continues to work unchanged — this PR only touched the read-only front face, so the edit workflow stayed as-is.

→ [Spec](../spec.md)
→ [Evidence](../evidence/)
→ [Planning post](./planning-post.md)
