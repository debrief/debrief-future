# Quickstart: Analysis Log Panel — Rich Card UX

**Feature**: 176-log-panel-ux
**Date**: 2026-04-02

## What This Feature Changes

The Log Panel's read-only card face is redesigned from plain text to rich cards with:
- Tool category icons (coloured squares with glyphs)
- Type-aware parameter chips (colour swatches, numeric prefixes, boolean symbols)
- Track badges (pill labels showing platform name)
- 4-tab view switcher (Timeline, By Feature, Compact, Detailed)
- Non-default parameter markers (red dots)
- Rationale tooltips
- Full ARIA accessibility

## Key Files to Modify

| File | Change |
|------|--------|
| `shared/components/src/LogPanel/types.ts` | Add `ToolCategory`, `ParamType`, `RichViewMode`; update `ViewMode`; remove `PresentationMode` |
| `shared/components/src/LogPanel/LogEntry.tsx` | Restructure front face to 3-row card anatomy (header, meta, params) |
| `shared/components/src/LogPanel/utils.ts` | Add `inferParamType`, `formatParamChip`, update `formatDuration`, `formatTimestamp` |
| `shared/components/src/LogPanel/strings.ts` | Add new i18n strings for categories, chip labels, tab names |
| `shared/components/src/LogPanel/LogPanel.tsx` | Update to use unified `ViewMode` (4 tabs), remove `PresentationMode` |
| `shared/components/src/LogPanel/LogActionBar.tsx` | Replace mode toggles with 4-tab bar using ARIA tablist pattern |
| `shared/components/src/LogPanel/LogPanel.css` | New styles for tool icons, parameter chips, track badges, card anatomy |
| `shared/components/src/LogPanel/LogPanel.stories.tsx` | Update stories for new card design and all view modes |
| `apps/vscode/src/views/logPanelView.ts` | Update `toTimelineEntry` to pass-through new fields; update message types |
| `apps/vscode/src/webview/web/logPanel.tsx` | Remove `PresentationMode` state, use unified `ViewMode` |

## New Files

| File | Purpose |
|------|---------|
| `shared/components/src/LogPanel/ToolCategoryIcon.tsx` | 18×18px coloured square sub-component |
| `shared/components/src/LogPanel/ParameterChip.tsx` | Type-aware chip sub-component |
| `shared/components/src/LogPanel/TrackBadge.tsx` | Platform name pill badge sub-component |
| `shared/components/src/LogPanel/toolCategories.ts` | Static category config map + manifest lookup |
| `shared/components/src/LogPanel/paramTypeInference.ts` | `inferParamType` heuristic function |

## Testing Approach

1. **Unit tests** (vitest): `inferParamType`, `formatDuration`, `formatParamChip` utility functions
2. **Component tests** (vitest + React Testing Library): Card rendering for all parameter types, view modes, disabled/selected states
3. **Storybook stories**: Visual development and snapshot testing for all card variants
4. **E2E tests** (Playwright): Verify tab switching and card rendering in the VS Code webview

## Architecture Notes

- **No PROV model changes** — all new types are UI-layer only
- **No new service dependencies** — uses existing LogService, CalcService, schema cache
- **Flip-card integration preserved** — only the front face changes; CardFlip/EditFace remain
- **Tool category source** — currently a static map; will be replaced by tool manifest lookup when manifests are available (neutral grey fallback until then)
