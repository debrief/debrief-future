# Implementation Plan: Shared React Component Library

**Branch**: `001-shared-react-components` | **Date**: 2026-01-16 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-shared-react-components/spec.md`

## Summary

Build a reusable React component library providing MapView, Timeline, and FeatureList components for visualizing GeoJSON maritime data. Components use Leaflet for mapping, Canvas for timeline rendering, and virtualized lists for performance. All components share selection state, accept GeoJSON as input, and work in both Electron and VS Code webview contexts. Storybook serves as the primary platform for UI review and community feedback.

## Technical Context

**Language/Version**: TypeScript 5.x with React 18+
**Primary Dependencies**: react-leaflet v4+, @tanstack/react-virtual, @debrief/schemas (workspace types)
**Storage**: N/A (pure display components — no persistence)
**Testing**: Vitest (unit), Storybook (visual preview/review), Playwright (integration)
**Target Platform**: Electron renderer, VS Code webview, modern browsers
**Project Type**: Component library (pnpm workspace package)
**Performance Goals**: Initial render <500ms for 500 features (SC-002), 60fps pan/zoom (SC-006)
**Constraints**: <200KB gzipped total (SC-003), tree-shakeable imports (FR-009)
**Scale/Scope**: 3 core components, 1 theme provider, utility hooks

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Requirement | Status | Notes |
|---------|-------------|--------|-------|
| **I. Defence-Grade Reliability** | Offline by default | PASS | Components work with local data, tile URL configurable for offline |
| **I.3** | No silent failures | PASS | Malformed data handled gracefully (FR-011), logged to console |
| **II. Schema Integrity** | Use derived schemas | PASS | GeoJSON types extended from LinkML-derived definitions |
| **III. Data Sovereignty** | Provenance always | N/A | Display-only components don't modify data |
| **IV. Architectural Boundaries** | Services never touch UI | PASS | Components are UI-only, receive data as props |
| **IV.2** | Frontends never persist | PASS | No data writes, purely presentational |
| **VI. Testing** | Unit tests required | PASS | Vitest + RTL planned, 80% coverage target |
| **VIII. Documentation** | Specs before code | PASS | Full specification completed |
| **XI. Internationalisation** | I18N from the start | PASS | Component labels externalized, locale-aware date formatting |
| **XII. Community Engagement** | Beta previews | PASS | Storybook deployment to GitHub Pages |

**Gate Status**: PASS — all applicable constitution requirements satisfied

## Project Structure

### Documentation (this feature)

```text
specs/001-shared-react-components/
├── spec.md              # Feature specification (completed)
├── plan.md              # This file
├── research.md          # Phase 0 output - technical decisions
├── data-model.md        # Phase 1 output - TypeScript interfaces
├── quickstart.md        # Phase 1 output - usage examples
├── contracts/           # Phase 1 output
│   └── types.d.ts       # Public API type definitions
├── media/               # Phase 2 output
│   ├── planning-post.md # Blog announcement
│   └── linkedin-planning.md
└── tasks.md             # Created by /speckit.tasks (not this command)
```

### Source Code (repository root)

```text
shared/components/
├── src/
│   ├── index.ts                 # Main entry point (re-exports)
│   │
│   ├── MapView/
│   │   ├── index.ts             # Component export
│   │   ├── MapView.tsx          # Main component
│   │   ├── MapView.stories.tsx  # Storybook stories
│   │   ├── MapView.test.tsx     # Unit tests
│   │   ├── MapView.css          # Component styles
│   │   └── hooks/               # Map-specific hooks
│   │       └── useMapInteraction.ts
│   │
│   ├── Timeline/
│   │   ├── index.ts
│   │   ├── Timeline.tsx
│   │   ├── Timeline.stories.tsx
│   │   ├── Timeline.test.tsx
│   │   ├── Timeline.css
│   │   └── canvas/              # Canvas rendering utilities
│   │       ├── TimeAxis.ts
│   │       └── FeatureBars.ts
│   │
│   ├── FeatureList/
│   │   ├── index.ts
│   │   ├── FeatureList.tsx
│   │   ├── FeatureList.stories.tsx
│   │   ├── FeatureList.test.tsx
│   │   ├── FeatureList.css
│   │   └── FeatureRow.tsx       # Individual list row
│   │
│   ├── ThemeProvider/
│   │   ├── index.ts
│   │   ├── ThemeProvider.tsx
│   │   ├── ThemeContext.ts      # React context
│   │   ├── defaultTheme.ts      # Default token values
│   │   └── ThemeProvider.test.tsx
│   │
│   ├── hooks/                   # Shared hooks
│   │   ├── useSelection.ts      # Selection state management
│   │   └── useTheme.ts          # Theme access hook
│   │
│   ├── utils/                   # Utility functions
│   │   ├── bounds.ts            # calculateBounds
│   │   ├── time.ts              # calculateTimeExtent
│   │   ├── labels.ts            # getFeatureLabel, getFeatureIcon
│   │   └── types.ts             # Re-exports from @debrief/schemas + convenience unions
│   │
│   └── styles/
│       └── tokens.css           # CSS custom property definitions
│
├── .storybook/
│   ├── main.ts                  # Storybook configuration
│   ├── preview.ts               # Global decorators
│   └── manager.ts               # UI customization
│
├── tests/
│   └── setup.ts                 # Test setup (jsdom, mocks)
│
├── package.json
├── tsconfig.json
├── vite.config.ts               # Build configuration
└── vitest.config.ts             # Test configuration
```

**Structure Decision**: Component library structure with colocated stories and tests per component. Each component is a separate entry point for tree-shaking. Storybook configuration at package root for unified preview experience.

## Key Design Decisions

### 1. Storybook as Core Practice

Storybook is not an afterthought — it's central to the development workflow:

| Benefit | How It Helps |
|---------|--------------|
| **Visual Review** | Stakeholders review UI without installing Electron/VS Code |
| **Living Documentation** | Component APIs documented with interactive examples |
| **Cross-Context Testing** | Verify rendering in simulated Electron/VS Code contexts |
| **Design System Enforcement** | Theme tokens visible across all components |
| **Accessibility Validation** | a11y addon catches issues during development |
| **Community Engagement** | Public deployment invites early feedback (Constitution XII) |

Deployment: `https://debrief.github.io/debrief-future/components/`

