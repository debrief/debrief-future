Shipped a chart renderer that proves a point: analysis tools shouldn't care about rendering libraries.

We built a React component wrapping Vega-Lite, plus a registry-based transformer that converts standard dataset JSON into chart specs. Tools produce `{ type, title, data }` — the transformer handles the rest. Only 7 files in the codebase reference Vega-Lite. Swapping to a different chart library means replacing one 200-line transformer, not touching the tools.

Right now we support bar charts (zone histograms) and line charts (range/bearing series). Charts automatically adapt to light/dark/VS Code themes via CSS custom properties. All rendering happens in under 100ms, tested with 10K-point datasets.

The renderer is done. Next step: wire it into the VS Code extension so analysts can see their tool results as charts, not raw JSON.

[Read the full post](https://debrief.github.io/)

#FutureDebrief #DataVisualization #OpenSource
