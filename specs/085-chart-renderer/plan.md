# Implementation Plan: Chart Renderer + Dataset-to-Spec Transformer

**Branch**: `085-chart-renderer` | **Date**: 2026-02-13 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/085-chart-renderer/spec.md`

## Summary

Build a shared React chart renderer component and a dataset-to-spec transformer that converts standard tool result datasets into Vega-Lite specs. The transformer is a registry-based module where each dataset type (e.g., `zone_histogram`, `range_bearing_series`) has a dedicated mapping function producing a Vega-Lite `TopLevelSpec`. The `ChartRenderer` component wraps `vega-embed` with React lifecycle management, error boundaries, and empty state handling. Both are published as a new entry point (`@debrief/components/ChartRenderer`) in the shared components library, with Storybook stories for all chart types and edge cases. Vega-Lite is isolated to this module only — no other code in the repository imports it.

## Technical Context

**Language/Version**: TypeScript 5.x (shared components library)
**Primary Dependencies**: Vega-Lite 5.x, Vega 5.x, vega-embed 6.x, React 18.x (peer)
**Storage**: N/A (stateless — consumes dataset JSON, produces rendered charts)
**Testing**: Vitest (unit tests for transformer), Playwright (E2E tests for rendered charts in Storybook)
**Target Platform**: Browser (VS Code webview, Storybook, any React host)
**Project Type**: Library module within existing pnpm monorepo
**Performance Goals**: Charts render within 2 seconds for datasets up to 10,000 data points
**Constraints**: Offline-only (no network requests), VS Code webview CSP compatible (no eval), rendering library isolated to transformer + renderer only
**Scale/Scope**: 2 dataset types at launch (zone_histogram, range_bearing_series), 3 chart types (bar, line, scatter), extensible via registry

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Gate | Status | Notes |
|---------|------|--------|-------|
| I. Defence-Grade Reliability | Offline by default | PASS | Vega-Lite fully bundled, no runtime network requests (FR-010) |
| I. Defence-Grade Reliability | No silent failures | PASS | Three-tier error handling: transformer validation, React error boundary, empty state detection (FR-006, FR-007) |
| II. Schema Integrity | Schema tests mandatory | PASS | Dataset envelope JSON Schema defined in contracts/. Fixtures validate round-trip. |
| III. Data Sovereignty | Provenance always | N/A | Chart renderer is read-only — displays data, does not transform or persist it. Provenance is handled by the tool that produces the dataset. |
| IV. Architectural Boundaries | Services never touch UI | PASS | Chart renderer is a shared UI component. The transformer is a pure function (data in → spec out) with no service or persistence coupling. |
| IV. Architectural Boundaries | Frontends never persist | PASS | Chart renderer only renders — no file writes. |
| V. Extensibility | Fail-safe loading | PASS | ChartRenderer wraps vega-embed in an error boundary. A rendering failure shows an error message, not a crash. |
| VI. Testing | Unit tests required | PASS | Transformer mapping functions tested with fixture datasets. ChartRenderer tested with Vitest + Playwright E2E. |
| VII. Test-Driven AI | Tests before implementation | PASS | Fixture datasets and expected outputs defined before implementation. |
| VIII. Documentation | Specs before code | PASS | This plan + spec.md complete before implementation. |
| IX. Dependencies | Minimal, justified | PASS | Vega-Lite is the only new dependency — justified as the declarative charting library selected per E04 epic decision. Isolated behind transformer boundary. |
| X. Security | No secrets in code | PASS | No credentials involved. |
| XI. Internationalisation | I18N from the start | PASS | Axis labels, titles, and series names are data-driven (from dataset metadata). Locale-aware number formatting delegated to Vega-Lite's built-in format support. |

**Post-Phase-1 re-check**: All gates still PASS. No violations introduced by design decisions.

## Project Structure

### Documentation (this feature)

```text
specs/085-chart-renderer/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 research decisions
├── data-model.md        # Entity definitions
├── quickstart.md        # Developer getting-started guide
├── contracts/
│   ├── dataset-envelope.schema.json      # Base dataset JSON Schema
│   ├── zone-histogram.schema.json        # zone_histogram type schema
│   ├── range-bearing-series.schema.json  # range_bearing_series type schema
│   └── transformer-error.schema.json     # Error response schema
├── checklists/
│   └── requirements.md  # Specification quality checklist
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
shared/components/
├── src/
│   ├── ChartRenderer/
│   │   ├── index.ts                          # Public exports
│   │   ├── ChartRenderer.tsx                 # React component wrapping vega-embed
│   │   ├── ChartRenderer.stories.tsx         # Storybook stories (all chart types + edge cases)
│   │   ├── ChartRenderer.test.tsx            # Vitest unit tests
│   │   ├── types.ts                          # DatasetEnvelope, ChartRendererProps types
│   │   ├── transformer/
│   │   │   ├── index.ts                      # transformDataset() entry + registry
│   │   │   ├── registry.ts                   # TransformerRegistry class
│   │   │   ├── types.ts                      # TransformerError, TransformResult types
│   │   │   ├── theme.ts                      # CSS tokens → Vega-Lite config mapping
│   │   │   ├── mappings/
│   │   │   │   ├── index.ts                  # Registers all built-in mappings
│   │   │   │   ├── zoneHistogram.ts          # zone_histogram → bar chart
│   │   │   │   └── rangeBearingSeries.ts     # range_bearing_series → line chart
│   │   │   └── mappings.test.ts              # Unit tests for each mapping function
│   │   └── fixtures/
│   │       ├── zone-histogram.json           # Valid zone_histogram dataset
│   │       ├── range-bearing-series.json     # Valid range_bearing_series dataset
│   │       ├── empty-dataset.json            # Dataset with zero data points
│   │       └── malformed-dataset.json        # Invalid structure for error testing
│   └── index.ts                              # Add ChartRenderer re-export
├── vite.config.ts                            # Add ChartRenderer entry point
├── package.json                              # Add vega, vega-lite, vega-embed deps
└── e2e/
    └── ChartRenderer.spec.ts                 # Playwright E2E tests
