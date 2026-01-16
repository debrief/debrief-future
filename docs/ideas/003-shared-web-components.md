# Idea 003: Extract Mapping Component to Shared Web Components

**Backlog ID**: 003
**Category**: Tech Debt
**Status**: Parked (see STRATEGY.md Parking Lot)
**Revisit When**: VS Code extension development begins (tracer bullet step 6)

## Problem

The planned VS Code extension will contain a mapping component. This same component will be needed in multiple frontends:

- VS Code extension (webview)
- Electron loader app (renderer)
- Jupyter notebooks (output cells)

Building the component tightly coupled to any single frontend would require duplication or complex refactoring later.

## Proposed Solution

Build the mapping component as a **Web Component** in `shared/web-components/` from the start, rather than building it in VS Code and extracting later.

### Why Web Components?

| Approach | Pros | Cons |
|----------|------|------|
| **Web Components** | Framework-agnostic, works everywhere, browser-native | More complex than React, less ecosystem |
| React Components | Simpler, rich ecosystem | Requires React in all consumers |

**Decision**: Web Components chosen for framework independence. All three target frontends (VS Code webview, Electron, Jupyter) can consume Web Components without requiring React.

### Target Consumers

1. **VS Code Extension** — Primary consumer, webview-based UI
2. **Electron Loader** — File loading mini-app with map preview
3. **Jupyter Notebooks** — Interactive analysis with embedded maps

### Package Structure

```
shared/
└── web-components/
    ├── package.json
    ├── tsconfig.json
    ├── src/
    │   ├── debrief-map/           # Map component
    │   │   ├── debrief-map.ts
    │   │   ├── debrief-map.css
    │   │   └── index.ts
    │   └── index.ts               # Package exports
    ├── dist/                      # Built output
    └── README.md
```

### Component API (Draft)

```html
<debrief-map
  tracks="[GeoJSON FeatureCollection]"
  center="[lat, lng]"
  zoom="10"
  selection="[feature IDs]"
  @track-click="handler"
  @selection-change="handler">
</debrief-map>
```

**Attributes**:
- `tracks` — GeoJSON FeatureCollection of track data
- `center` — Map center coordinates
- `zoom` — Zoom level
- `selection` — Currently selected feature IDs

**Events**:
- `track-click` — Fired when a track is clicked
- `selection-change` — Fired when selection changes

## Success Criteria

- [ ] `shared/web-components/` package exists with build tooling
- [ ] `<debrief-map>` component renders tracks on a Leaflet map
- [ ] Component works in plain HTML (no framework required)
- [ ] Component works in VS Code webview
- [ ] Component API is documented
- [ ] TypeScript types exported for consumers

## Constraints

- **Offline operation** — Must work without network (CONSTITUTION Article I)
- **No vendor lock-in** — Use standard Web Components, not proprietary framework
- **TypeScript** — All source in TypeScript for type safety
- **Leaflet** — Use Leaflet for mapping (already planned per ARCHITECTURE.md)

## Out of Scope

- Other components (timeline, etc.) — future work after map proves the pattern
- Integration into Loader or Jupyter — just make component available
- New mapping features — initial version matches VS Code extension needs

## Implementation Notes

### Build Tooling Options

| Tool | Consideration |
|------|---------------|
| Lit | Google's Web Component library, good DX |
| Stencil | Compiler approach, generates standard WC |
| Vanilla | No framework, maximum control |

Recommendation: Evaluate Lit for developer experience while maintaining standards compliance.

### Integration Pattern

Each frontend imports and registers the component:

```typescript
// In VS Code extension webview
import '@debrief/web-components/debrief-map';

// Use in HTML
const html = `<debrief-map tracks="${tracksJson}"></debrief-map>`;
```

## Related Items

- **ARCHITECTURE.md** — References Leaflet for map rendering
- **Build Sequence Step 6** — VS Code extension (primary consumer)
- **Build Sequence Step 4** — Loader mini-app (secondary consumer)

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-01-16 | Web Components over React | Framework independence for multi-frontend reuse |
| 2026-01-16 | Park until VS Code development | No code exists yet to extract; build correctly from start |

---

*Created: 2026-01-16*
*Last updated: 2026-01-16*
