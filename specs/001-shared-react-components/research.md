# Research: Shared React Component Library

**Feature**: 001-shared-react-components
**Date**: 2026-01-16
**Purpose**: Resolve technical unknowns before implementation

## Research Topics

### 1. Map Rendering Library

**Question**: Which mapping library should be used for the MapView component?

**Decision**: Leaflet with react-leaflet wrapper

**Rationale**:
- Spec assumption (line 149) already specifies Leaflet for consistency with VS Code extension
- Lightweight (~40KB gzipped) — helps meet SC-003 bundle size target (<200KB)
- Excellent TypeScript support
- Strong community and ecosystem
- Works offline (no tile server dependency for vector data)
- Battle-tested for maritime/GIS applications

**Alternatives Considered**:
| Alternative | Rejected Because |
|-------------|------------------|
| MapLibre GL | Heavier (~200KB), WebGL dependency may cause issues in some webviews |
| OpenLayers | Steeper learning curve, larger bundle |
| deck.gl | Overkill for track visualization, heavier bundle |
| Mapbox GL | License restrictions, requires API key |

**Implementation Notes**:
- Use react-leaflet v4+ for React 18 compatibility
- Custom tile layer support for offline/classified environments
- Default to OpenStreetMap tiles with easy override

---

### 2. Timeline Component Approach

**Question**: Build custom timeline or use an existing library?

**Decision**: Build custom lightweight timeline using HTML5 Canvas

**Rationale**:
- Existing timeline libraries (vis-timeline, react-chrono) are heavy and opinionated
- Maritime temporal data has specific needs (variable time spans, multiple tracks)
- Canvas rendering provides smooth 60fps pan/zoom (SC-006)
- Tight integration with selection state and GeoJSON data
- Smaller bundle contribution than full-featured libraries

**Alternatives Considered**:
| Alternative | Rejected Because |
|-------------|------------------|
| vis-timeline | Large bundle (~150KB), jQuery legacy |
| react-chrono | Focused on vertical timelines, not time-series |
| d3-timeline | Additional d3 dependency, more complexity |
| recharts | Chart-focused, not timeline-oriented |

**Implementation Notes**:
- Canvas for rendering, React for state/props
- Pan/zoom with mouse and touch gestures
- Time axis labels adapt to zoom level
- Feature bars color-coded by type

---

### 3. Storybook as Development & Review Platform

**Question**: How to enable component review and community feedback?

**Decision**: Storybook with GitHub Pages deployment — positioned as a CORE development practice, not an afterthought

**Rationale**:
Storybook provides transformative benefits for this project:

**1. Visual Review Without Running the Full Application**
- Stakeholders (DSTL scientists, contributors) can review UI rendering in a browser
- No need to install Electron, VS Code, or configure Python services
- Components are presented in isolation, making design feedback more focused

**2. Living Documentation**
- Each component has documented props, variants, and edge cases
- New contributors understand component APIs without reading source
- Examples serve as implicit tests for expected behavior

**3. Cross-Context Validation**
- Stories can demonstrate components in simulated Electron and VS Code contexts
- Visual regression testing catches rendering differences between environments
- Critical for SC-004: "pass visual regression tests across contexts"

**4. Design System Enforcement**
- Theme tokens visible in action across all components
- Easy to spot inconsistencies in spacing, colors, typography
- Enables rapid iteration on design decisions

**5. Accessibility Testing**
- Storybook a11y addon catches accessibility issues during development
- Keyboard navigation and screen reader behavior can be tested
- Critical for government/defence accessibility requirements

**6. Community Engagement (Constitution Article XII)**
- Public Storybook deployment invites early feedback
- Contributors can propose changes by referencing specific stories
- Reduces barrier to participation — no dev setup required

**Alternatives Considered**:
| Alternative | Rejected Because |
|-------------|------------------|
| Screenshot-based review | Static, can't interact, hard to maintain |
| Deployed demo app | Requires full infrastructure, hides component details |
| Docusaurus + MDX | Good for docs, not interactive component showcase |
| No preview | Violates Constitution Article XII (beta previews) |

**Implementation Notes**:
- Deploy to GitHub Pages: `https://debrief.github.io/debrief-future/components/`
- GitHub Action triggers on changes to `shared/components/`
- Include stories for:
  - Each component with default props
  - Each component with edge cases (empty data, large datasets)
  - Theme variants (light/dark if applicable)
  - Interactive props via Controls addon
- Link to feedback GitHub Discussion from Storybook

---

### 4. Theme and Styling Strategy

**Question**: How to implement consistent styling across Electron and VS Code contexts?

**Decision**: CSS Custom Properties (CSS Variables) with a theme provider

**Rationale**:
- CSS Custom Properties work everywhere (Electron, VS Code webview, Storybook)
- Runtime theme switching without JavaScript bundle changes
- VS Code can inject its own theme values to match editor appearance
- Aligns with spec assumption (line 153): "CSS custom properties for runtime theming"

