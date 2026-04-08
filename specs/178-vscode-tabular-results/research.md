# Phase 0: Research — Tabular Results Panel (VS Code Extension)

**Feature**: 178-vscode-tabular-results
**Date**: 2026-04-07
**Companion to**: `spec.md`

This document resolves the open questions raised in the source SRD (`docs/tabular-results-vscode-integration-srd.md` §10) and the design decisions implied by spec.md FR-015 / FR-022. Each section follows the **Decision / Rationale / Alternatives** format.

---

## R1. Results Panel placement: WebviewView vs. WebviewPanel

**Decision**: Use a `WebviewView` registered into the VS Code **panel area** (the same horizontal strip that hosts Terminal / Output / Problems), via a new `viewsContainers.panel` contribution and a `WebviewViewProvider`.

**Rationale**:
- Matches VS Code's idiomatic "tabular tool output beneath the editor" placement (Test Explorer Output, Vitest results, Python Test Output all live there).
- The panel area is horizontally docked beneath the editor, giving us the spatial equivalent of the web-shell's "70/30 split" without inventing a custom layout system.
- VS Code persists the panel area's collapsed/expanded state automatically (FR-005 — "roughly 70/30 when first shown" maps to "show & focus the new view container on first result").
- A `WebviewView` is the same construct already used for `ActivityPanelViewProvider`, `LogPanelViewProvider`, and `LayersView`. The bundling, CSP, and message-passing patterns are proven.
- The user can drag the view between the panel area and the secondary side bar themselves if they prefer a spatial layout — VS Code handles that transparently.

**Alternatives considered**:
- **Editor-area `WebviewPanel` beside the map** — Would more closely mirror the web-shell's "below map" layout, but conflicts with the existing custom editor (`MapPanel`) which already owns the editor area for the active plot. Splitting the editor pane with a sibling webview is fragile across multi-plot tab states.
- **Sidebar `WebviewView`** — Sidebars are vertical and narrow; tables and Vega-Lite charts need horizontal room.
- **A new custom editor type** — Heavy: requires document URI handling, dirty state, save commands, and conflicts with the existing map editor for the same plot URI.

**Resolves**: SRD Open Questions #1 (Open action — see R3) and #3 (panel placement).

---

## R2. Webview bundling

**Decision**: Add a new entry to the existing `apps/vscode/src/webview/web/` esbuild bundling pipeline (alongside `mapView.tsx`, `activityPanel.tsx`, `logPanel.tsx`). The new entry is `apps/vscode/src/webview/web/resultsPanel.tsx`, producing `dist/webview/resultsPanel.js`. Reuse the same CSP template (`default-src 'none'; script-src 'nonce-…'; style-src ${cspSource} 'unsafe-inline'`).

**Rationale**:
- The bundler is already configured for React 18 + TypeScript and emits VS Code-CSP-compatible single-file bundles. Extending the entrypoint list is a one-line change.
- Sharing the bundler keeps `pnpm build` and `pnpm dev` workflows uniform across all webviews.
- A separate Vite or Rollup pipeline would fragment the build and force a second watch process.

**Alternatives considered**:
- **Separate Vite pipeline** — Rejected: duplicates infrastructure and complicates CI.
- **Inline `<script>` IIFE** — Rejected: React + Vega-Lite + `@debrief/components` are too large for inline.

**Resolves**: SRD Open Question #4.

---

## R3. "Open" action behaviour for saved CSVs

**Decision**: **Reopen the saved CSV as a new tab in the Results panel.** Implement a CSV → flat-rows parser (`parseCsvToTableDataset`) in `shared/utils/src/csv.ts` (alongside the existing `buildCsvContent`) that round-trips the file back into a `DatasetEnvelope { displayHint: 'table' }`.