### 2. Component Architecture

Each component follows consistent patterns:

```tsx
// Pattern: Controlled component with optional defaults
interface ComponentProps {
  features: DebriefFeatureCollection;  // Required data
  selectedIds?: Set<string>;           // Controlled selection
  onSelect?: SelectionHandler;         // Selection callback
  // ... additional props
}
```

Selection state is managed by the consumer, enabling cross-component synchronization.

### 3. Performance Strategy

| Component | Approach | Target |
|-----------|----------|--------|
| MapView | Leaflet Canvas renderer, marker clustering | 60fps with 500 tracks |
| Timeline | HTML5 Canvas for rendering | 60fps pan/zoom |
| FeatureList | @tanstack/react-virtual | Smooth scroll with 1000+ items |

### 4. Theming via CSS Custom Properties

```css
:root {
  --debrief-primary: #1e40af;
  --debrief-surface: #ffffff;
  --debrief-track-color: #3b82f6;
  /* ... */
}
```

- Runtime theme switching without JavaScript changes
- VS Code webview can inject editor theme values
- Storybook provides theme switcher addon

### 5. Tree-Shakeable Exports

```json
{
  "exports": {
    ".": "./dist/index.js",
    "./MapView": "./dist/MapView/index.js",
    "./Timeline": "./dist/Timeline/index.js",
    "./FeatureList": "./dist/FeatureList/index.js",
    "./ThemeProvider": "./dist/ThemeProvider/index.js"
  }
}
```