**Alternatives Considered**:
| Alternative | Rejected Because |
|-------------|------------------|
| CSS-in-JS (styled-components) | Runtime overhead, SSR complexity |
| Tailwind CSS | Utility classes less suited for component library |
| CSS Modules | No runtime theme switching |
| Emotion | Additional runtime, not needed for our use case |

**Implementation Notes**:
```css
:root {
  --debrief-primary: #1e40af;
  --debrief-surface: #ffffff;
  --debrief-text: #1f2937;
  --debrief-border: #e5e7eb;
  --debrief-track-color: #3b82f6;
  /* ... more tokens */
}
```
- ThemeProvider component sets CSS variables on container
- VS Code extension can override variables to match editor theme
- Storybook addon for theme switching during preview

---

### 5. Bundle Strategy and Tree Shaking

**Question**: How to ensure components are individually importable (FR-009)?

**Decision**: ESM-only build with explicit exports in package.json

**Rationale**:
- ESM is the modern standard, supported by all target environments
- Explicit exports enable bundler tree-shaking
- Each component in its own entry point

**Package Structure**:
```json
{
  "name": "@debrief/components",
  "type": "module",
  "exports": {
    ".": "./dist/index.js",
    "./MapView": "./dist/MapView/index.js",
    "./Timeline": "./dist/Timeline/index.js",
    "./FeatureList": "./dist/FeatureList/index.js",
    "./ThemeProvider": "./dist/ThemeProvider/index.js"
  },
  "sideEffects": ["**/*.css"]
}
```

**Alternatives Considered**:
| Alternative | Rejected Because |
|-------------|------------------|
| Single bundle | No tree-shaking, larger consumer bundles |
| CJS + ESM dual | Complexity, CJS not needed for our targets |
| UMD | Legacy format, not needed |

**Implementation Notes**:
- Use tsup or Vite library mode for building
- Generate TypeScript declaration files (.d.ts)
- CSS imported per-component, bundled separately

---

### 6. Large Dataset Handling

**Question**: How to maintain performance with 500+ features (SC-002, SC-006)?

**Decision**: Virtualization for lists, canvas clustering for maps

**Rationale**:
- FeatureList: Use virtualization (only render visible rows)
- MapView: Leaflet.markercluster for dense areas, canvas renderer for tracks
- Timeline: Canvas already provides efficient rendering

**Implementation Notes**:
- FeatureList: Use @tanstack/react-virtual for virtualized scrolling
- MapView: Leaflet.Canvas for polylines, marker clustering for points
- Benchmark with 500 features during development
- Add performance stories in Storybook to demonstrate behavior

---

### 7. GeoJSON Type Safety

**Question**: How to ensure type-safe GeoJSON handling?

**Decision**: Use geojson TypeScript types with Debrief-specific extensions

**Rationale**:
- The `geojson` npm package provides official TypeScript types
- Extend with Debrief-specific property interfaces
- Aligns with schema-first approach (derived from LinkML)

**Implementation Notes**:
```typescript
import type { Feature, FeatureCollection } from 'geojson';

// Debrief-specific properties
interface DebriefFeatureProperties {
  name?: string;
  type?: 'track' | 'reference' | 'analysis';
  startTime?: string; // ISO 8601
  endTime?: string;   // ISO 8601
  // Additional properties from schema
}

type DebriefFeature = Feature<GeoJSON.Geometry, DebriefFeatureProperties>;
type DebriefFeatureCollection = FeatureCollection<GeoJSON.Geometry, DebriefFeatureProperties>;
```

---

### 8. Testing Strategy

**Question**: What testing approach for a component library?

**Decision**: Vitest for unit tests, Storybook for visual tests, Playwright for integration

**Rationale**:
- Vitest: Fast, Vite-native, React Testing Library compatible
- Storybook: Visual regression via chromatic or percy (optional)
- Playwright: Test components in actual browser contexts
- Aligns with loader app's existing test stack

**Test Coverage Requirements**:
| Area | Tool | Coverage Target |
|------|------|-----------------|
| Component logic | Vitest + RTL | 80% |
| Props/rendering | Storybook stories | All public props |
| Visual regression | Storybook + Chromatic | Key states |
| Browser integration | Playwright | Critical paths |

---

## Summary

All technical unknowns resolved. Key decisions:

| Topic | Decision |
|-------|----------|
| Map rendering | Leaflet + react-leaflet |
| Timeline | Custom canvas-based implementation |
| Storybook | Core practice — deployed to GitHub Pages for review |
| Styling | CSS Custom Properties with ThemeProvider |
| Bundle format | ESM-only with explicit exports |
| Large datasets | Virtualization + canvas rendering |
| GeoJSON types | geojson package + Debrief extensions |
| Testing | Vitest + Storybook + Playwright |

**Storybook Value Summary**:
1. Review UI without full app installation
2. Living documentation for contributors
3. Cross-context validation (Electron vs VS Code)
4. Design system enforcement
5. Accessibility testing
6. Community engagement per Constitution Article XII

**Ready to proceed to Phase 1: Design & Contracts**
