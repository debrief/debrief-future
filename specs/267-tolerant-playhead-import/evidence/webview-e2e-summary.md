# Web-shell E2E summary — tolerant playhead import (spec 267)

**Runner:** Playwright via `apps/web-shell/run-playwright.mjs` (bundled
`@sparticuz/chromium`, cloud session). **Spec:**
`apps/web-shell/playwright/tests/playhead-clamp.spec.ts`. **Result: 2 passed.**

```
Running 2 tests using 1 worker
  ✓  US1: an orphaned playhead opens, clamps to the window edge, and notifies (2.2s)
  ✓  US2: an incoherent window (start>end) still fails to open (guard rail) (1.5s)
  2 passed (6.4s)
```

## Scenario 1 — tolerant path (US1)

A FeatureCollection whose temporal `SystemState.current_time` is **after**
`end_time` is opened via the fresh-store transfer hook. Asserted:

- the plot **opens** (analysis view + `.leaflet-container` render);
- **no** `plot-load-error-banner` (no hard fail);
- a **non-blocking** toast (`[data-testid="playhead-clamp-toast"]`) reports the
  saved time-cursor was outside the time range and was moved to the **window end**;
- the store `currentTime` equals `Date.parse(end_time)` (clamped to the edge).

Screenshot: `evidence/screenshots/playhead-clamp-toast.png` — opened plot with
the amber clamp toast above the workspace.

## Scenario 2 — guard rail (US2)

A FeatureCollection with `start_time > end_time` is opened. Asserted:

- the plot does **NOT** open;
- the structured error surface (`plot-load-error-banner`) shows with
  `data-error-code="cross-field-invariant"` and names `state.temporal`.

Screenshot: `evidence/screenshots/incoherent-window-blocked.png` — the red
cross-field-invariant banner over the catalog (plot did not open).

## Notes

- The clamp notice is an **always-visible** App-level toast, not the LogPanel
  `actionResultMessage` transient: that surface is tab-gated and does not render
  a notice set while the Log tab is unmounted (the load-time case). See the
  contract delta Δ5 deviation note.
- Both scenarios drive the same shared `hydrateStoreFromFeatures` load path, so
  the web-shell result corroborates the VS Code unit coverage (SC-007).
