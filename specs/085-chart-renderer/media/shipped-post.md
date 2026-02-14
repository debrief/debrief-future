---
layout: future-post
title: "Shipped: Chart Renderer + Dataset Transformer"
date: 2026-02-13
track: [credibility]
author: Ian
reading_time: 3
tags: [tracer-bullet, chart-renderer, vega-lite, shared-components]
excerpt: "React component wraps Vega-Lite charts with theme integration, plus a registry-based transformer that converts tool datasets to specs."
---

## What We Built

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
