# Research: Chart Renderer + Dataset-to-Spec Transformer

**Feature**: 085-chart-renderer
**Date**: 2026-02-13

## R1: Rendering Library Selection

**Decision**: Vega-Lite 5.x with vega-embed for rendering

**Rationale**:
- Vega-Lite is schema-first (JSON specs), aligning with the project's schema-first philosophy
- Declarative: chart type, axes, encodings, and data are all described in a single JSON object — no imperative rendering code
- The transformer produces Vega-Lite `TopLevelSpec` objects; the chart renderer passes them to `vega-embed` which handles Canvas/SVG rendering
- No `eval()` usage — compatible with VS Code webview Content Security Policy (`script-src ${cspSource}`, no `unsafe-eval`)
- Works fully offline once bundled — no runtime network requests
- Supports bar, line, scatter, and many other chart types with the same spec schema

**Alternatives considered**:
- **Observable Plot**: Lighter weight (~90KB vs ~300KB gzipped), but less mature ecosystem. No JSON spec format — requires JavaScript function calls, making the transformer more complex and less portable.
- **ECharts**: Full-featured but heavyweight (~400KB gzipped). JSON-configurable but the option schema is complex and tightly coupled — swapping would be harder.
- **Chart.js**: Popular and lightweight, but imperative API. No declarative spec format to serve as the transformer output.
- **D3.js**: Maximum flexibility but extremely low-level. Would require building chart types from scratch.

**Bundle size mitigation**: Vega-Lite + Vega + vega-embed total ~300KB gzipped. This is acceptable for a dedicated results panel. The chart renderer is a separate esbuild entry point, so the cost is only paid when the results view is loaded.

## R2: Transformer Architecture

**Decision**: Registry-based transformer with one mapping function per dataset type

**Rationale**:
- Each dataset type (e.g., `dataset/zone_histogram`) has a dedicated mapping function that converts the standard dataset JSON into a Vega-Lite `TopLevelSpec`
- New dataset types are added by registering a new mapping function — no modification to existing code
- The registry pattern allows type-safe lookup: `transformerRegistry.get(datasetType)` returns the mapping function or `undefined` for unsupported types
- The transformer module is the **sole location** that imports `vega-lite` types — enforcing the isolation boundary (FR-008)

**Alternatives considered**:
- **Single function with switch/case**: Simpler initially but becomes unwieldy as dataset types grow. Violates open/closed principle.
- **Convention-based file lookup**: Auto-discovers mapping functions by file naming convention. Too implicit — harder to verify exhaustive coverage in tests.

## R3: Dataset JSON Schema Design

**Decision**: Standard envelope with type discriminator and typed payload

**Rationale**:
- Every dataset artifact follows a common envelope: `{ type, title, metadata, data }` where `type` is the dataset subtype string and `data` is the type-specific payload
- This aligns with the existing `tool-result.yaml` annotation pattern where `debrief:resultType` identifies the result type
- The envelope provides consistent metadata (title, axis labels, units, series names) that the transformer extracts for Vega-Lite encoding
- Type-specific payloads allow each dataset type to define its own data shape without a one-size-fits-all structure

**Schema for `dataset/zone_histogram`**:
```json
{
  "type": "zone_histogram",
  "title": "Buffer Zone Point Distribution",
  "metadata": {
    "xAxis": { "label": "Zone", "type": "nominal" },
    "yAxis": { "label": "Count", "type": "quantitative", "units": "points" }
  },
  "data": [
    { "zone": "Zone A (0-5 nm)", "count": 42 },
    { "zone": "Zone B (5-10 nm)", "count": 17 },
    { "zone": "Zone C (10-15 nm)", "count": 8 }
  ]
}
```

**Schema for `dataset/range_bearing_series`**:
```json
{
  "type": "range_bearing_series",
  "title": "Range and Bearing over Time",
  "metadata": {
    "xAxis": { "label": "Time", "type": "temporal" },
    "yAxis": { "label": "Range", "type": "quantitative", "units": "nm" }
  },
  "series": [
    {
      "name": "Track A → Track B",
      "data": [
        { "time": "2024-01-15T10:00:00Z", "value": 12.5 },
        { "time": "2024-01-15T10:05:00Z", "value": 11.8 },
        { "time": "2024-01-15T10:10:00Z", "value": 10.2 }
      ]
    }
  ]
}
```

**Alternatives considered**:
- **Flat array-of-records**: Simpler but loses metadata context. The transformer would need to infer axis labels and types from data, which is fragile.
- **Vega-Lite inline data format**: Couples the dataset to the rendering library, violating the isolation boundary.

## R4: Chart Renderer Component API

**Decision**: Single `<ChartRenderer>` React component accepting a Vega-Lite spec

**Rationale**:
- Props: `spec: TopLevelSpec | null`, `className?: string`, `onError?: (error: Error) => void`
- Internally wraps `vega-embed` with React lifecycle management (embed on mount/spec change, dispose on unmount)
- Handles error states internally (shows error UI for null/invalid specs)
- Handles empty data detection (shows "No data available" message)
- No knowledge of dataset types — only consumes the Vega-Lite spec
- The component is published from `shared/components/` and consumed by any frontend