```

**Structure Decision**: The ChartRenderer is a new module within the existing `shared/components/` library, following the established pattern (same as MapView, TimeController, etc.). A separate entry point in the Vite build ensures consumers that don't need charts don't pay the bundle cost. No new workspace packages are created.

## Media Components

| Component | Story Source | Bundle Name | Purpose |
|-----------|--------------|-------------|---------|
| ChartRenderer | `shared/components/src/ChartRenderer/ChartRenderer.stories.tsx` | `chart-renderer.js` | Demonstrates bar charts, line charts, and edge case handling for result datasets |

**Inclusion Criteria Applied**:
- [x] New visual component
- [x] Significant visual change
- [x] Interactive demo adds narrative value

**Bundleability Verified**:
- [x] Stories exist in Storybook (will be created as part of implementation)
- [x] Components render standalone (no app context required — only needs a Vega-Lite spec)
- [x] Reasonable bundle size expected (< 500KB — Vega-Lite + Vega + vega-embed ~300KB gzipped)

**Storybook Link**: `https://debrief.github.io/debrief-future/storybook/?path=/story/components-chartrenderer`

## Storybook E2E Testing

| Story | Test Coverage | Theme Variants | Interactions |
|-------|--------------|----------------|--------------|
| `ChartRenderer.stories.tsx` — BarChart | Rendering, data accuracy, axis labels | light, dark, vscode | hover (tooltip) |
| `ChartRenderer.stories.tsx` — LineChart | Rendering, multi-series, temporal axis | light, dark, vscode | hover (tooltip) |
| `ChartRenderer.stories.tsx` — EmptyState | Empty message displayed, axes visible | light, dark, vscode | none |
| `ChartRenderer.stories.tsx` — ErrorState | Error message displayed, no crash | light, dark, vscode | none |

**Testing Strategy**:
- [x] Component renders correctly in all theme variants
- [x] Interactive elements respond to user input
- [x] Accessibility attributes present (data-testid, aria-*)
- [x] Screenshots captured for evidence

**Test File Location**: `shared/components/e2e/ChartRenderer.spec.ts`

**Theme Variant URLs** (for Storybook):
```
/iframe.html?id=components-chartrenderer--bar-chart&globals=theme:light
/iframe.html?id=components-chartrenderer--bar-chart&globals=theme:dark
/iframe.html?id=components-chartrenderer--bar-chart&globals=theme:vscode
/iframe.html?id=components-chartrenderer--line-chart&globals=theme:light
/iframe.html?id=components-chartrenderer--empty-state&globals=theme:light
/iframe.html?id=components-chartrenderer--error-state&globals=theme:light
```

## Complexity Tracking

No constitution violations — this section is intentionally empty.
