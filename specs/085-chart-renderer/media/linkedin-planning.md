Every analysis tool in Future Debrief produces structured JSON datasets. The missing piece: turning those datasets into charts analysts can actually read.

This week I'm building a shared chart renderer and a transformer layer that sits between tool output and rendering. Tools describe what the data is (axis labels, units, series names) in a standard envelope. The transformer decides how to draw it. Only the transformer knows about the rendering library -- so if we swap Vega-Lite for something else later, zero tool code changes.

Two chart types at launch: bar charts for zone histograms, line charts for range-bearing time series. The component lives in our shared library with a separate entry point, so consumers that don't need charts don't pay the bundle cost.

https://debrief.github.io/blog/2026/02/13/planning-chart-renderer-and-dataset-transformer

#FutureDebrief #MaritimeAnalysis #OpenSource
