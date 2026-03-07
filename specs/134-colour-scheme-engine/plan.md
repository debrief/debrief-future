# Implementation Plan: Colour Scheme Engine with Legend

**Branch**: `134-colour-scheme-engine` | **Date**: 2026-03-07 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/134-colour-scheme-engine/spec.md`

## Summary

Implement a headless colour engine module with two thin React components (selector, legend) that allows analysts to colour-code exercises by Age, Vessel Class, or Tag. The engine produces dual-format output: a pre-computed `ReadonlyMap<string, string>` for the map view (#130) and a `ColourFn` for the timeline view (#131). A shared legend component renders gradient bars for continuous dimensions and discrete swatches for categorical ones. The module lives in `shared/components/src/colour-engine/` alongside the existing `filter-engine/`.

## Technical Context

**Language/Version**: TypeScript 5.x (React 18.x component library)
**Primary Dependencies**: React 18.x (existing), `@debrief/components` (existing shared component library). No new external dependencies.
**Storage**: N/A — session-scoped state only (active dimension ID)
**Testing**: vitest (unit tests), Storybook (visual verification), Playwright (E2E screenshots)
**Target Platform**: VS Code webview, browser (Storybook)
**Project Type**: Shared component library (existing `shared/components/` workspace)
**Performance Goals**: Colour assignment computation < 50ms for 500 items; dimension switch visible within 500ms (SC-001)
**Constraints**: Zero external dependencies for colour logic (Art. IX); offline-capable (Art. I.1)
**Scale/Scope**: Up to 500 exercises, 12+ categorical colours, 3 built-in dimensions + extensibility

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Requirement | Status | Notes |
|---------|-------------|--------|-------|
| I.1 Offline by default | All core functionality works without network | PASS | Pure computation, no network calls |
| II.1 Single source of truth | LinkML schemas define data structures | PASS | Consumes existing `StacBrowserItem` from schema-derived types |
| III.1 Provenance | Every transformation records lineage | N/A | Display-only feature; no data transformation |
| IV.1 Services never touch UI | Python services return data only | PASS | This is a frontend component; no Python services involved |
| IV.2 Frontends never persist | All data writes go through services | PASS | No persistence; session-scoped state only |
| V.1 Fail-safe loading | Broken extension cannot crash core | PASS | colourFn wrapped in try/catch; fallback to default colour |
| VI.2 Services require unit tests | No service code without tests | PASS | Comprehensive unit tests for engine, palette, dimensions |
| VII.1 Tests before implementation | Define expected behaviour as tests first | PASS | Test-first approach per quickstart.md |
| VIII.1 Specs before code | Written specification exists | PASS | spec.md complete |
| IX.1 Minimal dependencies | Prefer standard library | PASS | Zero new external dependencies; palette hand-curated |
| XI.1 I18N from the start | User-facing strings externalisable | PASS | Dimension labels and legend text are data-driven, not hardcoded UI strings |
| XV.1 Explicit types everywhere | All values have concrete types | PASS | Full TypeScript strict mode; all interfaces defined in contracts |

**Post-design re-check**: All gates remain PASS. No violations to justify.

## Project Structure

### Documentation (this feature)

```text
specs/134-colour-scheme-engine/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── colour-engine.ts # TypeScript API contract
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
shared/components/src/colour-engine/
├── index.ts                    # Public API exports
├── types.ts                    # ColourDimension, LegendModel, ColourAssignment, etc.
├── palette.ts                  # Default 12-colour palette + gradient colour stops
├── engine.ts                   # computeColourAssignment, getDefaultColourAssignment
├── dimensions/
│   ├── index.ts                # Built-in dimension registry
│   ├── age.ts                  # Age dimension (gradient, resolves from datetime)
│   ├── vessel-class.ts         # Vessel Class dimension (categorical, resolves from vesselClasses[])
│   └── tag.ts                  # Tag dimension (categorical, resolves from tags[])
├── ColourDimensionSelector.tsx  # Dropdown selector component
├── ColourDimensionSelector.css
├── ColourLegend.tsx            # Legend component (gradient bar + categorical swatches)
├── ColourLegend.css
├── ColourLegend.stories.tsx    # Storybook stories for legend variants
├── ColourDimensionSelector.stories.tsx  # Storybook stories for selector
└── __tests__/
    ├── engine.test.ts          # Core computation tests
    ├── palette.test.ts         # Palette coverage and recycling tests
    ├── age.test.ts             # Age dimension resolve + gradient interpolation
    ├── vessel-class.test.ts    # Vessel class resolve + categorical mapping
    ├── tag.test.ts             # Tag resolve + categorical mapping
    ├── ColourLegend.test.tsx   # Legend rendering (gradient + categorical modes)
    └── ColourDimensionSelector.test.tsx  # Selector interaction tests
```

**Structure Decision**: Extends the existing `shared/components/` workspace. The `colour-engine/` module follows the same pattern as `filter-engine/` — a headless logic module with co-located React components.

## Media Components

| Component | Story Source | Bundle Name | Purpose |
|-----------|--------------|-------------|---------|
| ColourLegend | `shared/components/src/colour-engine/ColourLegend.stories.tsx` | `colour-legend.js` | Demonstrates gradient and categorical legend rendering |
| ColourDimensionSelector | `shared/components/src/colour-engine/ColourDimensionSelector.stories.tsx` | `colour-selector.js` | Shows dimension switching interaction |

**Inclusion Criteria Applied**:
- [x] New visual component
- [x] Significant visual change
- [x] Interactive demo adds narrative value

**Bundleability Verified**:
- [x] Stories exist in Storybook (will be created as part of implementation)
- [x] Components render standalone (no app context required — pure props)
- [x] Reasonable bundle size expected (< 500KB — no external dependencies)

**Storybook Links**:
- `https://debrief.github.io/debrief-future/storybook/?path=/story/colour-engine-colourlegend`
- `https://debrief.github.io/debrief-future/storybook/?path=/story/colour-engine-colourdimensionselector`

## Storybook E2E Testing

| Story | Test Coverage | Theme Variants | Interactions |
|-------|--------------|----------------|--------------|
| `ColourLegend.stories.tsx` | Rendering (gradient + categorical modes), accessibility | light, dark, vscode | None (display only) |
| `ColourDimensionSelector.stories.tsx` | Rendering, selection behaviour | light, dark, vscode | Click to open, select dimension |

**Testing Strategy**:
- [x] Component renders correctly in all theme variants
- [x] Interactive elements respond to user input (selector dropdown)
- [x] Accessibility attributes present (data-testid, aria-*)
- [x] Screenshots captured for evidence

**Test File Location**: `shared/components/e2e/ColourEngine.spec.ts`

**Theme Variant URLs** (for Storybook):
```
/iframe.html?id=colour-engine-colourlegend--categorical&globals=theme:light
/iframe.html?id=colour-engine-colourlegend--categorical&globals=theme:dark
/iframe.html?id=colour-engine-colourlegend--categorical&globals=theme:vscode
/iframe.html?id=colour-engine-colourlegend--gradient&globals=theme:light
/iframe.html?id=colour-engine-colourlegend--gradient&globals=theme:dark
/iframe.html?id=colour-engine-colourlegend--gradient&globals=theme:vscode
```

## VS Code Webview E2E Testing

None — no extension workflow changes. The colour engine is consumed by the CatalogOverview parent component, which already has its own E2E coverage in #130.

## Complexity Tracking

No constitution violations to justify.
