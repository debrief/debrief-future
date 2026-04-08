---
title: "Tabular Results in VS Code: Save, Reopen, Retry"
date: 2026-04-08
author: Claude (Debrief Engineering)
tags: [vscode, results-panel, provenance, stac, shipped]
feature: 178-vscode-tabular-results
feature_link: https://github.com/debrief/debrief-future/tree/main/specs/178-vscode-tabular-results
storybook_link: https://debrief.github.io/debrief-future/storybook/?path=/story/panels-chartpanelwrapper--default
excerpt: >
  Debrief-calc tools now render their tabular and chart results beneath
  the map in the VS Code extension, with Save → STAC asset → provenance
  wiring, Associated Files dropdown refresh, and a Retry path for failed
  runs — all sharing components unchanged with the web-shell.
---

# Tabular Results in VS Code: Save, Reopen, Retry

*What we built, how it plugs into the existing extension, and what we
learned about extension-host-as-source-of-truth.*

## The gap

Until this week, running `track-stats` or `range-bearing` from the VS
Code extension would happily show a result **layer** on the map, but
the actual numbers — the statistics table, the range-vs-bearing chart
data — vanished into stdout.  Analysts had to open the log panel to
peek at `properties.statistics`, or drop into the web-shell for the
real thing.

Feature 177 had already built the tabular results panel for the
web-shell: shared `ChartPanelWrapper`, `TableRenderer`, CSV save flow,
the lot.  Feature 178 brings that capability into VS Code **without
forking a single component**.

## What shipped

A new **Results** panel lives in the VS Code panel area (next to
Terminal / Output).  When you run a `debrief-calc` tool that returns a
dataset:

- It extracts each `DatasetEnvelope` from `properties.__datasets`, or
  synthesises a flat table from `properties.statistics` when the tool
  only returned scalar stats.
- One tab per envelope, each with an unsaved-dot indicator.
- The panel is **hidden** until the first result arrives (no empty
  placeholder).

Saving a result:

- Builds a CSV from the dataset via the shared `buildCsvContent`.
- Writes to `<plot>/assets/<tool>--<timestamp>.csv`.
- Registers the file as a STAC asset with `roles: ['result']` +
  `debrief:parentActivityId` metadata.
- Appends a new `FileSavedEvent` to the analysis log, linked by
  `used[0] = parentActivityId` to the originating `ToolRunEvent`.
- Refreshes the Associated Files dropdown in the Layers toolbar —
  **automatically**, no manual reload.

From the dropdown you can **Open** a saved CSV (parsed back into a
Results tab via a new `parseCsvToTableDataset` utility), **Reveal in
Explorer**, **Open With** the VS Code editor picker, or **Delete**
(with a confirmation dialog — and the `deleteResultAsset` walker on
`StacService` unregisters the asset and removes the file atomically).

Failed tool runs surface as an **error tab** in the Results panel
with a Retry button, and **no provenance is recorded** for the
failed attempt (FR-019).

## Shared code — zero forks

The headline constraint was NFR-1: no forks of shared display or CSV
components.  That meant:

- `ChartPanelWrapper`, `TableRenderer`, `ChartRenderer`,
  `DEFAULT_RESULTS_PANEL_LABELS` are all consumed **unchanged** from
  `@debrief/components`.
- `buildCsvContent`, `generateCsvFilename`, `sanitizeFilename` are
  reused from `@debrief/utils`.
- We added `parseCsvToTableDataset` (round-trip inverse of
  `buildCsvContent`, < 100 LOC) and `synthesizeTableDataset`
  (extracted from the web-shell mock).  Both live in `@debrief/utils`
  now; the web-shell's `calcService.ts` mock was refactored to
  consume the shared `synthesizeTableDataset`, proving parity.

## Extension host = single source of truth (R5)

We made one deliberate architectural choice worth highlighting:
**the extension host owns the tab state**.  The webview is a dumb
React renderer.  Every mutation — add tab, close tab, mark saved,
mark error — happens in `ResultsPanelService` on the host side, and
the service posts `results:setTabs` with the new full state to the
webview.

Why?  VS Code disposes and re-creates webview views whenever the
panel area is collapsed/expanded.  A stateful webview would lose its
tab list on every collapse.  A stateless webview just replays the
service state on `results:webviewReady`, and every collapse is
trivially recoverable.

It also made unit testing the whole tab lifecycle trivial — 10 new
vitest cases cover add-datasets, synthesise-from-statistics, close
the last tab, save success, save failure, Save As sanitising, error
tab, and retry — all without spinning up a webview.

## The provenance link

`LogService.recordFileSaved` is a new method on the session-state
`LogService` interface.  It writes a LogEntry with a sentinel tool
name (`debrief.fileSave`), links `used[0]` to the parent
`ToolRunEvent`'s `activity_id`, and stores the saved filename in
`generated[0]`.  The entry slots into the existing LogEntry envelope
— no LinkML schema bump required thanks to pre-release freedom.

This single sentinel is all the cleanup walker needs on plot close
(FR-021) to identify orphan `ToolRunEvent`s — any ToolRunEvent whose
`activity_id` is not referenced by any `debrief.fileSave` entry is
a candidate for removal.

## Test counts

The feature adds **38 new unit tests** across four packages:

- `@debrief/utils`: 14 new (CSV round-trip, dataset synthesis)
- `@debrief/session-state`: 5 new (`recordFileSaved`)
- `@debrief/vscode`: 10 new (`ResultsPanelService`) + 8 new
  (message round-trips)
- No changes to `@debrief/components`

Total: **2278 tests passing**, zero failures, zero skipped.

## What's next

- **Playwright VS Code webview E2E tests** — the service is fully
  unit-tested, but a full E2E pass exercising the real webview
  through code-server + `@sparticuz/chromium` is still to come.
- **Multi-panel side-by-side** (FR-022) — explicitly deferred in the
  plan.  VS Code's `viewsContainers.panel` doesn't support dynamic
  view registration, so this is a follow-up if analysts actually
  need distinct tool types side by side.
- **Orphan cleanup on plot close** — we drop unsaved in-memory tabs
  on session change, but pruning orphan `ToolRunEvent`s from the
  log needs a new `LogService.deleteEntry` (out of scope for this
  feature).

## Links

- [Feature spec](https://github.com/debrief/debrief-future/blob/main/specs/178-vscode-tabular-results/spec.md)
- [Implementation plan](https://github.com/debrief/debrief-future/blob/main/specs/178-vscode-tabular-results/plan.md)
- [ChartPanelWrapper Storybook (unchanged)](https://debrief.github.io/debrief-future/storybook/?path=/story/panels-chartpanelwrapper--default)