**Alternatives considered**:
- **Multiple chart components** (BarChart, LineChart, etc.): Unnecessary because Vega-Lite handles chart type selection declaratively in the spec. Multiple components would duplicate error handling and lifecycle logic.
- **Render function pattern**: More flexible but less ergonomic for the common case. A simple component with a spec prop covers all use cases.

## R5: VS Code Webview CSP Compatibility

**Decision**: Vega-Lite renders via Canvas/SVG within existing CSP policy — no CSP changes required

**Rationale**:
- Current VS Code webview CSP: `default-src 'none'; script-src ${cspSource}; style-src ${cspSource} 'unsafe-inline'; img-src ${cspSource} data: https:`
- Vega-Lite does NOT use `eval()` or `new Function()` — compatible with the absence of `unsafe-eval`
- Vega-embed renders to `<canvas>` or `<svg>` elements — both work within `default-src 'none'`
- Inline styles used by Vega for positioning are covered by `'unsafe-inline'` in `style-src`
- Data URLs for SVG export (if needed later) are covered by `img-src data:`
- **Vega-embed configuration**: Set `actions: false` to disable the built-in export menu (which would try to fetch external resources), and `renderer: 'canvas'` for performance

## R6: Integration with Existing Build System

**Decision**: Add Vega-Lite as a dependency of `@debrief/components` with a separate Vite entry point

**Rationale**:
- The shared components library (`shared/components/`) uses Vite for building and already has multi-entry build configuration
- Add a new entry point `./ChartRenderer` (alongside existing `./MapView`, `./Timeline`, etc.) to keep the chart rendering bundle separate from core components
- This means consumers that don't need charts don't pay the ~300KB bundle cost
- Vega-Lite, Vega, and vega-embed are production dependencies of `@debrief/components` but tree-shaken away from other entry points
- The transformer module is also exported from this entry point: `import { transformDataset, ChartRenderer } from '@debrief/components/ChartRenderer'`

**Alternatives considered**:
- **Separate package** (`@debrief/chart-renderer`): More isolation but adds workspace overhead. The shared components library already handles multi-entry builds and theming integration.
- **Bundle in VS Code extension only**: Prevents Storybook and other frontends from using the component. Violates the shared component principle.

## R7: Storybook Development Strategy

**Decision**: Storybook stories with fixture datasets covering all chart types and edge cases

**Rationale**:
- Stories are organized by chart type: Bar Chart, Line Chart, Scatter Plot
- Additional stories for edge cases: Empty Dataset, Large Dataset, Malformed Input, Missing Values
- Stories use the full pipeline: fixture JSON → transformer → Vega-Lite spec → ChartRenderer component
- This validates the entire data flow in isolation, without the VS Code extension
- Fixtures live in `shared/components/src/ChartRenderer/fixtures/` alongside the stories
- All three theme variants (light, dark, vscode) are testable via the existing Storybook theme toolbar

## R8: Error Handling Strategy

**Decision**: Three-tier error handling — transformer validation, renderer error boundary, empty state detection

**Rationale**:
1. **Transformer validation**: Before converting, validate the dataset against the expected schema for its type. Return a structured error `{ type: 'unsupported_type' | 'invalid_schema' | 'empty_data', message: string, details?: object }` for any failure.
2. **Renderer error boundary**: The ChartRenderer component wraps vega-embed in a React error boundary. If Vega-Lite fails to render (e.g., malformed spec), the error is caught and displayed as user-friendly text within the chart area.
3. **Empty state detection**: If the dataset's data array has zero items, the transformer produces a special "empty" indicator rather than a valid spec. The ChartRenderer displays "No data available" with the chart title and axis labels still shown for context.

**Alternatives considered**:
- **Let Vega-Lite handle all errors**: Vega-Lite's error messages are developer-focused, not user-friendly. Pre-validation in the transformer provides better UX.
- **Global error handler**: Too broad — chart errors should be contained within the chart area, not affect the entire panel.

## R9: Theming Integration

**Decision**: Apply Debrief design tokens to Vega-Lite via the `config` property of the spec

**Rationale**:
- Vega-Lite specs support a top-level `config` object that controls default colours, fonts, axis styling, etc.
- The transformer reads Debrief CSS custom properties (via `getComputedStyle`) and maps them to Vega-Lite config values: background colour, text colour, axis colours, grid colours, mark colours
- This ensures charts match the current theme (light/dark/vscode) automatically
- The `config` is merged into every spec produced by the transformer, providing consistent styling across all chart types

**Alternatives considered**:
- **CSS overrides on SVG/Canvas container**: Limited control — can't style individual chart elements like axis labels or grid lines.
- **Hard-coded theme configs**: Wouldn't respond to theme changes. The dynamic approach reads current CSS properties at transform time.
