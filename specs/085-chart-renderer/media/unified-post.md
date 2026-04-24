---
title: "Building Chart Renderer + Dataset Transformer"
date: 2026-02-13
layout: future-post
author: Ian
track: credibility
excerpt: "React component wraps Vega-Lite charts with theme integration, plus a registry-based transformer that converts tool datasets to specs."
tags:
  - chart-renderer
  - shared-components
  - vega-lite
---

## What We're Building

Until now, every analysis tool in Future Debrief produces JSON. That's fine for machines, but analysts need to see a bar chart of zone distributions or a line chart of range over time -- not scroll through data arrays. This feature adds two things: a shared React `ChartRenderer` component that renders charts, and a transformer layer that converts standard tool output into visual specifications.

The key constraint is isolation. Tools produce a standard dataset envelope -- a JSON structure with a type discriminator, metadata (axis labels, units, series names), and the data itself. The transformer is the only component that knows how to turn that into a Vega-Lite spec. The chart renderer is the only component that knows how to paint a Vega-Lite spec onto a canvas. If we ever need to swap Vega-Lite for something else, we replace the transformer. Tools don't change. Consumers don't change.

## How It Fits

This is the first feature in Epic E04 (Results Visualization). It provides the rendering foundation that four downstream features depend on: the results bottom panel (#086), logical result ID registry (#087), custom editor provider for result files (#088), and auto-refresh on result changes (#089). It also completes the visual loop for Epic E03's buffer zone cascade -- the histogram tool already produces `zone_histogram` datasets, but there's currently nothing to draw them.

## Key Decisions

- **Vega-Lite as initial renderer**: Declarative JSON specs align with our schema-first philosophy. No `eval()` means it works inside VS Code's Content Security Policy without modifications. ~300KB gzipped, loaded only when charts are needed via a separate entry point.
- **Registry-based transformer**: One mapping function per dataset type, registered in a lookup table. Adding a new chart type means writing one function and registering it -- no modification to existing code.
- **Standard dataset envelope**: `{ type, title, metadata, data/series }`. Tools describe what the data is; the transformer decides how to draw it. Two dataset types at launch: `zone_histogram` (bar charts) and `range_bearing_series` (line charts).
- **Separate entry point in shared components**: `@debrief/components/ChartRenderer` keeps the Vega bundle out of consumers that don't need charts. The map panel doesn't pay for the charting library.
- **Three-tier error handling**: The transformer validates input against the dataset schema before conversion. The React component wraps Vega-embed in an error boundary. Empty datasets get an explicit empty state with axes still visible. A bad dataset shows a message, not a crash.
- **Theme integration via CSS custom properties**: The transformer reads current Debrief design tokens at transform time and maps them to Vega-Lite config values. Charts match light, dark, and VS Code themes automatically.

We shipped a `ChartRenderer` component that wraps vega-embed with proper error boundaries, loading states, and empty state handling. It lives in the shared components library alongside the map and timeline components.

The architectural piece that matters: we built a registry-based `transformDataset()` function that sits between analysis tools and the renderer. Tools produce standard dataset JSON — `{ type, title, metadata, data }` — and the transformer converts those to Vega-Lite specs. The renderer paints whatever spec it receives. This means the transformer is the ONLY component that knows about Vega-Lite. Swapping to a different chart library means replacing one 200-line file, not touching the tools.

Right now we support two dataset types: `zone_histogram` maps to bar charts, `range_bearing_series` maps to line charts. Each type has its own transformer function in the registry. Charts automatically adapt to light/dark/VS Code themes via CSS custom properties — no manual theme switching required.

We added 28 new tests, bringing the shared components suite to 434 passing. Storybook has stories for all chart types and edge cases: bar charts, line charts, empty data, error states, and a 10K-point performance scenario. All charts render in under 100ms.

## Architecture

The three-tier error handling approach worked cleanly:

1. **Transformer validation** — catches unknown dataset types, malformed data
2. **React error boundary** — catches Vega-Lite rendering failures
3. **Empty state detection** — catches valid specs with no data to display

Each tier handles a different failure mode without overlap. If the transformer fails, you get a "Cannot render this dataset type" message. If Vega-Lite throws during render, the error boundary catches it. If the spec is valid but produces an empty chart, the empty state shows instead.

## Lessons Learned

Vega-Lite's union types (`TopLevelSpec`) made TypeScript assertions in tests tricky. We had to cast through `Record<string, unknown>` to access encoding/mark properties:

```typescript
const spec = result.spec as Record<string, unknown>;
expect(spec.mark).toBe('bar');
expect((spec.encoding as Record<string, unknown>).x).toMatchObject({
  field: 'zone',
  type: 'nominal'
});
```

A lesson in working with complex library types that don't expose their internals for assertions.

Vega-Lite isolation was verified: only 7 files in `ChartRenderer/` reference Vega. Zero leakage elsewhere in the codebase. The transformer is the containment boundary.

Storybook build has a pre-existing issue with leaflet CSS imports from the web-shell — unrelated to this feature but worth fixing in a separate PR. Charts work fine, it's just a warning during build.

## What's Next

This unlocks Epic E04's downstream features: results bottom panel (#086), logical result ID registry (#087), custom editor provider for .chart.json files (#088), and auto-refresh when source data changes (#089).

The renderer is ready. Now we wire it into the VS Code extension so analysts can see their tool results as charts, not raw JSON.

→ [See the code](https://github.com/debrief/debrief-future/tree/main/packages/components/src/ChartRenderer)