Consumers import only what they need; bundlers eliminate unused code.

## Dependencies

### Production Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| react | ^18.2.0 | Peer dependency |
| react-dom | ^18.2.0 | Peer dependency |
| @debrief/schemas | workspace:* | Shared TypeScript types (TrackFeature, ReferenceLocation, etc.) |
| leaflet | ^1.9.0 | Map rendering |
| react-leaflet | ^4.2.0 | React wrapper for Leaflet |
| @tanstack/react-virtual | ^3.0.0 | List virtualization |

### Development Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| typescript | ^5.3.0 | Type checking |
| vite | ^5.0.0 | Build tool |
| vitest | ^1.0.0 | Unit testing |
| @testing-library/react | ^14.0.0 | Component testing |
| storybook | ^10.0.0 | Component preview |
| @storybook/react-vite | ^10.0.0 | Storybook + Vite integration |
| @storybook/addon-a11y | ^10.0.0 | Accessibility testing |

## Integration Points

### Consumer: Electron Loader App

```tsx
// apps/loader/src/renderer/components/MapPanel.tsx
import { MapView } from '@debrief/components/MapView';
import { useSelection } from '@debrief/components';
```

### Consumer: VS Code Extension

```tsx
// apps/vscode/src/webview/panels/PlotPanel.tsx
import { ThemeProvider } from '@debrief/components/ThemeProvider';
import { MapView } from '@debrief/components/MapView';

// Integrate with VS Code theme
<ThemeProvider theme={vsCodeTheme}>
  <MapView features={plotData} />
</ThemeProvider>
```

### Data Source: debrief-schemas

```typescript
// Types derived from LinkML schemas
import type { DebriefFeature } from '@debrief/components';
// These should align with generated types from /shared/schemas/
```

## Complexity Tracking

No constitution violations requiring justification. The design follows established patterns:

- Single library package (not multiple projects)
- Standard component library structure
- Well-established dependencies (Leaflet, React)
- No custom persistence layer

## Storybook Story Plan

Each component will have stories covering:

| Story Category | Purpose |
|----------------|---------|
| Default | Component with minimal props |
| With Selection | Demonstrates selection behavior |
| Large Dataset | 500+ features for performance testing |
| Empty State | How component handles no data |
| Error Cases | Malformed data handling |
| Theme Variants | Light/dark theme demonstration |
| Interactive Controls | All props adjustable via Storybook Controls |

Example story structure for MapView:

```tsx
// MapView.stories.tsx
export default {
  title: 'Components/MapView',
  component: MapView,
};

export const Default = { args: { features: sampleTracks } };
export const WithSelection = { args: { features: sampleTracks, selectedIds: new Set(['track-1']) } };
export const LargeDataset = { args: { features: generate500Features() } };
export const EmptyMap = { args: { features: { type: 'FeatureCollection', features: [] } } };
export const OfflineTiles = { args: { features: sampleTracks, tileUrl: '/local-tiles/{z}/{x}/{y}.png' } };
```

## Success Metrics Verification

| Criteria | Verification Method |
|----------|---------------------|
| SC-001: 5 lines to display map | Quickstart example demonstrates |
| SC-002: <500ms initial render | Performance test in Storybook |
| SC-003: <200KB gzipped | Build output size check in CI |
| SC-004: Visual regression tests | Storybook + Chromatic/Percy |
| SC-005: 100% TypeScript coverage | contracts/types.d.ts exports all public APIs |
| SC-006: 60fps interaction | Manual testing + performance stories |

## Next Steps

1. Run `/speckit.tasks` to generate implementation tasks
2. Set up package structure in `shared/components/`
3. Implement ThemeProvider (foundational)
4. Implement MapView (P1)
5. Implement Timeline (P1)
6. Implement FeatureList (P2)
7. Configure Storybook and deploy to GitHub Pages
8. Integration testing with loader app