**Rationale**:
- Symmetric with the web-shell behaviour (already shipped in feature 177) — analysts get the same mental model in both apps.
- Reuses the existing `ChartPanelWrapper` + `TableRenderer` rendering path with no additional UI work.
- Already saved means the tab opens in `isSaved: true` state immediately — no extra provenance is created.
- A simple CSV parser (header + RFC-4180 quoted-string handling) is < 100 LOC and is the inverse of `buildCsvContent`. It is well-defined for the files we ourselves write.
- "Open With" remains available for users who *want* the raw editor (FR-017).

**Alternatives considered**:
- **Open in VS Code's text editor** — Simpler, but breaks parity with the web-shell and discards the table semantics on round-trip.
- **Open in a built-in CSV viewer extension** — Adds an unowned dependency.

**Risk**: CSV round-trip is lossy for free-form text containing newlines that we *did not* quote. Mitigation: `formatCsvValue` already quotes such strings on write, so files we produce parse cleanly. Files edited externally fall back to a best-effort flat parse; if the parse fails the panel surfaces an error and the user can use Open With.

**Resolves**: SRD Open Question #1.

---

## R4. Multi-panel side-by-side layout (FR-022)

**Decision**: **Defer.** The Results panel ships as a single `WebviewView` that holds all tabs. Side-by-side layout for distinct tool types is explicitly out of scope for this feature and is captured as a follow-up (`backlog.md` candidate: "Tabular Results: side-by-side panels for distinct tool types").

**Rationale**:
- VS Code's `viewsContainers.panel` does not support arbitrary horizontal splits within a single container the way GoldenLayout does. Achieving it would require either:
  1. Multiple sibling `WebviewView` providers (one per tool type) registered dynamically — VS Code does not support dynamic view registration after activation, and pre-registering N "slots" feels like an anti-pattern.
  2. A single `WebviewView` whose internal React app implements its own split-pane layout (re-introducing GoldenLayout into VS Code) — explicitly excluded by SRD §8.
- The web-shell tab system already handles the common case ("multiple results from the same tool") via the existing `chartTabs` array. Distinct tool types are still visible — they just stack as tabs rather than splits.
- Spec marks FR-022 as **Optional**.

**Alternatives considered**:
- **Two pre-registered slot views** — Hard-coded N=2; awkward when N=1; capacity mismatch with the web-shell.
- **GoldenLayout in VS Code** — Explicit non-goal.

**Resolves**: SRD Open Question #2 and FR-022 deferral.

---

## R5. Cross-webview state coordination (lifecycle, plot open/close)

**Decision**: The **extension host is the single source of truth.** A new singleton `ResultsPanelService` (in `apps/vscode/src/services/resultsPanelService.ts`) holds the per-plot tab state and pushes diffs to the Results webview via `postMessage`. The webview is **stateless** apart from local UI bits (active tab, Save As form open). Plot lifecycle is communicated by the existing `SessionManager.onActiveSessionChange` observer.

**Rationale**:
- The `ActivityPanelViewProvider` already follows this pattern (it subscribes to `SessionManager` and pushes state into its webview); reusing the pattern avoids inventing a new event bus.
- A stateless webview is trivially restorable (VS Code may dispose & re-create the view at any time when the panel area is collapsed); the host can replay the current state on `webviewReady`.
- Cleanup-on-plot-close (FR-021) becomes a single host-side subscription handler.

**Alternatives considered**:
- **Shared event bus inside the webview** — Rejected: requires every webview to be alive at once and breaks under VS Code's webview disposal lifecycle.
- **Webview as source of truth** — Rejected: state lost on view collapse.

**Resolves**: SRD Open Question #5.

---

## R6. `synthesizeTableDataset` extraction

**Decision**: Extract the table-from-statistics synthesizer currently embedded in `apps/web-shell/src/mocks/calcService.ts` (lines ~478–504) into a new shared utility:

```text
shared/utils/src/datasetSynthesis.ts
  export function synthesizeTableDataset(
    toolId: string,
    properties: Record<string, unknown>,
    sourceLabel: string,
  ): DatasetEnvelope | null
```

