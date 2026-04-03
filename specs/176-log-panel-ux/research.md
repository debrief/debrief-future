# Research: Analysis Log Panel — Rich Card UX

**Feature**: 176-log-panel-ux
**Date**: 2026-04-02

## R1: Tool Category System

**Decision**: Introduce a 5-category tool classification system (import, style, calc, filter, snapshot) with coloured icon backgrounds, replacing the current 4-category `OperationCategory` type.

**Rationale**: The SRD defines 5 visually distinct categories with specific background colours and glyphs. The current `OperationCategory` type (`'calculation' | 'import' | 'property-edit' | 'export'`) doesn't cover `style`, `filter`, or `snapshot`, and lacks visual distinction. The new categories better match analyst mental models of tool families.

**Alternatives considered**:
- Extend the existing `OperationCategory` — rejected because the semantics diverge (SRD categories are visual families, not operation types) and the name would be misleading.
- Infer category from tool name prefix — explicitly rejected in SRD §12 Q1. Category must be declared in a tool manifest.

**Implementation**: Add a `ToolCategory` type (`'import' | 'style' | 'calc' | 'filter' | 'snapshot'`) alongside the existing `OperationCategory`. Tool category is resolved from a manifest lookup, falling back to `undefined` (neutral grey icon). The existing `OperationCategory` remains for filtering logic; `ToolCategory` is purely visual.

## R2: Parameter Type Inference

**Decision**: Implement a client-side `inferParamType` utility with tool-schema override, following the SRD §6.3 priority chain: tool schema → heuristic → fallback.

**Rationale**: The current LogEntry renders parameter values as plain `String(param.value)`. The SRD requires type-aware chips with icons (colour swatch, `#`, `≡`, `↔`, `⊤`/`⊥`). The existing `ParameterSchemaEntry.type` field from Feature 113 provides tool-schema types but only for the flip-card edit face; we need a lighter-weight inference path for the read-only card face.

**Alternatives considered**:
- Always require tool schema — rejected because schema is not available for all tools, and the flip-card schema request round-trip is too heavy for read-only rendering.
- Encode type in the PROV schema — rejected because this would modify the provenance model, which the SRD explicitly avoids.

**Implementation**: New `inferParamType(value: unknown): ParamType` function in `utils.ts`. Returns `'colour' | 'number' | 'boolean' | 'range' | 'enum'`. When a `ParameterSchemaEntry` is available (from the existing schema cache), its `type` field takes precedence.

## R3: View Mode Consolidation

**Decision**: Replace the current separate `ViewMode` (`'timeline' | 'by-feature'`) + `PresentationMode` (`'compact' | 'normal' | 'detailed'`) with a unified `ViewMode` type matching the SRD's 4 tabs: `'timeline' | 'by-feature' | 'compact' | 'detailed'`.

**Rationale**: The SRD defines 4 view tabs (Timeline, By Feature, Compact, Detailed) as the primary navigation. The current implementation uses `ViewMode` for layout switching and `PresentationMode` for detail level — but the SRD merges these into a single tab bar. Compact is "header + meta only" (regardless of layout), and Detailed is "full card + feature IDs" (regardless of layout).

**Alternatives considered**:
- Keep both dimensions — rejected because the SRD's tab bar is a single-selection model with 4 options, not a 2×3 matrix.
- Add tabs for all combinations — rejected as overly complex.

**Implementation**: `ViewMode` becomes `'timeline' | 'by-feature' | 'compact' | 'detailed'`. Remove `PresentationMode`. The `LogActionBar` renders 4 tabs using ARIA `tablist/tab/tabpanel` pattern. Compact view renders Timeline layout with reduced card height. Detailed view renders Timeline layout with expanded feature ID lists.

## R4: Card Visual Redesign

**Decision**: Restructure the `LogEntry` component into three rows (header, meta, params) matching the SRD §4.1 anatomy, with CSS styling for tool category icons, track badges, and parameter chips.

**Rationale**: The current `LogEntry` renders: header (step + tool name + feature + badges + edit icon), optional params, optional details. The SRD requires: header (step number + tool icon + tool name + rationale icon), meta (track badge + disabled badge + timestamp + duration), params (labelled chips with type icons).

**Alternatives considered**:
- Incremental modification of existing structure — possible but the row semantics are sufficiently different that a clear restructuring is cleaner.
- New component replacing LogEntry — rejected to preserve the flip-card integration from Feature 113.

**Implementation**: Modify `LogEntry.tsx` to render the new 3-row structure. The flip-card wrapping (CardFlip, EditFace) continues to work — only the front face changes. CSS in `LogPanel.css` updated for new class names.

## R5: Duration Formatting

**Decision**: Update `formatDuration` to match SRD §4.1 rules: `< 1s` → `Xms`, `≥ 1s` → `X.Xs`.

**Rationale**: Current implementation formats as `0.5s`, `1m 2s`. SRD specifies milliseconds below 1 second and single-decimal seconds at/above 1 second.

**Implementation**: Modify `formatDuration` in `utils.ts`. Parse ISO 8601 duration, convert to milliseconds, then apply formatting rules.

## R6: Timestamp Formatting

**Decision**: Always display timestamps in UTC as `HH:MM:SS UTC`, not locale time.

**Rationale**: SRD §12 Q4 resolved: UTC always. Current implementation uses `toLocaleTimeString()` which shows local time. The Constitution (I.4 Reproducibility) supports consistent UTC display.

**Implementation**: Update `formatTimestamp` to use `toISOString()` or manual UTC formatting, appending " UTC" suffix.

## R7: Accessibility Improvements

**Decision**: Add comprehensive ARIA attributes to cards, chips, badges, and tabs as specified in SRD §9.

**Rationale**: Current implementation has basic `role="button"`, `tabIndex`, and `data-testid` attributes. The SRD requires `aria-label` on chips/badges, `aria-selected` on cards, step number in card `aria-label`, and ARIA `tablist/tab/tabpanel` on view tabs.

**Implementation**: Add `aria-label` to ParameterChip, TrackBadge, and rationale icon. Add `aria-selected` to card wrapper. Update LogActionBar to use `role="tablist"` with `role="tab"` on each tab button.

## R8: I18N String Additions

**Decision**: Add all new user-facing strings to `strings.ts` as externalisable constants.

**Rationale**: Constitution Article XI requires all user-facing strings to be externalisable. The existing `LOG_PANEL_STRINGS` object is the established pattern.

**Implementation**: Add entries for: new view tab labels, tool category names, parameter type labels, chip aria-labels, track badge labels, empty state messages, and "Manual checkpoint" / "No parameters" placeholders.

## R9: Storybook Stories

**Decision**: Create/update Storybook stories for the redesigned LogEntry (rich card) and new ParameterChip sub-component.

**Rationale**: The project uses Storybook for visual component development. Existing `LogPanel.stories.tsx` and `ParameterEditor.stories.tsx` provide the pattern. New visual components need stories for development and testing.

**Implementation**: Update `LogPanel.stories.tsx` with stories demonstrating: all 5 tool categories, all parameter chip types, disabled state, rationale tooltip, empty/error states, all 4 view modes.
