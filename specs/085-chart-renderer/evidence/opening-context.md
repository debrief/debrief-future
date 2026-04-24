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