Both `apps/web-shell/src/mocks/calcService.ts` and `apps/vscode/src/services/resultsPanelService.ts` consume the same export. The web-shell call site is refactored as part of this feature so neither side forks the logic (NFR-1 / FR-025 / SC-006).

**Rationale**:
- Spec FR-003 explicitly requires the VS Code path to match the web-shell synthesizer "matching the web-shell's behaviour". The only way to keep them in lock-step is to share one function.
- The synthesizer has a pure-function signature — no I/O, no React, no VS Code API — which makes it a clean fit for `shared/utils`.

**Alternatives considered**:
- **Copy-paste** — Forbidden by NFR-1.
- **Re-export from `@debrief/components`** — Rejected: it's a data utility, not a component.

---

## R7. `FileSavedEvent` provenance integration

**Decision**: Add a new method `recordFileSaved` to the `LogService` interface (and implementation in `services/session-state/src/log/logService.ts`) that appends a lightweight log entry of type `file_saved` linked to an existing `activity_id`. The entry's `was_generated_by.tool` is inherited from the originating `ToolRunEvent` and the saved filename is recorded in `generated`.

**Schema sketch** (inline; no LinkML changes required for the wire-format additive field):

```ts
recordFileSaved(
  storePath: string,
  itemPath: string,
  parentActivityId: string,    // the ToolRunEvent's activity_id
  filename: string,            // assets/<csv>
  timestamp: string,           // ISO
): Promise<{ activity_id: string }>;
```

The cleanup-on-close routine (FR-021) walks the timeline for the closing plot, finds every `ToolRunEvent` whose `activity_id` is **not** referenced by any `FileSavedEvent.parent_activity_id`, and removes it via the existing `deleteEntry` path (or, if simpler, marks it `deleted: true`).

**Rationale**:
- LinkML schema allows additive fields under XIV (Pre-Release Freedom) without a version bump.
- Reuses the existing `LogEntry` envelope; no new top-level type.
- The "orphan tool runs" concept is already a known pattern from the web-shell side.

**Alternatives considered**:
- **A separate `saved_files` collection on the STAC item** — Splits provenance across two stores; harder to query.
- **Inline `saved_files` array on the `ToolRunEvent`** — Mutates an immutable provenance entry, violating Article III.

---

## R8. Storybook story for `ChartPanelWrapper` in VS Code theme

**Decision**: No new Storybook story is needed. `ChartPanelWrapper.stories.tsx` already exists from feature 177 with `light`, `dark`, and `vscode` theme variants. The VS Code-side work is integration plumbing only — no new visual component.

**Rationale**: Spec FR-025 mandates reuse without forking, so we explicitly do **not** create a `VsCodeChartPanelWrapper`.

---

## R9. E2E testing strategy

**Decision**: Add new Playwright tests under `tests/e2e/` (the real VS Code webview suite, not the web-shell suite). The tests mirror the web-shell tests in `apps/web-shell/playwright/tests/tabular-results-save.spec.ts` and `result-file-actions.spec.ts` but exercise the extension host through code-server. Use the existing webview-injection helper (`tests/e2e/helpers/webview-injector.ts`) to wait for the Results panel webview to mount, then reach into it via `frameLocator` chaining.

**Rationale**:
- The CLAUDE.md notes Playwright works in cloud sessions via `@sparticuz/chromium`.
- Reusing the existing patterns from `tests/e2e/test-*.spec.ts` keeps CI green.

---

## Open items resolved

| SRD Open Question | Resolution | Reference |
|-------------------|------------|-----------|
| #1 Open action behaviour | Reopen as Results panel tab via CSV parser | R3 |
| #2 Multi-panel support | Deferred — backlog item | R4 |
| #3 Panel placement | `WebviewView` in panel area | R1 |
| #4 Webview bundling | Reuse existing `webview/web/` esbuild pipeline | R2 |
| #5 Cross-webview state | Extension host = source of truth, stateless webview | R5 |

All NEEDS CLARIFICATION markers from spec.md were already 0 at end of `/speckit.specify`. Phase 1 may proceed.
