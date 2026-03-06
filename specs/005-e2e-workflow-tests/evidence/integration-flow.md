# Dual-Platform E2E Test Architecture

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                   CI Pipeline                        │
│                                                     │
│  ┌──────────────┐          ┌──────────────────────┐ │
│  │  ci.yml       │          │  e2e.yml             │ │
│  │              │          │                      │ │
│  │  Web-Shell   │          │  VS Code E2E         │ │
│  │  Playwright  │  ║       │  Playwright          │ │
│  │  13 specs    │  ║       │  18 specs            │ │
│  │  81+ tests   │  ║       │  ~53 tests           │ │
│  │  Mock data   │  ║       │  Real services       │ │
│  │  ~30s        │  ║       │  ~3min               │ │
│  └──────────────┘  ║       └──────────────────────┘ │
│                    ║  PARALLEL                       │
└─────────────────────────────────────────────────────┘
```

## Data Flow: Web-Shell Tests

```
Browser
  └─→ Playwright
       └─→ web-shell dev server (Vite)
            └─→ React app with mock STAC data
                 └─→ MapView, FeatureList, LogPanel, etc.
                      └─→ Assertions on DOM state
```

- **Fast**: Direct component rendering, no VS Code overhead
- **Mock data**: Inline STAC Items with known values
- **Exact assertions**: "name === 'HMS DEFENDER'" (controlled data)

## Data Flow: VS Code E2E Tests

```
Browser
  └─→ Playwright
       └─→ code-server (VS Code in browser)
            └─→ Debrief extension activates
                 ├─→ debrief-io (Python) → parses REP → GeoJSON
                 ├─→ debrief-stac (Python) → stores STAC Items
                 └─→ debrief-calc (Python) → runs analysis tools
                      └─→ Webview renders real data
                           └─→ Assertions on DOM state
```

- **Comprehensive**: Full VS Code + extension + Python services
- **Real data**: Actual REP files parsed by real Python services
- **Structural assertions**: "trackCount > 0" (real output varies)

## Spec File Mapping

| Category | Web-Shell Spec | VS Code E2E Spec |
|----------|---------------|-------------------|
| Load/Display | selection-sync.spec.ts | test-load-display.spec.ts |
| Selection | selection-sync.spec.ts | test-selection-sync.spec.ts |
| Time Control | time-controller.spec.ts | test-time-controller.spec.ts |
| Drawing | drawing.spec.ts | test-drawing.spec.ts |
| Catalog | catalog-browse.spec.ts | test-catalog-browse.spec.ts |
| Log Panel | log-panel.spec.ts | test-log-panel.spec.ts |
| Log Editing | log-edit-face.spec.ts | test-log-edit-face.spec.ts |
| Events | event-log-propagation.spec.ts | test-event-log-propagation.spec.ts |
| Styling | styling-tools.spec.ts | test-styling-tools.spec.ts |
| Undo/Redo | undo-redo-split.spec.ts | test-undo-redo-split.spec.ts |
| Evidence | capture-log-evidence.spec.ts | test-capture-log-evidence.spec.ts |
| Analysis | — | test-analysis-tool.spec.ts |
| Errors | — | test-error-feedback.spec.ts |
| Tuning | — | test-tune-prov.spec.ts |

## test.fixme() Strategy

Tests for unimplemented extension features use `test.fixme()`:

```typescript
test.fixme('time scrubber updates map display', async ({ codeServerPage }) => {
  // Time controller not yet implemented in VS Code extension
  // See backlog: time-controller feature
});
```

This ensures:
- Tests appear in reports as "to be implemented" (not silently hidden)
- Backlog cross-references link tests to planned features
- When features ship, tests can be activated by removing `test.fixme()`
