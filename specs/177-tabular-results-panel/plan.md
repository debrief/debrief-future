# Implementation Plan: Tabular Results Panel

**Feature**: 177-tabular-results-panel
**Created**: 2026-04-03
**Complexity**: High

## Technical Approach

### Architecture Overview

The tabular results panel extends the existing GoldenLayout panel workspace to display
tool outputs (tables and charts) in a panel beneath the map. It builds on established
patterns: the `ChartPanelWrapper` pattern for panel rendering, `PanelContext` for
state delivery, and the `DatasetEnvelope` type for result data.

### Key Design Decisions

1. **Reuse ChartPanelWrapper**: Rather than creating an entirely separate panel type,
   extend the existing Chart/Results panel with a `TableRenderer` component. The panel
   already supports tabs, dynamic addition, and Vega-Lite charts. Adding table rendering
   is additive.

2. **Display type on DatasetEnvelope**: Add a `displayHint` field to `DatasetEnvelope`
   (`'table' | 'chart'`) so the panel wrapper can dispatch to the correct renderer.
   This avoids schema changes to the tool registry — the display type travels with the data.

3. **CSV utilities as shared module**: Create CSV formatting and filename sanitization
   in `@debrief/utils` so both TypeScript frontends can use them.

4. **Save workflow via messages**: Save/Save As actions are webview→extension messages.
   The extension host handles file I/O, STAC registration, and provenance recording.

5. **Multi-panel via existing tab system**: The existing `chartTabs` system already
   supports multiple result tabs. Side-by-side is handled by GoldenLayout's column splitting.

## Components

### New Files

| File | Purpose |
|------|---------|
| `shared/components/src/TableRenderer/TableRenderer.tsx` | Table rendering component for flat statistics |
| `shared/components/src/TableRenderer/index.ts` | Barrel export |
| `shared/utils/src/csv.ts` | CSV formatting, filename sanitization |
| `shared/utils/src/csv.test.ts` | CSV utility tests |
| `shared/components/src/TableRenderer/TableRenderer.test.tsx` | TableRenderer tests |

### Modified Files

| File | Change |
|------|--------|
| `shared/components/src/ChartRenderer/types.ts` | Add `displayHint` to `DatasetEnvelope` |
| `shared/components/src/panels/ChartPanelWrapper.tsx` | Add table rendering path, save UI, error/retry states |
| `shared/components/src/panels/PanelContext.tsx` | Add save callbacks, error state, retry to `ChartContextProps` |
| `shared/components/src/index.ts` | Export `TableRenderer` and CSV utilities |
| `apps/web-shell/src/App.tsx` | Wire save handlers, error state, retry logic |
| `apps/vscode/src/webview/messages.ts` | Add save request/response message types |

## Phases

1. **Setup**: CSV utilities, display hint type extension
2. **Foundation**: TableRenderer component
3. **Integration**: Wire into ChartPanelWrapper with display dispatch
4. **Save**: CSV save workflow (messages, handlers, UI)
5. **Error/Retry**: Error state display and retry mechanism
6. **Tests**: Unit tests for all new code
